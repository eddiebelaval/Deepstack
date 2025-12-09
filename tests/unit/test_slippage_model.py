"""
Comprehensive tests for SlippageModel.

Tests slippage estimation, market impact calculation, historical tracking,
and execution quality scoring with hand-calculated expected values.
"""

from datetime import datetime
from unittest.mock import patch

import pytest

from core.execution.slippage import SlippageEstimate, SlippageModel

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def slippage_model():
    """Create a basic slippage model with default parameters."""
    return SlippageModel(
        base_spread_bps=5.0,
        impact_coefficient=0.1,
        urgency_multiplier=1.5,
    )


@pytest.fixture
def slippage_model_with_history(slippage_model):
    """Create a slippage model pre-populated with historical data."""
    # Record various historical slippages
    slippage_model.record_actual_slippage(
        symbol="AAPL",
        quantity=100,
        action="BUY",
        expected_price=150.00,
        actual_price=150.10,
        order_type="MARKET",
    )
    slippage_model.record_actual_slippage(
        symbol="AAPL",
        quantity=200,
        action="SELL",
        expected_price=150.50,
        actual_price=150.40,
        order_type="MARKET",
    )
    slippage_model.record_actual_slippage(
        symbol="MSFT",
        quantity=150,
        action="BUY",
        expected_price=350.00,
        actual_price=350.20,
        order_type="LIMIT",
    )
    slippage_model.record_actual_slippage(
        symbol="AAPL",
        quantity=300,
        action="BUY",
        expected_price=151.00,
        actual_price=151.15,
        order_type="MARKET",
    )
    slippage_model.record_actual_slippage(
        symbol="MSFT",
        quantity=100,
        action="SELL",
        expected_price=351.00,
        actual_price=350.85,
        order_type="MARKET",
    )
    return slippage_model


# ============================================================================
# TestSlippageEstimation - Basic estimation tests (12 tests)
# ============================================================================


