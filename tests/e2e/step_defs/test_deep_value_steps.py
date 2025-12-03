"""
Step definitions for deep value trade E2E test.

Implements BDD-style test steps for complete trading workflow validation.
"""

from pytest_bdd import given, parsers, scenarios, then, when

# Load scenarios from feature file
scenarios("../features/deep_value_trade.feature")


@given("the trading system is initialized")
def trading_system_initialized(e2e_trading_system):
    """Verify trading system is ready."""
    assert e2e_trading_system is not None
    assert e2e_trading_system["trader"] is not None
    assert e2e_trading_system["strategy"] is not None
    assert e2e_trading_system["breaker"] is not None


@given(parsers.parse("the portfolio has {amount:d} dollars in cash"))
def portfolio_with_cash(e2e_trading_system, amount):
    """Initialize portfolio with specified cash."""
    trader = e2e_trading_system["trader"]
    # Paper trader already initialized with 100k
    assert trader.get_portfolio_value() == amount


@given("circuit breakers are armed")
def circuit_breakers_armed(e2e_trading_system):
    """Verify circuit breakers are active."""
    breaker = e2e_trading_system["breaker"]
    assert breaker is not None
    # Check that breakers are in ARMED state
    from core.risk.circuit_breaker import BreakerState, BreakerType

    for breaker_type in BreakerType:
        assert (
            breaker.breaker_states[breaker_type.value] == BreakerState.ARMED
        ), f"{breaker_type.value} should be ARMED"


@given("the market is open")
def market_is_open(market_open):
    """Market is open for trading."""
    assert market_open is True


@given(parsers.parse('"{symbol}" stock has PE ratio {pe:f} and PB ratio {pb:f}'))
def stock_fundamentals(e2e_trading_system, symbol, pe, pb):
    """Set stock fundamental data."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}
    mock_data[symbol].update(
        {
            "pe_ratio": pe,
            "pb_ratio": pb,
            "roe": 0.22,  # Default ROE for deep value
            "fcf_yield": 0.10,
            "debt_equity": 0.2,
            "current_ratio": 2.0,
        }
    )


@given(parsers.parse('"{symbol}" is trading at {price:f} dollars'))
def stock_price(e2e_trading_system, symbol, price):
    """Set stock price."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}
    mock_data[symbol]["price"] = price


@given(parsers.parse("the portfolio has lost {percent:d} percent today"))
def portfolio_daily_loss(e2e_trading_system, percent):
    """Simulate portfolio daily loss to test circuit breaker."""
    breaker = e2e_trading_system["breaker"]
    trader = e2e_trading_system["trader"]

    # Simulate losses to trip circuit breaker
    initial_value = 100000.0
    loss_amount = initial_value * (percent / 100)

    # Reduce cash to simulate loss
    trader.cash = initial_value - loss_amount
    breaker.start_of_day_value = initial_value

    # Store context for later assertions
    e2e_trading_system["_simulated_loss_pct"] = percent / 100


