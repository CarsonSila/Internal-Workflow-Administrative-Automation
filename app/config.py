import os
from functools import lru_cache
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Inuka Unified Beneficiary Intelligence API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # API
    API_V1_PREFIX: str = "/api/v1"
    ENABLE_API_V1: bool = True
    ENABLE_LEGACY_API: bool = True

    # CORS
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["*"])

    # Data
    MOCK_DATA_DIR: str = Field(default_factory=lambda: os.environ.get("MOCK_DATA_DIR", "/app/mock_data"))
    USE_DATABASE: bool = False
    DATABASE_URL: str = "sqlite:///./inuka_platform.db"

    # Cache
    USE_REDIS_CACHE: bool = False
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET_KEY: str = Field(default_factory=lambda: os.environ.get("JWT_SECRET_KEY", "kpc_inuka_secure_secret_key_2026"))
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Frontend fallback
    MOCK_DATA_FALLBACK: bool = True

    # File watcher
    INUKA_INCOMING_DIR: str = "incoming_registrations"
    INUKA_PROCESSED_DIR: str = "processed_registrations"

    @property
    def mock_data_path(self) -> str:
        path = self.MOCK_DATA_DIR
        if not os.path.exists(path):
            for fallback in ["/app/mock_data", "/workspace/scratch/mock_data", "mock_data", "./mock_data"]:
                if os.path.exists(fallback):
                    path = fallback
                    break
        return path


@lru_cache()
def get_settings() -> Settings:
    return Settings()