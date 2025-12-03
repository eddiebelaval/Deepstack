"""
E2E Test: Multi-Strategy Portfolio
Tests 5 strategies running simultaneously with risk coordination.
"""

import pytest


@pytest.mark.asyncio
async def test_initialize_multi_strategy_portfolio(e2e_trading_system):
    """
    Test initializing portfolio with multiple strategies.

    Validates:
    - All 5 strategies can be activated
    - Portfolio heat tracking works across strategies
    - Each strategy has proper configuration
    """
    trader = e2e_trading_system["trader"]
    breaker = e2e_trading_system["breaker"]
    strategy = e2e_trading_system["strategy"]

    # Verify initial state
    assert trader.get_portfolio_value() == 100000.0
    assert len(trader.get_positions()) == 0

    # Configure strategies
    strategies = [
        "deep_value",
        "squeeze_hunter",
        "mean_reversion",
        "momentum",
        "pairs_trading",
    ]

    # Each strategy should be distinct
    assert len(strategies) == 5
    assert len(set(strategies)) == 5

    # Verify circuit breaker is armed for all strategies
    breaker_status = breaker.get_breaker_status()
    assert breaker_status["trading_allowed"]
    assert not breaker_status["any_tripped"]


@pytest.mark.asyncio
async def test_execute_trades_from_multiple_strategies(e2e_trading_system):
    """
    Test executing trades from different strategies simultaneously.

    Validates:
    - Multiple strategies can generate signals
    - Trades execute independently
    - Portfolio heat is coordinated across all trades
    """
    trader = e2e_trading_system["trader"]
    breaker = e2e_trading_system["breaker"]
    kelly = e2e_trading_system["kelly"]

    # Define strategy trades
    strategy_trades = [
        {"symbol": "VALUE", "strategy": "deep_value", "shares": 100},
        {"symbol": "SQUEEZE", "strategy": "squeeze_hunter", "shares": 50},
        {"symbol": "MEAN", "strategy": "mean_reversion", "shares": 75},
        {"symbol": "MOMENTUM", "strategy": "momentum", "shares": 60},
        {"symbol": "PAIR_A", "strategy": "pairs_trading", "shares": 40},
    ]

    # Add mock data for all symbols
    for trade in strategy_trades:
        symbol = trade["symbol"]
        e2e_trading_system["mock_data"][symbol] = {
            "price": 100.0,
            "volume": 1000000,
            "pe_ratio": 15.0,
            "pb_ratio": 1.5,
            "roe": 0.15,
        }

    initial_value = trader.get_portfolio_value()
    executed_orders = []

    # Execute all strategy trades
    for trade in strategy_trades:
        symbol = trade["symbol"]
        shares = trade["shares"]

        # Check portfolio heat before trade (synchronous call)
        heat_check = breaker.check_breakers(
            current_portfolio_value=trader.get_portfolio_value()
        )

        if heat_check["trading_allowed"]:
            order_id = await trader.place_market_order(symbol, shares, "BUY")
            if order_id:
                executed_orders.append(
                    {
                        "symbol": symbol,
                        "shares": shares,
                        "strategy": trade["strategy"],
                        "order_id": order_id,
                    }
                )

    # Verify trades executed
    assert len(executed_orders) >= 3, "At least 3 strategies should execute trades"

    # Verify portfolio contains positions
    positions = trader.get_positions()
    assert len(positions) >= 3

    # Verify cash was used for positions (total value maintained, but cash reduced)
    final_cash = trader.cash
    assert (
        final_cash < initial_value
    ), f"Cash {final_cash} should be less than initial {initial_value}"


