"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ResQMap AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database — SQLite for dev, PostgreSQL for production
    DATABASE_URL: str = "sqlite:///./resqmap.db"
    # For PostgreSQL+PostGIS, set:
    # DATABASE_URL: str = "postgresql://user:pass@localhost:5432/resqmap"

    # JWT Auth
    SECRET_KEY: str = "resqmap-ai-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
