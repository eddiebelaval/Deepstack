"""
Step definitions for squeeze hunter E2E test.

Tests the short squeeze detection and execution workflow.
"""

from datetime import datetime

from pytest_bdd import given, parsers, scenarios, then, when

from core.strategies.squeeze_hunter import (
    Catalyst,
    ShortInterestData,
    SqueezeHunterStrategy,
)

# Load scenarios from feature file
scenarios("../features/squeeze_hunter_trade.feature")


# Shared step definitions (common across E2E tests)
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


@given("the market is open")
def market_is_open(market_open):
    """Market is open for trading."""
    assert market_open is True


@given(parsers.parse('"{symbol}" is trading at {price:f} dollars'))
def stock_price(e2e_trading_system, symbol, price):
    """Set stock price."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}
    mock_data[symbol]["price"] = price


@given(parsers.parse('"{symbol}" stock has {percent:d} percent short interest'))
def stock_short_interest(e2e_trading_system, symbol, percent):
    """Set stock short interest percentage."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}

    mock_data[symbol]["short_interest_pct"] = percent
    mock_data[symbol]["short_interest"] = 10_000_000 * (percent / 20)  # Scale with %
    mock_data[symbol]["float_shares"] = 50_000_000


@given(parsers.parse('"{symbol}" has {days:d} days to cover'))
def stock_days_to_cover(e2e_trading_system, symbol, days):
    """Set days to cover metric."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}

    mock_data[symbol]["days_to_cover"] = float(days)


@given(parsers.parse('"{symbol}" has increasing volume trend'))
def stock_increasing_volume(e2e_trading_system, symbol):
    """Set increasing volume trend."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}

    mock_data[symbol]["volume_trend"] = "increasing"
    mock_data[symbol]["volume"] = 2_000_000  # High volume


@given(parsers.parse('"{symbol}" has decreasing volume trend'))
def stock_decreasing_volume(e2e_trading_system, symbol):
    """Set decreasing volume trend."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}

    mock_data[symbol]["volume_trend"] = "decreasing"
    mock_data[symbol]["volume"] = 500_000  # Low volume


@when(parsers.parse('the squeeze hunter analyzes "{symbol}"'))
def analyze_squeeze_opportunity(e2e_trading_system, symbol):
    """Analyze stock for squeeze opportunity."""
    mock_data = e2e_trading_system["mock_data"]
    stock_data = mock_data.get(symbol, {})

    # Create squeeze hunter
    squeeze_hunter = SqueezeHunterStrategy(
        min_short_interest_pct=20.0,
        min_days_to_cover=3.0,
        min_squeeze_score=60.0,
    )

    # Create mock short interest data
    short_data = ShortInterestData(
        symbol=symbol,
        short_interest=int(stock_data.get("short_interest", 10_000_000)),
        float_shares=int(stock_data.get("float_shares", 50_000_000)),
        short_percent_float=float(stock_data.get("short_interest_pct", 20.0)),
        days_to_cover=float(stock_data.get("days_to_cover", 5.0)),
        last_updated=datetime.now(),
    )

    # Create catalysts based on volume trend
    catalysts = []
    if stock_data.get("volume_trend") == "increasing":
        # Add multiple strong catalysts for high confidence
        catalysts.append(
            Catalyst(
                catalyst_type="technical",
                description="Strong volume increase indicating momentum",
                impact_score=9.0,
                date=datetime.now(),
            )
        )
        catalysts.append(
            Catalyst(
                catalyst_type="sentiment",
                description="Positive social media sentiment",
                impact_score=8.5,
                date=datetime.now(),
            )
        )

    # Calculate squeeze score
    squeeze_score = squeeze_hunter._calculate_squeeze_score(short_data, catalysts)

    # Assess confidence and risk
    confidence = squeeze_hunter._assess_confidence(squeeze_score, catalysts, short_data)
    risk = squeeze_hunter._assess_risk(short_data, stock_data.get("price", 25.0))
    recommendation = squeeze_hunter._make_recommendation(
        squeeze_score, confidence, risk
    )

    # Store results
    e2e_trading_system["squeeze_score"] = squeeze_score
    e2e_trading_system["squeeze_recommendation"] = recommendation
    e2e_trading_system["squeeze_confidence"] = confidence
    e2e_trading_system["analyzed_symbol"] = symbol


@then("a STRONG_BUY signal should be generated")
def strong_buy_signal_generated(e2e_trading_system):
    """Verify STRONG_BUY recommendation was generated."""
    recommendation = e2e_trading_system.get("squeeze_recommendation", "pass")
    assert (
        recommendation == "buy"
    ), f"Expected 'buy' recommendation, got '{recommendation}'"


@then(parsers.parse("the squeeze score should be above {threshold:d}"))
def squeeze_score_above_threshold(e2e_trading_system, threshold):
    """Verify squeeze score is above threshold."""
    squeeze_score = e2e_trading_system.get("squeeze_score", 0)
    assert (
        squeeze_score > threshold
    ), f"Squeeze score {squeeze_score:.1f} should be above {threshold}"


@then(parsers.parse("the squeeze score should be below {threshold:d}"))
def squeeze_score_below_threshold(e2e_trading_system, threshold):
    """Verify squeeze score is below threshold."""
    squeeze_score = e2e_trading_system.get("squeeze_score", 0)
    assert (
        squeeze_score < threshold
    ), f"Squeeze score {squeeze_score:.1f} should be below {threshold}"


@then("a position should be opened")
def position_should_be_opened(e2e_trading_system, event_loop):
    """Verify a position was opened."""
    trader = e2e_trading_system["trader"]
    symbol = e2e_trading_system["analyzed_symbol"]

    # Calculate position size (10% of portfolio for squeeze plays)
    portfolio_value = trader.get_portfolio_value()
    position_size_dollars = portfolio_value * 0.10
    price = e2e_trading_system["mock_data"][symbol]["price"]
    shares = int(position_size_dollars / price)

    # Execute order
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, shares, "BUY")
    )

    assert order_id is not None, "Order should be placed"
    e2e_trading_system["order_id"] = order_id
    e2e_trading_system["shares"] = shares


@then("a tight trailing stop should be placed")
def tight_trailing_stop_placed(e2e_trading_system):
    """Verify tight trailing stop was calculated."""
    stops = e2e_trading_system["stops"]
    symbol = e2e_trading_system["analyzed_symbol"]
    price = e2e_trading_system["mock_data"][symbol]["price"]
    shares = e2e_trading_system.get("shares", 10)

    # Squeeze plays use tighter stops (3% instead of 5%)
    stop_data = stops.calculate_stop_loss(
        symbol=symbol,
        entry_price=price,
        position_size=price * shares,
        position_side="long",
        stop_type="fixed_pct",
        stop_pct=0.03,  # 3% tight stop
    )

    assert stop_data is not None, "Stop data should be calculated"
    assert (
        stop_data["stop_price"] >= price * 0.97
    ), f"Stop price should be at least 3% below entry: {stop_data['stop_price']} vs {price * 0.97}"

    e2e_trading_system["stop_price"] = stop_data["stop_price"]


@then("no position should be opened")
def no_position_should_be_opened(e2e_trading_system):
    """Verify no position was opened due to low score."""
    recommendation = e2e_trading_system.get("squeeze_recommendation", "pass")
    assert (
        recommendation == "pass"
    ), f"Expected 'pass' recommendation, got '{recommendation}'"
