from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import shutil
import os
import sys

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bot import ask_lumira
# Import the new ingestion function
from ingest import ingest_document

app = FastAPI()

# --- Security: Allow React to Connect ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"status": "Lumira Backend Online"}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"📩 Received: {request.message}")
    return StreamingResponse(
        ask_lumira(request.message),
        media_type="text/plain"
    )

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # 1. Define paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)

    # 2. Save the file locally
    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"📂 Saved file: {file_path}")

    # 3. Trigger Ingestion in Background
    # This allows the API to respond "Success" immediately while processing happens
    background_tasks.add_task(ingest_document, file_path)

    return {"status": "File uploaded successfully. Indexing in progress..."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)