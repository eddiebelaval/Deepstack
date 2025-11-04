"""
Unit tests for KellyPositionSizer - Kelly Criterion Position Sizing

Tests comprehensive Kelly Criterion implementation including:
- Core Kelly formula calculations
- Fractional Kelly sizing
- Position caps enforcement
- Portfolio heat management
- Edge case handling
- Input validation

Each test includes hand calculations to verify Kelly math correctness.
"""

import sys
from pathlib import Path

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.risk.kelly_position_sizer import KellyPositionSizer


class TestKellyCalculation:
    """Test core Kelly Criterion formula calculations."""

    def test_kelly_basic_calculation_positive_edge(self):
        """
        Test basic Kelly calculation with positive edge.

        Hand Calculation:
        - Win rate (W) = 0.55 (55%)
        - Loss rate (L) = 0.45 (45%)
        - Avg win = $1,500
        - Avg loss = $1,000
        - Win/Loss ratio (R) = 1,500 / 1,000 = 1.5

        Kelly % = (W × R - L) / R
                = (0.55 × 1.5 - 0.45) / 1.5
                = (0.825 - 0.45) / 1.5
                = 0.375 / 1.5
                = 0.25 (25%)

        With 0.5x fractional Kelly = 12.5%
        """
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.55, avg_win=1500, avg_loss=1000, kelly_fraction=0.5
        )

        # Verify Kelly calculation
        expected_kelly = 0.25  # 25%
        assert abs(result["kelly_pct"] - expected_kelly) < 0.001

        # Verify fractional Kelly
        expected_fractional = expected_kelly * 0.5  # 12.5%
        assert abs(result["adjusted_pct"] - expected_fractional) < 0.001

        # Verify position size
        expected_position = 100000 * expected_fractional  # $12,500
        assert abs(result["position_size"] - expected_position) < 1.0

        # Verify win/loss ratio
        assert abs(result["win_loss_ratio"] - 1.5) < 0.001

    def test_kelly_high_win_rate_calculation(self):
        """
        Test Kelly with high win rate.

        Hand Calculation:
        - Win rate (W) = 0.70 (70%)
        - Loss rate (L) = 0.30 (30%)
        - Avg win = $2,000
        - Avg loss = $1,000
        - Win/Loss ratio (R) = 2.0

        Kelly % = (0.70 × 2.0 - 0.30) / 2.0
                = (1.40 - 0.30) / 2.0
                = 1.10 / 2.0
                = 0.55 (55%)

        Capped at max_position_pct = 0.25 (25%)
        """
        sizer = KellyPositionSizer(account_balance=100000, max_position_pct=0.25)

        result = sizer.calculate_position_size(
            win_rate=0.70,
            avg_win=2000,
            avg_loss=1000,
            kelly_fraction=1.0,  # Full Kelly to test cap
        )

        # Raw Kelly should be 55%
        expected_kelly = 0.55
        assert abs(result["kelly_pct"] - expected_kelly) < 0.001

        # Should be capped at 25%
        assert result["adjusted_pct"] == 0.25
        assert "max_position_pct" in result["rationale"]

    def test_kelly_low_win_rate_calculation(self):
        """
        Test Kelly with low win rate but high win/loss ratio.

        Hand Calculation:
        - Win rate (W) = 0.35 (35%)
        - Loss rate (L) = 0.65 (65%)
        - Avg win = $3,000
        - Avg loss = $500
        - Win/Loss ratio (R) = 6.0

        Kelly % = (0.35 × 6.0 - 0.65) / 6.0
                = (2.10 - 0.65) / 6.0
                = 1.45 / 6.0
                = 0.2417 (24.17%)

        With 0.5x fractional Kelly = 12.08%
        """
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.35, avg_win=3000, avg_loss=500, kelly_fraction=0.5
        )

        expected_kelly = (0.35 * 6.0 - 0.65) / 6.0
        assert abs(result["kelly_pct"] - expected_kelly) < 0.001

        expected_fractional = expected_kelly * 0.5
        assert abs(result["adjusted_pct"] - expected_fractional) < 0.001

    def test_kelly_negative_edge(self):
        """
        Test Kelly with negative edge (no bet).

        Hand Calculation:
        - Win rate (W) = 0.40 (40%)
        - Loss rate (L) = 0.60 (60%)
        - Avg win = $1,000
        - Avg loss = $1,000
        - Win/Loss ratio (R) = 1.0

        Kelly % = (0.40 × 1.0 - 0.60) / 1.0
                = (0.40 - 0.60) / 1.0
                = -0.20 (-20%)

        Negative Kelly = no position
        """
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.40, avg_win=1000, avg_loss=1000, kelly_fraction=0.5
        )

        # Kelly should be negative
        assert result["kelly_pct"] < 0

        # Position size should be 0
        assert result["position_size"] == 0.0
        assert result["adjusted_pct"] == 0.0
        assert "Negative edge" in result["rationale"]

    def test_kelly_breakeven_edge(self):
        """
        Test Kelly at breakeven (edge = 0).

        Hand Calculation:
        - Win rate (W) = 0.50 (50%)
        - Loss rate (L) = 0.50 (50%)
        - Win/Loss ratio (R) = 1.0

        Kelly % = (0.50 × 1.0 - 0.50) / 1.0 = 0

        Zero Kelly = no position
        """
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.50, avg_win=1000, avg_loss=1000, kelly_fraction=0.5
        )

        # Kelly should be 0 or very close
        assert abs(result["kelly_pct"]) < 0.001
        assert result["position_size"] == 0.0