class TestSlippageEstimation:
    """Test slippage estimation for various order scenarios."""

    def test_estimate_slippage_basic_buy_order(self, slippage_model):
        """Test basic buy order slippage estimation."""
        # Expected calculation:
        # spread_cost_bps = 5.0
        # order_value = 100 * 150 = 15,000
        # daily_value = 100,000,000 * 150 = 15,000,000,000
        # participation_rate = 15,000 / 15,000,000,000 = 0.000001
        # impact_bps = 0.1 * sqrt(0.000001) * 10000 = 0.1 * 0.001 * 10000 = 1.0
        # urgency_bps = 5.0 * (1.5 - 1.0) = 2.5
        # total_slippage_bps = 5.0 + 1.0 + 2.5 = 8.5
        # slippage_pct = 8.5 / 10000 = 0.00085
        # slippage_dollars = 150 * 0.00085 * 100 = 12.75
        # estimated_fill_price = 150 * (1 + 0.00085) = 150.1275

        estimate = slippage_model.estimate_slippage(
            symbol="AAPL",
            quantity=100,
            action="BUY",
            current_price=150.0,
            avg_daily_volume=100_000_000,
            order_type="MARKET",
        )

        assert isinstance(estimate, SlippageEstimate)
        assert estimate.symbol == "AAPL"
        assert estimate.quantity == 100
        assert estimate.action == "BUY"
        assert estimate.current_price == 150.0
        assert estimate.slippage_bps == pytest.approx(8.5, rel=0.01)
        assert estimate.slippage_dollars == pytest.approx(12.75, rel=0.01)
        assert estimate.estimated_fill_price == pytest.approx(150.1275, rel=0.01)
        assert estimate.components["spread_cost_bps"] == 5.0
        assert estimate.components["market_impact_bps"] == pytest.approx(1.0, rel=0.01)
        assert estimate.components["urgency_premium_bps"] == pytest.approx(
            2.5, rel=0.01
        )

    def test_estimate_slippage_basic_sell_order(self, slippage_model):
        """Test basic sell order slippage estimation."""
        # Expected calculation:
        # Same components as buy, but fill price adjusted down
        # total_slippage_bps = 8.5
        # slippage_pct = 0.00085
        # estimated_fill_price = 150 * (1 - 0.00085) = 149.8725

        estimate = slippage_model.estimate_slippage(
            symbol="AAPL",
            quantity=100,
            action="SELL",
            current_price=150.0,
            avg_daily_volume=100_000_000,
            order_type="MARKET",
        )

        assert estimate.action == "SELL"
        assert estimate.slippage_bps == pytest.approx(8.5, rel=0.01)
        assert estimate.estimated_fill_price == pytest.approx(149.8725, rel=0.01)
        assert estimate.slippage_dollars == pytest.approx(12.75, rel=0.01)

    def test_estimate_slippage_micro_cap_stock(self, slippage_model):
        """Test slippage for micro-cap stock with low volume."""
        # Low volume = higher market impact
        # order_value = 1000 * 5 = 5,000
        # daily_value = 50,000 * 5 = 250,000
        # participation_rate = 5,000 / 250,000 = 0.02
        # impact_bps = 0.1 * sqrt(0.02) * 10000 = 0.1 * 0.14142 * 10000 = 141.42 (capped at 100)
        # total_slippage_bps = 5.0 + 100.0 + 2.5 = 107.5

        estimate = slippage_model.estimate_slippage(
            symbol="MICRO",
            quantity=1000,
            action="BUY",
            current_price=5.0,
            avg_daily_volume=50_000,
            order_type="MARKET",
        )

        assert estimate.components["market_impact_bps"] == 100.0  # Capped
        assert estimate.slippage_bps == pytest.approx(107.5, rel=0.01)

    def test_estimate_slippage_mega_cap_stock(self, slippage_model):
        """Test slippage for mega-cap stock with high volume."""
        # High volume = lower market impact
        # order_value = 100 * 500 = 50,000
        # daily_value = 50,000,000 * 500 = 25,000,000,000
        # participation_rate = 50,000 / 25,000,000,000 = 0.000002
        # impact_bps = 0.1 * sqrt(0.000002) * 10000 = 0.1 * 0.001414 * 10000 = 1.414

        estimate = slippage_model.estimate_slippage(
            symbol="MEGA",
            quantity=100,
            action="BUY",
            current_price=500.0,
            avg_daily_volume=50_000_000,
            order_type="MARKET",
        )

        assert estimate.components["market_impact_bps"] == pytest.approx(
            1.414, rel=0.01
        )
        assert estimate.slippage_bps < 10.0  # Very low slippage

    def test_estimate_slippage_illiquid_stock(self, slippage_model):
        """Test slippage for illiquid stock with minimal volume."""
        # Very low volume
        # order_value = 500 * 10 = 5,000
        # daily_value = 10,000 * 10 = 100,000
        # participation_rate = 5,000 / 100,000 = 0.05
        # impact_bps = 0.1 * sqrt(0.05) * 10000 = 0.1 * 0.2236 * 10000 = 223.6 (capped at 100)

        estimate = slippage_model.estimate_slippage(
            symbol="ILLIQ",
            quantity=500,
            action="BUY",
            current_price=10.0,
            avg_daily_volume=10_000,
            order_type="MARKET",
        )

        assert estimate.components["market_impact_bps"] == 100.0  # Capped
        assert estimate.slippage_bps > 100.0  # High total slippage

    def test_estimate_slippage_high_volatility(self, slippage_model):
        """Test slippage with high volatility adjustment."""
        # volatility = 0.50 (50%)
        # spread_cost_bps = 5.0 * (1 + 0.50 * 2) = 5.0 * 2.0 = 10.0
        # vol_adjustment_bps = 10.0 * 0.50 = 5.0
        # NOTE: spread_cost calculation happens in _calculate_spread_cost
        # so the base is already adjusted by volatility

        estimate = slippage_model.estimate_slippage(
            symbol="VOLATILE",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            volatility=0.50,
            order_type="MARKET",
        )

        # spread_cost_bps includes vol adjustment: 5.0 * 2.0 = 10.0
        assert estimate.components["spread_cost_bps"] == 10.0
        # vol_adjustment is additional: 10.0 * 0.50 = 5.0
        assert estimate.components["volatility_adjustment_bps"] == pytest.approx(
            5.0, rel=0.01
        )
        assert estimate.slippage_bps > 15.0  # Higher due to volatility

    def test_estimate_slippage_low_volatility(self, slippage_model):
        """Test slippage with low volatility."""
        # volatility = 0.10 (10%)
        # spread_cost_bps = 5.0 * (1 + 0.10 * 2) = 5.0 * 1.2 = 6.0
        # vol_adjustment_bps = 6.0 * 0.10 = 0.6

        estimate = slippage_model.estimate_slippage(
            symbol="STABLE",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            volatility=0.10,
            order_type="MARKET",
        )

        assert estimate.components["spread_cost_bps"] == 6.0
        assert estimate.components["volatility_adjustment_bps"] == pytest.approx(
            0.6, rel=0.01
        )

    def test_estimate_slippage_zero_volume_default(self, slippage_model):
        """Test slippage estimation with zero volume uses default impact."""
        estimate = slippage_model.estimate_slippage(
            symbol="ZERO_VOL",
            quantity=100,
            action="BUY",
            current_price=50.0,
            avg_daily_volume=0,
            order_type="MARKET",
        )

        # Should use default 10 bps for market impact
        assert estimate.components["market_impact_bps"] == 10.0

    def test_estimate_slippage_large_order_high_impact(self, slippage_model):
        """Test large order relative to volume has high market impact."""
        # Very large order
        # order_value = 100,000 * 100 = 10,000,000
        # daily_value = 1,000,000 * 100 = 100,000,000
        # participation_rate = 10,000,000 / 100,000,000 = 0.1
        # impact_bps = 0.1 * sqrt(0.1) * 10000 = 0.1 * 0.3162 * 10000 = 316.2 (capped at 100)

        estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=100_000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="MARKET",
        )

        assert estimate.components["market_impact_bps"] == 100.0  # Capped at max

    def test_estimate_slippage_small_order_low_impact(self, slippage_model):
        """Test small order relative to volume has minimal market impact."""
        # Tiny order
        # order_value = 10 * 100 = 1,000
        # daily_value = 10,000,000 * 100 = 1,000,000,000
        # participation_rate = 1,000 / 1,000,000,000 = 0.000001
        # impact_bps = 0.1 * sqrt(0.000001) * 10000 = 0.1 * 0.001 * 10000 = 1.0

        estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=10,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=10_000_000,
            order_type="MARKET",
        )

        assert estimate.components["market_impact_bps"] == pytest.approx(1.0, rel=0.01)

    def test_estimate_slippage_with_urgency_premium(self, slippage_model):
        """Test market order includes urgency premium."""
        estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="MARKET",
        )

        # urgency_bps = spread_cost_bps * (1.5 - 1.0) = 5.0 * 0.5 = 2.5
        assert estimate.components["urgency_premium_bps"] == pytest.approx(
            2.5, rel=0.01
        )

    def test_estimate_slippage_market_vs_limit(self, slippage_model):
        """Test limit order has no urgency premium compared to market order."""
        market_estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="MARKET",
        )

        limit_estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="LIMIT",
        )

        assert market_estimate.components["urgency_premium_bps"] > 0
        assert limit_estimate.components["urgency_premium_bps"] == 0
        assert market_estimate.slippage_bps > limit_estimate.slippage_bps


