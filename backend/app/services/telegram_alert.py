"""Telegram Alert service.

Provides integration with Telegram Bot API for sending price alerts.
Users configure their bot token and chat ID, then set alert conditions.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
import json
import os


@dataclass
class AlertCondition:
    """Alert condition definition."""
    id: str
    symbol: str
    condition: str  # "above", "below", "change_pct_above", "change_pct_below", "rsi_above", "rsi_below"
    value: float
    message: Optional[str] = None
    triggered: bool = False
    created_at: str = ""
    triggered_at: Optional[str] = None


@dataclass
class TelegramConfig:
    """Telegram bot configuration."""
    bot_token: str
    chat_id: str
    enabled: bool = True


@dataclass
class AlertMessage:
    """Formatted alert message."""
    text: str
    symbol: str
    condition: str
    current_value: float
    threshold: float


def format_alert_message(
    symbol: str,
    condition: str,
    current_value: float,
    threshold: float,
    price: Optional[float] = None,
) -> str:
    """Format a Telegram alert message with emojis and details."""
    emoji_map = {
        "above": "🚀",
        "below": "🔻",
        "change_pct_above": "📈",
        "change_pct_below": "📉",
        "rsi_above": "⚠️",
        "rsi_below": "💡",
    }

    condition_text = {
        "above": f"di atas ${threshold:.2f}",
        "below": f"di bawah ${threshold:.2f}",
        "change_pct_above": f"naik {threshold:.1f}%",
        "change_pct_below": f"turun {threshold:.1f}%",
        "rsi_above": f"RSI di atas {threshold:.0f} (overbought)",
        "rsi_below": f"RSI di bawah {threshold:.0f} (oversold)",
    }

    emoji = emoji_map.get(condition, "🔔")
    cond_text = condition_text.get(condition, f"{condition}: {threshold}")

    msg = (
        f"{emoji} *ALERT: {symbol}*\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📊 Kondisi: {cond_text}\n"
        f"💰 Harga saat ini: ${current_value:.2f}\n"
        f"⏰ Waktu: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC\n"
        f"━━━━━━━━━━━━━━━\n"
        f"_Saham-US Alert System_"
    )
    return msg


def check_alert_condition(
    condition: str,
    current_price: float,
    threshold: float,
    rsi_value: Optional[float] = None,
    change_pct: Optional[float] = None,
) -> bool:
    """Check if alert condition is met."""
    if condition == "above":
        return current_price >= threshold
    elif condition == "below":
        return current_price <= threshold
    elif condition == "change_pct_above":
        return (change_pct or 0) >= threshold
    elif condition == "change_pct_below":
        return (change_pct or 0) <= -abs(threshold)
    elif condition == "rsi_above":
        return (rsi_value or 50) >= threshold
    elif condition == "rsi_below":
        return (rsi_value or 50) <= threshold
    return False


def generate_telegram_setup_instructions() -> Dict:
    """Return instructions for setting up Telegram alerts."""
    return {
        "title": "Setup Telegram Alerts",
        "steps": [
            {
                "step": 1,
                "title": "Buat Bot Telegram",
                "description": "Chat @BotFather di Telegram, ketik /newbot, ikuti instruksi.",
                "detail": "Simpan token yang diberikan (format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz).",
            },
            {
                "step": 2,
                "title": "Dapatkan Chat ID",
                "description": "Chat @userinfobot di Telegram untuk melihat chat ID kamu.",
                "detail": "Chat ID berupa angka seperti: 123456789.",
            },
            {
                "step": 3,
                "title": "Konfigurasi di Settings",
                "description": "Masukkan Bot Token dan Chat ID di halaman Settings.",
                "detail": "Alerts akan dikirim otomatis ke Telegram kamu saat kondisi terpenuhi.",
            },
            {
                "step": 4,
                "title": "Set Alert",
                "description": "Pilih saham, kondisi (harga di atas/bawah, RSI, % change), dan threshold.",
                "detail": "Kamu bisa set unlimited alerts untuk berbagai saham.",
            },
        ],
        "supported_conditions": [
            {"id": "above", "label": "Harga di atas", "description": "Alert ketika harga naik ke level tertentu"},
            {"id": "below", "label": "Harga di bawah", "description": "Alert ketika harga turun ke level tertentu"},
            {"id": "change_pct_above", "label": "Naik %", "description": "Alert ketika saham naik X% dalam sehari"},
            {"id": "change_pct_below", "label": "Turun %", "description": "Alert ketika saham turun X% dalam sehari"},
            {"id": "rsi_above", "label": "RSI Overbought", "description": "Alert ketika RSI di atas threshold"},
            {"id": "rsi_below", "label": "RSI Oversold", "description": "Alert ketika RSI di bawah threshold"},
        ],
        "example_message": format_alert_message("AAPL", "above", 185.50, 180.00),
    }