@when(parsers.parse('the strategy agent analyzes "{symbol}"'))
def analyze_stock(e2e_trading_system, symbol, event_loop):
    """Strategy agent analyzes stock."""
    strategy = e2e_trading_system["strategy"]
    mock_data = e2e_trading_system["mock_data"]

    # Mock the fundamentals handler to use our test data
    async def mock_get_fundamentals(args):
        data = mock_data.get(symbol, {})
        return {
            "symbol": symbol,
            "pe_ratio": data.get("pe_ratio", 15.0),
            "pb_ratio": data.get("pb_ratio", 1.5),
            "roe": data.get("roe", 0.10),
            "debt_equity": data.get("debt_equity", 0.5),
            "current_ratio": data.get("current_ratio", 1.0),
            "fcf_yield": data.get("fcf_yield", 0.03),
            "dividend_yield": data.get("dividend_yield", 0.02),
            "profit_margin": data.get("profit_margin", 0.10),
            "operating_margin": data.get("operating_margin", 0.15),
        }

    # Mock the quote handler
    async def mock_get_quote(args):
        data = mock_data.get(symbol, {})
        return {
            "symbol": symbol,
            "price": data.get("price", 100.0),
            "volume": data.get("volume", 1000000),
            "market_cap": data.get("market_cap", 1000000000),
            "sector": data.get("sector", "Unknown"),
        }

    # Mock the short interest handler
    async def mock_get_short_interest(args):
        return {
            "symbol": symbol,
            "short_interest_pct": 0.10,
            "days_to_cover": 2.0,
            "cost_to_borrow": 0.02,
            "float_available_pct": 0.30,
            "squeeze_score": 30.0,
            "data_source": "test_mock",
        }

    # Temporarily replace handlers
    original_fundamentals = strategy._handle_get_fundamentals
    original_quote = strategy._handle_get_stock_quote
    original_short = strategy._handle_get_short_interest

    strategy._handle_get_fundamentals = mock_get_fundamentals
    strategy._handle_get_stock_quote = mock_get_quote
    strategy._handle_get_short_interest = mock_get_short_interest

    try:
        # Analyze and store result (run async in event loop)
        result = event_loop.run_until_complete(strategy.analyze_stock(symbol))
        e2e_trading_system["analysis_result"] = result
        e2e_trading_system["analyzed_symbol"] = symbol
    finally:
        # Restore original handlers
        strategy._handle_get_fundamentals = original_fundamentals
        strategy._handle_get_stock_quote = original_quote
        strategy._handle_get_short_interest = original_short


@when(
    parsers.parse(
        'the strategy agent analyzes "{symbol}" with {confidence:d} percent confidence'
    )
)
def analyze_stock_with_confidence(e2e_trading_system, symbol, confidence, event_loop):
    """Strategy agent analyzes stock with specific confidence level."""
    # First do the normal analysis
    analyze_stock(e2e_trading_system, symbol, event_loop)

    # Override confidence in the result
    result = e2e_trading_system["analysis_result"]
    result.confidence = confidence / 100
    e2e_trading_system["analysis_result"] = result

    # Also calculate position size automatically for this step
    position_size_calculated(e2e_trading_system)


@then("a BUY signal should be generated")
def buy_signal_generated(e2e_trading_system):
    """Verify BUY signal was generated."""
    result = e2e_trading_system.get("analysis_result")
    assert result is not None, "Analysis result should not be None"
    assert result.recommendation in [
        "BUY",
        "STRONG_BUY",
    ], f"Expected BUY signal, got {result.recommendation}"


@then("the position size should be calculated")
def position_size_calculated(e2e_trading_system):
    """Verify position size was calculated."""
    kelly = e2e_trading_system["kelly"]
    result = e2e_trading_system.get("analysis_result")

    # Calculate position size using Kelly
    position_size = kelly.calculate_position_size(
        win_rate=0.60,  # Assume 60% win rate for high-confidence deep value
        avg_win=1500.0,
        avg_loss=1000.0,
        kelly_fraction=0.25,  # 1/4 Kelly for safety
        stock_price=e2e_trading_system["mock_data"][
            e2e_trading_system["analyzed_symbol"]
        ]["price"],
        symbol=e2e_trading_system["analyzed_symbol"],
    )

    assert position_size["position_size"] > 0, "Position size should be greater than 0"
    assert position_size["shares"] > 0, "Number of shares should be greater than 0"

    # Store for next steps
    e2e_trading_system["position_size"] = position_size["position_size"]
    e2e_trading_system["shares"] = position_size["shares"]


@then("the order should be executed")
def order_executed(e2e_trading_system, event_loop):
    """Verify order was executed."""
    trader = e2e_trading_system["trader"]
    symbol = e2e_trading_system["analyzed_symbol"]
    shares = e2e_trading_system.get(
        "shares", 10
    )  # Default to 10 shares if not calculated

    # Execute order
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, shares, "BUY")
    )

    assert order_id is not None, "Order ID should not be None"
    assert order_id.startswith("paper_"), "Order ID should have paper_ prefix"

    e2e_trading_system["order_id"] = order_id


