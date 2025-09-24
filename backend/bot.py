from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from Utils.pdfvectorising import retriever

model = OllamaLLM(model= "llama3.2")

template = """
You are an expert in answering questions elaborately about projects in an Expo 
Answer the question : {question} based only on the following context : {context}
"""

prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

while True:
    print("\n\n-------------------------------------")
    qn = input("Ask question(q to quit):")
    if qn == "q":
        break
    context = retriever.invoke(qn)
    result = chain.invoke({"context":context , "question":qn})
    print(result)