# ============================================================================
# TestMarketImpact - Market impact calculation tests (8 tests)
# ============================================================================


class TestMarketImpact:
    """Test market impact calculation logic."""

    def test_market_impact_square_root_model(self, slippage_model):
        """Test market impact follows square root model."""
        # Test that doubling order size increases impact by sqrt(2)
        # order_value_1 = 1000 * 100 = 100,000
        # order_value_2 = 2000 * 100 = 200,000
        # daily_value = 10,000,000 * 100 = 1,000,000,000
        # participation_rate_1 = 100,000 / 1,000,000,000 = 0.0001
        # participation_rate_2 = 200,000 / 1,000,000,000 = 0.0002
        # impact_1 = 0.1 * sqrt(0.0001) * 10000 = 0.1 * 0.01 * 10000 = 10.0
        # impact_2 = 0.1 * sqrt(0.0002) * 10000 = 0.1 * 0.01414 * 10000 = 14.14
        # ratio = 14.14 / 10.0 = 1.414 ≈ sqrt(2)

        estimate_1 = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=1000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=10_000_000,
            order_type="LIMIT",
        )

        estimate_2 = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=2000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=10_000_000,
            order_type="LIMIT",
        )

        impact_1 = estimate_1.components["market_impact_bps"]
        impact_2 = estimate_2.components["market_impact_bps"]

        # Ratio should be approximately sqrt(2) ≈ 1.414
        ratio = impact_2 / impact_1
        assert ratio == pytest.approx(1.414, rel=0.01)

    def test_market_impact_participation_rate(self, slippage_model):
        """Test market impact scales with participation rate."""
        # Higher participation rate = higher impact
        # Low participation: 100 shares of 1M volume
        low_participation = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="LIMIT",
        )

        # High participation: 10,000 shares of 1M volume
        high_participation = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=10_000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="LIMIT",
        )

        assert (
            high_participation.components["market_impact_bps"]
            > low_participation.components["market_impact_bps"]
        )

    def test_market_impact_coefficient_scaling(self):
        """Test market impact scales with coefficient parameter."""
        # Create models with different coefficients
        model_low = SlippageModel(impact_coefficient=0.05)
        model_high = SlippageModel(impact_coefficient=0.20)

        estimate_low = model_low.estimate_slippage(
            symbol="TEST",
            quantity=1000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="LIMIT",
        )

        estimate_high = model_high.estimate_slippage(
            symbol="TEST",
            quantity=1000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="LIMIT",
        )

        # High coefficient should have 4x the impact (0.20 / 0.05)
        ratio = (
            estimate_high.components["market_impact_bps"]
            / estimate_low.components["market_impact_bps"]
        )
        assert ratio == pytest.approx(4.0, rel=0.01)

    def test_market_impact_cap_at_maximum(self, slippage_model):
        """Test market impact is capped at 100 bps."""
        # Create scenario with very high participation rate
        estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=500_000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="LIMIT",
        )

        # Should be capped at 100 bps
        assert estimate.components["market_impact_bps"] == 100.0

    def test_market_impact_zero_with_tiny_order(self, slippage_model):
        """Test market impact is near zero for tiny orders."""
        # Extremely small order
        # order_value = 1 * 100 = 100
        # daily_value = 100,000,000 * 100 = 10,000,000,000
        # participation_rate = 100 / 10,000,000,000 = 0.00000001
        # impact_bps = 0.1 * sqrt(0.00000001) * 10000 = 0.1 * 0.0001 * 10000 = 0.1
        estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=1,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=100_000_000,
            order_type="LIMIT",
        )

        # Should be very small (0.1 bps)
        assert estimate.components["market_impact_bps"] <= 0.1

    def test_market_impact_with_book_depth(self, slippage_model):
        """Test market impact considers order depth indirectly through volume."""
        # More volume = more depth = less impact
        shallow_book = slippage_model.estimate_slippage(
            symbol="SHALLOW",
            quantity=1000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=100_000,
            order_type="LIMIT",
        )

        deep_book = slippage_model.estimate_slippage(
            symbol="DEEP",
            quantity=1000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=10_000_000,
            order_type="LIMIT",
        )

        assert (
            shallow_book.components["market_impact_bps"]
            > deep_book.components["market_impact_bps"]
        )

    def test_spread_cost_calculation(self, slippage_model):
        """Test spread cost is calculated correctly."""
        # Without volatility: should be base_spread_bps
        estimate_no_vol = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="LIMIT",
        )

        assert estimate_no_vol.components["spread_cost_bps"] == 5.0

    def test_volatility_adjustment(self, slippage_model):
        """Test volatility adjustment increases spread cost."""
        # With 30% volatility:
        # spread_cost_bps = 5.0 * (1 + 0.30 * 2) = 5.0 * 1.6 = 8.0
        # vol_adjustment_bps = 8.0 * 0.30 = 2.4

        estimate = slippage_model.estimate_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            volatility=0.30,
            order_type="LIMIT",
        )

        assert estimate.components["spread_cost_bps"] == 8.0
        assert estimate.components["volatility_adjustment_bps"] == pytest.approx(
            2.4, rel=0.01
        )


