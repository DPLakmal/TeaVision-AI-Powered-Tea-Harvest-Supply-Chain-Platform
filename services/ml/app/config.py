"""Configuration settings for the TeaVision ML Inference Service.

Uses Pydantic Settings to read configuration parameters from environment
variables or an optional .env file.
"""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application runtime configuration settings."""

    model_path: str = "/app/models/tea_grader.pt"
    model_arch: str = "mobilenetv3"
    model_version: str = "v1.0.0"
    num_classes: int = 3
    class_names: List[str] = ["high_quality", "medium_quality", "low_quality"]
    input_size: int = 224
    host: str = "0.0.0.0"
    port: int = 8000
    ml_env: str = "development"
    max_upload_size_mb: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Retrieve cached application settings instance.

    Returns:
        Settings: Singleton instance of the application settings.
    """
    return Settings()
