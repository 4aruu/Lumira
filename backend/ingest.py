import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

# Configuration
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")
MODEL_NAME = "llama3.2"


def ingest_document(file_path: str):
    """
    Loads a PDF, splits it, embeds it, and adds it to the ChromaDB.
    """
    print(f"🔄 Starting ingestion for: {file_path}")

    try:
        # 1. Load PDF
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        if not documents:
            print("⚠️ No text found in PDF.")
            return False

        # 2. Split Text (Chunks)
        # We split text into smaller pieces so the AI can process specific details.
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents)
        print(f"📄 Split into {len(chunks)} chunks.")

        # 3. Initialize Embeddings & Vector Store
        # 'persist_directory' ensures the data is saved to disk and not lost on restart.
        embeddings = OllamaEmbeddings(model=MODEL_NAME)
        vector_store = Chroma(
            persist_directory=DB_PATH,
            embedding_function=embeddings
        )

        # 4. Add to DB
        vector_store.add_documents(chunks)

        print(f"✅ Successfully ingested {file_path} into Knowledge Base.")
        return True

    except Exception as e:
        print(f"❌ Ingestion failed: {str(e)}")
        return False