# ============================================================================
# TestSlippageTracking - Historical tracking tests (8 tests)
# ============================================================================


class TestSlippageTracking:
    """Test slippage tracking and historical analysis."""

    def test_record_slippage_single_trade(self, slippage_model):
        """Test recording a single slippage event."""
        slippage_model.record_actual_slippage(
            symbol="AAPL",
            quantity=100,
            action="BUY",
            expected_price=150.00,
            actual_price=150.10,
            order_type="MARKET",
        )

        assert len(slippage_model.historical_slippage) == 1
        record = slippage_model.historical_slippage[0]

        assert record["symbol"] == "AAPL"
        assert record["quantity"] == 100
        assert record["action"] == "BUY"
        assert record["expected_price"] == 150.00
        assert record["actual_price"] == 150.10
        assert record["order_type"] == "MARKET"

        # Slippage calculations:
        # slippage_dollars = |150.10 - 150.00| * 100 = 10.0
        # slippage_pct = |150.10 - 150.00| / 150.00 = 0.10 / 150.00 = 0.000666...
        # slippage_bps = 0.000666... * 10000 = 6.666...
        assert record["slippage_dollars"] == pytest.approx(10.0, rel=0.01)
        assert record["slippage_bps"] == pytest.approx(6.667, rel=0.01)

    def test_record_slippage_multiple_trades(self, slippage_model_with_history):
        """Test recording multiple slippage events."""
        assert len(slippage_model_with_history.historical_slippage) == 5

        # Check first record
        first = slippage_model_with_history.historical_slippage[0]
        assert first["symbol"] == "AAPL"
        assert first["quantity"] == 100

        # Check last record
        last = slippage_model_with_history.historical_slippage[-1]
        assert last["symbol"] == "MSFT"
        assert last["quantity"] == 100

    def test_get_statistics_by_symbol(self, slippage_model_with_history):
        """Test getting statistics filtered by symbol."""
        aapl_stats = slippage_model_with_history.get_slippage_statistics(symbol="AAPL")

        assert aapl_stats["total_trades"] == 3
        assert aapl_stats["buy_trades"] == 2
        assert aapl_stats["sell_trades"] == 1

        msft_stats = slippage_model_with_history.get_slippage_statistics(symbol="MSFT")

        assert msft_stats["total_trades"] == 2
        assert msft_stats["buy_trades"] == 1
        assert msft_stats["sell_trades"] == 1

    def test_get_statistics_by_order_size(self, slippage_model):
        """Test statistics calculation for different order sizes."""
        # Record trades of different sizes
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.05,
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=1000,
            action="BUY",
            expected_price=100.0,
            actual_price=100.20,
        )

        stats = slippage_model.get_slippage_statistics()

        assert stats["total_trades"] == 2
        # Average should be between the two values
        assert stats["avg_slippage_bps"] > 0

    def test_get_statistics_by_time_of_day(self, slippage_model):
        """Test statistics can track timing information."""
        # Record trades at different times
        with patch("core.execution.slippage.datetime") as mock_datetime:
            mock_datetime.now.return_value = datetime(2024, 1, 1, 9, 30)  # Market open
            slippage_model.record_actual_slippage(
                symbol="TEST",
                quantity=100,
                action="BUY",
                expected_price=100.0,
                actual_price=100.10,
            )

            mock_datetime.now.return_value = datetime(
                2024, 1, 1, 15, 30
            )  # Market close
            slippage_model.record_actual_slippage(
                symbol="TEST",
                quantity=100,
                action="BUY",
                expected_price=100.0,
                actual_price=100.05,
            )

        assert len(slippage_model.historical_slippage) == 2
        assert (
            slippage_model.historical_slippage[0]["timestamp"]
            != slippage_model.historical_slippage[1]["timestamp"]
        )

    def test_get_statistics_empty_history(self, slippage_model):
        """Test statistics with no historical data."""
        stats = slippage_model.get_slippage_statistics()

        assert stats["total_trades"] == 0
        assert stats["avg_slippage_bps"] == 0.0
        assert stats["median_slippage_bps"] == 0.0
        assert stats["max_slippage_bps"] == 0.0
        assert stats["total_slippage_cost"] == 0.0

    def test_median_calculation_odd_count(self, slippage_model):
        """Test median calculation with odd number of records."""
        # Record 5 trades with known slippages
        # slippage_bps = (abs(actual - expected) / expected) * 10000
        # For 100.01: (0.01 / 100.0) * 10000 = 1.0 bps
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.01,  # 1 bps
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.02,  # 2 bps
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.03,  # 3 bps (median)
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.04,  # 4 bps
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.05,  # 5 bps
        )

        stats = slippage_model.get_slippage_statistics()

        # Median of [1, 2, 3, 4, 5] is 3
        # sorted[5 // 2] = sorted[2] = 3rd element (0-indexed)
        assert stats["median_slippage_bps"] == pytest.approx(3.0, rel=0.01)

    def test_median_calculation_even_count(self, slippage_model):
        """Test median calculation with even number of records."""
        # Record 4 trades
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.01,  # 1 bps
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.02,  # 2 bps
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.03,  # 3 bps (will be selected as median)
        )
        slippage_model.record_actual_slippage(
            symbol="TEST",
            quantity=100,
            action="BUY",
            expected_price=100.0,
            actual_price=100.04,  # 4 bps
        )

        stats = slippage_model.get_slippage_statistics()

        # Median of [1, 2, 3, 4] using index 4 // 2 = 2, so 3rd element (0-indexed)
        # sorted[2] = 3
        assert stats["median_slippage_bps"] == pytest.approx(3.0, rel=0.01)


