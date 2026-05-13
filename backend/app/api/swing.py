"""Swing-trading scanner endpoints."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Query

from app.schemas.stock import SwingSetup
from app.services.scanners import get_scanner_service

router = APIRouter(prefix="/swing", tags=["swing"])

VALID_SETUPS = {"breakout", "pullback", "oversold_bounce", "golden_cross"}


@router.get("/scan", response_model=List[SwingSetup])
async def swing_scan(
    setup: str = Query(
        "breakout",
        description="One of: breakout, pullback, oversold_bounce, golden_cross",
    ),
    limit: int = Query(25, ge=1, le=100),
):
    """Return swing-trading setups detected in the default universe."""
    if setup not in VALID_SETUPS:
        return []
    return await get_scanner_service().swing_scan(setup=setup, limit=limit)


@router.get("/setups", response_model=List[str])
async def list_setups():
    """Return the setup types supported by the scanner."""
    return sorted(VALID_SETUPS)
