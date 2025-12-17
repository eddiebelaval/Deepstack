"""
Integration tests for Risk Pipeline

Tests the flow: Signal → Position Sizing → Risk Checks → Approval/Rejection

Test Coverage:
- Kelly criterion calculation with portfolio context
- Circuit breaker validation before trade
- Portfolio heat calculation
- Position limit enforcement
- Concentration risk checks
- Stop loss validation
- Risk pyramid compliance
- Multiple risk checks in sequence
- Risk override scenarios
"""

import pytest

from core.risk.circuit_breaker import CircuitBreaker
from core.risk.kelly_position_sizer import KellyPositionSizer
from core.risk.stop_loss_manager import StopLossManager

# ============================================================================
# Kelly Criterion Integration Tests
# ============================================================================


@pytest.fixture
def kelly_sizer_with_positions():
    """Kelly sizer with existing positions."""
    sizer = KellyPositionSizer(
        account_balance=100000.0,
        max_position_pct=0.25,
        max_total_exposure=1.0,
        current_positions={
            "AAPL": 10000.0,  # $10k position
            "MSFT": 15000.0,  # $15k position
        },
    )
    return sizer


def test_kelly_calculation_with_portfolio_context(kelly_sizer_with_positions):
    """Test Kelly calculation considers existing portfolio."""
    sizer = kelly_sizer_with_positions

    # Calculate new position with 55% win rate, 1.5:1 reward/risk
    result = sizer.calculate_position_size(
        win_rate=0.55,
        avg_win=150.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="GOOGL",
    )

    # Should respect portfolio heat (already 25% deployed)
    assert result["position_size"] > 0
    assert result["portfolio_heat"] == 0.25  # 25k / 100k
    assert result["adjusted_pct"] <= 0.75  # Max remaining capacity


def test_kelly_with_concentration_limit_existing_position(kelly_sizer_with_positions):
    """Test Kelly respects concentration when adding to existing position."""
    sizer = kelly_sizer_with_positions

    # Try to add to AAPL (already have $10k)
    result = sizer.calculate_position_size(
        win_rate=0.60,
        avg_win=200.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=150.0,
        symbol="AAPL",  # Already have position
    )

    # Should account for existing position
    assert "warnings" in result
    # Position may be capped due to existing exposure


def test_kelly_with_portfolio_at_capacity():
    """Test Kelly when portfolio is at max capacity."""
    sizer = KellyPositionSizer(
        account_balance=100000.0,
        max_position_pct=0.25,
        max_total_exposure=1.0,
        current_positions={
            "STOCK1": 25000.0,
            "STOCK2": 25000.0,
            "STOCK3": 25000.0,
            "STOCK4": 25000.0,
        },
    )

    # Portfolio is at 100% capacity
    result = sizer.calculate_position_size(
        win_rate=0.60,
        avg_win=200.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="NEW",
    )

    # Should reject - no capacity
    assert result["position_size"] == 0.0
    assert (
        "portfolio_full" in result.get("warnings", [""])[0].lower()
        or result["adjusted_pct"] == 0.0
    )


# ============================================================================
# Circuit Breaker Integration Tests
# ============================================================================


@pytest.fixture
def circuit_breaker_with_history():
    """Circuit breaker with trading history."""
    breaker = CircuitBreaker(
        initial_portfolio_value=100000.0,
        daily_loss_limit=0.03,  # 3% daily loss limit
        max_drawdown_limit=0.10,  # 10% max drawdown
        consecutive_loss_limit=5,
        volatility_threshold=40.0,
    )
    return breaker


def test_circuit_breaker_validation_before_trade(circuit_breaker_with_history):
    """Test circuit breaker check before trade execution."""
    breaker = circuit_breaker_with_history

    # Check breakers with current portfolio value
    status = breaker.check_breakers(
        current_portfolio_value=98000.0,  # Down $2k from $100k
        start_of_day_value=100000.0,
    )

    # Should allow trading (within limits)
    assert status["trading_allowed"] is True
    assert len(status["breakers_tripped"]) == 0


def test_circuit_breaker_trips_on_daily_loss(circuit_breaker_with_history):
    """Test circuit breaker trips on daily loss limit."""
    breaker = circuit_breaker_with_history

    # Simulate 4% daily loss (exceeds 3% limit)
    status = breaker.check_breakers(
        current_portfolio_value=96000.0, start_of_day_value=100000.0  # Down $4k (4%)
    )

    # Should halt trading
    assert status["trading_allowed"] is False
    assert "daily_loss" in status["breakers_tripped"]
    assert status["current_daily_loss_pct"] >= 0.04


