"""
Sentiment Aggregator — DeepSignals Phase 2

Combines CBOE put/call data with options flow analysis to produce
market-wide and ticker-level sentiment scores.

Equivalent to Unusual Whales' "Market Tide" view.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from core.data.alpaca_options_client import OptionContract, OptionType
from core.data.cboe_client import CBOEClient

# FlowDetector is built in parallel — import gracefully
try:
    from core.signals.flow_detector import FlowDetector, FlowSummary
except ImportError:
    FlowDetector = None  # type: ignore[assignment,misc]
    FlowSummary = None  # type: ignore[assignment,misc]

logger = logging.getLogger(__name__)


# ── Dataclasses ──────────────────────────────────────────────────


@dataclass
class MarketSentiment:
    """Broad market sentiment derived from CBOE put/call ratios."""

    pcr_total: float
    pcr_equity: float
    pcr_index: float
    pcr_percentile: float
    sentiment_label: str
    timestamp: datetime


@dataclass
class TickerSentiment:
    """Ticker-level sentiment combining flow + PCR data."""

    symbol: str
    net_premium: float
    call_volume: int
    put_volume: int
    pcr: float
    flow_bullish_score: int  # 0-100
    flow_bearish_score: int  # 0-100
    overall_sentiment: int  # -100 to +100


# ── PCR Sentiment Thresholds ─────────────────────────────────────

PCR_THRESHOLDS = [
    (1.2, "extreme_fear"),
    (1.0, "fear"),
    (0.7, "neutral"),
    (0.5, "greed"),
]
PCR_FLOOR_LABEL = "extreme_greed"


def _label_from_pcr(pcr: float) -> str:
    """Map a total put/call ratio to a sentiment label."""
    for threshold, label in PCR_THRESHOLDS:
        if pcr > threshold:
            return label
    return PCR_FLOOR_LABEL


# ── Aggregator ───────────────────────────────────────────────────


class SentimentAggregator:
    """
    Combines CBOE put/call ratios with options flow signals.

    Usage:
        cboe = CBOEClient()
        agg = SentimentAggregator(cboe_client=cboe)
        market = await agg.get_market_sentiment()
    """

    # Weights for overall_sentiment calculation
    FLOW_WEIGHT = 0.6
    PCR_WEIGHT = 0.4

    def __init__(
        self,
        cboe_client: CBOEClient,
        flow_detector: Optional["FlowDetector"] = None,  # type: ignore[type-arg]
    ):
        self.cboe = cboe_client
        self.flow = flow_detector

        if self.flow is None and FlowDetector is not None:
            logger.debug(
                "No FlowDetector provided; ticker-level flow scores will be unavailable"
            )

        logger.info("SentimentAggregator initialized")

    # ── Market-wide sentiment ────────────────────────────────────

    async def get_market_sentiment(self) -> MarketSentiment:
        """
        Build a MarketSentiment snapshot from CBOE data.

        Fetches total/equity/index PCR in parallel, then derives
        the sentiment label from the total PCR.
        """
        # Fire all CBOE calls concurrently
        (total, equity, index_, percentile) = await asyncio.gather(
            self.cboe.get_put_call_ratio("total"),
            self.cboe.get_put_call_ratio("equity"),
            self.cboe.get_put_call_ratio("index"),
            self.cboe.get_pcr_percentile("total"),
        )

        pcr_total = total.put_call_ratio
        label = _label_from_pcr(pcr_total)

        sentiment = MarketSentiment(
            pcr_total=pcr_total,
            pcr_equity=equity.put_call_ratio,
            pcr_index=index_.put_call_ratio,
            pcr_percentile=percentile,
            sentiment_label=label,
            timestamp=datetime.utcnow(),
        )

        logger.info(
            f"Market sentiment: {label} "
            f"(PCR total={pcr_total:.2f}, percentile={percentile:.0%})"
        )
        return sentiment

    # ── Ticker-level sentiment ───────────────────────────────────

    async def get_ticker_sentiment(
        self,
        ticker: str,
        contracts: List[OptionContract],
        spot_price: float,
    ) -> TickerSentiment:
        """
        Compute sentiment for a single ticker from its option contracts.

        Args:
            ticker: Underlying symbol (e.g. "AAPL")
            contracts: List of OptionContract objects for this ticker
            spot_price: Current underlying price

        The score blends:
        - Options flow signal (60% weight) via FlowDetector
        - Ticker-level put/call ratio signal (40% weight)
        """
        # Separate calls and puts, tally volume and premium
        call_volume = 0
        put_volume = 0
        call_premium = 0.0
        put_premium = 0.0

        for c in contracts:
            mid = _mid_price(c)
            vol = c.volume or 0
            notional = mid * vol * 100  # each contract = 100 shares

            if c.option_type == OptionType.CALL:
                call_volume += vol
                call_premium += notional
            else:
                put_volume += vol
                put_premium += notional

        net_premium = call_premium - put_premium
        total_volume = call_volume + put_volume
        pcr = put_volume / call_volume if call_volume > 0 else 0.0

        # Flow scores from FlowDetector (if available)
        flow_bullish = 50
        flow_bearish = 50

        if self.flow is not None and FlowSummary is not None:
            try:
                summary = self.flow.get_flow_summary(
                    contracts, spot_price
                )
                flow_bullish = summary.bullish_score
                flow_bearish = summary.bearish_score
            except Exception as e:
                logger.warning(f"FlowDetector error for {ticker}: {e}")

        # Combine into overall sentiment (-100 to +100)
        overall = self._compute_overall(
            flow_bullish, flow_bearish, pcr
        )

        return TickerSentiment(
            symbol=ticker,
            net_premium=round(net_premium, 2),
            call_volume=call_volume,
            put_volume=put_volume,
            pcr=round(pcr, 3),
            flow_bullish_score=flow_bullish,
            flow_bearish_score=flow_bearish,
            overall_sentiment=overall,
        )

    # ── Internal helpers ─────────────────────────────────────────

    def _compute_overall(
        self,
        flow_bullish: int,
        flow_bearish: int,
        pcr: float,
    ) -> int:
        """
        Blend flow scores and PCR into a single -100..+100 score.

        Flow component: (bullish - bearish) scaled to -100..+100
        PCR component:  inverted — low PCR is bullish, high PCR is bearish
                        mapped through a sigmoid-like linear clamp.
        """
        # Flow component: already 0-100 each, diff gives -100..+100
        flow_signal = flow_bullish - flow_bearish

        # PCR component: map PCR 0.5..1.5 → +100..-100
        # Center at PCR=1.0 (neutral), clamp at extremes
        pcr_signal = _pcr_to_signal(pcr)

        raw = (self.FLOW_WEIGHT * flow_signal) + (self.PCR_WEIGHT * pcr_signal)
        return int(max(-100, min(100, round(raw))))


# ── Module-level helpers ─────────────────────────────────────────


def _mid_price(contract: OptionContract) -> float:
    """Best estimate of a contract's fair price."""
    if contract.bid is not None and contract.ask is not None:
        return (contract.bid + contract.ask) / 2
    if contract.last_price is not None:
        return contract.last_price
    return 0.0


def _pcr_to_signal(pcr: float) -> float:
    """
    Convert a put/call ratio to a sentiment signal in -100..+100.

    PCR 0.5 → +100  (extreme greed / bullish)
    PCR 1.0 →   0   (neutral)
    PCR 1.5 → -100  (extreme fear / bearish)
    """
    # Linear mapping: signal = -200 * (pcr - 1.0), clamped
    signal = -200.0 * (pcr - 1.0)
    return max(-100.0, min(100.0, signal))
