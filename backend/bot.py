from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
# Ensure Utils is a python package (has __init__.py) or in path
try:
    from Utils.pdfvectorising import retriever
except ImportError:
    # Fallback for direct running or path issues
    from pdfvectorising import retriever

model = OllamaLLM(model="llama3.2")

template = """
You are an expert in answering questions elaborately about projects in an Expo 
Answer the question : {question} based only on the following context : {context}
"""

prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

# --- NEW FUNCTION FOR API ---
def ask_lumira(question):
    """
    Function to be called by the API.
    """
    print(f"Processing question: {question}")
    context = retriever.invoke(question)
    result = chain.invoke({"context": context, "question": question})
    return result

# --- OLD CLI LOOP (Only runs if you run this file directly) ---
if __name__ == "__main__":
    while True:
        print("\n\n-------------------------------------")
        qn = input("Ask question(q to quit):")
        if qn == "q":
            break
        print(ask_lumira(qn))