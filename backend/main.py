from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import shutil
import os
import sys

# Setup path so we can import bot.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the streaming function we just made in bot.py
from bot import ask_lumira

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

    # We return a StreamingResponse.
    # This pipes the 'yield' from bot.py directly to the HTTP response.
    # The client (React) will need to read this stream chunk by chunk.
    return StreamingResponse(
        ask_lumira(request.message),
        media_type="text/plain"
    )


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save to 'Dataset' folder so pdfvectorising.py can find it
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"📂 Saved file: {file_path}")
    return {"status": "File uploaded successfully"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)