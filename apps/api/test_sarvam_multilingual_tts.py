
import os
import base64
from pathlib import Path

from dotenv import load_dotenv
from sarvamai import SarvamAI

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("SARVAM_API_KEY")
if not api_key:
    raise RuntimeError("SARVAM_API_KEY is missing from .env")

client = SarvamAI(api_subscription_key=api_key)

samples = [
    {
        "language": "hi-IN",
        "name": "Hindi",
        "text": "नमस्ते! हमारे डेंटल क्लिनिक में आपका स्वागत है। "
                "मैं आपकी अपॉइंटमेंट बुक करने में मदद कर सकता हूँ।",
    },
    {
        "language": "mr-IN",
        "name": "Marathi",
        "text": "नमस्कार! आमच्या डेंटल क्लिनिकमध्ये आपले स्वागत आहे. "
                "मी तुम्हाला अपॉइंटमेंट बुक करण्यासाठी मदत करू शकतो.",
    },
    {
        "language": "en-IN",
        "name": "English",
        "text": "Hello! Welcome to our dental clinic. "
                "I can help you book an appointment. "
                "Would you prefer a morning or an afternoon appointment?",
    },
]

for sample in samples:
    print(f"Generating {sample['name']} voice...")

    response = client.text_to_speech.convert(
        text=sample["text"],
        target_language_code=sample["language"],
        model="bulbul:v3",
        speaker="shubh",
        pace=1.0,
        temperature=0.6,
    )

    audio_bytes = base64.b64decode(response.audios[0])
    output_file = BASE_DIR / f"receptionist_{sample['language']}.wav"
    output_file.write_bytes(audio_bytes)

    print(f"Saved: {output_file.name}")

print("All multilingual samples generated successfully.")