def test_circuit_breaker_trips_on_max_drawdown(circuit_breaker_with_history):
    """Test circuit breaker trips on max drawdown."""
    breaker = circuit_breaker_with_history
    breaker.peak_portfolio_value = 100000.0

    # Simulate 12% drawdown (exceeds 10% limit)
    status = breaker.check_breakers(
        current_portfolio_value=88000.0, start_of_day_value=90000.0  # Down $12k (12%)
    )

    # Should halt trading
    assert status["trading_allowed"] is False
    assert "max_drawdown" in status["breakers_tripped"]
    assert status["current_drawdown_pct"] >= 0.10


def test_circuit_breaker_consecutive_losses(circuit_breaker_with_history):
    """Test circuit breaker tracks consecutive losses."""
    breaker = circuit_breaker_with_history

    # Record 5 consecutive losses
    for i in range(5):
        breaker.record_trade(profit_or_loss=-100.0)

    # Check breakers
    status = breaker.check_breakers(
        current_portfolio_value=99500.0, start_of_day_value=100000.0
    )

    # Should trip on consecutive losses
    assert status["trading_allowed"] is False
    assert "consecutive_losses" in status["breakers_tripped"]
    assert status["consecutive_losses"] == 5


def test_circuit_breaker_resets_on_win(circuit_breaker_with_history):
    """Test circuit breaker resets consecutive losses on win."""
    breaker = circuit_breaker_with_history

    # Record losses
    for i in range(4):
        breaker.record_trade(profit_or_loss=-100.0)

    assert breaker.consecutive_losses == 4

    # Record a win
    breaker.record_trade(profit_or_loss=200.0)

    # Should reset
    assert breaker.consecutive_losses == 0
    assert breaker.consecutive_wins == 1


# ============================================================================
# Portfolio Heat Integration Tests
# ============================================================================


def test_portfolio_heat_calculation_with_kelly_sizer():
    """Test portfolio heat calculation via KellyPositionSizer."""
    # Test using KellyPositionSizer directly (which tracks portfolio heat)
    sizer = KellyPositionSizer(
        account_balance=100000.0,
        current_positions={"AAPL": 10000.0, "MSFT": 15000.0, "GOOGL": 5000.0},
    )

    # Calculate new position with 55% win rate, 1.5:1 reward/risk
    result = sizer.calculate_position_size(
        win_rate=0.55,
        avg_win=150.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=200.0,
        symbol="TSLA",
    )

    # Current heat: 30k / 100k = 30%
    assert result["portfolio_heat"] == 0.30
    # Should calculate a valid position
    assert result["position_size"] > 0


def test_portfolio_heat_capped_at_max_exposure():
    """Test portfolio heat is capped when approaching max exposure."""
    # Portfolio at 90% capacity
    sizer = KellyPositionSizer(
        account_balance=100000.0,
        max_total_exposure=1.0,
        current_positions={"AAPL": 30000.0, "MSFT": 30000.0, "GOOGL": 30000.0},
    )

    # Current heat: 90k / 100k = 90%
    # Max remaining capacity: 10%
    result = sizer.calculate_position_size(
        win_rate=0.60,
        avg_win=200.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="TSLA",
    )

    # Should have limited capacity
    assert result["portfolio_heat"] == 0.90
    # Position should be capped to not exceed 100%
    max_allowed = 100000 * 0.10  # Only 10% remaining
    assert result["position_size"] <= max_allowed


# ============================================================================
# Position Limit Integration Tests
# ============================================================================


def test_position_limit_enforcement_single_stock():
    """Test position limit for single stock."""
    sizer = KellyPositionSizer(
        account_balance=100000.0,
        max_position_pct=0.10,  # 10% max per position
        max_total_exposure=1.0,
    )

    # Try to size position
    result = sizer.calculate_position_size(
        win_rate=0.70,  # Very high win rate
        avg_win=300.0,
        avg_loss=100.0,
        kelly_fraction=1.0,  # Full Kelly (aggressive)
        stock_price=100.0,
        symbol="AAPL",
    )

    # Should be capped at 10%
    assert result["adjusted_pct"] <= 0.10
    assert result["position_size"] <= 10000.0


def test_position_limit_with_absolute_dollar_cap():
    """Test position limit with absolute dollar cap."""
    sizer = KellyPositionSizer(
        account_balance=1000000.0,  # $1M portfolio
        max_position_pct=0.25,  # 25% would be $250k
        max_position_size=50000.0,  # But hard cap at $50k
    )

    # Calculate large position
    result = sizer.calculate_position_size(
        win_rate=0.65,
        avg_win=250.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="AAPL",
    )

    # Should hit absolute cap
    assert result["position_size"] <= 50000.0


# ============================================================================
# Stop Loss Integration Tests
# ============================================================================


