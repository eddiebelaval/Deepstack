"""
CryExc WebSocket Client - Real-Time Exchange Data

Connects to a CryExc server for sub-second trade data, orderbook depth,
liquidations, and CVD (Cumulative Volume Delta) from exchanges like
Binance, Bybit, and OKX.

Follows the PriceFeed subscriber pattern from price_feed.py but acts as
a WebSocket *consumer* (client) rather than a server.

Protocol (CryExc server):
    Subscribe: {"type": "stream_subscribe", "stream": "<name>", "config": {...}}
    Batch:     {"type": "stream_subscribe_batch", "subscriptions": [...]}
    Ping:      {"type": "ping"} / {"type": "pong"}

    Inbound messages from server:
    - {"type": "trade", "data": {exchange, symbol, price, quantity, quoteQty, isBuyerMaker, timestamp}}
    - {"type": "liquidation", "data": {exchange, symbol, side, price, quantity, notionalUsd, timestamp}}
    - {"type": "orderbook_stats", "data": {exchange, symbol, bestBid, bestAsk, midPrice, spread, ...}}
    - {"type": "subscribed", "stream": "...", "config": {...}}
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import websockets
from websockets.exceptions import ConnectionClosed, InvalidURI

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class CryExcTrade:
    """Single trade event from an exchange."""
    symbol: str
    exchange: str
    price: float
    quantity: float
    side: str  # "buy" or "sell"
    timestamp: float  # unix ms
    notional: float = 0.0  # price * quantity

    def __post_init__(self):
        if self.notional == 0.0:
            self.notional = self.price * self.quantity


@dataclass
class CryExcLiquidation:
    """Liquidation event from an exchange."""
    symbol: str
    exchange: str
    side: str  # "long" or "short"
    quantity: float
    price: float
    notional: float
    timestamp: float


@dataclass
class CryExcCVD:
    """Cumulative Volume Delta snapshot."""
    symbol: str
    exchange: str
    cvd: float  # positive = net buying, negative = net selling
    buy_volume: float
    sell_volume: float
    interval_seconds: int
    timestamp: float


@dataclass
class CryExcOrderbookStats:
    """Aggregated orderbook depth statistics."""
    symbol: str
    exchange: str
    bid_depth: float  # total bid notional within N levels
    ask_depth: float
    spread: float  # best ask - best bid
    mid_price: float
    best_bid: float
    best_ask: float
    timestamp: float


# ---------------------------------------------------------------------------
# WebSocket Client
# ---------------------------------------------------------------------------

# Default reconnect parameters
DEFAULT_RECONNECT_BASE_SECONDS = 1.0
DEFAULT_RECONNECT_MAX_SECONDS = 30.0
DEFAULT_PING_INTERVAL_SECONDS = 15.0


class CryExcClient:
    """
    Async WebSocket client for a CryExc real-time exchange data server.

    Manages connection lifecycle, subscriptions, and message dispatch.
    Reconnects automatically with exponential backoff on disconnect.

    Example:
        >>> client = CryExcClient("ws://localhost:8086/ws")
        >>> client.on_trade(my_trade_handler)
        >>> await client.connect()
        >>> await client.listen_loop()  # runs until disconnect
    """

    def __init__(
        self,
        url: str,
        reconnect_base: float = DEFAULT_RECONNECT_BASE_SECONDS,
        reconnect_max: float = DEFAULT_RECONNECT_MAX_SECONDS,
        ping_interval: float = DEFAULT_PING_INTERVAL_SECONDS,
    ):
        self.url = url
        self._reconnect_base = reconnect_base
        self._reconnect_max = reconnect_max
        self._ping_interval = ping_interval

        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._running = False
        self._connected = False
        self._reconnect_attempt = 0

        # Callbacks per message type
        self._trade_callbacks: List[Callable[[CryExcTrade], None]] = []
        self._liquidation_callbacks: List[Callable[[CryExcLiquidation], None]] = []
        self._cvd_callbacks: List[Callable[[CryExcCVD], None]] = []
        self._orderbook_callbacks: List[Callable[[CryExcOrderbookStats], None]] = []

        # Pending subscriptions (sent on connect/reconnect)
        self._subscriptions: List[Dict[str, Any]] = []

        logger.info(f"CryExcClient created: {url}")

    # -- Callback registration -----------------------------------------------

    def on_trade(self, callback: Callable[[CryExcTrade], None]) -> None:
        self._trade_callbacks.append(callback)

    def on_liquidation(self, callback: Callable[[CryExcLiquidation], None]) -> None:
        self._liquidation_callbacks.append(callback)

    def on_cvd(self, callback: Callable[[CryExcCVD], None]) -> None:
        self._cvd_callbacks.append(callback)

    def on_orderbook_stats(self, callback: Callable[[CryExcOrderbookStats], None]) -> None:
        self._orderbook_callbacks.append(callback)

    # -- Connection management -----------------------------------------------

    async def connect(self) -> bool:
        """Open WebSocket connection. Returns True on success."""
        try:
            self._ws = await websockets.connect(
                self.url,
                ping_interval=None,  # We manage our own pings
                close_timeout=5,
            )
            self._connected = True
            self._reconnect_attempt = 0
            logger.info(f"CryExc connected: {self.url}")

            # Re-send pending subscriptions after (re)connect
            if self._subscriptions:
                await self._send_subscriptions()

            return True
        except (OSError, InvalidURI, ConnectionRefusedError) as e:
            logger.warning(f"CryExc connect failed: {e}")
            self._connected = False
            return False

    async def disconnect(self) -> None:
        """Gracefully close the connection."""
        self._running = False
        self._connected = False
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
        logger.info("CryExc disconnected")

    @property
    def is_connected(self) -> bool:
        return self._connected and self._ws is not None and self._ws.open

    # -- Subscriptions -------------------------------------------------------

    # Map our logical channel names to CryExc server stream names
    _CHANNEL_TO_STREAM = {
        "trades": "trade",
        "liquidations": "liquidation",
        "orderbook_stats": "orderbook_stats",
    }

    async def subscribe(
        self,
        symbol: str,
        channels: Optional[List[str]] = None,
        exchanges: Optional[List[str]] = None,
        min_notional_trade: float = 0,
        min_notional_liq: float = 0,
    ) -> None:
        """
        Subscribe to streams for a symbol using CryExc protocol.

        Translates our channel list into CryExc stream_subscribe_batch format.
        CVD is derived from trade data, so we skip the CVD stream subscription.

        Args:
            symbol: e.g. "BTCUSDT"
            channels: list of "trades", "liquidations", "orderbook_stats"
            exchanges: filter to specific exchanges, or [] for all
            min_notional_trade: min trade size to relay
            min_notional_liq: min liquidation size to relay
        """
        channels = channels or ["trades", "liquidations", "orderbook_stats"]

        subs = []
        for channel in channels:
            stream = self._CHANNEL_TO_STREAM.get(channel, channel)
            config: Dict[str, Any] = {"symbol": symbol}
            if exchanges:
                config["exchanges"] = exchanges
            # Per-stream notional filters
            if stream == "trade" and min_notional_trade > 0:
                config["minNotional"] = min_notional_trade
            elif stream == "liquidation" and min_notional_liq > 0:
                config["minNotional"] = min_notional_liq
            subs.append({"stream": stream, "config": config})

        self._subscriptions.extend(subs)

        if self.is_connected:
            batch_msg = {
                "type": "stream_subscribe_batch",
                "subscriptions": subs,
            }
            await self._ws.send(json.dumps(batch_msg))
            logger.debug(f"Subscribed: {symbol} [{', '.join(channels)}]")

    async def _send_subscriptions(self) -> None:
        """Re-send all pending subscriptions as a batch (after reconnect)."""
        try:
            batch_msg = {
                "type": "stream_subscribe_batch",
                "subscriptions": self._subscriptions,
            }
            await self._ws.send(json.dumps(batch_msg))
        except Exception as e:
            logger.warning(f"Failed to re-subscribe: {e}")

    # -- Main listen loop ----------------------------------------------------

    async def listen_loop(self) -> None:
        """
        Main loop: receive messages, dispatch to callbacks, reconnect on failure.

        Runs until disconnect() is called or _running is set to False.
        """
        self._running = True

        while self._running:
            if not self.is_connected:
                await self._reconnect()
                if not self.is_connected:
                    continue

            try:
                # Start ping task alongside message receive
                ping_task = asyncio.create_task(self._ping_loop())

                async for raw in self._ws:
                    if not self._running:
                        break
                    self._dispatch_message(raw)

                ping_task.cancel()

            except ConnectionClosed as e:
                logger.warning(f"CryExc connection closed: {e.code} {e.reason}")
                self._connected = False
            except Exception as e:
                logger.error(f"CryExc listen error: {e}")
                self._connected = False

        logger.info("CryExc listen loop ended")

    async def _ping_loop(self) -> None:
        """Send periodic pings to keep the connection alive."""
        try:
            while self._running and self.is_connected:
                await asyncio.sleep(self._ping_interval)
                if self.is_connected:
                    try:
                        await self._ws.send(json.dumps({"type": "ping"}))
                    except Exception:
                        break
        except asyncio.CancelledError:
            pass

    async def _reconnect(self) -> None:
        """Exponential backoff reconnection."""
        delay = min(
            self._reconnect_base * (2 ** self._reconnect_attempt),
            self._reconnect_max,
        )
        self._reconnect_attempt += 1
        logger.info(
            f"CryExc reconnecting in {delay:.1f}s "
            f"(attempt {self._reconnect_attempt})"
        )
        await asyncio.sleep(delay)
        await self.connect()

    # -- Message dispatch ----------------------------------------------------

    def _dispatch_message(self, raw: str) -> None:
        """Parse JSON message and route to appropriate callbacks."""
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            logger.debug(f"CryExc non-JSON message: {raw[:100]}")
            return

        msg_type = msg.get("type", "")
        data = msg.get("data")

        if not data:
            if msg_type == "pong":
                return  # Expected keepalive response
            if msg_type == "subscribed":
                logger.debug(f"CryExc subscription confirmed: {msg}")
                return
            if msg_type == "error":
                logger.warning(f"CryExc server error: {msg.get('message', msg)}")
                return
            return

        if msg_type == "trade":
            self._handle_trade(data)
        elif msg_type == "trade_batch":
            if isinstance(data, list):
                for item in data:
                    self._handle_trade(item)
        elif msg_type == "liquidation":
            self._handle_liquidation(data)
        elif msg_type == "cvd":
            self._handle_cvd(data)
        elif msg_type == "orderbook_stats":
            self._handle_orderbook_stats(data)

    def _handle_trade(self, data: Dict[str, Any]) -> None:
        # CryExc relays Binance format: isBuyerMaker + quoteQty
        # Convert: isBuyerMaker=false means buyer is taker (buy trade)
        if "side" in data:
            side = data["side"]
        elif "isBuyerMaker" in data:
            side = "sell" if data["isBuyerMaker"] else "buy"
        else:
            side = "buy"

        notional = float(data.get("notional", data.get("quoteQty", 0)))

        trade = CryExcTrade(
            symbol=data.get("symbol", ""),
            exchange=data.get("exchange", ""),
            price=float(data.get("price", 0)),
            quantity=float(data.get("quantity", 0)),
            side=side,
            timestamp=float(data.get("timestamp", time.time() * 1000)),
            notional=notional,
        )
        for cb in self._trade_callbacks:
            try:
                cb(trade)
            except Exception as e:
                logger.error(f"Trade callback error: {e}")

    def _handle_liquidation(self, data: Dict[str, Any]) -> None:
        # CryExc sends Binance format: side="SELL"/"BUY", notionalUsd
        # Convert: forced SELL = long position liquidated, forced BUY = short liquidated
        raw_side = data.get("side", "")
        if raw_side.upper() == "SELL":
            side = "long"
        elif raw_side.upper() == "BUY":
            side = "short"
        else:
            side = raw_side.lower() if raw_side else "long"

        notional = float(
            data.get("notional", data.get("notionalUsd", data.get("quoteQty", 0)))
        )

        liq = CryExcLiquidation(
            symbol=data.get("symbol", ""),
            exchange=data.get("exchange", ""),
            side=side,
            quantity=float(data.get("quantity", 0)),
            price=float(data.get("price", 0)),
            notional=notional,
            timestamp=float(data.get("timestamp", time.time() * 1000)),
        )
        for cb in self._liquidation_callbacks:
            try:
                cb(liq)
            except Exception as e:
                logger.error(f"Liquidation callback error: {e}")

    def _handle_cvd(self, data: Dict[str, Any]) -> None:
        cvd = CryExcCVD(
            symbol=data.get("symbol", ""),
            exchange=data.get("exchange", ""),
            cvd=float(data.get("cvd", 0)),
            buy_volume=float(data.get("buy_volume", 0)),
            sell_volume=float(data.get("sell_volume", 0)),
            interval_seconds=int(data.get("interval_seconds", 60)),
            timestamp=float(data.get("timestamp", time.time() * 1000)),
        )
        for cb in self._cvd_callbacks:
            try:
                cb(cvd)
            except Exception as e:
                logger.error(f"CVD callback error: {e}")

    def _handle_orderbook_stats(self, data: Dict[str, Any]) -> None:
        # CryExc sends camelCase Binance format; map to our snake_case fields.
        # Use totalBidQuantity/totalAskQuantity as bid_depth/ask_depth fallbacks.
        stats = CryExcOrderbookStats(
            symbol=data.get("symbol", ""),
            exchange=data.get("exchange", ""),
            bid_depth=float(data.get("bid_depth", data.get("totalBidQuantity", 0))),
            ask_depth=float(data.get("ask_depth", data.get("totalAskQuantity", 0))),
            spread=float(data.get("spread", 0)),
            mid_price=float(data.get("mid_price", data.get("midPrice", 0))),
            best_bid=float(data.get("best_bid", data.get("bestBid", 0))),
            best_ask=float(data.get("best_ask", data.get("bestAsk", 0))),
            timestamp=float(data.get("timestamp", time.time() * 1000)),
        )
        for cb in self._orderbook_callbacks:
            try:
                cb(stats)
            except Exception as e:
                logger.error(f"Orderbook stats callback error: {e}")
