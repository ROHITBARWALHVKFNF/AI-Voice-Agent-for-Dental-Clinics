
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str

    # AI configuration — secrets belong in .env
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    SARVAM_API_KEY: str = ""

    # Application configuration
    APP_NAME: str = "Dental AI Platform API"
    APP_ENV: str = "development"
    JWT_SECRET_KEY: str = "change-this-development-secret-key"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
