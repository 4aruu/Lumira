import re
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


def _clean_text_for_tts(text: str) -> str:
    """Sanitize text to prevent voice pitch/tone changes in edge-tts.

    Removes markdown, code artifacts, special symbols, and excessive
    punctuation that cause the neural voice to switch to a 'bulky'
    or robotic tone mid-sentence.
    """
    if not text:
        return text

    cleaned = text

    # Strip markdown: headers, bold, italic, code blocks, links
    cleaned = re.sub(r'#{1,6}\s*', '', cleaned)       # ## Headers
    cleaned = re.sub(r'\*{1,3}(.+?)\*{1,3}', r'\1', cleaned)  # **bold** / *italic*
    cleaned = re.sub(r'`{1,3}[^`]*`{1,3}', '', cleaned)       # `code` / ```blocks```
    cleaned = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cleaned) # [links](url)

    # Strip bullet points and list markers
    cleaned = re.sub(r'^[\s]*[-•*]\s+', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^\s*\d+\.\s+', '', cleaned, flags=re.MULTILINE)

    # Remove special characters that confuse TTS engines
    cleaned = re.sub(r'[{}()\[\]<>|\\/@#$%^&*_~=+]', ' ', cleaned)

    # Remove excessive punctuation (more than 2 in a row)
    cleaned = re.sub(r'([.!?]){2,}', r'\1', cleaned)

    # Collapse multiple spaces and trim
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    # Remove leading/trailing punctuation-only fragments
    cleaned = re.sub(r'^\s*[.,:;!?]+\s*', '', cleaned)

    return cleaned


async def speak(text: str, voice: str | None = None):
    try:
        # Always resolve voice consistently
        voice_key = (voice or DEFAULT_VOICE).lower().strip()
        voice_name = VOICE_MAP.get(voice_key, VOICE_MAP[DEFAULT_VOICE])

        # Clean the text to prevent voice tone changes
        cleaned_text = _clean_text_for_tts(text)

        if not cleaned_text:
            # Nothing to say after cleaning
            return Response(content=b"", media_type="audio/mpeg")

        communicate = edge_tts.Communicate(
            cleaned_text,
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
