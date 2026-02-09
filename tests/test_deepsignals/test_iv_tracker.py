"""
Unit tests for IVTracker

Tests IV percentile/rank calculations and cold start handling.
Uses mocked Supabase responses to avoid network calls.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.signals.iv_tracker import IVTracker, IVMetrics, IVRecord


# ── Fixtures ──────────────────────────────────────────────────


@pytest.fixture
def tracker():
    """Tracker with Supabase config stubbed out."""
    return IVTracker(
        supabase_url="https://fake.supabase.co",
        supabase_key="fake-key",
    )


def _mock_iv_rows(values: list[float]) -> list[dict]:
    """Build mock Supabase row dicts from a list of IV values."""
    return [
        {
            "symbol": "AAPL",
            "date": f"2025-{(i // 30) + 1:02d}-{(i % 28) + 1:02d}",
            "implied_volatility": v,
            "iv_percentile": None,
        }
        for i, v in enumerate(values)
    ]


# ── Percentile & Rank Calculation ─────────────────────────────


class TestIVPercentile:

    async def test_basic_percentile(self, tracker):
        """Current IV = 0.30 with most days lower → high percentile."""
        ivs = [0.20 + i * 0.001 for i in range(50)]  # 0.200 → 0.249
        ivs.append(0.30)  # current = last element
        rows = _mock_iv_rows(ivs)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is not None
        assert metrics.symbol == "AAPL"
        assert metrics.current_iv == 0.30
        # 50 out of 51 days are below 0.30
        assert metrics.iv_percentile == pytest.approx(50 / 51 * 100, abs=0.1)

    async def test_iv_rank_formula(self, tracker):
        """IV Rank = (current - low) / (high - low) * 100."""
        ivs = [0.10, 0.20, 0.30, 0.40, 0.50]  # Pad to >= 30
        ivs = ivs * 7  # 35 entries
        ivs.append(0.35)  # current = 0.35
        rows = _mock_iv_rows(ivs)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is not None
        # rank = (0.35 - 0.10) / (0.50 - 0.10) * 100 = 62.5
        assert metrics.iv_rank == pytest.approx(62.5, abs=0.1)

    async def test_iv_rank_at_low(self, tracker):
        """Current at the low → rank = 0."""
        ivs = [0.10, 0.20, 0.30] * 11  # 33 entries
        ivs.append(0.10)  # current = min
        rows = _mock_iv_rows(ivs)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is not None
        assert metrics.iv_rank == pytest.approx(0.0, abs=0.1)

    async def test_iv_rank_at_high(self, tracker):
        """Current at the high → rank = 100."""
        ivs = [0.10, 0.20, 0.30] * 11
        ivs.append(0.30)  # current = max
        rows = _mock_iv_rows(ivs)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is not None
        assert metrics.iv_rank == pytest.approx(100.0, abs=0.1)

    async def test_constant_iv_rank_50(self, tracker):
        """All same IV → rank = 50 (zero range fallback)."""
        ivs = [0.25] * 35
        rows = _mock_iv_rows(ivs)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is not None
        assert metrics.iv_rank == pytest.approx(50.0)

    async def test_high_low_mean_tracked(self, tracker):
        """IVMetrics should track high, low, mean."""
        ivs = [0.10, 0.20, 0.30, 0.40, 0.50] * 7
        ivs.append(0.30)
        rows = _mock_iv_rows(ivs)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is not None
        assert metrics.iv_high_252 == 0.50
        assert metrics.iv_low_252 == 0.10
        assert 0.10 <= metrics.mean_iv <= 0.50


# ── Cold Start Guard ──────────────────────────────────────────


class TestColdStart:

    async def test_returns_none_under_30_days(self, tracker):
        """Fewer than 30 days of history → None."""
        rows = _mock_iv_rows([0.25] * 20)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is None

    async def test_returns_none_for_empty(self, tracker):
        """No history at all → None."""
        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = []
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is None

    async def test_exactly_30_days_works(self, tracker):
        """Exactly 30 days should work (not be rejected)."""
        rows = _mock_iv_rows([0.25] * 30)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            metrics = await tracker.get_iv_percentile("AAPL")

        assert metrics is not None


# ── IV Rank Convenience Method ────────────────────────────────


class TestGetIVRank:

    async def test_returns_rank_value(self, tracker):
        ivs = [0.10, 0.20, 0.30] * 11
        ivs.append(0.20)
        rows = _mock_iv_rows(ivs)

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            rank = await tracker.get_iv_rank("AAPL")

        assert rank is not None
        assert 0 <= rank <= 100

    async def test_returns_none_on_cold_start(self, tracker):
        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = []
            rank = await tracker.get_iv_rank("AAPL")

        assert rank is None


# ── IV History ────────────────────────────────────────────────


class TestGetIVHistory:

    async def test_returns_iv_records(self, tracker):
        rows = _mock_iv_rows([0.20, 0.25, 0.30])

        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = rows
            records = await tracker.get_iv_history("AAPL", days=30)

        assert len(records) == 3
        assert all(isinstance(r, IVRecord) for r in records)
        assert records[0].implied_volatility == 0.20

    async def test_empty_history(self, tracker):
        with patch.object(
            tracker, "_fetch_iv_history_raw", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = []
            records = await tracker.get_iv_history("AAPL")

        assert records == []


# ── Supabase Not Configured ──────────────────────────────────


class TestNoSupabase:

    async def test_record_daily_iv_noop(self):
        """Without Supabase config, recording is a no-op."""
        tracker = IVTracker(supabase_url="", supabase_key="")
        # Should not raise
        await tracker.record_daily_iv("AAPL", 0.25, __import__("datetime").date.today())

    async def test_fetch_returns_empty(self):
        tracker = IVTracker(supabase_url="", supabase_key="")
        rows = await tracker._fetch_iv_history_raw("AAPL", 252)
        assert rows == []