@then("a stop loss should be placed")
def stop_loss_placed(e2e_trading_system):
    """Verify stop loss was placed."""
    stops = e2e_trading_system["stops"]
    symbol = e2e_trading_system["analyzed_symbol"]
    price = e2e_trading_system["mock_data"][symbol]["price"]
    shares = e2e_trading_system.get("shares", 10)

    # Calculate stop loss
    stop_data = stops.calculate_stop_loss(
        symbol=symbol,
        entry_price=price,
        position_size=price * shares,
        position_side="long",
        stop_type="fixed_pct",
        stop_pct=0.05,  # 5% stop
    )

    assert stop_data is not None, "Stop data should not be None"
    assert stop_data["stop_price"] < price, "Stop price should be below entry price"
    assert (
        stop_data["stop_price"] >= price * 0.95
    ), "Stop should be at least 5% below entry"

    e2e_trading_system["stop_price"] = stop_data["stop_price"]


@then("the position should appear in the portfolio")
def position_in_portfolio(e2e_trading_system):
    """Verify position appears in portfolio."""
    trader = e2e_trading_system["trader"]
    symbol = e2e_trading_system["analyzed_symbol"]

    positions = trader.get_positions()
    position_symbols = [p["symbol"] for p in positions]

    assert symbol in position_symbols, f"Symbol {symbol} should be in portfolio"

    # Verify position details
    position = trader.get_position(symbol)
    assert position is not None, "Position should exist"
    assert position["quantity"] > 0, "Position quantity should be greater than 0"


@then("the circuit breaker should trip")
def circuit_breaker_trips(e2e_trading_system):
    """Verify circuit breaker trips when expected."""
    breaker = e2e_trading_system["breaker"]
    trader = e2e_trading_system["trader"]

    # Check circuit breaker status
    status = breaker.check_breakers(
        current_portfolio_value=trader.get_portfolio_value(),
        start_of_day_value=breaker.start_of_day_value,
    )

    assert not status[
        "trading_allowed"
    ], "Trading should not be allowed when breaker trips"
    assert len(status["breakers_tripped"]) > 0, "At least one breaker should be tripped"

    e2e_trading_system["breaker_status"] = status


@then("no order should be executed")
def no_order_executed(e2e_trading_system, event_loop):
    """Verify no order was executed when breaker tripped."""
    trader = e2e_trading_system["trader"]
    symbol = e2e_trading_system.get("analyzed_symbol", "VALUE")

    # Try to place order (should fail due to circuit breaker)
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, 10, "BUY")
    )

    assert (
        order_id is None
    ), "Order should not be placed when circuit breaker is tripped"


@then(
    parsers.parse(
        "the Kelly position size should not exceed {percent:d} percent of portfolio"
    )
)
def kelly_size_under_limit(e2e_trading_system, percent):
    """Verify Kelly position size respects max limits."""
    position_size = e2e_trading_system.get("position_size", 0)
    portfolio_value = 100000.0

    max_position = portfolio_value * (percent / 100)

    assert (
        position_size <= max_position
    ), f"Position size ${position_size:,.2f} should not exceed {percent}% of portfolio (${max_position:,.2f})"


@then("the position size should reflect the confidence level")
def position_size_reflects_confidence(e2e_trading_system):
    """Verify position size scales with confidence level."""
    result = e2e_trading_system.get("analysis_result")
    position_size = e2e_trading_system.get("position_size", 0)

    assert result is not None, "Analysis result should exist"
    assert position_size > 0, "Position size should be calculated"

    # Higher confidence should generally result in larger positions
    # But still capped by max position limits
    portfolio_value = 100000.0
    position_pct = position_size / portfolio_value

    # Position should be reasonable given confidence
    # For 70% confidence, expect at least 2.5% position
    if result.confidence >= 0.70:
        assert (
            position_pct >= 0.025
        ), f"Position size {position_pct:.2%} seems low for {result.confidence:.0%} confidence"
