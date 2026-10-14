
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

audio_file = BASE_DIR / "patient_test.wav"

if not audio_file.exists():
    raise FileNotFoundError(
        "Record patient_test.wav first using the recording step."
    )

print("Sending audio to Sarvam STT...")

with audio_file.open("rb") as audio:
    response = client.speech_to_text.transcribe(
        file=audio,
        model="saaras:v3",
        mode="transcribe",
    )

print("\nRecognized speech:")
print(response.transcript)
