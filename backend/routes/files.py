import os
import re
import shutil

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from langchain_chroma import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

from ingest import ingest_document

router = APIRouter()

# --- Constants ---
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf"}


def _get_upload_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal characters and dangerous patterns."""
    # Strip directory components
    filename = os.path.basename(filename)
    # Remove any non-alphanumeric chars except dots, dashes, underscores, spaces
    filename = re.sub(r'[^\w\s\-.]', '', filename)
    # Collapse multiple dots/spaces
    filename = re.sub(r'\.{2,}', '.', filename)
    filename = filename.strip('. ')
    return filename if filename else "unnamed.pdf"


@router.get("/api/files/{filename}/exists")
def check_file_exists(filename: str):
    """Check if a dataset file exists. Used by frontend to validate QR codes."""
    upload_dir = _get_upload_dir()
    safe_name = _sanitize_filename(filename)
    file_path = os.path.join(upload_dir, safe_name)
    exists = os.path.isfile(file_path)
    return {"exists": exists, "filename": safe_name}


@router.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # --- Validate file extension ---
    if not file.filename:
        raise HTTPException(400, "No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Invalid file type '{ext}'. Only PDF files are allowed."
        )

    safe_name = _sanitize_filename(file.filename)
    upload_dir = _get_upload_dir()
    file_path = os.path.join(upload_dir, safe_name)

    # --- Check for duplicates ---
    if os.path.exists(file_path):
        raise HTTPException(
            409,
            f"A file named \"{safe_name}\" already exists. Delete it first or rename your file."
        )

    # --- Read and validate file size ---
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            413,
            f"File too large ({len(content) / (1024 * 1024):.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB."
        )

    if len(content) == 0:
        raise HTTPException(400, "File is empty.")

    # --- Save file ---
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    background_tasks.add_task(ingest_document, file_path)
    return {"status": "File uploaded successfully", "filename": safe_name}


@router.get("/api/files")
def list_files():
    upload_dir = _get_upload_dir()
    try:
        return {"files": [
            {"name": f, "size": f"{os.path.getsize(os.path.join(upload_dir, f)) / 1024:.1f} KB", "status": "Active"} for
            f in os.listdir(upload_dir) if os.path.isfile(os.path.join(upload_dir, f))]}
    except Exception as e:
        print(f"❌ Error listing files: {e}")
        return {"files": []}


@router.delete("/api/files/{filename}")
def delete_file(filename: str):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    safe_name = _sanitize_filename(filename)
    file_path = os.path.join(base_dir, "Dataset", safe_name)
    db_path = os.path.join(base_dir, "chroma_db")

    # --- Check file exists ---
    if not os.path.exists(file_path):
        raise HTTPException(404, f"File \"{safe_name}\" not found.")

    # --- Delete physical file ---
    try:
        os.remove(file_path)
    except OSError as e:
        print(f"❌ Failed to delete file: {e}")
        raise HTTPException(500, f"Failed to delete file: {e}")

    # --- Clean up vector store ---
    try:
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        vector_store = Chroma(persist_directory=db_path, embedding_function=embeddings)
        vector_store.delete(where={"source": file_path})
        print(f"✅ Deleted vectors for: {safe_name}")
    except Exception as e:
        # Vector cleanup is non-critical — file is already deleted
        print(f"⚠️ Vector cleanup failed for {safe_name}: {e}")

    return {"status": "Deleted", "filename": safe_name}
