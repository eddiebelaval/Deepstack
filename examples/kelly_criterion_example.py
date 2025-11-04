"""
Kelly Criterion Position Sizing Examples

Demonstrates practical usage of the KellyPositionSizer with real-world scenarios.
Includes hand calculations to validate Kelly math and show how the sizer works.

Run this file to see Kelly position sizing in action:
    python examples/kelly_criterion_example.py
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.risk.kelly_position_sizer import KellyPositionSizer


def print_section(title):
    """Print formatted section header."""
    print(f"\n{'=' * 80}")
    print(f"  {title}")
    print(f"{'=' * 80}\n")


def print_result(result, show_all=False):
    """Print position sizing result in readable format."""
    print(f"Position Size: ${result['position_size']:,.2f}")
    if result["shares"] is not None:
        print(f"Shares: {result['shares']:,}")
    print(f"Raw Kelly: {result['kelly_pct']:.2%}")
    print(f"Adjusted %: {result['adjusted_pct']:.2%}")
    print(f"Win/Loss Ratio: {result['win_loss_ratio']:.2f}")
    print(f"Portfolio Heat: {result['portfolio_heat']:.1%}")
    print(f"Rationale: {result['rationale']}")

    if result["warnings"]:
        print(f"\nWarnings:")
        for warning in result["warnings"]:
            print(f"  - {warning}")

    if show_all:
        print(f"\nFull Result:")
        for key, value in result.items():
            print(f"  {key}: {value}")


def example_1_basic_kelly():
    """Example 1: Basic Kelly calculation with positive edge."""
    print_section("Example 1: Basic Kelly Calculation")

    print("Scenario: Momentum strategy with 55% win rate")
    print("- Historical win rate: 55%")
    print("- Average win: $1,500")
    print("- Average loss: $1,000")
    print("- Account balance: $100,000")
    print()

    print("Hand Calculation:")
    print("  Win/Loss Ratio (R) = $1,500 / $1,000 = 1.5")
    print("  Win Rate (W) = 0.55")
    print("  Loss Rate (L) = 1 - 0.55 = 0.45")
    print()
    print("  Kelly % = (W × R - L) / R")
    print("          = (0.55 × 1.5 - 0.45) / 1.5")
    print("          = (0.825 - 0.45) / 1.5")
    print("          = 0.375 / 1.5")
    print("          = 0.25 (25%)")
    print()
    print("  Half Kelly (0.5x) = 25% × 0.5 = 12.5%")
    print("  Position Size = $100,000 × 12.5% = $12,500")
    print()

    # Calculate using sizer
    sizer = KellyPositionSizer(account_balance=100000)

    result = sizer.calculate_position_size(
        win_rate=0.55,
        avg_win=1500,
        avg_loss=1000,
        kelly_fraction=0.5,  # Half Kelly for safety
        stock_price=125.0,
        symbol="MOM",
    )

    print("Sizer Result:")
    print_result(result)


def example_2_fractional_kelly_comparison():
    """Example 2: Compare fractional Kelly sizes (0.25x, 0.5x, 1.0x)."""
    print_section("Example 2: Fractional Kelly Comparison")

    print("Scenario: Value strategy with 60% win rate")
    print("- Historical win rate: 60%")
    print("- Average win: $2,000")
    print("- Average loss: $1,000")
    print("- Account balance: $100,000")
    print()

    print("Hand Calculation:")
    print("  Win/Loss Ratio (R) = $2,000 / $1,000 = 2.0")
    print("  Kelly % = (0.60 × 2.0 - 0.40) / 2.0")
    print("          = (1.20 - 0.40) / 2.0")
    print("          = 0.40 (40%)")
    print()

    sizer = KellyPositionSizer(account_balance=100000)

    # Compare different Kelly fractions
    fractions = [
        (0.25, "Quarter Kelly (Conservative)"),
        (0.50, "Half Kelly (Recommended)"),
        (1.00, "Full Kelly (Aggressive)"),
    ]

    for fraction, label in fractions:
        result = sizer.calculate_position_size(
            win_rate=0.60,
            avg_win=2000,
            avg_loss=1000,
            kelly_fraction=fraction,
            stock_price=100.0,
        )

        print(f"{label}:")
        print(f"  Fraction: {fraction:.2f}x")
        print(f"  Position %: {result['adjusted_pct']:.2%}")
        print(f"  Position Size: ${result['position_size']:,.2f}")
        print(f"  Shares: {result['shares']}")
        print()


def example_3_portfolio_heat():
    """Example 3: Portfolio heat management with existing positions."""
    print_section("Example 3: Portfolio Heat Management")

    print("Scenario: Adding position to existing portfolio")
    print("- Account balance: $100,000")
    print("- Existing positions:")
    print("    AAPL: $20,000 (20%)")
    print("    GOOGL: $15,000 (15%)")
    print("    MSFT: $10,000 (10%)")
    print("    Total heat: 45%")
    print()
    print("- Trying to add TSLA position")
    print("- TSLA stats: 58% win rate, $1,800 avg win, $1,200 avg loss")
    print()

    sizer = KellyPositionSizer(
        account_balance=100000,
        max_position_pct=0.25,
        current_positions={
            "AAPL": 20000,
            "GOOGL": 15000,
            "MSFT": 10000,
        },
    )

    print("Hand Calculation:")
    print("  Win/Loss Ratio = $1,800 / $1,200 = 1.5")
    print("  Kelly % = (0.58 × 1.5 - 0.42) / 1.5")
    print("          = (0.87 - 0.42) / 1.5")
    print("          = 0.30 (30%)")
    print("  Half Kelly = 15%")
    print()
    print("  Current portfolio heat: 45%")
    print("  Max total exposure: 100%")
    print("  Remaining capacity: 55%")
    print("  Requested: 15% (fits within capacity)")
    print()

    result = sizer.calculate_position_size(
        win_rate=0.58,
        avg_win=1800,
        avg_loss=1200,
        kelly_fraction=0.5,
        stock_price=250.0,
        symbol="TSLA",
    )

    print("Sizer Result:")
    print_result(result)


def example_4_position_caps():
    """Example 4: Position caps preventing oversized positions."""
    print_section("Example 4: Position Caps Enforcement")

    print("Scenario: Very strong edge but capped position")
    print("- Win rate: 70% (very high)")
    print("- Average win: $3,000")
    print("- Average loss: $1,000")
    print("- Account balance: $100,000")
    print("- Max position cap: 25%")
    print()

    print("Hand Calculation:")
    print("  Win/Loss Ratio = $3,000 / $1,000 = 3.0")
    print("  Kelly % = (0.70 × 3.0 - 0.30) / 3.0")
    print("          = (2.10 - 0.30) / 3.0")
    print("          = 0.60 (60%)")
    print()
    print("  Full Kelly would be 60%, but...")
    print("  Capped at max_position_pct = 25%")
    print("  Final position = $25,000")
    print()

    sizer = KellyPositionSizer(account_balance=100000, max_position_pct=0.25)

    result = sizer.calculate_position_size(
        win_rate=0.70,
        avg_win=3000,
        avg_loss=1000,
        kelly_fraction=1.0,  # Full Kelly
        stock_price=100.0,
    )

    print("Sizer Result:")
    print_result(result)


def example_5_negative_edge():
    """Example 5: Negative edge - no position recommended."""
    print_section("Example 5: Negative Edge (No Position)")

    print("Scenario: Poor strategy with negative expected value")
    print("- Win rate: 40% (losing more than winning)")
    print("- Average win: $1,000")
    print("- Average loss: $1,000")
    print("- Account balance: $100,000")
    print()

    print("Hand Calculation:")
    print("  Win/Loss Ratio = $1,000 / $1,000 = 1.0")
    print("  Kelly % = (0.40 × 1.0 - 0.60) / 1.0")
    print("          = (0.40 - 0.60) / 1.0")
    print("          = -0.20 (-20%)")
    print()
    print("  Negative Kelly = No position (negative expected value)")
    print()

    sizer = KellyPositionSizer(account_balance=100000)

    result = sizer.calculate_position_size(
        win_rate=0.40, avg_win=1000, avg_loss=1000, kelly_fraction=0.5
    )

    print("Sizer Result:")
    print_result(result)


def example_6_low_win_rate_high_ratio():
    """Example 6: Low win rate but high win/loss ratio."""
    print_section("Example 6: Low Win Rate, High Win/Loss Ratio")

    print("Scenario: Trend following strategy")
    print("- Win rate: 35% (loses often)")
    print("- Average win: $5,000 (big winners)")
    print("- Average loss: $500 (small losers)")
    print("- Account balance: $100,000")
    print()
    print("This is typical of trend-following: lose often, win big")
    print()

    print("Hand Calculation:")
    print("  Win/Loss Ratio = $5,000 / $500 = 10.0")
    print("  Kelly % = (0.35 × 10.0 - 0.65) / 10.0")
    print("          = (3.50 - 0.65) / 10.0")
    print("          = 0.285 (28.5%)")
    print()
    print("  Half Kelly = 14.25%")
    print("  Position Size = $14,250")
    print()

    sizer = KellyPositionSizer(account_balance=100000)

    result = sizer.calculate_position_size(
        win_rate=0.35, avg_win=5000, avg_loss=500, kelly_fraction=0.5, stock_price=75.0
    )

    print("Sizer Result:")
    print_result(result)


def example_7_portfolio_full():
    """Example 7: Portfolio at capacity - no room for new position."""
    print_section("Example 7: Portfolio at Capacity")

    print("Scenario: Fully invested portfolio")
    print("- Account balance: $100,000")
    print("- Max total exposure: 100%")
    print("- Existing positions:")
    print("    AAPL: $30,000 (30%)")
    print("    GOOGL: $25,000 (25%)")
    print("    MSFT: $25,000 (25%)")
    print("    TSLA: $20,000 (20%)")
    print("    Total heat: 100% (fully invested)")
    print()

    sizer = KellyPositionSizer(
        account_balance=100000,
        max_total_exposure=1.0,
        current_positions={
            "AAPL": 30000,
            "GOOGL": 25000,
            "MSFT": 25000,
            "TSLA": 20000,
        },
    )

    result = sizer.calculate_position_size(
        win_rate=0.60, avg_win=2000, avg_loss=1000, kelly_fraction=0.5, symbol="AMZN"
    )

    print("Sizer Result:")
    print_result(result)
    print()
    print("Note: Portfolio is at 100% capacity, no room for new positions.")
    print("      Must sell existing positions first or increase account balance.")


def example_8_realistic_workflow():
    """Example 8: Realistic trading workflow."""
    print_section("Example 8: Realistic Trading Workflow")

    print("Scenario: Progressive portfolio building")
    print("- Starting with $100,000 account")
    print("- Building positions over time")
    print()

    # Initialize sizer
    sizer = KellyPositionSizer(
        account_balance=100000,
        max_position_pct=0.25,
        max_total_exposure=1.0,
        min_position_size=100,
    )

    # Position 1: AAPL
    print("Step 1: Analyze AAPL")
    print("  Stats: 56% win rate, $1,600 avg win, $1,100 avg loss")
    result1 = sizer.calculate_position_size(
        win_rate=0.56,
        avg_win=1600,
        avg_loss=1100,
        kelly_fraction=0.5,
        stock_price=180.0,
        symbol="AAPL",
    )
    print(
        f"  Recommended: ${result1['position_size']:,.2f} ({result1['shares']} shares)"
    )
    print()

    # Update positions
    sizer.update_positions({"AAPL": result1["position_size"]})

    # Position 2: GOOGL
    print("Step 2: Analyze GOOGL")
    print("  Stats: 58% win rate, $1,800 avg win, $1,200 avg loss")
    print(f"  Current portfolio heat: {sizer.get_portfolio_heat():.1%}")
    result2 = sizer.calculate_position_size(
        win_rate=0.58,
        avg_win=1800,
        avg_loss=1200,
        kelly_fraction=0.5,
        stock_price=140.0,
        symbol="GOOGL",
    )
    print(
        f"  Recommended: ${result2['position_size']:,.2f} ({result2['shares']} shares)"
    )
    print()

    # Update positions
    current_positions = {
        "AAPL": result1["position_size"],
        "GOOGL": result2["position_size"],
    }
    sizer.update_positions(current_positions)

    # Position 3: MSFT
    print("Step 3: Analyze MSFT")
    print("  Stats: 60% win rate, $2,000 avg win, $1,000 avg loss")
    print(f"  Current portfolio heat: {sizer.get_portfolio_heat():.1%}")
    result3 = sizer.calculate_position_size(
        win_rate=0.60,
        avg_win=2000,
        avg_loss=1000,
        kelly_fraction=0.5,
        stock_price=380.0,
        symbol="MSFT",
    )
    print(
        f"  Recommended: ${result3['position_size']:,.2f} ({result3['shares']} shares)"
    )
    print()

    # Final portfolio state
    current_positions["MSFT"] = result3["position_size"]
    sizer.update_positions(current_positions)

    print("Final Portfolio:")
    info = sizer.get_position_info()
    print(f"  Account Balance: ${info['account_balance']:,.2f}")
    print(f"  Total Positions: {info['num_positions']}")
    print(f"  Portfolio Heat: {info['current_heat']:.1%}")
    print(f"  Remaining Capacity: {info['remaining_capacity']:.1%}")
    print()
    print("  Positions:")
    for symbol, value in current_positions.items():
        pct = value / info["account_balance"]
        print(f"    {symbol}: ${value:,.2f} ({pct:.1%})")


def main():
    """Run all examples."""
    print("\n" + "=" * 80)
    print("  KELLY CRITERION POSITION SIZER - EXAMPLES")
    print("  DeepStack Trading System")
    print("=" * 80)

    # Run all examples
    example_1_basic_kelly()
    example_2_fractional_kelly_comparison()
    example_3_portfolio_heat()
    example_4_position_caps()
    example_5_negative_edge()
    example_6_low_win_rate_high_ratio()
    example_7_portfolio_full()
    example_8_realistic_workflow()

    print("\n" + "=" * 80)
    print("  END OF EXAMPLES")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
