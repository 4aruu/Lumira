import sys
import os

# --- PATH SETUP ---
# Ensures Python can find the 'Utils' folder
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

try:
    # Try importing from Utils
    from Utils.pdfvectorising import retriever
except ImportError:
    # Fallback if running directly from Utils folder (rare)
    from pdfvectorising import retriever

model = OllamaLLM(model="llama3.2")

template = """
You are a helpful AI assistant for an Exhibition. 
Answer the question: {question} based only on the following context: {context}.

Rules:
1. Be concise and precise, try to limit the answer according to the weight of the Question asked.
2. **Greetings & Small Talk:** If the user greets you (e.g., "hi", "hello") or asks how you are, reply politely and welcome them.
3. **General Knowledge:** If the user asks a general question unrelated to the exhibition (e.g., "what is AI?"), you may answer briefly using your general knowledge.
4. Do not use bullet points or long lists unless necessary.
5. If the answer is not in the context, say "I don't have that information."
"""

prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model


# --- UPDATED FUNCTION FOR API (STREAMING) ---
def ask_lumira(question):
    """
    Generator function that yields the AI response chunk by chunk.
    """
    print(f"🤖 Processing (Streaming): {question}")
    try:
        context = retriever.invoke(question)
        # Use .stream() instead of .invoke() for line-by-line response
        for chunk in chain.stream({"context": context, "question": question}):
            yield chunk
    except Exception as e:
        yield f"Error connecting to AI model: {e}"


# --- UPDATED CLI LOOP ---
if __name__ == "__main__":
    print("--- CLI Mode (Streaming) ---")
    while True:
        print("\n\n-------------------------------------")
        qn = input("Ask question (q to quit): ")
        if qn == "q":
            break

        # Loop over the generator to print chunks as they arrive
        print("Answer: ", end="", flush=True)
        for chunk in ask_lumira(qn):
            print(chunk, end="", flush=True)
        print()  # New line after answer is complete