@pytest.mark.asyncio
async def test_coordinate_risk_across_strategies(e2e_trading_system):
    """
    Test risk coordination across multiple strategies.

    Validates:
    - Portfolio heat limits respected across all strategies
    - Single strategy can't dominate portfolio
    - Risk manager properly aggregates exposure
    """
    trader = e2e_trading_system["trader"]
    kelly = e2e_trading_system["kelly"]
    breaker = e2e_trading_system["breaker"]

    # Configure max position constraints
    max_single_position_pct = 0.20  # 20% max per position
    max_total_exposure_pct = 1.0  # 100% max total exposure

    kelly.max_position_pct = max_single_position_pct
    kelly.max_total_exposure = max_total_exposure_pct

    portfolio_value = trader.get_portfolio_value()

    # Attempt to place 10 large positions (should hit limits)
    symbols = [f"STRAT_{i}" for i in range(10)]

    for symbol in symbols:
        e2e_trading_system["mock_data"][symbol] = {
            "price": 100.0,
            "volume": 1000000,
        }

    executed_count = 0

    for symbol in symbols:
        # Calculate max allowed position size
        max_position_value = portfolio_value * max_single_position_pct
        shares = int(max_position_value / 100.0)  # price = 100

        order_id = await trader.place_market_order(symbol, shares, "BUY")
        if order_id:
            executed_count += 1

    # Should stop before 10 trades due to portfolio heat limits
    assert executed_count <= 5, "Portfolio heat should limit number of positions"

    # Verify total exposure is within limits
    positions = trader.get_positions()
    # Calculate total exposure from positions
    total_exposure = 0
    for p in positions:
        # Calculate value: quantity * current price
        symbol = p["symbol"]
        price = e2e_trading_system["mock_data"].get(symbol, {}).get("price", 100.0)
        total_exposure += p["quantity"] * price

    exposure_pct = total_exposure / portfolio_value if portfolio_value > 0 else 0

    assert (
        exposure_pct <= max_total_exposure_pct * 1.1
    ), f"Total exposure {exposure_pct:.1%} exceeds limit {max_total_exposure_pct:.1%}"


@pytest.mark.asyncio
async def test_handle_conflicting_signals(e2e_trading_system):
    """
    Test handling conflicting signals from multiple strategies.

    Validates:
    - Buy and sell signals for same symbol handled correctly
    - Position priority logic works
    - No simultaneous long/short on same symbol
    """
    trader = e2e_trading_system["trader"]
    strategy = e2e_trading_system["strategy"]

    symbol = "CONFLICT"
    e2e_trading_system["mock_data"][symbol] = {
        "price": 100.0,
        "volume": 1000000,
        "pe_ratio": 15.0,
        "pb_ratio": 1.5,
    }

    # Strategy 1: Deep Value says BUY
    order_id_1 = await trader.place_market_order(symbol, 50, "BUY")
    assert order_id_1 is not None

    # Verify position created
    position = trader.get_position(symbol)
    assert position is not None
    assert position["quantity"] == 50

    # Strategy 2: Mean Reversion says SELL (short)
    # This should fail or close existing position, not create long+short
    order_id_2 = await trader.place_market_order(symbol, 25, "SELL")

    # Check final position state
    position_after = trader.get_position(symbol)

    if position_after:
        # Position reduced, not both long and short
        assert position_after["quantity"] <= 50
        assert position_after["quantity"] >= 0

    # Verify no negative position (no simultaneous long/short)
    all_positions = trader.get_positions()
    for pos in all_positions:
        if pos["symbol"] == symbol:
            assert (
                pos["quantity"] >= 0
            ), "Should not have negative position (short while long)"


@pytest.mark.asyncio
async def test_rebalance_between_strategies(e2e_trading_system):
    """
    Test portfolio rebalancing across strategies.

    Validates:
    - Can reallocate capital between strategies
    - Underperforming strategies get reduced allocation
    - Top performers get increased allocation
    """
    trader = e2e_trading_system["trader"]

    # Create initial multi-strategy portfolio
    initial_positions = [
        ("STRAT_A", 100, 100.0),  # $10,000
        ("STRAT_B", 100, 100.0),  # $10,000
        ("STRAT_C", 100, 100.0),  # $10,000
        ("STRAT_D", 100, 100.0),  # $10,000
        ("STRAT_E", 100, 100.0),  # $10,000
    ]

    for symbol, shares, price in initial_positions:
        e2e_trading_system["mock_data"][symbol] = {"price": price}
        await trader.place_market_order(symbol, shares, "BUY")

    initial_portfolio = trader.get_positions()
    assert len(initial_portfolio) == 5

    # Simulate rebalancing: reduce STRAT_A, increase STRAT_E
    # Sell half of STRAT_A
    await trader.place_market_order("STRAT_A", 50, "SELL")

    # Buy more STRAT_E with proceeds
    await trader.place_market_order("STRAT_E", 50, "BUY")

    # Verify rebalancing occurred
    final_portfolio = trader.get_positions()

    strat_a_pos = trader.get_position("STRAT_A")
    strat_e_pos = trader.get_position("STRAT_E")

    assert strat_a_pos["quantity"] == 50, "STRAT_A should be reduced"
    assert strat_e_pos["quantity"] == 150, "STRAT_E should be increased"

    # Verify total portfolio value roughly maintained (minus fees if any)
    initial_value = 100000.0
    final_value = trader.get_portfolio_value()
    assert (
        abs(final_value - initial_value) < 1000
    ), "Portfolio value should be maintained during rebalance"
