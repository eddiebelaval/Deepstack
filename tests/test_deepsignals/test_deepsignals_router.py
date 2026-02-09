"""
Integration tests for DeepSignals API Router

Tests endpoint response shapes, status codes, and error handling
with mocked data clients. Uses FastAPI TestClient.
"""

from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.api.deepsignals_router import router

from .conftest import make_contract

# ── Test App Setup ────────────────────────────────────────────

app = FastAPI()
app.include_router(router)


@pytest.fixture
def client():
    """TestClient with credit/auth dependencies bypassed."""
    from core.api.credits import verify_token_optional

    # Override the auth dependency so FreeEndpoint doesn't call Supabase
    async def _no_auth():
        return None

    app.dependency_overrides[verify_token_optional] = _no_auth

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides = {}


# ── Mock Helpers ──────────────────────────────────────────────


def _mock_chain_and_spot():
    """Returns a mock for _get_chain_and_spot."""
    contracts = [
        make_contract(volume=5000, open_interest=500, last_price=5.0, gamma=0.05),
        make_contract(
            option_type=__import__(
                "core.data.alpaca_options_client", fromlist=["OptionType"]
            ).OptionType.PUT,
            strike=480.0, volume=200, open_interest=3000,
            last_price=3.0, gamma=0.04,
        ),
    ]
    return contracts, 500.0


# ── /api/signals/flow ─────────────────────────────────────────


