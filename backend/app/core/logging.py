"""Structured logging setup."""
from __future__ import annotations

import logging
import sys

from app.core.config import get_settings


def configure_logging() -> None:
    """Configure root logger with level from settings."""
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
        stream=sys.stdout,
    )
