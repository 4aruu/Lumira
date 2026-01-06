import os
import sys

# --- PATH SETUP TO FIND MODULES ---
# This ensures we can find the 'backend' folder even from inside Utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_chroma import Chroma
# NEW: Must use FastEmbed to match ingest.py
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

# --- CONFIGURATION ---
# This points to backend/chroma_db
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")

if not os.path.exists(DB_PATH):
    print(f"⚠️ Warning: Database folder not found at {DB_PATH}")
    os.makedirs(DB_PATH)

print(f"🔌 Connecting to DB at: {DB_PATH}")

# NEW: Initialize with the EXACT same model as ingest.py
embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

vectorstore = Chroma(
    persist_directory=DB_PATH,
    embedding_function=embeddings
)

retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5} # Fetch top 5 relevant chunks
)

print("✅ Retriever Ready with FastEmbed.")