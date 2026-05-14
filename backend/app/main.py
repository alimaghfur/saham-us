"""FastAPI application entrypoint."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import advanced, backtest, macro, market, opportunities, quant, scalping, score, screener, stocks, swing, technicals
from app.core.config import get_settings
from app.core.logging import configure_logging

configure_logging()
log = logging.getLogger(__name__)
settings = get_settings()

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — all mounted under /api/v1
API_V1 = "/api/v1"
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
    return {"status": "ok"}


@app.on_event("startup")
async def on_startup() -> None:
    log.info("%s v%s starting up", settings.app_name, __version__)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    log.info("%s shutting down", settings.app_name)