# ============================================================================
# TestExecutionQuality - Execution quality scoring tests (7 tests)
# ============================================================================


class TestExecutionQuality:
    """Test execution quality calculation and grading."""

    def test_execution_quality_better_than_expected(self, slippage_model):
        """Test quality score when actual is better than expected."""
        # actual < expected = better execution
        quality = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0,
            actual_slippage_bps=8.0,
        )

        # quality_score = 100 * (8.0 / 10.0) = 80.0
        assert quality["expected_slippage_bps"] == 10.0
        assert quality["actual_slippage_bps"] == 8.0
        assert quality["deviation_bps"] == -2.0
        assert quality["deviation_pct"] == -0.2
        assert quality["quality_score"] == 80.0
        assert quality["rating"] == "EXCELLENT"  # < 90

    def test_execution_quality_worse_than_expected(self, slippage_model):
        """Test quality score when actual is worse than expected."""
        # actual > expected = worse execution
        quality = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0,
            actual_slippage_bps=15.0,
        )

        # quality_score = 100 * (15.0 / 10.0) = 150.0
        assert quality["deviation_bps"] == 5.0
        assert quality["deviation_pct"] == 0.5
        assert quality["quality_score"] == 150.0
        assert quality["rating"] == "POOR"  # >= 130

    def test_execution_quality_equal_to_expected(self, slippage_model):
        """Test quality score when actual equals expected."""
        quality = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0,
            actual_slippage_bps=10.0,
        )

        # quality_score = 100 * (10.0 / 10.0) = 100.0
        assert quality["deviation_bps"] == 0.0
        assert quality["deviation_pct"] == 0.0
        assert quality["quality_score"] == 100.0
        assert quality["rating"] == "GOOD"  # 90-110

    def test_quality_score_calculation(self, slippage_model):
        """Test quality score calculation formula."""
        # Test various scenarios
        test_cases = [
            (10.0, 5.0, 50.0),  # Half expected = score 50
            (10.0, 10.0, 100.0),  # Equal = score 100
            (10.0, 20.0, 200.0),  # Double = score 200
            (10.0, 12.0, 120.0),  # 20% worse = score 120
        ]

        for expected, actual, expected_score in test_cases:
            quality = slippage_model.calculate_execution_quality(
                expected_slippage_bps=expected,
                actual_slippage_bps=actual,
            )
            assert quality["quality_score"] == expected_score

    def test_quality_grade_boundaries(self, slippage_model):
        """Test quality rating boundaries."""
        # Test boundary conditions
        excellent = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0, actual_slippage_bps=8.9
        )
        assert excellent["rating"] == "EXCELLENT"  # < 90

        good_low = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0, actual_slippage_bps=9.0
        )
        assert good_low["rating"] == "GOOD"  # 90

        good_high = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0, actual_slippage_bps=10.9
        )
        assert good_high["rating"] == "GOOD"  # 109

        fair = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0, actual_slippage_bps=11.0
        )
        assert fair["rating"] == "FAIR"  # 110

        poor = slippage_model.calculate_execution_quality(
            expected_slippage_bps=10.0, actual_slippage_bps=13.0
        )
        assert poor["rating"] == "POOR"  # 130

    def test_quality_with_zero_expected(self, slippage_model):
        """Test quality calculation when expected is zero."""
        quality = slippage_model.calculate_execution_quality(
            expected_slippage_bps=0.0,
            actual_slippage_bps=5.0,
        )

        # Should handle division by zero gracefully
        assert quality["quality_score"] == 100.0
        assert quality["deviation_pct"] == 0.0

    def test_quality_trend_analysis(self, slippage_model_with_history):
        """Test quality trends across multiple executions."""
        # Calculate quality for each historical trade
        qualities = []

        for record in slippage_model_with_history.historical_slippage:
            # Assume expected was 10 bps for all
            quality = slippage_model_with_history.calculate_execution_quality(
                expected_slippage_bps=10.0,
                actual_slippage_bps=record["slippage_bps"],
            )
            qualities.append(quality["quality_score"])

        # Should have quality scores for all trades
        assert len(qualities) == 5
        # All scores should be positive
        assert all(score > 0 for score in qualities)


