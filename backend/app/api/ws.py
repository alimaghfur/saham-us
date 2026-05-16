"""WebSocket endpoint for real-time price updates via Finnhub."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Set

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import get_settings

router = APIRouter(tags=["websocket"])
log = logging.getLogger(__name__)
settings = get_settings()


class ConnectionManager:
    """Manage WebSocket connections and subscriptions."""

    def __init__(self):
        self.active_connections: dict[WebSocket, Set[str]] = {}
        self._finnhub_ws = None
        self._finnhub_task = None
        self._subscribed_symbols: Set[str] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = set()
        log.info("Client WebSocket connected. Total: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.pop(websocket, None)
        log.info("Client WebSocket disconnected. Total: %d", len(self.active_connections))

    def subscribe(self, websocket: WebSocket, symbols: list[str]):
        if websocket in self.active_connections:
            self.active_connections[websocket].update(s.upper() for s in symbols)

    def unsubscribe(self, websocket: WebSocket, symbols: list[str]):
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
        all_symbols: Set[str] = set()
        for symbols in self.active_connections.values():
            all_symbols.update(symbols)
        return all_symbols


manager = ConnectionManager()


async def finnhub_ws_listener():
    """Connect to Finnhub WebSocket and broadcast real-time trades to clients.
    
    If FINNHUB_API_KEY is not set, falls back to polling via Finnhub REST API.
    """
    if not settings.finnhub_api_key:
        log.warning("FINNHUB_API_KEY not set — using polling fallback for price updates")
        await _polling_fallback()
        return

    ws_url = f"wss://ws.finnhub.io?token={settings.finnhub_api_key}"
    subscribed: Set[str] = set()

    while True:
        try:
            import websockets
            async with websockets.connect(ws_url) as ws:
                log.info("Connected to Finnhub WebSocket (real-time trades)")

                while True:
                    # Check if we need to subscribe to new symbols
                    needed = manager.get_all_subscribed_symbols()
                    to_add = needed - subscribed
                    to_remove = subscribed - needed

                    for symbol in to_add:
                        await ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))
                        subscribed.add(symbol)
                        log.debug("Finnhub WS subscribed: %s", symbol)

                    for symbol in to_remove:
                        await ws.send(json.dumps({"type": "unsubscribe", "symbol": symbol}))
                        subscribed.discard(symbol)

                    # Receive messages with timeout
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                        data = json.loads(msg)

                        if data.get("type") == "trade" and data.get("data"):
                            for trade in data["data"]:
                                symbol = trade.get("s", "")
                                price = trade.get("p", 0)
                                volume = trade.get("v", 0)
                                timestamp = trade.get("t", 0)

                                await manager.broadcast_price(symbol, {
                                    "price": round(price, 2),
                                    "volume": volume,
                                    "timestamp": timestamp,
                                    "source": "finnhub_realtime",
                                })
                    except asyncio.TimeoutError:
                        # No message — just continue to check subscriptions
                        pass

        except ImportError:
            log.warning("websockets package not installed — falling back to polling")
            await _polling_fallback()
            return
        except Exception as e:
            log.error("Finnhub WebSocket error: %s — reconnecting in 5s", e)
            subscribed.clear()
            await asyncio.sleep(5)


async def _polling_fallback():
    """Fallback: poll Finnhub REST API every 5 seconds for price updates."""
    from app.adapters.finnhub_adapter import get_realtime_quote

    while True:
        try:
            symbols = manager.get_all_subscribed_symbols()
            for symbol in symbols:
                quote = await get_realtime_quote(symbol)
                if quote:
                    await manager.broadcast_price(symbol, {
                        "price": quote["price"],
                        "change": quote["change"],
                        "change_pct": quote["change_percent"],
                        "high": quote["high"],
                        "low": quote["low"],
                        "open": quote["open"],
                        "previous_close": quote["previous_close"],
                        "source": "finnhub_rest",
                    })
                # Small delay between symbols to respect rate limit
                await asyncio.sleep(0.5)
        except Exception as e:
            log.error("Polling fallback error: %s", e)

        await asyncio.sleep(5)


# Alias for main.py startup
price_feed_loop = finnhub_ws_listener


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
