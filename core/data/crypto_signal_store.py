"""
Crypto Signal Store - Derived Trading Signals from Exchange Data

Aggregates raw CryExc events (trades, liquidations, CVD, orderbook)
into actionable trading signals consumed by strategies.

Each store instance tracks a single symbol (e.g. BTCUSDT) and maintains
rolling windows of price history, liquidation events, and orderbook snapshots.

Thread Safety:
    This store is designed for single-threaded async usage. Callbacks from
    CryExcClient write; strategy methods read. No locking needed because
    both happen in the same event loop.
"""

import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional

from .cryexc_client import (
    CryExcCVD,
    CryExcLiquidation,
    CryExcOrderbookStats,
    CryExcTrade,
)

logger = logging.getLogger(__name__)

# Rolling window limits
MAX_PRICE_HISTORY = 10_000  # ~10K ticks at sub-second rate
LIQUIDATION_WINDOW_SECONDS = 300  # 5-minute rolling window
CASCADE_THRESHOLD_COUNT = 5  # 5+ liquidations in window = cascade
CASCADE_THRESHOLD_NOTIONAL = 500_000  # $500K total = cascade


@dataclass
class PriceEntry:
    """Single price observation."""
    price: float
    timestamp: float  # unix seconds
    side: str = ""  # "buy" or "sell"
    notional: float = 0.0


@dataclass
class LiquidationEntry:
    """Single liquidation event."""
    side: str  # "long" or "short"
    notional: float
    price: float
    timestamp: float  # unix seconds


