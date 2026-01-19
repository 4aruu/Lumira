import os
import shutil
from langchain_community.document_loaders import PyPDFLoader
# CHANGE: Switched from SemanticChunker to Recursive for reliable large chunks
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_chroma import Chroma

# Configuration
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")


def ingest_document(file_path: str):
    print(f"🔄 Starting ingestion for: {file_path}")

    try:
        # 1. Load PDF
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        if not documents:
            return False

        # 2. Initialize Fast Embeddings
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

        print("🧠 Splitting text (Wide-Angle Mode)...")

        # 3. FIX: USE RECURSIVE SPLITTER WITH LARGE CHUNKS
        # chunk_size=2000 ensures we capture full pages/sections at once.
        # This is CRITICAL for answering broad questions like "Summarize this".
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,
            chunk_overlap=200
        )

        chunks = text_splitter.split_documents(documents)

        # 🔍 DEBUG: See exactly how many large chunks were created
        print(f"📄 SPLITTING REPORT: Created {len(chunks)} LARGE chunks from {os.path.basename(file_path)}")

        # 4. Add to Vector Store
        # Note: We append to the existing DB, we don't overwrite it
        vector_store = Chroma(
            persist_directory=DB_PATH,
            embedding_function=embeddings
        )
        vector_store.add_documents(chunks)

        print(f"✅ Successfully ingested {file_path}")
        return True

    except Exception as e:
        print(f"❌ Ingestion failed: {str(e)}")
        return False