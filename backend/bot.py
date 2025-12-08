import sys
import os

# --- PATH SETUP ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

try:
    from Utils.pdfvectorising import retriever
except ImportError:
    from pdfvectorising import retriever

model = OllamaLLM(model="llama3.2")

# --- PROMPT TEMPLATE ---
# strict instructions to behave like a Voice Assistant
template = """
System: You are Lumira, an AI voice assistant for an exhibition. 
Context: {context}
User Question: {question}

Instructions:
1. **DIRECT ANSWER:** Answer the question immediately. Do NOT repeat the question.
2. **SHORT & SPOKEN:** Use simple, spoken English. Maximum 3-4 sentences. bullet points (if needed).
3. **CONTEXT ONLY:** Use the provided Context for factual answers.
4. **FALLBACK:** If the Context is empty or irrelevant to the question, say "I don't have that information, anything you would like to know on the topic at hand? etc."
5. **OUTOFCONTEXT:** Don't answer questions that are "IRRELEVANT" or "OUTOFCONTEXT" , questions which are not related to the project , just reply - "Please Ask A Relevant Question About This Project" . This must also include random questions
6. **TECHQUESTIONS:** Don't answer random tech questions that are asked, answer only product/project based questions based on the data provided
"""

prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

# --- CONVERSATIONAL FILTER LIST ---
# If user says these, we skip the AI processing to save time and avoid errors.
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
def ask_lumira(question):
    print(f"🤖 Processing: {question}")

    # 1. Clean the input
    clean_q = question.strip().lower().replace('.', '').replace('!', '').replace('?', '')

    # 2. Check for Small Talk (The Fix for "Okay")
    if clean_q in SMALL_TALK:
        # Yield the pre-set response immediately
        yield SMALL_TALK[clean_q]
        return

    # 3. Handle Noise (Short, meaningless inputs like "do")
    if len(clean_q) < 3 and clean_q not in ["ai", "ui", "ux"]:
        yield "I didn't quite catch that. Could you repeat?"
        return

    # 4. Normal RAG Process (For real questions)
    try:
        context = retriever.invoke(question)
        for chunk in chain.stream({"context": context, "question": question}):
            yield chunk
    except Exception as e:
        yield f"System Error: {e}"


# --- CLI LOOP ---
if __name__ == "__main__":
    print("--- CLI Mode ---")
    while True:
        qn = input("\nAsk (q to quit): ")
        if qn == "q": break
        for chunk in ask_lumira(qn):
            print(chunk, end="", flush=True)
        print()