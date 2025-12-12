import os
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

# Must match the DB_PATH in ingest.py
DB_PATH = "./chroma_db"
MODEL_NAME = "llama3.2"

# Ensure the DB directory exists to avoid initial errors
if not os.path.exists(DB_PATH):
    os.makedirs(DB_PATH)

print("🔌 Connecting to Vector Database...")

embeddings = OllamaEmbeddings(model=MODEL_NAME)

# Connect to the persisted database
vectorstore = Chroma(
    persist_directory=DB_PATH,
    embedding_function=embeddings
)

# Create the retriever interface for the bot
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4} # Retrieve top 4 most relevant chunks
)

print("✅ Vector Store Ready.")