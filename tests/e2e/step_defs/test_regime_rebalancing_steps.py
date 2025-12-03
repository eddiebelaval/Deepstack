"""
Step definitions for regime rebalancing E2E test.

Tests the regime detection and portfolio rebalancing workflow.
"""

from datetime import datetime

from pytest_bdd import given, parsers, scenarios, then, when

from core.regime.regime_allocator import RegimeBasedAllocator
from core.regime.regime_detector import (
    MarketRegime,
    RegimeDetector,
    RegimeFactors,
)

# Load scenarios from feature file
scenarios("../features/regime_rebalancing.feature")


# Shared step definitions
@given("the trading system is initialized")
def trading_system_initialized(e2e_trading_system):
    """Verify trading system is ready."""
    assert e2e_trading_system is not None
    assert e2e_trading_system["trader"] is not None


@given(parsers.parse("the portfolio has {amount:d} dollars in cash"))
def portfolio_with_cash(e2e_trading_system, amount):
    """Initialize portfolio with specified cash."""
    trader = e2e_trading_system["trader"]
    assert trader.get_portfolio_value() == amount


@given("the current regime is BULL")
def set_current_regime_bull(e2e_trading_system):
    """Set current market regime to BULL."""
    e2e_trading_system["_current_regime"] = MarketRegime.BULL


@given("the market shows defensive regime signals")
def set_defensive_regime_signals(e2e_trading_system):
    """Set market conditions indicating defensive regime (BEAR or CRISIS)."""
    # Note: May detect as BEAR or CRISIS depending on VIX level
    e2e_trading_system["_defensive_mode"] = True
    e2e_trading_system["_regime_signals"] = {
        "vix": 32.0,  # High volatility
        "sma_50": 4500.0,
        "sma_200": 4600.0,  # Death cross (50 below 200)
        "price": 4450.0,
        "adx": 30.0,  # Strong trend
        "advance_decline_ratio": 0.6,  # More declining
        "new_highs_lows_ratio": 0.4,  # More new lows
    }


@given("the market shows BULL regime signals")
def set_bull_regime_signals(e2e_trading_system):
    """Set market conditions indicating BULL regime."""
    e2e_trading_system["_target_regime"] = MarketRegime.BULL
    e2e_trading_system["_regime_signals"] = {
        "vix": 15.0,  # Low volatility
        "sma_50": 4600.0,
        "sma_200": 4500.0,  # Golden cross (50 above 200)
        "price": 4650.0,
        "adx": 28.0,  # Strong trend
        "advance_decline_ratio": 1.6,  # More advancing
        "new_highs_lows_ratio": 2.5,  # More new highs
    }


@given(parsers.parse("VIX is above {level:d}"))
def vix_above_level(e2e_trading_system, level):
    """Set VIX above specified level."""
    signals = e2e_trading_system.get("_regime_signals", {})
    # Set VIX slightly above, but not too high to avoid CRISIS
    signals["vix"] = min(float(level) + 2.0, 32.0)  # Cap at 32 to stay in BEAR range
    e2e_trading_system["_regime_signals"] = signals


@given(parsers.parse("VIX is below {level:d}"))
def vix_below_level(e2e_trading_system, level):
    """Set VIX below specified level."""
    signals = e2e_trading_system.get("_regime_signals", {})
    signals["vix"] = float(level) - 5.0  # Ensure it's below
    e2e_trading_system["_regime_signals"] = signals


@given("the SMA 50 crosses below SMA 200")
def sma_death_cross(e2e_trading_system):
    """Set death cross condition (bearish)."""
    signals = e2e_trading_system.get("_regime_signals", {})
    signals["sma_50"] = 4500.0
    signals["sma_200"] = 4600.0  # 50 below 200
    e2e_trading_system["_regime_signals"] = signals


