"""
PostgreSQL Database Layer — SQLAlchemy + Alembic
Master Prompt V2.0 Compliance

This module sets up:
1. SQLAlchemy async engine connected to PostgreSQL
2. Async session factory for dependency injection
3. Declarative base for ORM models
4. pgvector extension for embeddings
"""

import logging
from typing import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.orm import declarative_base

from config import settings

logger = logging.getLogger(__name__)

# ============================================================
# Async Engine & Session Configuration
# ============================================================

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=20,
    max_overflow=40,
    pool_recycle=3600,   # Recycle connections every hour
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def init_db():
    """
    Initialize the database:
    1. Create pgvector extension
    2. Verify connection
    
    Note: Tables should be created via Alembic migrations in production.
    """
    try:
        async with engine.begin() as conn:
            # Enable pgvector extension
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("✅ pgvector extension ready")
    except Exception as e:
        logger.warning(f"⚠️  pgvector extension setup: {e}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Async dependency injection function for FastAPI endpoints.
    
    Usage in FastAPI:
        @app.get("/example")
        async def read_example(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def close_db():
    """Close all database connections."""
    await engine.dispose()
    logger.info("Database connections closed")
