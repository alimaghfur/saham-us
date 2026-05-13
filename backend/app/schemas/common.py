"""Shared Pydantic schemas."""
from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiError(BaseModel):
    """Standard error response body."""

    detail: str
    code: Optional[str] = None


class Paginated(BaseModel, Generic[T]):
    """Simple page wrapper."""

    items: List[T]
    total: int
    page: int = 1
    page_size: int = 50
