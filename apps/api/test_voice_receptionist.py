
import os
import base64
from pathlib import Path

import sounddevice as sd
import soundfile as sf
from dotenv import load_dotenv
from sarvamai import SarvamAI

from app.ai.receptionist_graph import receptionist_graph


# Load environment variables from apps/api/.env
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("SARVAM_API_KEY")

if not api_key:
    raise RuntimeError("SARVAM_API_KEY is missing from apps/api/.env")

client = SarvamAI(api_subscription_key=api_key)

MICROPHONE_ID = 1
SAMPLE_RATE = 16000

LANGUAGES = {
    "1": ("English", "en-IN"),
    "2": ("Hindi", "hi-IN"),
    "3": ("Marathi", "mr-IN"),
}

print("\n=== AI Dental Receptionist Voice Test ===")
print("1. English")
print("2. Hindi")
print("3. Marathi")

choice = input("Choose your language (1/2/3): ").strip()
language = LANGUAGES.get(choice)

if not language:
    raise ValueError("Please choose 1, 2, or 3.")

language_name, language_code = language

print(f"\nLanguage: {language_name}")
print("Speak after the recording prompt.")
print("Type 'exit' at the prompt to finish.\n")


def record_patient_audio():
    input("Press Enter to speak...")

    print("Recording for 6 seconds. Speak now!")

    audio = sd.rec(
        int(6 * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        device=MICROPHONE_ID,
    )
    sd.wait()

    audio_path = BASE_DIR / "patient_test.wav"
    sf.write(audio_path, audio, SAMPLE_RATE)

    print("Recording complete.")
    return audio_path


def transcribe_audio(audio_path):
    print("Recognizing your speech...")

    with audio_path.open("rb") as audio_file:
        result = client.speech_to_text.transcribe(
            file=audio_file,
            model="saaras:v3",
            mode="transcribe",
        )

    return result.transcript.strip()


def get_receptionist_answer(question):
    print("Gemini is preparing a response...")

    result = receptionist_graph.invoke({
        "question": question,
        "answer": "",
    })

    return result["answer"].strip()


def speak_answer(text):
    print(f"\nReceptionist: {text}")
    print("Generating speech...")

    result = client.text_to_speech.convert(
        text=text,
        target_language_code=language_code,
        model="bulbul:v3",
        speaker="shubh",
        pace=1.0,
        temperature=0.6,
    )

    audio_bytes = base64.b64decode(result.audios[0])
    output_path = BASE_DIR / "receptionist_reply.wav"
    output_path.write_bytes(audio_bytes)

    speech, sample_rate = sf.read(output_path, dtype="float32")

    print("Playing receptionist voice...")
    sd.play(speech, sample_rate)
    sd.wait()


while True:
    try:
        command = input(
            "\nPress Enter to talk, or type 'exit' to stop: "
        ).strip().lower()

        if command == "exit":
            print("Voice test finished.")
            break

        audio_path = record_patient_audio()
        patient_text = transcribe_audio(audio_path)

        if not patient_text:
            print("I couldn't recognize speech. Please try again.")
            continue

        print(f"\nYou said: {patient_text}")

        answer = get_receptionist_answer(patient_text)
        speak_answer(answer)

    except KeyboardInterrupt:
        print("\nVoice test stopped.")
        break

    except Exception as error:
        print(f"\nError: {type(error).__name__}: {error}")
        print("Check the error above before trying again.")
