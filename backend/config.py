"""
Pydantic Settings — AI Hiring OS Master Prompt V2.0
All environment variables required. No optional config in production.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from .env file.
    CRITICAL: All values must be defined. No defaults except where noted.
    """

    # ============================================================
    # DATABASE
    # ============================================================
    DATABASE_URL: str
    """PostgreSQL connection string: postgresql://user:password@localhost:5432/hiring_os"""

    # ============================================================
    # REDIS
    # ============================================================
    REDIS_URL: str = "redis://localhost:6379/0"
    """Redis connection for sessions, caching, job queue"""

    # ============================================================
    # AUTHENTICATION
    # ============================================================
    JWT_SECRET: str
    """Secret key for JWT signing. Generate with: openssl rand -hex 32"""

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ============================================================
    # AI/LLM
    # ============================================================
    ANTHROPIC_API_KEY: str
    """Anthropic Claude API key for LLM calls"""

    LLM_MODEL: str = "claude-sonnet-4-20250514"
    """Claude model to use for all LLM operations"""
    GROQ_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    CHROMA_PERSIST_DIR: str = "/tmp/chroma"

    # ============================================================
    # DOCKER (for VM sessions)
    # ============================================================
    DOCKER_SOCKET: str = "/var/run/docker.sock"
    """Docker daemon socket (Linux) or npipe (Windows)"""

    VM_IMAGE_NAME: str = "hiring-vm:latest"
    """Pre-built Docker image for VM test sessions"""

    VM_PORT_RANGE_START: int = 8100
    VM_PORT_RANGE_END: int = 9000
    """Port range for VM container assignment"""
    WORKSPACE_BASE_PATH: str = "/tmp/workspaces"
    VM_POOL_SIZE: int = 4
    MAX_SESSION_DURATION_MINUTES: int = 90
    IDLE_TIMEOUT_MINUTES: int = 20

    # ============================================================
    # FILE STORAGE
    # ============================================================
    UPLOAD_DIR: str = "/uploads"
    """Local directory for resume PDFs and uploads"""

    MAX_UPLOAD_SIZE_MB: int = 10
    """Maximum file upload size in MB"""

    # ============================================================
    # ENVIRONMENT
    # ============================================================
    ENVIRONMENT: str = "development"
    """'development' | 'staging' | 'production'"""

    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    CORS_ORIGINS: str = "http://localhost:3000"
    """Comma-separated list of allowed origins"""

    # ============================================================
    # EXTERNAL APIs
    # ============================================================
    ADZUNA_APP_ID: Optional[str] = None
    """Adzuna API app ID (free tier: 1000 req/day)"""

    ADZUNA_API_KEY: Optional[str] = None
    """Adzuna API key"""

    # ============================================================
    # EMBEDDING MODEL
    # ============================================================
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    """sentence-transformers model for embeddings (loads locally)"""

    # ============================================================
    # KAGGLE (for downloading datasets)
    # ============================================================
    KAGGLE_USERNAME: Optional[str] = None
    KAGGLE_KEY: Optional[str] = None

    # ============================================================
    # DATA DIRECTORIES
    # ============================================================
    DATA_RAW_DIR: str = "/data/raw"
    """Downloaded CSVs from Kaggle, IMF, PwC"""

    DATA_PROCESSED_DIR: str = "/data/processed"
    """Processed/normalized data"""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"  # Allow extra fields from .env


settings = Settings()
