import asyncio
from faster_whisper import WhisperModel

# --- STT MODEL INITIALIZATION ---
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
