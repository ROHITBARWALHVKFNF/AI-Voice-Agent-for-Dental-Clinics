
from pathlib import Path
import sounddevice as sd
import soundfile as sf
import numpy as np

BASE_DIR = Path(__file__).resolve().parent

duration = 6
sample_rate = 16000
device_id = 1  # Realtek microphone

print("Selected microphone:")
print(sd.query_devices(device_id))

input("Press Enter, then speak clearly for 6 seconds...")

print("Recording now. Speak!")
audio = sd.rec(
    int(duration * sample_rate),
    samplerate=sample_rate,
    channels=1,
    dtype="float32",
    device=device_id,
)
sd.wait()

peak = float(np.max(np.abs(audio)))
rms = float(np.sqrt(np.mean(audio ** 2)))

output_file = BASE_DIR / "patient_test.wav"
sf.write(output_file, audio, sample_rate)

print(f"\nSaved: {output_file}")
print(f"Peak volume: {peak:.5f}")
print(f"Average volume (RMS): {rms:.5f}")

if peak < 0.005:
    print("WARNING: Very little microphone audio detected.")
else:
    print("Audio detected successfully.")
