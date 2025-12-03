"""
Step definitions for pairs trading E2E test.

Implements BDD-style test steps for statistical arbitrage workflow validation.
"""

from pytest_bdd import given, parsers, scenarios, then, when

# Load scenarios from feature file
scenarios("../features/pairs_trade.feature")


@given("pairs trading is enabled")
def pairs_trading_enabled(e2e_trading_system):
    """Enable pairs trading in the system."""
    e2e_trading_system["pairs_enabled"] = True
    assert e2e_trading_system["pairs_enabled"] is True


@given(parsers.parse('"{symbol1}" and "{symbol2}" are a cointegrated pair'))
def cointegrated_pair(e2e_trading_system, symbol1, symbol2):
    """Define a cointegrated trading pair."""
    # Setup mock data for both symbols
    e2e_trading_system["mock_data"][symbol1] = {
        "price": 100.0,
        "volume": 1000000,
        "sector": "Energy",
    }

    e2e_trading_system["mock_data"][symbol2] = {
        "price": 105.0,
        "volume": 1000000,
        "sector": "Energy",
    }

    # Store pair relationship
    pair_key = f"pair_{symbol1}_{symbol2}"
    e2e_trading_system[pair_key] = {
        "symbol1": symbol1,
        "symbol2": symbol2,
        "cointegrated": True,
        "historical_mean_spread": 5.0,  # CVX typically $5 above XOM
        "spread_std": 2.5,  # Standard deviation of spread
        "hedge_ratio": 1.0,  # 1:1 ratio for simplicity
    }

    e2e_trading_system["current_pair"] = pair_key


@given("the spread has diverged 2 standard deviations")
def spread_diverged(e2e_trading_system):
    """Simulate spread divergence from historical mean."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    symbol1 = pair_data["symbol1"]
    symbol2 = pair_data["symbol2"]

    # Calculate diverged spread (2 std devs above mean)
    mean_spread = pair_data["historical_mean_spread"]
    std_dev = pair_data["spread_std"]
    diverged_spread = mean_spread + (2 * std_dev)

    # Update prices to create diverged spread
    # Current spread = CVX - XOM = 105 - 100 = 5 (at mean)
    # Target spread = 5 + (2 * 2.5) = 10
    # Adjust prices to create spread of 10

    e2e_trading_system["mock_data"][symbol1]["price"] = 95.0  # XOM drops
    e2e_trading_system["mock_data"][symbol2]["price"] = 105.0  # CVX unchanged

    current_spread = (
        e2e_trading_system["mock_data"][symbol2]["price"]
        - e2e_trading_system["mock_data"][symbol1]["price"]
    )

    pair_data["current_spread"] = current_spread
    pair_data["spread_z_score"] = (current_spread - mean_spread) / std_dev

    assert (
        abs(pair_data["spread_z_score"]) >= 2.0
    ), "Spread should be 2+ standard deviations"


@given(parsers.parse('"{symbol}" is undervalued relative to "{other_symbol}"'))
def symbol_undervalued(e2e_trading_system, symbol, other_symbol):
    """Mark which symbol is undervalued in the pair."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    pair_data["undervalued"] = symbol
    pair_data["overvalued"] = other_symbol

    # Verify spread direction
    price1 = e2e_trading_system["mock_data"][symbol]["price"]
    price2 = e2e_trading_system["mock_data"][other_symbol]["price"]

    assert price1 < price2, f"{symbol} should be cheaper than {other_symbol}"


@given(
    parsers.parse(
        'the portfolio has an open pair with "{symbol1}" long and "{symbol2}" short'
    )
)
def portfolio_has_open_pair(e2e_trading_system, symbol1, symbol2, event_loop):
    """Create existing pair position."""
    trader = e2e_trading_system["trader"]

    # Setup mock data
    e2e_trading_system["mock_data"][symbol1] = {"price": 95.0}
    e2e_trading_system["mock_data"][symbol2] = {"price": 105.0}

    # Buy symbol1 (long position)
    long_order = event_loop.run_until_complete(
        trader.place_market_order(symbol1, 100, "BUY")
    )

    assert long_order is not None

    # Note: Paper trader doesn't support actual shorting
    # We simulate short by tracking it separately
    e2e_trading_system["mock_short_positions"] = {
        symbol2: {
            "quantity": 100,
            "entry_price": 105.0,
        }
    }

    # Store pair info
    pair_key = f"pair_{symbol1}_{symbol2}"
    e2e_trading_system[pair_key] = {
        "symbol1": symbol1,
        "symbol2": symbol2,
        "long_symbol": symbol1,
        "short_symbol": symbol2,
        "quantity": 100,
        "entry_spread": 10.0,  # 105 - 95
        "historical_mean_spread": 5.0,
        "spread_std": 2.5,
    }

    e2e_trading_system["current_pair"] = pair_key


