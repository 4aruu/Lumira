import os
import shutil
import sys
import asyncio
import random
import edge_tts
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
import uvicorn
from faster_whisper import WhisperModel

# --- AUTH IMPORTS ---
from auth import otp_manager, email_service, rate_limiter

# --- RAG IMPORTS ---
from langchain_chroma import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from bot import ask_lumira
from ingest import ingest_document

# --- INITIALIZATION (THE ACCURACY UPGRADE) ---
try:
    # "small" is the sweet spot for laptop CPUs.
    # It is much smarter than "base" but still runs reasonably fast.
    stt_model = WhisperModel("small", device="cpu", compute_type="int8")
    print("✅ Faster-Whisper: Ready (Model: Small - High Accuracy)")
except Exception as e:
    stt_model = None
    print(f"❌ Whisper Error: {e}")

# Concurrency Lock
inference_lock = asyncio.Semaphore(4)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    active_file: str = None


class OTPGenerateRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    session_id: str
    otp: str


@app.get("/api/health")
def read_health():
    return {"status": "Lumira Backend Online"}


@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    if not stt_model: raise HTTPException(503, "STT Offline")

    async with inference_lock:
        temp_path = f"temp_{random.randint(1000, 9999)}.wav"
        try:
            with open(temp_path, "wb") as b:
                shutil.copyfileobj(file.file, b)

            # DEBUG
            print(f"🎤 Audio Size: {os.path.getsize(temp_path)} bytes")

            # --- ACCURACY SETTINGS ---
            segments, _ = stt_model.transcribe(
                temp_path,
                vad_filter=False,  # Don't cut off quiet speech
                beam_size=5,  # Look for 5 possibilities (Smarter)
                initial_prompt="This is a user asking a technical question about a software project or exhibition."
                # Context Clue
            )

            text = " ".join([s.text for s in segments]).strip()
            print(f"📝 Transcribed: {text}")
            return {"text": text}
        except Exception as e:
            print(f"STT Error: {e}")
            return {"text": ""}
        finally:
            if os.path.exists(temp_path): os.remove(temp_path)


@app.get("/api/speak")
async def speak(text: str):
    VOICE = "en-US-AvaNeural"
    try:
        communicate = edge_tts.Communicate(text, VOICE, rate="+10%")
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        ask_lumira(request.message, request.active_file),
        media_type="text/plain"
    )


@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
    background_tasks.add_task(ingest_document, file_path)
    return {"status": "File uploaded successfully"}


@app.get("/api/files")
def list_files():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)
    try:
        return {"files": [
            {"name": f, "size": f"{os.path.getsize(os.path.join(upload_dir, f)) / 1024:.1f} KB", "status": "Active"} for
            f in os.listdir(upload_dir) if os.path.isfile(os.path.join(upload_dir, f))]}
    except:
        return {"files": []}


@app.delete("/api/files/{filename}")
def delete_file(filename: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
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


@app.post("/api/auth/otp/generate")
async def generate_otp(request: OTPGenerateRequest):
    email = request.email.lower().strip()
    if not rate_limiter.is_allowed(email): raise HTTPException(429, "Too many requests")
    session_id, otp = otp_manager.create_otp(email)
    if email_service.send_otp(email, otp):
        return {"success": True, "message": "OTP Sent", "session_id": session_id}
    raise HTTPException(500, "Email Failed")


@app.post("/api/auth/otp/verify")
async def verify_otp(request: OTPVerifyRequest):
    success, result = otp_manager.verify_otp(request.session_id, request.otp)
    if success: return {"success": True, "email": result}
    raise HTTPException(401, result)


frontend_path = "../frontend/dist"
if os.path.exists(frontend_path):
    print("✅ Frontend Build Found! Serving UI...")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)