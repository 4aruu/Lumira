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
    from Utils.pdfvectorising import vectorstore

# Use the Chat Model
model = OllamaLLM(model="llama3.2")

# --- PROMPT TEMPLATE ---
template = """
System: You are Lumira, an AI voice assistant for an exhibition. 
Context: {context}
User Question: {question}

Instructions:
1. **DIRECT ANSWER:** Answer the question immediately. Do NOT repeat the question.
2. **SHORT & SPOKEN:** Use simple, spoken English. Maximum 3-4 sentences. bullet points (if needed).
3. **CONTEXT ONLY:** Use the provided Context for factual answers.
4. **FALLBACK:** If the Context is empty or irrelevant to the question, say "I don't have that information, anything you would like to know on the topic at hand? etc."
5. **OUTOFCONTEXT:** Don't answer questions that are "IRRELEVANT" or "OUTOFCONTEXT", questions which are not related to the project, just reply - "Please Ask A Relevant Question About This Project". This must also include random questions
6. **TECHQUESTIONS:** Don't answer random tech questions that are asked, answer only product/project based questions based on the data provided
7. **NO GREETINGS:** Do NOT say "Hello", "Hi", "I am Lumira", or "As an AI" after the initial greetings. Start answering the question immediately.
"""

prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

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
        # 3. CONFIGURE RETRIEVER (With Optional Locking)
        search_kwargs = {"k": 5}

        if filter_filename:
            # Reconstruct the full path because ChromaDB stores the full path in 'source'
            base_dir = os.path.dirname(os.path.abspath(__file__))
            full_path = os.path.join(base_dir, "Dataset", filter_filename)

            # STRICT FILTER: Only look at vectors from this specific file
            search_kwargs["filter"] = {"source": full_path}
            print(f"🔒 Locking search to: {filter_filename}")

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

        # 6. GENERATE ANSWER
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