class TestFractionalKelly:
    """Test fractional Kelly sizing (0.25x, 0.5x, 1.0x)."""

    def test_quarter_kelly(self):
        """Test quarter Kelly (0.25x) conservative sizing."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.60,
            avg_win=2000,
            avg_loss=1000,
            kelly_fraction=0.25,  # Quarter Kelly
        )

        # Raw Kelly = (0.60 × 2.0 - 0.40) / 2.0 = 0.40 (40%)
        # Quarter Kelly = 40% × 0.25 = 10%
        expected_kelly = 0.40
        assert abs(result["kelly_pct"] - expected_kelly) < 0.001

        expected_position_pct = expected_kelly * 0.25
        assert abs(result["adjusted_pct"] - expected_position_pct) < 0.001

    def test_half_kelly(self):
        """Test half Kelly (0.5x) - recommended default."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5  # Half Kelly
        )

        # Raw Kelly = 40%
        # Half Kelly = 40% × 0.5 = 20%
        expected_kelly = 0.40
        expected_position_pct = expected_kelly * 0.5

        assert abs(result["kelly_pct"] - expected_kelly) < 0.001
        assert abs(result["adjusted_pct"] - expected_position_pct) < 0.001

    def test_full_kelly(self):
        """Test full Kelly (1.0x) - most aggressive."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=1.0  # Full Kelly
        )

        # Raw Kelly = 40%
        # Full Kelly = 40% × 1.0 = 40% (but capped at 25%)
        expected_kelly = 0.40
        assert abs(result["kelly_pct"] - expected_kelly) < 0.001

        # Should be capped at max_position_pct
        assert result["adjusted_pct"] == 0.25


class TestPositionCaps:
    """Test position size caps enforcement."""

    def test_max_position_pct_cap(self):
        """Test 25% max position cap enforcement."""
        sizer = KellyPositionSizer(account_balance=100000, max_position_pct=0.25)

        # Try to get 50% position (will be capped)
        result = sizer.calculate_position_size(
            win_rate=0.75, avg_win=3000, avg_loss=1000, kelly_fraction=1.0
        )

        # Should be capped at 25%
        assert result["adjusted_pct"] == 0.25
        assert result["position_size"] == 25000.0
        assert (
            "cap" in result["rationale"].lower()
            or "adjusted" in result["rationale"].lower()
        )

    def test_custom_max_position_cap(self):
        """Test custom max position cap (e.g., 10%)."""
        sizer = KellyPositionSizer(
            account_balance=100000, max_position_pct=0.10  # 10% max
        )

        result = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5
        )

        # Would be 20% without cap, should be 10%
        assert result["adjusted_pct"] == 0.10
        assert result["position_size"] == 10000.0

    def test_min_position_size_enforcement(self):
        """Test minimum position size enforcement."""
        sizer = KellyPositionSizer(
            account_balance=100000, min_position_size=1000  # $1,000 minimum
        )

        # Calculate very small position
        result = sizer.calculate_position_size(
            win_rate=0.51,  # Barely positive edge
            avg_win=1000,
            avg_loss=1000,
            kelly_fraction=0.25,
        )

        # Should be rejected if below minimum
        if result["position_size"] > 0:
            assert result["position_size"] >= 1000

    def test_max_position_size_dollar_cap(self):
        """Test absolute dollar maximum enforcement."""
        sizer = KellyPositionSizer(
            account_balance=1000000,  # $1M account
            max_position_pct=0.25,
            max_position_size=50000,  # $50k hard cap
        )

        result = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=1.0
        )

        # 25% of $1M = $250k, but hard cap at $50k
        assert result["position_size"] == 50000.0


class TestPortfolioHeat:
    """Test portfolio heat (total exposure) management."""

    def test_empty_portfolio_zero_heat(self):
        """Test that empty portfolio has zero heat."""
        sizer = KellyPositionSizer(account_balance=100000, current_positions={})

        heat = sizer.get_portfolio_heat()
        assert heat == 0.0

    def test_portfolio_heat_calculation(self):
        """Test portfolio heat calculation with existing positions."""
        sizer = KellyPositionSizer(
            account_balance=100000,
            current_positions={
                "AAPL": 10000,  # $10k position
                "GOOGL": 5000,  # $5k position
            },
        )

        heat = sizer.get_portfolio_heat()
        expected_heat = 15000 / 100000  # 15%
        assert abs(heat - expected_heat) < 0.001

    def test_portfolio_heat_limits_new_position(self):
        """Test that portfolio heat limits reduce available capacity."""
        sizer = KellyPositionSizer(
            account_balance=100000,
            max_total_exposure=1.0,  # 100% max
            current_positions={
                "AAPL": 50000,  # 50% already invested
                "GOOGL": 30000,  # 30% already invested
            },
        )

        # Try to take 40% position (would exceed 100%)
        result = sizer.calculate_position_size(
            win_rate=0.60,
            avg_win=2000,
            avg_loss=1000,
            kelly_fraction=1.0,  # Full Kelly = 40%
        )

        # Should be limited to 20% (remaining capacity)
        # Current: 80%, Max: 100%, Available: 20%
        assert result["adjusted_pct"] <= 0.20
        assert "portfolio" in result["rationale"].lower()

    def test_portfolio_full_no_capacity(self):
        """Test that full portfolio prevents new positions."""
        sizer = KellyPositionSizer(
            account_balance=100000,
            max_total_exposure=1.0,
            current_positions={
                "AAPL": 60000,
                "GOOGL": 40000,
            },
        )

        result = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5
        )

        # Portfolio at 100%, no room
        assert result["position_size"] == 0.0
        assert (
            "capacity" in result["rationale"].lower()
            or "portfolio" in result["rationale"].lower()
        )

    def test_existing_position_replacement(self):
        """Test that existing position in same symbol is accounted for."""
        sizer = KellyPositionSizer(
            account_balance=100000,
            max_position_pct=0.25,
            current_positions={
                "AAPL": 15000,  # Existing 15% position
            },
        )

        # Try to size AAPL position (should account for existing)
        result = sizer.calculate_position_size(
            win_rate=0.60,
            avg_win=2000,
            avg_loss=1000,
            kelly_fraction=0.5,
            symbol="AAPL",
        )

        # Should allow full sizing since existing AAPL is being replaced
        assert result["adjusted_pct"] > 0.0


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_zero_win_rate(self):
        """Test 0% win rate (always lose)."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.0, avg_win=1000, avg_loss=1000, kelly_fraction=0.5
        )

        # Should recommend no position
        assert result["position_size"] == 0.0
        assert result["kelly_pct"] < 0

    def test_hundred_percent_win_rate(self):
        """Test 100% win rate (always win)."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=1.0,  # 100% win rate
            avg_win=1000,
            avg_loss=1000,
            kelly_fraction=0.5,
        )

        # Kelly = (1.0 × 1.0 - 0.0) / 1.0 = 1.0 (100%)
        # Should be capped at max position
        assert result["kelly_pct"] == 1.0
        assert result["adjusted_pct"] == 0.25  # Capped

    def test_very_small_account(self):
        """Test with very small account balance."""
        sizer = KellyPositionSizer(
            account_balance=1000, min_position_size=100  # $1,000 account
        )

        result = sizer.calculate_position_size(
            win_rate=0.55, avg_win=100, avg_loss=100, kelly_fraction=0.5
        )

        # Should still work with small account
        assert result["position_size"] >= 0

    def test_very_large_account(self):
        """Test with very large account balance."""
        sizer = KellyPositionSizer(
            account_balance=10000000,  # $10M account
            max_position_size=100000,  # $100k cap
        )

        result = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5
        )

        # Should respect dollar cap
        assert result["position_size"] <= 100000

    def test_equal_avg_win_loss(self):
        """Test when average win equals average loss."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.60,  # 60% win rate
            avg_win=1000,
            avg_loss=1000,  # Same as avg win
            kelly_fraction=0.5,
        )

        # Kelly = (0.60 × 1.0 - 0.40) / 1.0 = 0.20 (20%)
        # Half Kelly = 10%
        assert abs(result["kelly_pct"] - 0.20) < 0.001
        assert abs(result["adjusted_pct"] - 0.10) < 0.001