class CryptoSignalStore:
    """
    Per-symbol signal state aggregated from all CryExc streams.

    Provides derived signal methods that strategies consume:
    - get_spot_price() -> latest trade price
    - get_momentum() -> % change over lookback window
    - get_cvd_signal() -> normalized buy/sell pressure (-100 to +100)
    - get_orderbook_imbalance() -> depth ratios, spread, mid_price
    - get_liquidation_signal() -> pressure, side bias, cascade detection
    - is_stale() -> data freshness check

    Usage:
        store = CryptoSignalStore("BTCUSDT")
        # Wire callbacks from CryExcClient:
        client.on_trade(store.on_trade)
        client.on_cvd(store.on_cvd)
        client.on_orderbook_stats(store.on_orderbook_stats)
        client.on_liquidation(store.on_liquidation)

        # Later, from a strategy:
        price = store.get_spot_price()
        momentum = store.get_momentum(lookback_seconds=300)
    """

    def __init__(self, symbol: str):
        self.symbol = symbol

        # Price history: rolling deque of PriceEntry
        self._price_history: Deque[PriceEntry] = deque(maxlen=MAX_PRICE_HISTORY)
        self._last_price: float = 0.0
        self._last_trade_time: float = 0.0

        # CVD state (most recent snapshot)
        self._last_cvd: Optional[CryExcCVD] = None
        self._last_cvd_time: float = 0.0

        # Orderbook state (most recent snapshot)
        self._last_orderbook: Optional[CryExcOrderbookStats] = None
        self._last_orderbook_time: float = 0.0

        # Liquidation rolling window
        self._liquidations: Deque[LiquidationEntry] = deque()
        self._last_liquidation_time: float = 0.0

        logger.debug(f"CryptoSignalStore created for {symbol}")

    # -- Callback handlers (called by CryExcClient) --------------------------

    def on_trade(self, trade: CryExcTrade) -> None:
        """Ingest a trade event."""
        if trade.symbol != self.symbol:
            return

        ts = trade.timestamp / 1000.0  # ms -> seconds
        self._price_history.append(PriceEntry(
            price=trade.price,
            timestamp=ts,
            side=trade.side,
            notional=trade.notional,
        ))
        self._last_price = trade.price
        self._last_trade_time = ts

    def on_cvd(self, cvd: CryExcCVD) -> None:
        """Ingest a CVD snapshot."""
        if cvd.symbol != self.symbol:
            return
        self._last_cvd = cvd
        self._last_cvd_time = cvd.timestamp / 1000.0

    def on_orderbook_stats(self, stats: CryExcOrderbookStats) -> None:
        """Ingest an orderbook stats snapshot."""
        if stats.symbol != self.symbol:
            return
        self._last_orderbook = stats
        self._last_orderbook_time = stats.timestamp / 1000.0

    def on_liquidation(self, liq: CryExcLiquidation) -> None:
        """Ingest a liquidation event."""
        if liq.symbol != self.symbol:
            return

        ts = liq.timestamp / 1000.0
        self._liquidations.append(LiquidationEntry(
            side=liq.side,
            notional=liq.notional,
            price=liq.price,
            timestamp=ts,
        ))
        self._last_liquidation_time = ts
        self._prune_liquidations()

    # -- Derived signal methods (consumed by strategies) ---------------------

    def get_spot_price(self) -> float:
        """Latest trade price. Returns 0.0 if no data."""
        return self._last_price

    def get_momentum(self, lookback_seconds: float = 300) -> float:
        """
        Price change as a percentage over the lookback window.

        Returns:
            Percentage change (e.g. 0.015 = +1.5%), or 0.0 if insufficient data.
        """
        if not self._price_history:
            return 0.0

        now = time.time()
        cutoff = now - lookback_seconds

        # Find the oldest price within the lookback window
        oldest_price = None
        for entry in self._price_history:
            if entry.timestamp >= cutoff:
                oldest_price = entry.price
                break

        if oldest_price is None or oldest_price == 0:
            return 0.0

        return (self._last_price - oldest_price) / oldest_price

    def get_cvd_signal(self) -> float:
        """
        Normalized buy/sell pressure from CVD.

        Returns:
            Value from -100 (all selling) to +100 (all buying).
            Returns 0.0 if no CVD data.
        """
        if not self._last_cvd:
            return 0.0

        cvd = self._last_cvd
        total = cvd.buy_volume + cvd.sell_volume
        if total == 0:
            return 0.0

        # Normalize: net_buy / total * 100
        net_buy = cvd.buy_volume - cvd.sell_volume
        return (net_buy / total) * 100.0

    def get_orderbook_imbalance(self) -> Dict[str, Any]:
        """
        Orderbook depth analysis.

        Returns:
            Dict with:
                - bid_ask_ratio: bid_depth / ask_depth (>1 = bid heavy)
                - spread: best_ask - best_bid
                - mid_price: midpoint of best bid/ask
                - bid_depth: total bid depth
                - ask_depth: total ask depth
            Returns empty dict if no data.
        """
        if not self._last_orderbook:
            return {}

        ob = self._last_orderbook
        total_depth = ob.bid_depth + ob.ask_depth
        ratio = ob.bid_depth / ob.ask_depth if ob.ask_depth > 0 else 1.0

        return {
            "bid_ask_ratio": ratio,
            "spread": ob.spread,
            "mid_price": ob.mid_price,
            "bid_depth": ob.bid_depth,
            "ask_depth": ob.ask_depth,
            "best_bid": ob.best_bid,
            "best_ask": ob.best_ask,
        }

    def get_liquidation_signal(self) -> Dict[str, Any]:
        """
        Liquidation pressure analysis over the rolling window.

        Returns:
            Dict with:
                - count: number of liquidations in window
                - total_notional: total $ value liquidated
                - side_bias: "long" or "short" (which side is getting liquidated more)
                - pressure: 0-100 normalized pressure score
                - is_cascade: True if liquidation cascade detected
            Returns empty dict if no data.
        """
        self._prune_liquidations()

        if not self._liquidations:
            return {
                "count": 0,
                "total_notional": 0.0,
                "side_bias": "neutral",
                "pressure": 0.0,
                "is_cascade": False,
            }

        long_notional = 0.0
        short_notional = 0.0
        for liq in self._liquidations:
            if liq.side == "long":
                long_notional += liq.notional
            else:
                short_notional += liq.notional

        total = long_notional + short_notional
        count = len(self._liquidations)

        # Side bias
        if long_notional > short_notional * 1.5:
            side_bias = "long"
        elif short_notional > long_notional * 1.5:
            side_bias = "short"
        else:
            side_bias = "neutral"

        # Pressure score: 0-100 based on notional
        pressure = min(100.0, (total / CASCADE_THRESHOLD_NOTIONAL) * 100.0)

        # Cascade detection
        is_cascade = (
            count >= CASCADE_THRESHOLD_COUNT
            or total >= CASCADE_THRESHOLD_NOTIONAL
        )

        return {
            "count": count,
            "total_notional": total,
            "side_bias": side_bias,
            "pressure": pressure,
            "is_cascade": is_cascade,
        }

    def is_stale(self, max_age_seconds: float = 10.0) -> bool:
        """
        Check if data is too old to be useful.

        Returns True if the most recent trade is older than max_age_seconds,
        or if no data has been received at all.
        """
        if self._last_trade_time == 0:
            return True
        return (time.time() - self._last_trade_time) > max_age_seconds

    # -- Internal helpers ----------------------------------------------------

    def _prune_liquidations(self) -> None:
        """Remove liquidation entries older than the rolling window."""
        cutoff = time.time() - LIQUIDATION_WINDOW_SECONDS
        while self._liquidations and self._liquidations[0].timestamp < cutoff:
            self._liquidations.popleft()

    def get_stats(self) -> Dict[str, Any]:
        """Get diagnostic stats for logging/dashboard."""
        return {
            "symbol": self.symbol,
            "last_price": self._last_price,
            "price_history_len": len(self._price_history),
            "has_cvd": self._last_cvd is not None,
            "has_orderbook": self._last_orderbook is not None,
            "liquidation_count": len(self._liquidations),
            "is_stale": self.is_stale(),
            "last_trade_age_s": round(time.time() - self._last_trade_time, 1)
            if self._last_trade_time > 0 else None,
        }