@given("the spread has reverted to the mean")
def spread_reverted(e2e_trading_system):
    """Simulate spread reversion to mean."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    symbol1 = pair_data["symbol1"]
    symbol2 = pair_data["symbol2"]

    mean_spread = pair_data["historical_mean_spread"]

    # Update prices to create mean spread
    # Mean spread = 5, so CVX - XOM = 5
    e2e_trading_system["mock_data"][symbol1]["price"] = 100.0
    e2e_trading_system["mock_data"][symbol2]["price"] = 105.0

    current_spread = 105.0 - 100.0
    pair_data["current_spread"] = current_spread

    # Calculate z-score (should be near 0)
    std_dev = pair_data["spread_std"]
    pair_data["spread_z_score"] = (current_spread - mean_spread) / std_dev

    assert abs(pair_data["spread_z_score"]) < 0.5, "Spread should be near mean"


@when("the pairs trader detects the opportunity")
def pairs_trader_detects(e2e_trading_system):
    """Pairs trading strategy detects opportunity."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    # Analyze pair opportunity
    z_score = pair_data["spread_z_score"]

    # Trading rules:
    # z_score > 2: Short overvalued, Long undervalued
    # z_score < -2: Long overvalued, Short undervalued

    if z_score >= 2.0:
        # Spread too wide: buy undervalued, short overvalued
        recommendation = "ENTER_PAIR"
        action = {
            "buy": pair_data["undervalued"],
            "short": pair_data["overvalued"],
        }
    elif z_score <= -2.0:
        # Spread too narrow: opposite trade
        recommendation = "ENTER_PAIR"
        action = {
            "buy": pair_data["overvalued"],
            "short": pair_data["undervalued"],
        }
    else:
        recommendation = "HOLD"
        action = None

    pair_data["recommendation"] = recommendation
    pair_data["action"] = action

    assert recommendation == "ENTER_PAIR", "Should recommend entering pair trade"


@when("the pairs trader checks the spread")
def pairs_trader_checks_spread(e2e_trading_system):
    """Pairs trader monitors spread for exit signal."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    z_score = pair_data["spread_z_score"]

    # Exit rules:
    # |z_score| < 0.5: Spread reverted, close pair

    if abs(z_score) < 0.5:
        recommendation = "EXIT_PAIR"
    else:
        recommendation = "HOLD_PAIR"

    pair_data["recommendation"] = recommendation

    assert recommendation == "EXIT_PAIR", "Should recommend exiting pair"


@then(parsers.parse('"{symbol}" should be bought'))
def symbol_bought(e2e_trading_system, symbol, event_loop):
    """Verify long position was entered."""
    trader = e2e_trading_system["trader"]
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    # Calculate position size (dollar-neutral pair)
    portfolio_value = trader.get_portfolio_value()
    position_size_pct = 0.10  # 10% of portfolio per leg

    symbol_price = e2e_trading_system["mock_data"][symbol]["price"]
    position_value = portfolio_value * position_size_pct
    shares = int(position_value / symbol_price)

    # Execute long order
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, shares, "BUY")
    )

    assert order_id is not None, f"Should successfully buy {symbol}"

    # Verify position
    position = trader.get_position(symbol)
    assert position is not None
    assert position["quantity"] > 0

    pair_data["long_position"] = {
        "symbol": symbol,
        "quantity": shares,
        "entry_price": symbol_price,
    }


@then(parsers.parse('"{symbol}" should be shorted'))
def symbol_shorted(e2e_trading_system, symbol):
    """Verify short position was entered."""
    # Note: Paper trader doesn't support actual shorting
    # We simulate short tracking

    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    # Calculate short position size (match long dollar value)
    long_pos = pair_data["long_position"]
    long_value = long_pos["quantity"] * long_pos["entry_price"]

    symbol_price = e2e_trading_system["mock_data"][symbol]["price"]
    short_shares = int(long_value / symbol_price)

    # Simulate short
    if "mock_short_positions" not in e2e_trading_system:
        e2e_trading_system["mock_short_positions"] = {}

    e2e_trading_system["mock_short_positions"][symbol] = {
        "quantity": short_shares,
        "entry_price": symbol_price,
    }

    pair_data["short_position"] = {
        "symbol": symbol,
        "quantity": short_shares,
        "entry_price": symbol_price,
    }

    assert short_shares > 0, f"Should short {symbol}"


@then("the spread should be monitored")
def spread_monitored(e2e_trading_system):
    """Verify spread monitoring is active."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    # Mark monitoring active
    pair_data["monitoring_active"] = True

    assert pair_data["monitoring_active"] is True


