import edge_tts
from fastapi import HTTPException, Response


# --- Voice Presets (natural-sounding Neural voices) ---
VOICE_MAP = {
    "ava":       "en-US-AvaMultilingualNeural",
    "andrew":    "en-US-AndrewMultilingualNeural",
    "emma":      "en-US-EmmaMultilingualNeural",
    "brian":     "en-US-BrianMultilingualNeural",
    "jenny":     "en-US-JennyNeural",
    "aria":      "en-US-AriaNeural",
}

DEFAULT_VOICE = "ava"
RATE = "+5%"
PITCH = "+0Hz"


async def speak(text: str, voice: str | None = None):
    try:
        voice_key = (voice or DEFAULT_VOICE).lower()
        voice_name = VOICE_MAP.get(voice_key, VOICE_MAP[DEFAULT_VOICE])

        communicate = edge_tts.Communicate(
            text,
            voice_name,
            rate=RATE,
            pitch=PITCH,
        )
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(500, str(e))