class TestInputValidation:
    """Test input validation and error handling."""

    def test_invalid_win_rate_above_one(self):
        """Test that win rate > 1 is rejected."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=1.5, avg_win=1000, avg_loss=1000, kelly_fraction=0.5  # Invalid
        )

        assert result["position_size"] == 0.0
        assert "Win rate must be between 0 and 1" in result["rationale"]

    def test_invalid_win_rate_negative(self):
        """Test that negative win rate is rejected."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=-0.1, avg_win=1000, avg_loss=1000, kelly_fraction=0.5  # Invalid
        )

        assert result["position_size"] == 0.0
        assert "Win rate must be between 0 and 1" in result["rationale"]

    def test_invalid_negative_avg_win(self):
        """Test that negative average win is rejected."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.55, avg_win=-1000, avg_loss=1000, kelly_fraction=0.5  # Invalid
        )

        assert result["position_size"] == 0.0
        assert "positive" in result["rationale"].lower()

    def test_invalid_zero_avg_loss(self):
        """Test that zero average loss is rejected."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.55, avg_win=1000, avg_loss=0, kelly_fraction=0.5  # Invalid
        )

        assert result["position_size"] == 0.0
        assert "positive" in result["rationale"].lower()

    def test_invalid_kelly_fraction_above_one(self):
        """Test that Kelly fraction > 1 is rejected."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.55, avg_win=1000, avg_loss=1000, kelly_fraction=1.5  # Invalid
        )

        assert result["position_size"] == 0.0
        assert "Kelly fraction must be between 0 and 1" in result["rationale"]

    def test_invalid_account_balance_init(self):
        """Test that invalid account balance raises error on init."""
        with pytest.raises(ValueError, match="Account balance must be positive"):
            KellyPositionSizer(account_balance=0)

        with pytest.raises(ValueError, match="Account balance must be positive"):
            KellyPositionSizer(account_balance=-10000)

    def test_invalid_max_position_pct_init(self):
        """Test that invalid max_position_pct raises error on init."""
        with pytest.raises(ValueError, match="max_position_pct must be between"):
            KellyPositionSizer(account_balance=100000, max_position_pct=0)

        with pytest.raises(ValueError, match="max_position_pct must be between"):
            KellyPositionSizer(account_balance=100000, max_position_pct=1.5)

    def test_invalid_min_max_position_size(self):
        """Test that max < min position size raises error."""
        with pytest.raises(ValueError, match="max_position_size.*must be >="):
            KellyPositionSizer(
                account_balance=100000,
                min_position_size=10000,
                max_position_size=5000,  # Less than min
            )


class TestShareCalculation:
    """Test share quantity calculation when stock price provided."""

    def test_shares_calculation_basic(self):
        """Test basic share calculation."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.55,
            avg_win=1500,
            avg_loss=1000,
            kelly_fraction=0.5,
            stock_price=100.0,
        )

        # Half Kelly of 25% = 12.5% = $12,500
        # At $100/share = 125 shares
        assert result["shares"] == 125
        assert result["position_size"] == 12500.0

    def test_shares_calculation_fractional_shares_rounded_down(self):
        """Test that fractional shares are rounded down."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.55,
            avg_win=1500,
            avg_loss=1000,
            kelly_fraction=0.5,
            stock_price=99.0,  # Odd price
        )

        # $12,500 / $99 = 126.26 shares -> 126 shares
        assert result["shares"] == 126
        assert result["position_size"] == 126 * 99.0

    def test_shares_calculation_expensive_stock(self):
        """Test share calculation for expensive stock."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.60,
            avg_win=2000,
            avg_loss=1000,
            kelly_fraction=0.5,
            stock_price=1500.0,  # Expensive stock
        )

        # Should calculate appropriate shares
        if result["shares"] is not None:
            assert result["shares"] > 0
            assert result["position_size"] == result["shares"] * 1500.0

    def test_no_shares_when_price_not_provided(self):
        """Test that shares is None when price not provided."""
        sizer = KellyPositionSizer(account_balance=100000)

        result = sizer.calculate_position_size(
            win_rate=0.55,
            avg_win=1500,
            avg_loss=1000,
            kelly_fraction=0.5,
            # No stock_price
        )

        assert result["shares"] is None
        assert result["position_size"] > 0  # Dollar amount still calculated


