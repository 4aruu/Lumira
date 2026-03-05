import os
import shutil

from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from langchain_chroma import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

from ingest import ingest_document

router = APIRouter()


@router.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
    background_tasks.add_task(ingest_document, file_path)
    return {"status": "File uploaded successfully"}


@router.get("/api/files")
def list_files():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)
    try:
        return {"files": [
            {"name": f, "size": f"{os.path.getsize(os.path.join(upload_dir, f)) / 1024:.1f} KB", "status": "Active"} for
            f in os.listdir(upload_dir) if os.path.isfile(os.path.join(upload_dir, f))]}
    except:
        return {"files": []}


@router.delete("/api/files/{filename}")
def delete_file(filename: str):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, "Dataset", filename)
    db_path = os.path.join(base_dir, "chroma_db")
    if os.path.exists(file_path): os.remove(file_path)
    try:
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        vector_store = Chroma(persist_directory=db_path, embedding_function=embeddings)
        vector_store.delete(where={"source": file_path})
    except:
        pass
    return {"status": "Deleted"}
