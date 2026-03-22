import os
import shutil
import random

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from services.stt_service import stt_model, inference_lock
from services.tts_service import speak as tts_speak
from bot import ask_lumira
import analytics

router = APIRouter()

# --- Helpers ---
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _dataset_exists(filename: str) -> bool:
    """Check if a dataset file exists on disk."""
    if not filename:
        return True  # No filter = global chat, always allowed
    return os.path.isfile(os.path.join(_BASE_DIR, "Dataset", filename))


@router.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    if not stt_model: raise HTTPException(503, "STT Offline")

    async with inference_lock:
        # Preserve original file extension for correct FFmpeg/Whisper decoding
        # iOS sends .mp4, Chrome sends .webm, fallback to .wav
        original_name = file.filename or "audio.wav"
        ext = original_name.rsplit(".", 1)[-1] if "." in original_name else "wav"
        temp_path = f"temp_{random.randint(1000, 9999)}.{ext}"
        try:
            with open(temp_path, "wb") as b:
                shutil.copyfileobj(file.file, b)

            # DEBUG
            print(f"🎤 Audio ({ext}): {os.path.getsize(temp_path)} bytes")

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


@router.get("/api/speak")
async def speak(text: str, voice: str | None = None):
    return await tts_speak(text, voice)


@router.post("/api/chat")
async def chat_endpoint(request: ChatRequest, background_tasks: BackgroundTasks):
    # --- Validate dataset still exists ---
    if request.active_file and not _dataset_exists(request.active_file):
        raise HTTPException(
            404,
            f"Dataset \"{request.active_file}\" no longer exists. It may have been deleted."
        )

    # Log user message in background (non-blocking)
    if request.active_file:
        background_tasks.add_task(analytics.log_message, None, request.active_file, "user")
        background_tasks.add_task(analytics.log_message, None, request.active_file, "ai")
    return StreamingResponse(
        ask_lumira(request.message, request.active_file),
        media_type="text/plain"
    )
