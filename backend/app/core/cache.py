"""Simple in-memory cache with optional Redis backend.

For MVP we use a TTL dict to keep the service runnable with zero
external dependencies. If REDIS_URL is reachable, Redis is used.
"""
from __future__ import annotations

import json
import time
from typing import Any, Optional

try:
    import redis  # type: ignore
except ImportError:  # pragma: no cover
    redis = None  # type: ignore

from app.core.config import get_settings


class _MemoryCache:
    """In-process fallback cache."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        item = self._store.get(key)
        if item is None:
            return None
        expires_at, value = item
        if time.time() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl: int) -> None:
        self._store[key] = (time.time() + ttl, value)


class Cache:
    """Unified cache with Redis + memory fallback."""

    def __init__(self) -> None:
        settings = get_settings()
        self._memory = _MemoryCache()
        self._redis: Optional[Any] = None
        if redis is not None and settings.redis_url:
            try:
                self._redis = redis.Redis.from_url(
                    settings.redis_url, decode_responses=True
                )
                self._redis.ping()
            except Exception:
                # Redis unreachable — silently fall back
                self._redis = None

    def get(self, key: str) -> Optional[Any]:
        if self._redis is not None:
            try:
                raw = self._redis.get(key)
                if raw is not None:
                    return json.loads(raw)
            except Exception:
                pass
        return self._memory.get(key)

    def set(self, key: str, value: Any, ttl: int) -> None:
        if self._redis is not None:
            try:
                self._redis.setex(key, ttl, json.dumps(value, default=str))
                return
            except Exception:
                pass
        self._memory.set(key, value, ttl)


_cache: Optional[Cache] = None


def get_cache() -> Cache:
    """Return singleton cache."""
    global _cache
    if _cache is None:
        _cache = Cache()
    return _cache
