import edge_tts
from fastapi import HTTPException, Response


VOICE = "en-US-AvaNeural"
RATE = "+15%"
PITCH = "+3Hz"


async def speak(text: str):
    try:
        communicate = edge_tts.Communicate(
            text,
            VOICE,
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
