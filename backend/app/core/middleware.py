"""Security middleware and rate limiting."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


def setup_security(app: FastAPI) -> None:
    """Configure security middleware and rate limiting on the FastAPI app."""
    # Rate limiting (optional — requires slowapi)
    try:
        from slowapi import Limiter, _rate_limit_exceeded_handler
        from slowapi.errors import RateLimitExceeded
        from slowapi.util import get_remote_address

        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=[f"{settings.rate_limit_per_minute}/minute"],
        )
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        log.info("Rate limiting enabled: %d req/min", settings.rate_limit_per_minute)
    except ImportError:
        log.warning("slowapi not installed — rate limiting disabled")

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)
