"""Menu access permissions model."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MenuAccess(Base):
    """Stores menu access permissions per role as JSON list of allowed paths."""

    __tablename__ = "menu_access"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    role: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    allowed_menus: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON array of paths
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
