
from google import genai
from app.core.config import settings


def main():
    if not settings.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is missing. Check apps/api/.env"
        )

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents="You are testing a dental clinic AI receptionist. "
                 "Reply with: Gemini connection successful."
    )

    print("Gemini response:")
    print(response.text)


if __name__ == "__main__":
    main()
