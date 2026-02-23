import sys
import os

# --- PATH SETUP ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

# CHANGE: We import 'vectorstore' so we can build custom filters dynamically
try:
    from Utils.pdfvectorising import vectorstore
except ImportError:
    from pdfvectorising import vectorstore

# Use the Chat Model with temperature for creative, varied responses
model = OllamaLLM(model="llama3.2", temperature=0.7)

# --- DUAL PROMPT TEMPLATES ---
# Normal mode: Concise, voice-friendly
normal_template = """
You are Lumira, an engaging AI assistant for an exhibition. Provide helpful, natural responses.

Context: {context}
Question: {question}

Guidelines:
• Answer directly and naturally - vary your phrasing
• Keep it conversational (2-4 sentences for voice)
• Use Context as your primary source
• If Context lacks info: "I don't have details on that. Want to know about [related topic]?"
• For off-topic: Politely redirect to the project
• Be engaging, not robotic - vary sentence structure
• Skip "As an AI" or "I am Lumira" phrases

Answer:
"""

# Deep mode: Comprehensive technical explanations
deep_template = """
You are Lumira, a technical AI assistant. The user asked a detailed technical question.

Context: {context}
Question: {question}

Guidelines for DETAILED responses:
• Provide comprehensive technical explanations (5-10 sentences)
• Structure: Overview → Technical Details → Key Points
• Use technical terminology from the Context
• Cover architecture, implementation, and how things work
• Still base everything on the Context provided
• Be thorough but clear - explain complex concepts well
• Vary your phrasing naturally

Detailed Answer:
"""

normal_prompt = ChatPromptTemplate.from_template(normal_template)
deep_prompt = ChatPromptTemplate.from_template(deep_template)

# --- DEEP DIVE DETECTION ---
def is_deep_question(question: str) -> bool:
    """Detect if question requires detailed technical explanation"""
    deep_keywords = [
        "how does", "how do", "how is", "how are",
        "explain in detail", "in detail", "detailed explanation",
        "architecture", "implementation", "technical details",
        "work internally", "under the hood", "mechanism",
        "step by step", "process of", "workflow",
        "breakdown", "comprehensive", "thorough explanation"
    ]
    question_lower = question.lower()
    return any(keyword in question_lower for keyword in deep_keywords)

# --- CONVERSATIONAL FILTER LIST ---
SMALL_TALK = {
    # Greetings
    "hi": "Hi there! Ask me about any product.",
    "hello": "Hello! Welcome to the exhibition.",
    "hey": "Hey! How can I help you navigate the expo?",
    "greetings": "Greetings! I am ready to assist you.",
    "good morning": "Good morning! I hope you're enjoying the exhibition.",
    "good afternoon": "Good afternoon! Let me know if you need any info.",
    "good evening": "Good evening! I'm here if you have questions.",

    # Affirmations & Closers
    "okay": "Is there anything else you'd like to know?",
    "ok": "Go ahead, I'm listening.",
    "sure": "I'm ready for your next question.",
    "cool": "Glad you think so!",
    "nice": "It is pretty interesting, isn't it?",
    "thanks": "You're welcome!",
    "thank you": "Happy to help.",
    "thx": "No problem at all.",
    "bye": "Goodbye! Enjoy the expo.",
    "goodbye": "See you later! Have a great time.",

    # Confusion / Noise
    "hmm": "I'm still here. Take your time.",
    "um": "I'm listening.",
    "huh": "If you're unsure, try asking 'What is this product?'",

    # Identity
    "who are you": "I am Lumira, your AI guide for this exhibition.",
    "what is your name": "My name is Lumira.",
    "are you real": "I am a virtual assistant powered by AI.",
    "what can you do": "I can answer questions about the products and projects on display.",
}


# --- MAIN FUNCTION ---
# NEW: Added 'filter_filename' as the second argument
def ask_lumira(question, filter_filename=None):
    print(f"🤖 Processing: {question} | Filter: {filter_filename}")

    clean_q = question.strip().lower().replace('.', '').replace('!', '').replace('?', '')

    # 1. Check Small Talk
    if clean_q in SMALL_TALK:
        yield SMALL_TALK[clean_q]
        return

    # 2. Check for Noise (very short inputs)
    if len(clean_q) < 2 and clean_q not in ["ai", "ui", "ux"]:
        yield "I didn't quite catch that."
        return

    try:
        # 3. DETECT DEEP DIVE MODE
        is_deep = is_deep_question(question)
        
        # 4. CONFIGURE RETRIEVER (Dynamic based on question depth)
        search_kwargs = {"k": 12 if is_deep else 8}  # More chunks for deep questions

        if filter_filename:
            # Reconstruct the full path because ChromaDB stores the full path in 'source'
            base_dir = os.path.dirname(os.path.abspath(__file__))
            full_path = os.path.join(base_dir, "Dataset", filter_filename)

            # STRICT FILTER: Only look at vectors from this specific file
            search_kwargs["filter"] = {"source": full_path}
            print(f"🔒 Locking search to: {filter_filename}")
        
        # Log mode
        mode = "DEEP DIVE" if is_deep else "NORMAL"
        print(f"🎯 Mode: {mode} | Retrieving {search_kwargs['k']} chunks")

        # Create a dynamic retriever for this specific request
        retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs=search_kwargs
        )

        # 4. RETRIEVE CONTEXT
        context_docs = retriever.invoke(question)

        # --- DEBUG PRINT: SEE WHAT THE BOT FOUND ---
        print(f"🔎 Found {len(context_docs)} relevant chunks.")
        if context_docs:
            print(f"📄 Top Context: {context_docs[0].page_content[:200]}...")
        else:
            print("⚠️ NO CONTEXT FOUND! Bot will likely hallucinate.")
        # -------------------------------------------

        # 5. Convert docs to string
        formatted_context = "\n\n".join([doc.page_content for doc in context_docs])
        
        # 6. SELECT PROMPT BASED ON MODE
        selected_prompt = deep_prompt if is_deep else normal_prompt
        chain = selected_prompt | model

        # 7. GENERATE ANSWER
        for chunk in chain.stream({"context": formatted_context, "question": question}):
            yield chunk

    except Exception as e:
        print(f"❌ Error in ask_lumira: {e}")
        yield f"System Error: {e}"


# --- CLI LOOP (For testing without Frontend) ---
if __name__ == "__main__":
    print("--- CLI Mode (Type 'q' to quit) ---")
    while True:
        qn = input("\nAsk: ")
        if qn.lower() == "q": break

        print("Lumira: ", end="")
        # Pass None as the filter for CLI testing
        for chunk in ask_lumira(qn, None):
            print(chunk, end="", flush=True)
        print()