
import os
import base64
from pathlib import Path

from dotenv import load_dotenv
from sarvamai import SarvamAI

load_dotenv(Path(__file__).resolve().parent / ".env")

api_key = os.getenv("SARVAM_API_KEY")
if not api_key:
    raise RuntimeError("SARVAM_API_KEY is missing from .env")

client = SarvamAI(api_subscription_key=api_key)
output_dir = Path(__file__).resolve().parent

text = (
    "नमस्ते! हमारे डेंटल क्लिनिक में आपका स्वागत है। "
    "मैं आपकी मदद के लिए यहाँ हूँ। "
    "क्या आप नई अपॉइंटमेंट बुक करना चाहते हैं, "
    "या अपनी मौजूदा अपॉइंटमेंट के बारे में पूछना चाहते हैं?"
)

speakers = ["shubh"]

for speaker in speakers:
    print(f"Generating voice sample: {speaker}")

    response = client.text_to_speech.convert(
        text=text,
        target_language_code="hi-IN",
        model="bulbul:v3",
        speaker="shubh",
        pace=0.95,
        temperature=0.7,
    )

    audio_bytes = base64.b64decode(response.audios[0])
    output_file = output_dir / f"receptionist_{speaker}.wav"
    output_file.write_bytes(audio_bytes)

    print(f"Saved: {output_file.name}")

print("All voice samples generated.")