class TestFlowEndpoint:

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_flow_returns_list(self, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()
        response = client.get("/api/signals/flow?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_flow_alert_shape(self, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()
        response = client.get("/api/signals/flow?ticker=SPY")
        data = response.json()
        if len(data) > 0:
            alert = data[0]
            assert "id" in alert
            assert "symbol" in alert
            assert "alert_type" in alert
            assert "detected_at" in alert
            assert "confidence" in alert

    def test_flow_missing_ticker_422(self, client):
        response = client.get("/api/signals/flow")
        assert response.status_code == 422

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_flow_respects_limit(self, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()
        response = client.get("/api/signals/flow?ticker=SPY&limit=1")
        data = response.json()
        assert len(data) <= 1


# ── /api/signals/flow/summary ─────────────────────────────────


class TestFlowSummaryEndpoint:

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_summary_shape(self, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()
        response = client.get("/api/signals/flow/summary?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert "symbol" in data
        assert "call_flow" in data
        assert "put_flow" in data
        assert "net_flow" in data
        assert "dominant_side" in data
        assert data["dominant_side"] in ("bullish", "bearish", "neutral")


# ── /api/signals/gex ──────────────────────────────────────────


class TestGEXEndpoint:

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_gex_data_shape(self, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()
        response = client.get("/api/signals/gex?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert "symbol" in data
        assert "total_gex" in data
        assert "call_gex" in data
        assert "put_gex" in data
        assert "gex_by_strike" in data
        assert isinstance(data["gex_by_strike"], list)
        assert "timestamp" in data

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_gex_strike_entry_shape(self, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()
        response = client.get("/api/signals/gex?ticker=SPY")
        data = response.json()
        if data["gex_by_strike"]:
            strike = data["gex_by_strike"][0]
            assert "strike" in strike
            assert "call_gex" in strike
            assert "put_gex" in strike
            assert "total_gex" in strike


# ── /api/signals/gex/levels ───────────────────────────────────


class TestGEXLevelsEndpoint:

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_levels_shape(self, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()
        response = client.get("/api/signals/gex/levels?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert "symbol" in data
        assert "gamma_flip" in data
        assert "call_wall" in data
        assert "put_wall" in data
        assert "max_gamma_strike" in data
        assert "key_levels" in data
        assert isinstance(data["key_levels"], list)


# ── /api/signals/darkpool ────────────────────────────────────


class TestDarkPoolEndpoint:

    @patch("core.api.deepsignals_router._get_finra_client")
    def test_darkpool_shape(self, mock_finra_factory, client):
        mock_finra = AsyncMock()
        mock_finra.get_ticker_short_volume.return_value = [
            MagicMock(
                symbol="SPY",
                date=date(2026, 2, 7),
                short_volume=5000000,
                short_exempt_volume=100000,
                total_volume=10000000,
                short_ratio=0.50,
                market="CNMS",
            ),
        ]
        mock_finra_factory.return_value = mock_finra

        response = client.get("/api/signals/darkpool?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            entry = data[0]
            assert "symbol" in entry
            assert "date" in entry
            assert "short_volume" in entry
            assert "total_volume" in entry
            assert "short_ratio" in entry

    @patch("core.api.deepsignals_router._get_finra_client")
    def test_darkpool_top_shape(self, mock_finra_factory, client):
        mock_finra = AsyncMock()
        mock_finra.get_top_dark_pool_activity.return_value = [
            MagicMock(
                symbol="GME",
                short_ratio=0.65,
                short_volume=8000000,
                total_volume=12000000,
                date=date(2026, 2, 7),
            ),
        ]
        mock_finra_factory.return_value = mock_finra

        response = client.get("/api/signals/darkpool/top?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ── /api/signals/iv ──────────────────────────────────────────


class TestIVEndpoint:

    @patch("core.api.deepsignals_router._get_iv_tracker")
    def test_iv_data_shape(self, mock_tracker_factory, client):
        mock_tracker = AsyncMock()
        mock_metrics = MagicMock(
            current_iv=0.28,
            iv_percentile=65.0,
            iv_rank=55.0,
            iv_high_252=0.45,
            iv_low_252=0.15,
        )
        mock_tracker.get_iv_percentile.return_value = mock_metrics
        mock_tracker.get_iv_history.return_value = []
        mock_tracker_factory.return_value = mock_tracker

        response = client.get("/api/signals/iv?ticker=AAPL")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "AAPL"
        assert data["current_iv"] == 0.28
        assert data["iv_percentile"] == 65.0
        assert data["iv_rank"] == 55.0
        assert "history" in data
        assert "timestamp" in data

    @patch("core.api.deepsignals_router._get_iv_tracker")
    def test_iv_no_metrics(self, mock_tracker_factory, client):
        """When not enough data, fields should be null."""
        mock_tracker = AsyncMock()
        mock_tracker.get_iv_percentile.return_value = None
        mock_tracker.get_iv_history.return_value = []
        mock_tracker_factory.return_value = mock_tracker

        response = client.get("/api/signals/iv?ticker=NEWSTOCK")
        assert response.status_code == 200
        data = response.json()
        assert data["current_iv"] is None
        assert data["iv_percentile"] is None


# ── /api/signals/sentiment ────────────────────────────────────


class TestSentimentEndpoint:

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    @patch("core.api.deepsignals_router._get_sentiment_aggregator")
    def test_sentiment_shape(self, mock_agg_factory, mock_chain, client):
        mock_chain.return_value = _mock_chain_and_spot()

        mock_agg = AsyncMock()
        mock_ticker_sentiment = MagicMock(
            overall_sentiment=25,
            flow_bullish_score=65,
            flow_bearish_score=35,
            pcr=0.4,
            net_premium=50000.0,
            call_volume=5000,
            put_volume=200,
        )
        mock_agg.get_ticker_sentiment.return_value = mock_ticker_sentiment
        mock_agg_factory.return_value = mock_agg

        response = client.get("/api/signals/sentiment?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert "symbol" in data
        assert "overall_score" in data
        assert "flow_signal" in data
        assert "components" in data
        assert "call_volume" in data["components"]

    @patch("core.api.deepsignals_router._get_sentiment_aggregator")
    def test_market_sentiment_shape(self, mock_agg_factory, client):
        mock_agg = AsyncMock()
        mock_sentiment = MagicMock(
            pcr_total=0.85,
            sentiment_label="neutral",
            timestamp=datetime(2026, 2, 8, 12, 0),
        )
        mock_agg.get_market_sentiment.return_value = mock_sentiment
        mock_agg_factory.return_value = mock_agg

        response = client.get("/api/signals/sentiment/market")
        assert response.status_code == 200
        data = response.json()
        assert "overall_score" in data
        assert "put_call_ratio" in data
        assert "timestamp" in data


# ── Error Handling ────────────────────────────────────────────


class TestErrorHandling:

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_404_no_options_data(self, mock_chain, client):
        from fastapi import HTTPException
        mock_chain.side_effect = HTTPException(
            status_code=404, detail="No options data found for FAKE"
        )
        response = client.get("/api/signals/gex?ticker=FAKE")
        assert response.status_code == 404

    @patch("core.api.deepsignals_router._get_chain_and_spot")
    def test_500_on_unexpected_error(self, mock_chain, client):
        mock_chain.side_effect = RuntimeError("unexpected")
        response = client.get("/api/signals/flow?ticker=SPY")
        assert response.status_code == 500
