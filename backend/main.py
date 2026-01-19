# main.py - Updated with OTP authentication
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
import uvicorn
import shutil
import os
import sys
import edge_tts

# Import OTP components
from auth import otp_manager, email_service, rate_limiter

# NEW IMPORTS FOR DELETION
from langchain_chroma import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bot import ask_lumira
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


# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    active_file: str = None


class OTPGenerateRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    session_id: str
    otp: str


# --- EXISTING ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "Lumira Backend Online"}


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"📩 Received: {request.message} (Context: {request.active_file})")
    return StreamingResponse(
        ask_lumira(request.message, request.active_file),
        media_type="text/plain"
    )


@app.get("/api/speak")
async def speak(text: str):
    """
    Generates high-quality Neural speech and streams it to the client.
    """
    VOICE = "en-GB-SoniaNeural"

    async def audio_stream():
        communicate = edge_tts.Communicate(text, VOICE, rate="+30%")
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(audio_stream(), media_type="audio/mpeg")


@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"📂 Saved file: {file_path}")
    background_tasks.add_task(ingest_document, file_path)

    return {"status": "File uploaded successfully. Indexing in progress..."}


@app.get("/api/files")
def list_files():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "Dataset")
    os.makedirs(upload_dir, exist_ok=True)

    files_list = []
    try:
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            if os.path.isfile(file_path):
                size_kb = os.path.getsize(file_path) / 1024
                files_list.append({
                    "name": filename,
                    "size": f"{size_kb:.1f} KB",
                    "status": "Active"
                })
    except Exception as e:
        print(f"Error reading files: {e}")
        return {"files": []}

    return {"files": files_list}


@app.delete("/api/files/{filename}")
def delete_file(filename: str):
    print(f"🗑️ Request to delete: {filename}")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "Dataset")
    file_path = os.path.join(upload_dir, filename)
    db_path = os.path.join(base_dir, "chroma_db")

    # 1. Delete from Disk (Dataset folder)
    if os.path.exists(file_path):
        os.remove(file_path)
        print("✅ File removed from disk.")
    else:
        print("⚠️ File not found on disk, checking DB anyway...")

    # 2. Delete from Vector Database (ChromaDB)
    try:
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        vector_store = Chroma(
            persist_directory=db_path,
            embedding_function=embeddings
        )

        vector_store.delete(where={"source": file_path})
        print(f"✅ Vectors deleted for: {filename}")

    except Exception as e:
        print(f"❌ Error deleting from DB: {e}")
        return {"status": "Error deleting from database", "details": str(e)}

    return {"status": f"Deleted {filename} successfully"}


# --- NEW OTP AUTHENTICATION ENDPOINTS ---

@app.post("/api/auth/otp/generate")
async def generate_otp(request: OTPGenerateRequest):
    """
    Generate and send OTP to exhibitor email
    """
    email = request.email.lower().strip()

    # Rate limiting check
    if not rate_limiter.is_allowed(email):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again in 10 minutes."
        )

    try:
        # Generate OTP
        session_id, otp = otp_manager.create_otp(email)

        # Send email
        success = email_service.send_otp(email, otp)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Please try again."
            )

        print(f"✅ OTP sent to {email}: {otp}")  # Remove in production!

        return {
            "success": True,
            "message": f"Verification code sent to {email}",
            "session_id": session_id
        }

    except Exception as e:
        print(f"❌ OTP generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error. Please try again."
        )


@app.post("/api/auth/otp/verify")
async def verify_otp(request: OTPVerifyRequest):
    """
    Verify OTP and authenticate exhibitor
    """
    try:
        success, result = otp_manager.verify_otp(
            request.session_id,
            request.otp
        )

        if success:
            # Result is the email when successful
            email = result
            print(f"✅ User authenticated: {email}")

            return {
                "success": True,
                "message": "Authentication successful",
                "email": email
            }
        else:
            # Result is error message when failed
            raise HTTPException(
                status_code=401,
                detail=result
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ OTP verification error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error. Please try again."
        )


# --- Optional: Check OTP status ---
@app.get("/api/auth/status")
async def auth_status():
    """
    Get current OTP system status (for debugging)
    """
    return {
        "active_sessions": len(otp_manager.otp_store),
        "rate_limiter_entries": len(rate_limiter.requests)
    }


if __name__ == "__main__":
    print("🚀 Starting Lumira Backend with OTP Authentication...")
    print("📧 Make sure to set SMTP_EMAIL and SMTP_PASSWORD in .env file")
    uvicorn.run(app, host="0.0.0.0", port=8000)