import os
import shutil
from langchain_community.document_loaders import PyPDFLoader
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings  # NEW SPEEDSTER
from langchain_chroma import Chroma

# Configuration
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")


def ingest_document(file_path: str):
    print(f"🔄 Starting fast ingestion for: {file_path}")

    try:
        # 1. Load PDF
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        if not documents:
            return False

        # 2. Initialize Fast Embeddings
        # This model is optimized for speed and runs locally on CPU
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")

        print("🧠 Splitting text intelligently (Fast Mode)...")

        # 3. Semantic Splitting
        text_splitter = SemanticChunker(
            embeddings,
            breakpoint_threshold_type="percentile"
        )
        chunks = text_splitter.split_documents(documents)
        print(f"📄 Split into {len(chunks)} smart sections.")

        # 4. Add to Vector Store
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