@pytest.fixture
def stop_loss_manager():
    """Stop loss manager for testing."""
    return StopLossManager(
        account_balance=100000.0,
        max_risk_per_trade=0.02,  # 2% max risk
        default_stop_pct=0.02,
    )


def test_stop_loss_calculation_with_position_size(stop_loss_manager):
    """Test stop loss respects max risk per trade."""
    manager = stop_loss_manager

    # Calculate stop for $10k position
    stop_data = manager.calculate_stop_loss(
        symbol="AAPL",
        entry_price=150.0,
        position_size=10000.0,
        position_side="long",
        stop_type="fixed_pct",
        stop_pct=0.02,  # 2% stop
    )

    # Stop should be 2% below entry
    assert stop_data["stop_price"] == 150.0 * 0.98
    assert stop_data["risk_amount"] <= 2000.0  # 2% of $100k portfolio


def test_stop_loss_respects_max_risk_limit(stop_loss_manager):
    """Test stop loss enforces max risk per trade."""
    manager = stop_loss_manager

    # Try very tight stop on large position that exceeds max risk
    # Position: $50k, Stop: 10% = $5k risk
    # Max risk: 2% of $100k = $2k
    # Should raise ValueError
    with pytest.raises(ValueError, match="exceeds max account risk"):
        manager.calculate_stop_loss(
            symbol="AAPL",
            entry_price=150.0,
            position_size=50000.0,  # $50k position (50% of portfolio)
            position_side="long",
            stop_type="fixed_pct",
            stop_pct=0.10,  # 10% stop (would risk $5k = 5% of portfolio)
        )


def test_stop_loss_within_risk_limit(stop_loss_manager):
    """Test stop loss succeeds when within risk limit."""
    manager = stop_loss_manager

    # Smaller position that stays within 2% risk limit
    # Position: $10k, Stop: 10% = $1k risk (within 2% of $100k)
    stop_data = manager.calculate_stop_loss(
        symbol="AAPL",
        entry_price=150.0,
        position_size=10000.0,  # $10k position
        position_side="long",
        stop_type="fixed_pct",
        stop_pct=0.10,  # 10% stop = $1k risk
    )

    # Should succeed and show risk within limits
    assert stop_data["risk_amount"] <= 2000.0


# ============================================================================
# Multi-Stage Risk Check Integration Tests
# ============================================================================


@pytest.mark.asyncio
async def test_complete_risk_pipeline_approval():
    """Test complete risk pipeline approves valid trade."""
    # Setup risk components
    kelly = KellyPositionSizer(
        account_balance=100000.0,
        max_position_pct=0.15,
        current_positions={"AAPL": 10000.0},
    )

    breaker = CircuitBreaker(
        initial_portfolio_value=100000.0, daily_loss_limit=0.03, max_drawdown_limit=0.10
    )

    stop_mgr = StopLossManager(account_balance=100000.0, max_risk_per_trade=0.02)

    # Stage 1: Kelly position sizing
    kelly_result = kelly.calculate_position_size(
        win_rate=0.55,
        avg_win=150.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="MSFT",
    )
    assert kelly_result["position_size"] > 0

    # Stage 2: Circuit breaker check
    breaker_status = breaker.check_breakers(
        current_portfolio_value=100000.0, start_of_day_value=100000.0
    )
    assert breaker_status["trading_allowed"] is True

    # Stage 3: Stop loss validation
    stop_data = stop_mgr.calculate_stop_loss(
        symbol="MSFT",
        entry_price=100.0,
        position_size=kelly_result["position_size"],
        position_side="long",
        stop_type="fixed_pct",
    )
    assert stop_data["stop_price"] > 0

    # All stages passed - trade approved
    assert kelly_result["position_size"] > 0
    assert breaker_status["trading_allowed"] is True
    assert stop_data["risk_amount"] > 0


@pytest.mark.asyncio
async def test_complete_risk_pipeline_rejection():
    """Test complete risk pipeline rejects excessive risk."""
    # Setup risk components with triggered breaker
    kelly = KellyPositionSizer(
        account_balance=90000.0, max_position_pct=0.15  # Down from $100k
    )

    breaker = CircuitBreaker(
        initial_portfolio_value=100000.0, daily_loss_limit=0.03, max_drawdown_limit=0.10
    )

    # Stage 1: Kelly sizing (may still approve)
    kelly_result = kelly.calculate_position_size(
        win_rate=0.55,
        avg_win=150.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="MSFT",
    )

    # Stage 2: Circuit breaker check (should reject due to drawdown)
    breaker.peak_portfolio_value = 100000.0
    breaker_status = breaker.check_breakers(
        current_portfolio_value=85000.0,  # 15% drawdown (exceeds 10% limit)
        start_of_day_value=90000.0,
    )

    # Should be rejected at breaker stage
    assert breaker_status["trading_allowed"] is False
    assert len(breaker_status["breakers_tripped"]) > 0


