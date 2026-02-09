"""
Unit tests for SentimentAggregator

Tests blending formula, PCR-to-signal mapping, graceful degradation
when FlowDetector is unavailable, and ticker-level sentiment.
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.data.alpaca_options_client import OptionContract, OptionType
from core.signals.sentiment_aggregator import (
    SentimentAggregator,
    MarketSentiment,
    TickerSentiment,
    _label_from_pcr,
    _pcr_to_signal,
)

from .conftest import make_contract


# ── Fixtures ──────────────────────────────────────────────────


def _make_mock_cboe():
    """Build a mock CBOEClient with controllable PCR returns."""
    cboe = AsyncMock()
    cboe.get_put_call_ratio = AsyncMock()
    cboe.get_pcr_percentile = AsyncMock(return_value=0.5)
    return cboe


def _put_call_data(pcr: float):
    """Minimal mock for PutCallData."""
    mock = MagicMock()
    mock.put_call_ratio = pcr
    return mock


@pytest.fixture
def mock_cboe():
    return _make_mock_cboe()


# ── PCR Label Mapping ─────────────────────────────────────────


class TestPCRLabelMapping:
    """Test the _label_from_pcr thresholds."""

    def test_extreme_fear(self):
        assert _label_from_pcr(1.5) == "extreme_fear"

    def test_fear(self):
        assert _label_from_pcr(1.1) == "fear"

    def test_neutral(self):
        assert _label_from_pcr(0.8) == "neutral"

    def test_greed(self):
        assert _label_from_pcr(0.6) == "greed"

    def test_extreme_greed(self):
        assert _label_from_pcr(0.4) == "extreme_greed"

    def test_boundary_at_1_2(self):
        # > 1.2 → extreme_fear
        assert _label_from_pcr(1.21) == "extreme_fear"
        # <= 1.2 but > 1.0 → fear
        assert _label_from_pcr(1.19) == "fear"

    def test_boundary_at_0_5(self):
        # > 0.5 → greed
        assert _label_from_pcr(0.51) == "greed"
        # <= 0.5 → extreme_greed
        assert _label_from_pcr(0.49) == "extreme_greed"


# ── PCR to Signal ─────────────────────────────────────────────


class TestPCRToSignal:
    """Test the _pcr_to_signal linear mapping."""

    def test_neutral_at_1_0(self):
        assert _pcr_to_signal(1.0) == pytest.approx(0.0)

    def test_bullish_at_0_5(self):
        assert _pcr_to_signal(0.5) == pytest.approx(100.0)

    def test_bearish_at_1_5(self):
        assert _pcr_to_signal(1.5) == pytest.approx(-100.0)

    def test_clamped_above(self):
        """PCR below 0.5 should clamp at +100."""
        assert _pcr_to_signal(0.0) == 100.0

    def test_clamped_below(self):
        """PCR above 1.5 should clamp at -100."""
        assert _pcr_to_signal(2.0) == -100.0


# ── Market Sentiment ──────────────────────────────────────────


class TestMarketSentiment:

    async def test_basic_market_sentiment(self, mock_cboe):
        mock_cboe.get_put_call_ratio.side_effect = [
            _put_call_data(0.85),  # total
            _put_call_data(0.90),  # equity
            _put_call_data(0.70),  # index
        ]
        mock_cboe.get_pcr_percentile.return_value = 0.55

        agg = SentimentAggregator(cboe_client=mock_cboe)
        sentiment = await agg.get_market_sentiment()

        assert isinstance(sentiment, MarketSentiment)
        assert sentiment.pcr_total == 0.85
        assert sentiment.pcr_equity == 0.90
        assert sentiment.pcr_index == 0.70
        assert sentiment.sentiment_label == "neutral"  # 0.7 < 0.85 < 1.0
        assert sentiment.pcr_percentile == 0.55

    async def test_extreme_fear_label(self, mock_cboe):
        mock_cboe.get_put_call_ratio.side_effect = [
            _put_call_data(1.5),  # total
            _put_call_data(1.3),
            _put_call_data(1.1),
        ]

        agg = SentimentAggregator(cboe_client=mock_cboe)
        sentiment = await agg.get_market_sentiment()
        assert sentiment.sentiment_label == "extreme_fear"


# ── Ticker Sentiment ──────────────────────────────────────────


class TestTickerSentiment:

    async def test_without_flow_detector(self, mock_cboe):
        """Without FlowDetector, flow scores default to 50/50."""
        agg = SentimentAggregator(cboe_client=mock_cboe, flow_detector=None)

        contracts = [
            make_contract(volume=500, open_interest=5000, bid=5.0, ask=5.10),
            make_contract(
                option_type=OptionType.PUT,
                volume=200, open_interest=3000, bid=3.0, ask=3.10,
            ),
        ]
        result = await agg.get_ticker_sentiment("SPY", contracts, 500.0)

        assert isinstance(result, TickerSentiment)
        assert result.symbol == "SPY"
        assert result.call_volume == 500
        assert result.put_volume == 200
        assert result.pcr == pytest.approx(0.4, abs=0.01)
        # Flow neutral (50/50), PCR = 0.4 is bullish → positive overall
        assert result.overall_sentiment > 0

    async def test_with_flow_detector(self, mock_cboe):
        """With FlowDetector providing bullish signal, overall should be bullish."""
        mock_flow = MagicMock()
        mock_summary = MagicMock()
        mock_summary.bullish_score = 80
        mock_summary.bearish_score = 20
        mock_flow.get_flow_summary = MagicMock(return_value=mock_summary)

        agg = SentimentAggregator(
            cboe_client=mock_cboe, flow_detector=mock_flow
        )

        contracts = [
            make_contract(volume=500, open_interest=5000, bid=5.0, ask=5.10),
        ]
        result = await agg.get_ticker_sentiment("SPY", contracts, 500.0)

        # Flow bullish (80-20=60) * 0.6 weight = 36
        # PCR = 0 (no puts) → bullish → PCR signal ~ +100 * 0.4 = 40
        # Total ≈ 76 → clamped to ≤ 100
        assert result.overall_sentiment > 0
        assert result.flow_bullish_score == 80
        assert result.flow_bearish_score == 20

    async def test_flow_detector_error_graceful(self, mock_cboe):
        """FlowDetector raising should degrade to default 50/50."""
        mock_flow = MagicMock()
        mock_flow.get_flow_summary = MagicMock(
            side_effect=RuntimeError("boom")
        )

        agg = SentimentAggregator(
            cboe_client=mock_cboe, flow_detector=mock_flow
        )

        contracts = [
            make_contract(volume=500, open_interest=5000),
        ]
        result = await agg.get_ticker_sentiment("SPY", contracts, 500.0)

        # Should not raise, and flow scores default to 50
        assert result.flow_bullish_score == 50
        assert result.flow_bearish_score == 50


# ── Overall Sentiment Blending ────────────────────────────────


class TestComputeOverall:

    def test_neutral_inputs(self, mock_cboe):
        agg = SentimentAggregator(cboe_client=mock_cboe)
        # Flow: 50-50=0, PCR=1.0 → signal=0
        result = agg._compute_overall(50, 50, 1.0)
        assert result == 0

    def test_max_bullish(self, mock_cboe):
        agg = SentimentAggregator(cboe_client=mock_cboe)
        # Flow: 100-0=100, PCR=0.5 → signal=+100
        result = agg._compute_overall(100, 0, 0.5)
        assert result == 100

    def test_max_bearish(self, mock_cboe):
        agg = SentimentAggregator(cboe_client=mock_cboe)
        # Flow: 0-100=-100, PCR=1.5 → signal=-100
        result = agg._compute_overall(0, 100, 1.5)
        assert result == -100

    def test_clamped_to_range(self, mock_cboe):
        agg = SentimentAggregator(cboe_client=mock_cboe)
        result = agg._compute_overall(100, 0, 0.0)
        assert -100 <= result <= 100

    def test_weights(self, mock_cboe):
        """60% flow + 40% PCR weighting."""
        agg = SentimentAggregator(cboe_client=mock_cboe)
        assert agg.FLOW_WEIGHT == 0.6
        assert agg.PCR_WEIGHT == 0.4

    def test_mixed_signals(self, mock_cboe):
        """Bullish flow + bearish PCR → moderate result."""
        agg = SentimentAggregator(cboe_client=mock_cboe)
        # Flow: 80-20=60, PCR=1.3 → signal=-60
        result = agg._compute_overall(80, 20, 1.3)
        # 0.6 * 60 + 0.4 * (-60) = 36 - 24 = 12
        assert result == pytest.approx(12, abs=1)


# ── Mid Price Helper ──────────────────────────────────────────


class TestMidPrice:

    def test_uses_bid_ask_midpoint(self):
        from core.signals.sentiment_aggregator import _mid_price
        contract = make_contract(bid=5.0, ask=5.10, last_price=5.50)
        assert _mid_price(contract) == pytest.approx(5.05)

    def test_falls_back_to_last_price(self):
        from core.signals.sentiment_aggregator import _mid_price
        contract = make_contract(bid=None, ask=None, last_price=5.50)
        assert _mid_price(contract) == pytest.approx(5.50)

    def test_returns_zero_if_no_prices(self):
        from core.signals.sentiment_aggregator import _mid_price
        contract = make_contract(bid=None, ask=None, last_price=None)
        assert _mid_price(contract) == 0.0
