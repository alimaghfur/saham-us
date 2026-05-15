"""WebSocket endpoint for real-time price updates."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])
log = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections and subscriptions."""

    def __init__(self):
        self.active_connections: dict[WebSocket, Set[str]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = set()
        log.info("WebSocket connected. Total: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)
        log.info("WebSocket disconnected. Total: %d", len(self.active_connections))

    def subscribe(self, websocket: WebSocket, symbols: list[str]):
        """Subscribe a connection to symbol price updates."""
        if websocket in self.active_connections:
            self.active_connections[websocket].update(s.upper() for s in symbols)

    def unsubscribe(self, websocket: WebSocket, symbols: list[str]):
        """Unsubscribe from specific symbols."""
        if websocket in self.active_connections:
            for s in symbols:
                self.active_connections[websocket].discard(s.upper())

    async def broadcast_price(self, symbol: str, data: dict):
        """Send price update to all subscribers of this symbol."""
        symbol_upper = symbol.upper()
        disconnected = []
        for ws, subscribed_symbols in self.active_connections.items():
            if symbol_upper in subscribed_symbols:
                try:
                    await ws.send_json({"type": "price_update", "symbol": symbol_upper, "data": data})
                except Exception:
                    disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    def get_all_subscribed_symbols(self) -> Set[str]:
        """Get union of all subscribed symbols across connections."""
        all_symbols: Set[str] = set()
        for symbols in self.active_connections.values():
            all_symbols.update(symbols)
        return all_symbols


manager = ConnectionManager()


async def price_feed_loop():
    """Background task that fetches prices and broadcasts to subscribers."""
    import yfinance as yf

    while True:
        try:
            symbols = manager.get_all_subscribed_symbols()
            if symbols:
                # Fetch quotes in batch
                tickers_str = " ".join(symbols)
                tickers = yf.Tickers(tickers_str)
                for symbol in symbols:
                    try:
                        ticker = tickers.tickers.get(symbol)
                        if ticker:
                            info = ticker.fast_info
                            data = {
                                "price": round(getattr(info, "last_price", 0) or 0, 2),
                                "change": round(getattr(info, "last_price", 0) - getattr(info, "previous_close", 0), 2),
                                "change_pct": round(
                                    ((getattr(info, "last_price", 0) - getattr(info, "previous_close", 1))
                                     / max(getattr(info, "previous_close", 1), 0.01)) * 100, 2
                                ),
                                "volume": getattr(info, "last_volume", 0),
                            }
                            await manager.broadcast_price(symbol, data)
                    except Exception as e:
                        log.debug("Error fetching %s: %s", symbol, e)
        except Exception as e:
            log.error("Price feed error: %s", e)

        await asyncio.sleep(15)  # Update every 15 seconds


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    """WebSocket endpoint for real-time price streaming.

    Client sends JSON messages:
    - {"action": "subscribe", "symbols": ["AAPL", "MSFT"]}
    - {"action": "unsubscribe", "symbols": ["AAPL"]}

    Server sends:
    - {"type": "price_update", "symbol": "AAPL", "data": {"price": 150.25, ...}}
    """
    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                action = msg.get("action")
                symbols = msg.get("symbols", [])

                if action == "subscribe" and symbols:
                    manager.subscribe(websocket, symbols)
                    await websocket.send_json({
                        "type": "subscribed",
                        "symbols": [s.upper() for s in symbols],
                    })
                elif action == "unsubscribe" and symbols:
                    manager.unsubscribe(websocket, symbols)
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "symbols": [s.upper() for s in symbols],
                    })
                else:
                    await websocket.send_json({"type": "error", "message": "Invalid action"})
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