# ============================================================================
# Risk Pyramid Integration Tests
# ============================================================================


def test_risk_pyramid_with_tiered_positions():
    """Test risk pyramid with tiered position sizing."""
    sizer = KellyPositionSizer(
        account_balance=100000.0, max_position_pct=0.20, current_positions={}  # 20% max
    )

    # Tier 1: High confidence (larger position)
    tier1 = sizer.calculate_position_size(
        win_rate=0.65,  # 65% win rate
        avg_win=200.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="HIGHCONF",
    )

    # Tier 2: Medium confidence (smaller position)
    tier2 = sizer.calculate_position_size(
        win_rate=0.55,  # 55% win rate
        avg_win=150.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="MEDCONF",
    )

    # Tier 3: Lower confidence (smallest position)
    tier3 = sizer.calculate_position_size(
        win_rate=0.52,  # 52% win rate
        avg_win=130.0,
        avg_loss=100.0,
        kelly_fraction=0.5,
        stock_price=100.0,
        symbol="LOWCONF",
    )

    # Should have pyramid structure (higher confidence = larger size)
    assert tier1["adjusted_pct"] >= tier2["adjusted_pct"]
    assert tier2["adjusted_pct"] >= tier3["adjusted_pct"]


# ============================================================================
# Risk Override Scenarios
# ============================================================================


def test_manual_circuit_breaker_trip():
    """Test manual circuit breaker trip (override)."""
    breaker = CircuitBreaker(
        initial_portfolio_value=100000.0, daily_loss_limit=0.03, max_drawdown_limit=0.10
    )

    # Manually trip breaker
    trip_result = breaker.trip_breaker(
        breaker_type="manual", reason="Manual halt due to market conditions"
    )

    assert trip_result["tripped"] is True
    assert trip_result["confirmation_code"] is not None

    # Check status
    status = breaker.check_breakers(current_portfolio_value=100000.0)
    assert status["trading_allowed"] is False


def test_circuit_breaker_reset_with_confirmation():
    """Test circuit breaker reset requires confirmation."""
    breaker = CircuitBreaker(
        initial_portfolio_value=100000.0, daily_loss_limit=0.03, max_drawdown_limit=0.10
    )

    # Trip breaker
    trip_result = breaker.trip_breaker(breaker_type="manual", reason="Test trip")

    confirmation_code = trip_result["confirmation_code"]

    # Reset with confirmation
    reset_result = breaker.reset_breaker(
        breaker_type="manual",
        confirmation_code=confirmation_code,
        reset_reason="Test complete",
    )

    assert reset_result["reset_successful"] is True

    # Should allow trading again
    status = breaker.check_breakers(current_portfolio_value=100000.0)
    assert status["trading_allowed"] is True


def test_circuit_breaker_reset_fails_without_confirmation():
    """Test circuit breaker reset fails without correct confirmation."""
    breaker = CircuitBreaker(
        initial_portfolio_value=100000.0, daily_loss_limit=0.03, max_drawdown_limit=0.10
    )

    # Trip breaker
    breaker.trip_breaker(breaker_type="manual", reason="Test")

    # Try to reset with wrong confirmation code
    with pytest.raises(PermissionError):
        breaker.reset_breaker(
            breaker_type="manual",
            confirmation_code="WRONG_CODE",
            reset_reason="Attempted bypass",
        )


# ============================================================================
# Edge Case Risk Tests
# ============================================================================


def test_risk_pipeline_with_zero_account_balance():
    """Test risk pipeline handles zero balance gracefully."""
    with pytest.raises(ValueError):
        KellyPositionSizer(account_balance=0.0)


def test_risk_pipeline_with_negative_win_rate():
    """Test risk pipeline rejects negative win rate."""
    sizer = KellyPositionSizer(account_balance=100000.0)

    result = sizer.calculate_position_size(
        win_rate=-0.1, avg_win=150.0, avg_loss=100.0, kelly_fraction=0.5  # Invalid
    )

    # Should reject
    assert result["position_size"] == 0.0
    assert not result["rationale"].startswith("Kelly position")


def test_risk_pipeline_with_zero_kelly_fraction():
    """Test risk pipeline with zero Kelly fraction."""
    sizer = KellyPositionSizer(account_balance=100000.0)

    result = sizer.calculate_position_size(
        win_rate=0.55,
        avg_win=150.0,
        avg_loss=100.0,
        kelly_fraction=0.0,  # No position
        stock_price=100.0,
    )

    # Should return zero position
    assert result["position_size"] == 0.0
