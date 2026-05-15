"""FastAPI application entrypoint."""
from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import (
    advanced, backtest, macro, market, ml_predict, opportunities, options,
    prediction, pro_features, quantitative, quant, scalping, score, screener,
    sentiment, stocks, swing, technicals, telegram, verdict,
)
from app.core.config import get_settings
from app.core.logging import configure_logging

configure_logging()
log = logging.getLogger(__name__)
settings = get_settings()

# --- Sentry integration (optional) ---
if settings.sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.1,
            environment="production",
        )
        log.info("Sentry initialized")
    except ImportError:
        log.warning("sentry-sdk not installed, skipping Sentry integration")

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description=(
        "Comprehensive US stock market analysis API. "
        "Covers fundamentals, technicals, screeners, and swing/scalping scanners."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Security middleware (rate limiting + headers)
from app.core.middleware import setup_security
setup_security(app)

# CORS — use configured origins (not wildcard in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Routers — all mounted under /api/v1
API_V1 = "/api/v1"

# Auth router
from app.api import auth
app.include_router(auth.router, prefix=API_V1)

app.include_router(stocks.router, prefix=API_V1)
app.include_router(market.router, prefix=API_V1)
app.include_router(technicals.router, prefix=API_V1)
app.include_router(screener.router, prefix=API_V1)
app.include_router(swing.router, prefix=API_V1)
app.include_router(scalping.router, prefix=API_V1)
app.include_router(macro.router, prefix=API_V1)
app.include_router(backtest.router, prefix=API_V1)
app.include_router(score.router, prefix=API_V1)
app.include_router(opportunities.router, prefix=API_V1)
app.include_router(advanced.router, prefix=API_V1)
app.include_router(quant.router, prefix=API_V1)
app.include_router(verdict.router, prefix=API_V1)
app.include_router(prediction.router, prefix=API_V1)
app.include_router(sentiment.router, prefix=API_V1)
app.include_router(ml_predict.router, prefix=API_V1)
app.include_router(options.router, prefix=API_V1)
app.include_router(quantitative.router, prefix=API_V1)
app.include_router(telegram.router, prefix=API_V1)
app.include_router(pro_features.router, prefix=API_V1)

# WebSocket router
from app.api import ws
app.include_router(ws.router)


@app.get("/", tags=["meta"])
async def root():
    """API landing page with links."""
    return {
        "name": settings.app_name,
        "version": __version__,
        "docs": "/docs",
        "health": "/health",
        "api_base": API_V1,
    }


@app.get("/health", tags=["meta"])
async def health():
    """Liveness check."""
    return {
        "status": "ok",
        "version": __version__,
    }


@app.on_event("startup")
async def on_startup() -> None:
    log.info("%s v%s starting up", settings.app_name, __version__)
    # Initialize database
    from app.core.database import init_db
    await init_db()
    log.info("Database initialized")
    # Start WebSocket price feed
    from app.api.ws import price_feed_loop
    asyncio.create_task(price_feed_loop())
    log.info("WebSocket price feed started")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    log.info("%s shutting down", settings.app_name)
