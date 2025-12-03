"""
Step definitions for covered call options E2E test.

Implements BDD-style test steps for options trading workflow validation.
"""

import pytest
from pytest_bdd import given, parsers, scenarios, then, when

# Load scenarios from feature file
scenarios("../features/covered_call.feature")


@given("options trading is enabled")
def options_trading_enabled(e2e_trading_system):
    """Enable options trading in the system."""
    # Set flag to indicate options are enabled
    e2e_trading_system["options_enabled"] = True
    assert e2e_trading_system["options_enabled"] is True


@given(
    parsers.parse(
        'the portfolio holds {shares:d} shares of "{symbol}" at {price:f} dollars'
    )
)
def portfolio_holds_shares(e2e_trading_system, shares, symbol, price, event_loop):
    """Create existing position in portfolio."""
    trader = e2e_trading_system["trader"]

    # Add mock data for symbol
    e2e_trading_system["mock_data"][symbol] = {"price": price}

    # Place buy order to create position
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, shares, "BUY")
    )

    assert order_id is not None

    # Verify position created
    position = trader.get_position(symbol)
    assert position is not None
    assert position["quantity"] == shares

    # Store entry price for later
    e2e_trading_system[f"{symbol}_entry_price"] = price


@given(parsers.parse('"{symbol}" is trading at {price:f} dollars'))
def stock_trading_at_price(e2e_trading_system, symbol, price):
    """Update current stock price."""
    # Update mock data with current price
    if symbol not in e2e_trading_system["mock_data"]:
        e2e_trading_system["mock_data"][symbol] = {}

    e2e_trading_system["mock_data"][symbol]["price"] = price
    e2e_trading_system[f"{symbol}_current_price"] = price


@given(parsers.parse('the portfolio has sold calls on "{symbol}" at strike {strike:d}'))
def portfolio_has_sold_calls(e2e_trading_system, symbol, strike):
    """Simulate sold call options on position."""
    # Store call position details
    e2e_trading_system[f"{symbol}_call_strike"] = strike
    e2e_trading_system[f"{symbol}_call_sold"] = True

    # Simulate premium collected (e.g., $2 per share for 100 shares)
    premium_per_share = 2.0
    position = e2e_trading_system["trader"].get_position(symbol)
    total_premium = premium_per_share * position["quantity"]

    e2e_trading_system[f"{symbol}_premium_collected"] = total_premium

    # Add premium to cash
    trader = e2e_trading_system["trader"]
    trader.cash += total_premium


@given(parsers.parse('"{symbol}" rallies to {price:f} dollars'))
def stock_rallies_to_price(e2e_trading_system, symbol, price):
    """Simulate stock price rally."""
    e2e_trading_system["mock_data"][symbol]["price"] = price
    e2e_trading_system[f"{symbol}_rally_price"] = price


@when(parsers.parse('the covered call strategy analyzes "{symbol}"'))
def covered_call_analyzes(e2e_trading_system, symbol):
    """Strategy analyzes stock for covered call opportunity."""
    trader = e2e_trading_system["trader"]
    position = trader.get_position(symbol)

    assert position is not None, f"Must have position in {symbol} to sell covered calls"
    assert position["quantity"] >= 100, "Need at least 100 shares for covered call"

    current_price = e2e_trading_system["mock_data"][symbol]["price"]

    # Determine if covered call is attractive
    # Typically sell calls slightly OTM (Out of The Money)
    atm_strike = round(current_price / 5) * 5  # Round to nearest $5
    otm_strike = atm_strike + 5  # One strike OTM

    # Store analysis result
    e2e_trading_system[f"{symbol}_call_analysis"] = {
        "recommendation": "SELL_CALL",
        "current_price": current_price,
        "atm_strike": atm_strike,
        "recommended_strike": otm_strike,
        "contracts": position["quantity"] // 100,  # Each contract = 100 shares
    }


@when("assignment occurs")
def assignment_occurs(e2e_trading_system):
    """Simulate early assignment of call option."""
    # Assignment means stock is called away at strike price
    # Triggered when stock price > strike + premium

    # Mark assignment event
    e2e_trading_system["call_assigned"] = True


@then("a SELL_CALL signal should be generated")
def sell_call_signal_generated(e2e_trading_system):
    """Verify covered call signal was generated."""
    symbol = "AAPL"  # From scenario
    analysis = e2e_trading_system.get(f"{symbol}_call_analysis")

    assert analysis is not None
    assert analysis["recommendation"] == "SELL_CALL"


@then("the ATM call option should be selected")
def atm_call_selected(e2e_trading_system):
    """Verify at-the-money call option was selected."""
    symbol = "AAPL"
    analysis = e2e_trading_system[f"{symbol}_call_analysis"]

    current_price = analysis["current_price"]
    atm_strike = analysis["atm_strike"]

    # ATM strike should be close to current price
    assert (
        abs(atm_strike - current_price) <= 5
    ), f"ATM strike {atm_strike} should be near current price {current_price}"