class TestIntegration:
    """Integration tests for end-to-end position sizing."""

    def test_realistic_trading_scenario(self):
        """Test realistic trading scenario with all features."""
        # Setup: $100k account, 3 existing positions
        sizer = KellyPositionSizer(
            account_balance=100000,
            max_position_pct=0.25,
            max_total_exposure=1.0,
            min_position_size=100,
            max_position_size=50000,
            current_positions={
                "AAPL": 15000,  # 15% position
                "GOOGL": 12000,  # 12% position
                "MSFT": 8000,  # 8% position
            },
        )

        # Scenario: Analyze new position with good stats
        result = sizer.calculate_position_size(
            win_rate=0.58,
            avg_win=1800,
            avg_loss=1200,
            kelly_fraction=0.5,
            stock_price=150.0,
            symbol="TSLA",
        )

        # Verify result has all expected fields
        assert "position_size" in result
        assert "shares" in result
        assert "kelly_pct" in result
        assert "adjusted_pct" in result
        assert "win_loss_ratio" in result
        assert "fractional_kelly" in result
        assert "rationale" in result
        assert "warnings" in result
        assert "portfolio_heat" in result

        # Verify constraints are respected
        current_heat = 35000 / 100000  # 35%
        assert result["portfolio_heat"] == current_heat

        if result["position_size"] > 0:
            total_exposure = current_heat + result["adjusted_pct"]
            assert total_exposure <= 1.0  # Max 100% exposure
            assert result["adjusted_pct"] <= 0.25  # Max 25% per position

    def test_update_positions_and_recalculate(self):
        """Test updating positions and recalculating."""
        sizer = KellyPositionSizer(
            account_balance=100000, current_positions={"AAPL": 10000}
        )

        # Initial calculation
        result1 = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5
        )

        # Update positions (sold AAPL, bought GOOGL)
        sizer.update_positions(
            {
                "GOOGL": 20000,
                "MSFT": 15000,
            }
        )

        # Recalculate
        result2 = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5
        )

        # Portfolio heat should be different
        assert result1["portfolio_heat"] != result2["portfolio_heat"]

    def test_update_account_balance(self):
        """Test updating account balance."""
        sizer = KellyPositionSizer(account_balance=100000)

        # Initial calculation
        result1 = sizer.calculate_position_size(
            win_rate=0.55, avg_win=1500, avg_loss=1000, kelly_fraction=0.5
        )

        # Update balance (account grew)
        sizer.update_account_balance(150000)

        # Recalculate
        result2 = sizer.calculate_position_size(
            win_rate=0.55, avg_win=1500, avg_loss=1000, kelly_fraction=0.5
        )

        # Position size should be larger
        assert result2["position_size"] > result1["position_size"]

    def test_get_position_info(self):
        """Test getting sizer configuration and state."""
        sizer = KellyPositionSizer(
            account_balance=100000,
            max_position_pct=0.25,
            current_positions={
                "AAPL": 15000,
                "GOOGL": 10000,
            },
        )

        info = sizer.get_position_info()

        assert info["account_balance"] == 100000
        assert info["max_position_pct"] == 0.25
        assert info["current_heat"] == 0.25  # 25k / 100k
        assert info["remaining_capacity"] == 0.75  # 75% available
        assert info["num_positions"] == 2
        assert "AAPL" in info["position_symbols"]
        assert "GOOGL" in info["position_symbols"]