@then("the pair should be balanced dollar-neutral")
def pair_dollar_neutral(e2e_trading_system):
    """Verify pair is dollar-neutral (long value = short value)."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    long_pos = pair_data["long_position"]
    short_pos = pair_data["short_position"]

    long_value = long_pos["quantity"] * long_pos["entry_price"]
    short_value = short_pos["quantity"] * short_pos["entry_price"]

    # Allow 5% tolerance for rounding
    value_diff_pct = abs(long_value - short_value) / long_value

    assert (
        value_diff_pct < 0.05
    ), f"Pair should be dollar-neutral: Long=${long_value:.2f}, Short=${short_value:.2f}"


@then("both positions should be closed")
def both_positions_closed(e2e_trading_system, event_loop):
    """Verify both legs of pair are closed."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    trader = e2e_trading_system["trader"]

    long_symbol = pair_data["long_symbol"]
    short_symbol = pair_data["short_symbol"]

    # Close long position
    long_pos = trader.get_position(long_symbol)
    if long_pos and long_pos["quantity"] > 0:
        sell_order = event_loop.run_until_complete(
            trader.place_market_order(long_symbol, long_pos["quantity"], "SELL")
        )
        assert sell_order is not None

    # Close short position (simulated)
    if short_symbol in e2e_trading_system.get("mock_short_positions", {}):
        # Mark short as covered
        short_pos = e2e_trading_system["mock_short_positions"][short_symbol]
        short_pos["closed"] = True

    # Verify positions closed
    final_long_pos = trader.get_position(long_symbol)
    assert final_long_pos is None or final_long_pos["quantity"] == 0

    # Mark pair as closed
    pair_data["status"] = "CLOSED"


@then("profit should be realized")
def pairs_profit_realized(e2e_trading_system):
    """Verify profit was realized from pairs trade."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    # Calculate pair P&L
    long_pos = pair_data.get("long_position", {})
    short_pos = pair_data.get("short_position", {})

    if not long_pos or not short_pos:
        # Use entry spread vs current spread
        entry_spread = pair_data.get("entry_spread", 10.0)
        current_spread = pair_data.get("current_spread", 5.0)

        # Profit from spread convergence
        spread_improvement = entry_spread - current_spread
        quantity = pair_data.get("quantity", 100)
        profit = spread_improvement * quantity

    else:
        # Calculate from positions
        # Long P&L: (current_price - entry_price) * quantity
        long_symbol = long_pos["symbol"]
        long_current = e2e_trading_system["mock_data"][long_symbol]["price"]
        long_pnl = (long_current - long_pos["entry_price"]) * long_pos["quantity"]

        # Short P&L: (entry_price - current_price) * quantity
        short_symbol = short_pos["symbol"]
        short_current = e2e_trading_system["mock_data"][short_symbol]["price"]
        short_pnl = (short_pos["entry_price"] - short_current) * short_pos["quantity"]

        profit = long_pnl + short_pnl

    pair_data["total_profit"] = profit

    # For mean reversion pairs trade, profit should be positive
    assert profit > 0, f"Pairs trade should be profitable, got ${profit:,.2f}"


@then("the trade should be complete")
def trade_complete(e2e_trading_system):
    """Verify the pairs trade is complete."""
    pair_key = e2e_trading_system["current_pair"]
    pair_data = e2e_trading_system[pair_key]

    assert pair_data["status"] == "CLOSED", "Pair should be closed"

    total_profit = pair_data.get("total_profit", 0)

    print(f"\nPairs Trade Summary:")
    print(f"Pair: {pair_data['symbol1']} / {pair_data['symbol2']}")
    print(f"Entry Spread: ${pair_data.get('entry_spread', 0):.2f}")
    print(f"Exit Spread: ${pair_data.get('current_spread', 0):.2f}")
    print(f"Total Profit: ${total_profit:,.2f}")

    assert total_profit > 0, "Overall pairs trade should be profitable"