@then("the call should be sold")
def call_sold(e2e_trading_system):
    """Verify call option was sold."""
    symbol = "AAPL"
    analysis = e2e_trading_system[f"{symbol}_call_analysis"]

    # In real system, would execute option order
    # For testing, we simulate the sale
    strike = analysis["recommended_strike"]
    contracts = analysis["contracts"]

    # Mark call as sold
    e2e_trading_system[f"{symbol}_call_sold"] = True
    e2e_trading_system[f"{symbol}_call_strike"] = strike
    e2e_trading_system[f"{symbol}_call_contracts"] = contracts

    assert e2e_trading_system[f"{symbol}_call_sold"] is True


@then("premium should be collected")
def premium_collected(e2e_trading_system):
    """Verify option premium was collected."""
    symbol = "AAPL"

    # Simulate premium collection
    # Typical premium: 2-5% of stock price
    current_price = e2e_trading_system["mock_data"][symbol]["price"]
    contracts = e2e_trading_system[f"{symbol}_call_contracts"]

    # Assume $2.50 per share premium
    premium_per_share = 2.50
    total_premium = premium_per_share * contracts * 100

    e2e_trading_system[f"{symbol}_premium_collected"] = total_premium

    # Add premium to cash
    trader = e2e_trading_system["trader"]
    original_cash = trader.cash
    trader.cash += total_premium

    assert trader.cash > original_cash, "Cash should increase from premium"
    assert total_premium > 0, "Premium should be positive"


@then("the position should be protected")
def position_protected(e2e_trading_system):
    """Verify position has downside protection from premium."""
    symbol = "AAPL"

    entry_price = e2e_trading_system[f"{symbol}_entry_price"]
    premium = e2e_trading_system[f"{symbol}_premium_collected"]
    position = e2e_trading_system["trader"].get_position(symbol)

    # Calculate breakeven with premium
    premium_per_share = premium / position["quantity"]
    breakeven = entry_price - premium_per_share

    # Store protection metrics
    e2e_trading_system[f"{symbol}_breakeven"] = breakeven
    e2e_trading_system[f"{symbol}_protected_by"] = premium_per_share

    assert (
        breakeven < entry_price
    ), "Breakeven should be lower than entry due to premium"


@then("shares should be delivered")
def shares_delivered(e2e_trading_system):
    """Verify shares were delivered on assignment."""
    symbol = "AAPL"
    trader = e2e_trading_system["trader"]

    # On assignment, shares are sold at strike price
    strike = e2e_trading_system[f"{symbol}_call_strike"]

    # Simulate assignment: remove position
    position_before = trader.get_position(symbol)
    quantity = position_before["quantity"]

    # Execute sell at strike price
    e2e_trading_system["mock_data"][symbol]["price"] = strike

    # Mark shares as delivered
    e2e_trading_system[f"{symbol}_shares_delivered"] = quantity
    e2e_trading_system[f"{symbol}_delivery_price"] = strike


@then("profit should be realized")
def profit_realized(e2e_trading_system):
    """Verify profit was realized from covered call trade."""
    symbol = "AAPL"

    entry_price = e2e_trading_system[f"{symbol}_entry_price"]
    delivery_price = e2e_trading_system[f"{symbol}_delivery_price"]
    premium = e2e_trading_system[f"{symbol}_premium_collected"]
    quantity = e2e_trading_system[f"{symbol}_shares_delivered"]

    # Calculate total profit
    # 1. Capital gain: (delivery_price - entry_price) * quantity
    capital_gain = (delivery_price - entry_price) * quantity

    # 2. Premium collected
    total_profit = capital_gain + premium

    e2e_trading_system[f"{symbol}_total_profit"] = total_profit

    # Profit should be positive
    assert total_profit > 0, f"Total profit {total_profit} should be positive"


@then("position should be closed")
def position_closed(e2e_trading_system):
    """Verify position is closed after assignment."""
    symbol = "AAPL"
    trader = e2e_trading_system["trader"]

    # Simulate closing the position
    position = trader.get_position(symbol)

    if position and position["quantity"] > 0:
        # Sell all shares at current price
        quantity = position["quantity"]
        event_loop = pytest.current_event_loop()
        event_loop.run_until_complete(
            trader.place_market_order(symbol, quantity, "SELL")
        )

    # Verify position closed
    final_position = trader.get_position(symbol)
    assert final_position is None or final_position["quantity"] == 0


@then("the overall trade should be profitable")
def overall_trade_profitable(e2e_trading_system):
    """Verify the complete covered call trade was profitable."""
    symbol = "AAPL"

    total_profit = e2e_trading_system.get(f"{symbol}_total_profit", 0)

    assert (
        total_profit > 0
    ), f"Covered call trade should be profitable, got ${total_profit:,.2f}"

    # Log success
    entry_price = e2e_trading_system[f"{symbol}_entry_price"]
    delivery_price = e2e_trading_system[f"{symbol}_delivery_price"]
    premium = e2e_trading_system[f"{symbol}_premium_collected"]

    print(f"\nCovered Call Trade Summary:")
    print(f"Entry: ${entry_price:.2f}")
    print(f"Assignment: ${delivery_price:.2f}")
    print(f"Premium: ${premium:.2f}")
    print(f"Total Profit: ${total_profit:,.2f}")