class TestMultiplePositions:
    """Test scenarios with multiple positions and portfolio management."""

    def test_portfolio_with_four_positions(self):
        """Test portfolio heat with multiple positions."""
        sizer = KellyPositionSizer(
            account_balance=100000,
            max_position_pct=0.25,
            current_positions={
                "AAPL": 20000,  # 20%
                "GOOGL": 15000,  # 15%
                "MSFT": 12000,  # 12%
                "TSLA": 8000,  # 8%
            },
        )

        heat = sizer.get_portfolio_heat()
        expected_heat = 55000 / 100000  # 55%
        assert abs(heat - expected_heat) < 0.001

        # Try to add another position
        result = sizer.calculate_position_size(
            win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5
        )

        # Should be limited by remaining capacity (45%)
        # Kelly would be 20%, but we have 45% room
        assert result["adjusted_pct"] <= 0.45

    def test_diversified_portfolio_management(self):
        """Test managing a diversified portfolio."""
        # Start with concentrated portfolio
        sizer = KellyPositionSizer(
            account_balance=100000,
            max_position_pct=0.20,  # 20% max to encourage diversification
            current_positions={
                "SPY": 20000,  # 20%
                "QQQ": 20000,  # 20%
            },
        )

        # Add third position
        result = sizer.calculate_position_size(
            win_rate=0.58, avg_win=1800, avg_loss=1200, kelly_fraction=0.5, symbol="IWM"
        )

        # Should allow new position
        assert result["position_size"] > 0
        assert result["adjusted_pct"] <= 0.20  # Respect max per position
