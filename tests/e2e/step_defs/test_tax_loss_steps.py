"""
Step definitions for tax loss harvesting E2E test.

Tests the tax loss harvesting optimization workflow.
"""

from datetime import datetime

from pytest_bdd import given, parsers, scenarios, then, when

from core.tax.tax_loss_harvester import TaxLossHarvester
from core.tax.wash_sale_tracker import WashSaleTracker

# Load scenarios from feature file
scenarios("../features/tax_loss_harvesting.feature")


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


@given("the tax loss harvester is enabled")
def tax_harvester_enabled(e2e_trading_system):
    """Enable tax loss harvester."""
    trader = e2e_trading_system["trader"]

    # Create wash sale tracker
    wash_tracker = WashSaleTracker()

    # Create tax loss harvester
    harvester = TaxLossHarvester(
        trader=trader,
        wash_sale_tracker=wash_tracker,
        tax_rate_short_term=0.37,
        tax_rate_long_term=0.20,
        min_loss_threshold=100.0,
    )

    e2e_trading_system["harvester"] = harvester
    e2e_trading_system["wash_tracker"] = wash_tracker


@given(
    parsers.parse(
        'the portfolio holds {shares:d} shares of "{symbol}" at {cost:d} dollar cost basis'
    )
)
def portfolio_holds_position(e2e_trading_system, symbol, shares, cost, event_loop):
    """Add a position to the portfolio."""
    trader = e2e_trading_system["trader"]
    mock_data = e2e_trading_system["mock_data"]

    # Add stock to mock data with cost basis price
    if symbol not in mock_data:
        mock_data[symbol] = {}
    mock_data[symbol]["price"] = float(cost)

    # Place buy order to establish position
    order_id = event_loop.run_until_complete(
        trader.place_market_order(symbol, shares, "BUY")
    )

    assert order_id is not None, f"Should create position in {symbol}"

    # Store original cost basis
    e2e_trading_system[f"_{symbol}_cost_basis"] = float(cost)
    e2e_trading_system[f"_{symbol}_shares"] = shares


@given(parsers.parse('"{symbol}" is currently trading at {price:d} dollars'))
def stock_current_price(e2e_trading_system, symbol, price):
    """Update stock current price."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}
    mock_data[symbol]["price"] = float(price)


@given(parsers.parse('"{symbol}" is a suitable alternative at {price:d} dollars'))
def alternative_stock(e2e_trading_system, symbol, price):
    """Add alternative stock for harvesting."""
    mock_data = e2e_trading_system["mock_data"]
    if symbol not in mock_data:
        mock_data[symbol] = {}
    mock_data[symbol]["price"] = float(price)
    mock_data[symbol]["is_alternative"] = True


@when("the tax loss harvester scans opportunities")
def scan_harvest_opportunities(e2e_trading_system, event_loop):
    """Scan portfolio for tax loss harvesting opportunities."""
    harvester = e2e_trading_system["harvester"]

    # Run the scan
    opportunities = event_loop.run_until_complete(harvester.scan_opportunities())

    e2e_trading_system["harvest_opportunities"] = opportunities


@then(parsers.parse('a harvest opportunity should be identified for "{symbol}"'))
def verify_harvest_opportunity(e2e_trading_system, symbol):
    """Verify harvest opportunity was identified."""
    opportunities = e2e_trading_system.get("harvest_opportunities", [])

    assert len(opportunities) > 0, "At least one harvest opportunity should be found"

    # Find opportunity for the specific symbol
    opportunity = next((opp for opp in opportunities if opp.symbol == symbol), None)

    assert opportunity is not None, f"Harvest opportunity should be found for {symbol}"

    e2e_trading_system["_current_opportunity"] = opportunity


@then(parsers.parse("the unrealized loss should be {amount:d} dollars"))
def verify_unrealized_loss(e2e_trading_system, amount):
    """Verify unrealized loss amount."""
    opportunity = e2e_trading_system.get("_current_opportunity")

    assert opportunity is not None, "Harvest opportunity should exist"

    # Check unrealized loss (allow for commission and rounding - within 2% tolerance)
    tolerance = amount * 0.02  # 2% tolerance
    assert abs(opportunity.unrealized_loss - amount) < max(
        tolerance, 15.0
    ), f"Unrealized loss should be ~${amount}, got ${opportunity.unrealized_loss:.2f}"


@then("the tax benefit should be calculated")
def verify_tax_benefit(e2e_trading_system):
    """Verify tax benefit was calculated."""
    opportunity = e2e_trading_system.get("_current_opportunity")

    assert opportunity is not None, "Harvest opportunity should exist"
    assert opportunity.estimated_tax_benefit > 0, "Tax benefit should be greater than 0"

    # Verify tax benefit is reasonable (37% for short-term)
    expected_benefit = opportunity.unrealized_loss * 0.37
    assert (
        abs(opportunity.estimated_tax_benefit - expected_benefit) < 1.0
    ), f"Tax benefit should be ~${expected_benefit:.2f}, got ${opportunity.estimated_tax_benefit:.2f}"


@then("wash sale rules should be respected")
def verify_wash_sale_compliance(e2e_trading_system):
    """Verify wash sale rules are respected."""
    wash_tracker = e2e_trading_system["wash_tracker"]
    opportunity = e2e_trading_system.get("_current_opportunity")

    assert opportunity is not None, "Harvest opportunity should exist"

    # Check that opportunity would not trigger wash sale
    current_date = datetime.now()
    is_wash_sale = wash_tracker.is_wash_sale(opportunity.symbol, current_date)

    assert (
        not is_wash_sale
    ), f"Harvest opportunity should not trigger wash sale for {opportunity.symbol}"


@then("no harvest opportunity should be identified")
def verify_no_harvest_opportunity(e2e_trading_system):
    """Verify no harvest opportunity was found."""
    opportunities = e2e_trading_system.get("harvest_opportunities", [])

    assert (
        len(opportunities) == 0
    ), f"Expected no harvest opportunities, found {len(opportunities)}"


@then("the reason should be below threshold")
def verify_below_threshold_reason(e2e_trading_system):
    """Verify harvest was skipped due to threshold."""
    harvester = e2e_trading_system["harvester"]

    # Check that min threshold is configured
    assert harvester.min_loss_threshold == 100.0, "Min loss threshold should be $100"

    # Verify the loss is below threshold
    # SMALL: 10 shares * $2 loss = $20 loss (below $100 threshold)
    opportunities = e2e_trading_system.get("harvest_opportunities", [])
    assert (
        len(opportunities) == 0
    ), "No opportunities should be found for losses below $100"
