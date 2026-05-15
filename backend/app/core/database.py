"""Database engine and session management."""
from __future__ import annotations

import logging

log = logging.getLogger(__name__)

try:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.orm import DeclarativeBase

    from app.core.config import get_settings

    settings = get_settings()

    engine = create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
    )

    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    class Base(DeclarativeBase):
        """SQLAlchemy declarative base class."""
        pass

    async def get_db() -> AsyncSession:
        """Dependency that yields a database session."""
        async with async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def init_db() -> None:
        """Create all tables (for development/testing)."""
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("Database tables created")

    DB_AVAILABLE = True

except ImportError:
    log.warning("SQLAlchemy not installed — database features disabled")
    DB_AVAILABLE = False

    class Base:
        pass

    async def get_db():
        raise RuntimeError("Database not available — install sqlalchemy and aiosqlite")
        yield  # noqa

    async def init_db() -> None:
        log.warning("Skipping database init — SQLAlchemy not installed")
