"""Telegram Alert endpoints."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.telegram_alert import (
    format_alert_message,
    check_alert_condition,
    generate_telegram_setup_instructions,
)

router = APIRouter(prefix="/telegram", tags=["telegram"])


class AlertConditionRequest(BaseModel):
    symbol: str
    condition: str = Field(description="above, below, change_pct_above, change_pct_below, rsi_above, rsi_below")
    value: float
    current_price: float
    rsi_value: Optional[float] = None
    change_pct: Optional[float] = None


class AlertCheckResponse(BaseModel):
    triggered: bool
    message: str
    symbol: str
    condition: str


class TelegramSetupResponse(BaseModel):
    title: str
    steps: List[Dict]
    supported_conditions: List[Dict]
    example_message: str


@router.get("/setup", response_model=TelegramSetupResponse)
async def get_telegram_setup():
    """
    Get Telegram bot setup instructions and supported alert conditions.
    """
    return generate_telegram_setup_instructions()


@router.post("/check-alert", response_model=AlertCheckResponse)
async def check_alert(request: AlertConditionRequest):
    """
    Check if an alert condition is triggered and return the formatted message.
    The frontend calls this to determine if a Telegram notification should be sent.
    """
    triggered = check_alert_condition(
        condition=request.condition,
        current_price=request.current_price,
        threshold=request.value,
        rsi_value=request.rsi_value,
        change_pct=request.change_pct,
    )

    message = ""
    if triggered:
        message = format_alert_message(
            symbol=request.symbol,
            condition=request.condition,
            current_value=request.current_price,
            threshold=request.value,
        )

    return AlertCheckResponse(
        triggered=triggered,
        message=message,
        symbol=request.symbol,
        condition=request.condition,
    )


@router.post("/format-message")
async def format_message(
    symbol: str,
    condition: str,
    current_value: float,
    threshold: float,
):
    """Format a Telegram alert message for preview."""
    msg = format_alert_message(symbol, condition, current_value, threshold)
    return {"message": msg}
