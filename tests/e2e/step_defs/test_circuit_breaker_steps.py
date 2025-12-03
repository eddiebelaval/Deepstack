"""
Step definitions for circuit breaker E2E test.

Tests the circuit breaker risk management workflow.
"""

from pytest_bdd import given, parsers, scenarios, then, when

from core.risk.circuit_breaker import BreakerType

# Load scenarios from feature file
scenarios("../features/circuit_breaker.feature")


# Shared step definitions
@given("the trading system is initialized")
def trading_system_initialized(e2e_trading_system):
    """Verify trading system is ready."""
    assert e2e_trading_system is not None
    assert e2e_trading_system["trader"] is not None
    assert e2e_trading_system["breaker"] is not None


@given(parsers.parse("the portfolio has {amount:d} dollars in cash"))
def portfolio_with_cash(e2e_trading_system, amount):
    """Initialize portfolio with specified cash."""
    trader = e2e_trading_system["trader"]
    assert trader.get_portfolio_value() == amount


@given(
    parsers.parse("circuit breakers are set at {percent:d} percent daily loss limit")
)
def circuit_breakers_configured(e2e_trading_system, percent):
    """Configure circuit breaker with specific loss limit."""
    breaker = e2e_trading_system["breaker"]

    # Update daily loss limit
    breaker.daily_loss_limit = percent / 100.0

    # Verify configuration
    assert (
        breaker.daily_loss_limit == percent / 100.0
    ), f"Daily loss limit should be {percent}%"


@given(parsers.parse("the portfolio has lost {amount:d} dollars today"))
def simulate_portfolio_loss(e2e_trading_system, amount):
    """Simulate a portfolio loss for the day."""
    trader = e2e_trading_system["trader"]
    breaker = e2e_trading_system["breaker"]

    # Set start of day value
    initial_value = 100000.0
    breaker.start_of_day_value = initial_value

    # Reduce portfolio value to simulate loss
    current_value = initial_value - amount
    trader.cash = current_value

    # Store for assertions
    e2e_trading_system["_portfolio_loss"] = amount
    e2e_trading_system["_current_portfolio_value"] = current_value


@when(parsers.parse('a new trade signal is generated for "{symbol}"'))
def generate_trade_signal(e2e_trading_system, symbol):
    """Generate a trade signal and check circuit breaker."""
    breaker = e2e_trading_system["breaker"]
    trader = e2e_trading_system["trader"]

    # Check circuit breaker status before trading
    current_value = trader.get_portfolio_value()
    start_of_day = breaker.start_of_day_value

    status = breaker.check_breakers(
        current_portfolio_value=current_value,
        start_of_day_value=start_of_day,
    )

    # Store results
    e2e_trading_system["breaker_status"] = status
    e2e_trading_system["trade_signal_symbol"] = symbol


@then("the circuit breaker should trip")
def verify_breaker_tripped(e2e_trading_system):
    """Verify circuit breaker tripped."""
    status = e2e_trading_system.get("breaker_status")

    assert status is not None, "Circuit breaker status should be checked"
    assert not status[
        "trading_allowed"
    ], "Trading should NOT be allowed when breaker trips"
    assert len(status["breakers_tripped"]) > 0, "At least one breaker should be tripped"

    # Verify daily loss breaker specifically
    assert (
        BreakerType.DAILY_LOSS.value in status["breakers_tripped"]
    ), "Daily loss breaker should be tripped"


@then("all new trades should be blocked")
def verify_trades_blocked(e2e_trading_system, event_loop):
    """Verify that new trades are blocked."""
    trader = e2e_trading_system["trader"]
    symbol = e2e_trading_system.get("trade_signal_symbol", "TEST")

    # Try to place a trade (should fail due to breaker)
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, 10, "BUY")
    )

    assert order_id is None, "Order should be None when circuit breaker is tripped"


@then("an alert should be logged")
def verify_alert_logged(e2e_trading_system):
    """Verify alert was logged."""
    status = e2e_trading_system.get("breaker_status")

    assert status is not None, "Circuit breaker status should exist"
    assert len(status["reasons"]) > 0, "Alert reasons should be logged"

    # Check that reason mentions daily loss
    reasons_str = " ".join(status["reasons"])
    assert "daily loss" in reasons_str.lower(), "Alert should mention daily loss limit"


@then("the circuit breaker should remain armed")
def verify_breaker_armed(e2e_trading_system):
    """Verify circuit breaker remains armed (not tripped)."""
    status = e2e_trading_system.get("breaker_status")

    assert status is not None, "Circuit breaker status should be checked"
    assert status["trading_allowed"], "Trading should be allowed when below threshold"
    assert len(status["breakers_tripped"]) == 0, "No breakers should be tripped"


@then("the trade should be allowed to proceed")
def verify_trade_allowed(e2e_trading_system, event_loop):
    """Verify trade is allowed to proceed."""
    trader = e2e_trading_system["trader"]
    symbol = e2e_trading_system.get("trade_signal_symbol", "TEST")

    # Add mock data for the test symbol
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {"price": 50.0, "volume": 1000000}

    # Place a trade (should succeed)
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, 10, "BUY")
    )

    assert order_id is not None, "Order should be placed when circuit breaker is armed"
    assert order_id.startswith("paper_"), "Order ID should have paper_ prefix"