@given("the SMA 50 is above SMA 200")
def sma_golden_cross(e2e_trading_system):
    """Set golden cross condition (bullish)."""
    signals = e2e_trading_system.get("_regime_signals", {})
    signals["sma_50"] = 4600.0
    signals["sma_200"] = 4500.0  # 50 above 200
    e2e_trading_system["_regime_signals"] = signals


@when("the regime detector analyzes market conditions")
def analyze_regime(e2e_trading_system):
    """Analyze market conditions to detect regime."""
    signals = e2e_trading_system.get("_regime_signals", {})

    # Create regime detector
    detector = RegimeDetector()

    # Create regime factors from signals
    factors = RegimeFactors(
        sma_50=signals.get("sma_50", 4500.0),
        sma_200=signals.get("sma_200", 4400.0),
        price=signals.get("price", 4550.0),
        adx=signals.get("adx", 25.0),
        vix=signals.get("vix", 20.0),
        realized_volatility=signals.get("vix", 20.0) / 100,  # Convert VIX to decimal
        advance_decline_ratio=signals.get("advance_decline_ratio", 1.0),
        new_highs_lows_ratio=signals.get("new_highs_lows_ratio", 1.0),
        correlation=0.7,  # Default correlation
        timestamp=datetime.now(),
    )

    # Detect regime
    detection = detector.detect_regime(factors)

    e2e_trading_system["regime_detection"] = detection
    e2e_trading_system["regime_detector"] = detector


@then("a defensive regime should be detected")
def verify_defensive_regime(e2e_trading_system):
    """Verify defensive regime was detected (BEAR or CRISIS)."""
    detection = e2e_trading_system.get("regime_detection")

    assert detection is not None, "Regime detection should not be None"
    assert detection.regime in [
        MarketRegime.BEAR,
        MarketRegime.CRISIS,
    ], f"Expected BEAR or CRISIS regime, got {detection.regime.value}"


@then("a BULL regime should be detected")
def verify_bull_regime(e2e_trading_system):
    """Verify BULL regime was detected."""
    detection = e2e_trading_system.get("regime_detection")

    assert detection is not None, "Regime detection should not be None"
    assert (
        detection.regime == MarketRegime.BULL
    ), f"Expected BULL regime, got {detection.regime.value}"


@then(parsers.parse("the confidence should be above {threshold:d} percent"))
def verify_confidence_above_threshold(e2e_trading_system, threshold):
    """Verify regime detection confidence is above threshold."""
    detection = e2e_trading_system.get("regime_detection")

    assert detection is not None, "Regime detection should exist"
    assert (
        detection.confidence > threshold
    ), f"Confidence {detection.confidence:.1f}% should be above {threshold}%"


@then("a rebalance plan should be generated")
def verify_rebalance_plan(e2e_trading_system):
    """Verify rebalance plan was generated."""
    detection = e2e_trading_system.get("regime_detection")
    current_regime = e2e_trading_system.get("_current_regime", MarketRegime.BULL)

    # Create allocator
    allocator = RegimeBasedAllocator()

    # Generate rebalance plan
    plan = allocator.create_rebalance_plan(
        detection=detection,
        current_allocations={
            "deep_value": 40.0,
            "growth": 30.0,
            "squeeze_hunter": 20.0,
            "momentum": 10.0,
        },
        current_regime=current_regime,
    )

    assert plan is not None, "Rebalance plan should be generated"
    assert len(plan.actions) > 0, "Rebalance plan should have actions"

    # Store plan
    e2e_trading_system["rebalance_plan"] = plan


@then("regime should remain unchanged")
def verify_regime_unchanged(e2e_trading_system):
    """Verify regime remains unchanged."""
    detection = e2e_trading_system.get("regime_detection")
    current_regime = e2e_trading_system.get("_current_regime", MarketRegime.BULL)

    # Verify detected regime matches current regime
    assert (
        detection.regime == current_regime
    ), f"Detected regime {detection.regime.value} should match current {current_regime.value}"