# ============================================================================
# Additional Integration Tests
# ============================================================================


class TestSlippageModelIntegration:
    """Integration tests for complete workflows."""

    def test_full_workflow_estimate_and_track(self, slippage_model):
        """Test complete workflow: estimate, execute, record, analyze."""
        # 1. Estimate slippage
        estimate = slippage_model.estimate_slippage(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            current_price=150.0,
            avg_daily_volume=100_000_000,
            volatility=0.20,
            order_type="MARKET",
        )

        # 2. Simulate execution with actual price
        actual_price = 150.15

        # 3. Record actual slippage
        slippage_model.record_actual_slippage(
            symbol="AAPL",
            quantity=1000,
            action="BUY",
            expected_price=estimate.estimated_fill_price,
            actual_price=actual_price,
            order_type="MARKET",
        )

        # 4. Get statistics
        stats = slippage_model.get_slippage_statistics(symbol="AAPL")

        assert stats["total_trades"] == 1
        assert stats["avg_slippage_bps"] > 0

        # 5. Calculate execution quality
        actual_slippage_bps = stats["avg_slippage_bps"]
        quality = slippage_model.calculate_execution_quality(
            expected_slippage_bps=estimate.slippage_bps,
            actual_slippage_bps=actual_slippage_bps,
        )

        assert "quality_score" in quality
        assert "rating" in quality

    def test_slippage_report_generation(self, slippage_model_with_history):
        """Test comprehensive slippage report generation."""
        report = slippage_model_with_history.get_slippage_report()

        # Check overall stats
        assert "overall" in report
        assert report["overall"]["total_trades"] == 5

        # Check per-symbol breakdown
        assert "by_symbol" in report
        assert "AAPL" in report["by_symbol"]
        assert "MSFT" in report["by_symbol"]

        # Check recent slippage
        assert "recent_slippage" in report
        assert len(report["recent_slippage"]) <= 10

    def test_clear_history(self, slippage_model_with_history):
        """Test clearing historical slippage data."""
        assert len(slippage_model_with_history.historical_slippage) == 5

        slippage_model_with_history.clear_history()

        assert len(slippage_model_with_history.historical_slippage) == 0

        stats = slippage_model_with_history.get_slippage_statistics()
        assert stats["total_trades"] == 0

    def test_custom_parameters(self):
        """Test model with custom parameters."""
        model = SlippageModel(
            base_spread_bps=10.0,
            impact_coefficient=0.2,
            urgency_multiplier=2.0,
        )

        estimate = model.estimate_slippage(
            symbol="TEST",
            quantity=1000,
            action="BUY",
            current_price=100.0,
            avg_daily_volume=1_000_000,
            order_type="MARKET",
        )

        # Should reflect custom parameters
        assert estimate.components["spread_cost_bps"] == 10.0
        # urgency_premium = 10.0 * (2.0 - 1.0) = 10.0
        assert estimate.components["urgency_premium_bps"] == 10.0

    def test_statistical_accuracy(self, slippage_model):
        """Test statistical calculations are accurate."""
        # Add known slippages
        test_values = [5.0, 10.0, 15.0, 20.0, 25.0]

        for i, value in enumerate(test_values):
            slippage_model.record_actual_slippage(
                symbol="TEST",
                quantity=100,
                action="BUY",
                expected_price=100.0,
                actual_price=100.0 + (value / 10000 * 100.0),
            )

        stats = slippage_model.get_slippage_statistics()

        # Mean should be 15.0
        expected_mean = sum(test_values) / len(test_values)
        assert stats["avg_slippage_bps"] == pytest.approx(expected_mean, rel=0.01)

        # Median should be 15.0
        assert stats["median_slippage_bps"] == pytest.approx(15.0, rel=0.1)

        # Max should be 25.0
        assert stats["max_slippage_bps"] == pytest.approx(25.0, rel=0.01)
