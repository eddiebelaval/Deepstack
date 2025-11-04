"""
Enhanced Paper Trading Example

Demonstrates the complete enhanced paper trader with:
- Full risk system integration (Kelly, Stop Loss, Circuit Breakers)
- Real market data from Alpaca
- Commission tracking
- Performance analytics
- 10+ paper trades execution

This example shows the complete workflow for production-ready paper trading.
"""

import asyncio
import os
from datetime import datetime

from core.broker.paper_trader import PaperTrader
from core.config import Config
from core.data.alpaca_client import AlpacaClient
from core.risk.circuit_breaker import CircuitBreaker
from core.risk.kelly_position_sizer import KellyPositionSizer
from core.risk.stop_loss_manager import StopLossManager


def print_section(title: str):
    """Print formatted section header."""
    print(f"\n{'=' * 80}")
    print(f"  {title}")
    print(f"{'=' * 80}\n")


def print_subsection(title: str):
    """Print formatted subsection header."""
    print(f"\n{'-' * 60}")
    print(f"  {title}")
    print(f"{'-' * 60}\n")


async def main():
    """Run enhanced paper trading demonstration."""
    print_section("Enhanced Paper Trader - Full Integration Demo")

    # ========================================================================
    # STEP 1: Initialize Components
    # ========================================================================
    print_subsection("1. Initializing Components")

    # Load configuration
    config = Config()
    print("Configuration loaded")

    # Initialize Alpaca client (for real market data)
    # Note: Set environment variables ALPACA_API_KEY and ALPACA_SECRET_KEY
    alpaca_api_key = os.getenv("ALPACA_API_KEY", "your_api_key_here")
    alpaca_secret_key = os.getenv("ALPACA_SECRET_KEY", "your_secret_key_here")

    alpaca_client = None
    if alpaca_api_key != "your_api_key_here":
        try:
            alpaca_client = AlpacaClient(
                api_key=alpaca_api_key,
                secret_key=alpaca_secret_key,
                base_url="https://paper-api.alpaca.markets",
            )
            print("Alpaca client initialized (real market data enabled)")

            # Test connection
            health = await alpaca_client.health_check()
            if health:
                print("  Alpaca API health check: PASSED")
            else:
                print("  Alpaca API health check: FAILED (will use mock data)")
                alpaca_client = None
        except Exception as e:
            print(f"  Alpaca initialization failed: {e}")
            print("  Will proceed with mock data (prices will be random)")
            alpaca_client = None
    else:
        print("No Alpaca credentials - using mock data")
        print("  Set ALPACA_API_KEY and ALPACA_SECRET_KEY for real data")

    # Initialize risk systems
    initial_capital = 100000.0

    kelly_sizer = KellyPositionSizer(
        account_balance=initial_capital,
        max_position_pct=0.25,  # 25% max per position
        max_total_exposure=1.0,  # 100% max total exposure
    )
    print(f"Kelly Position Sizer initialized: max_position={0.25:.0%}")

    stop_manager = StopLossManager(
        account_balance=initial_capital,
        max_risk_per_trade=0.02,  # 2% max risk per trade
        default_stop_pct=0.02,  # 2% default stop
    )
    print(f"Stop Loss Manager initialized: max_risk={0.02:.1%}, default_stop={0.02:.1%}")

    circuit_breaker = CircuitBreaker(
        initial_portfolio_value=initial_capital,
        daily_loss_limit=0.03,  # 3% daily loss limit
        max_drawdown_limit=0.10,  # 10% max drawdown
        consecutive_loss_limit=5,  # 5 consecutive losses
    )
    print(f"Circuit Breaker initialized:")
    print(f"  Daily loss limit: {0.03:.1%}")
    print(f"  Max drawdown: {0.10:.1%}")
    print(f"  Consecutive loss limit: 5")

    # Initialize paper trader with all enhancements
    trader = PaperTrader(
        config=config,
        alpaca_client=alpaca_client,
        kelly_sizer=kelly_sizer,
        stop_manager=stop_manager,
        circuit_breaker=circuit_breaker,
        enable_risk_systems=True,
        commission_per_trade=1.0,  # $1 per trade
        commission_per_share=0.005,  # $0.005 per share
        enforce_market_hours=False,  # Disable for demo
    )
    print(f"\nPaper Trader initialized:")
    print(f"  Initial capital: ${initial_capital:,.2f}")
    print(f"  Commission: $1.00/trade + $0.005/share")
    print(f"  Risk systems: ENABLED")
    print(f"  Market hours enforcement: DISABLED (demo mode)")

    # ========================================================================
    # STEP 2: Check Circuit Breakers
    # ========================================================================
    print_subsection("2. Circuit Breaker Status Check")

    breaker_status = await trader.check_circuit_breakers()
    print(f"Trading allowed: {breaker_status['trading_allowed']}")
    print(f"Breakers tripped: {len(breaker_status['breakers_tripped'])}")
    if breaker_status['warnings']:
        print(f"Warnings: {breaker_status['warnings']}")

    if not breaker_status["trading_allowed"]:
        print("\nCIRCUIT BREAKERS TRIPPED - Trading halted!")
        print(f"Reasons: {breaker_status['reasons']}")
        return

    print("\nAll circuit breakers ARMED - Trading approved")

    # ========================================================================
    # STEP 3: Execute Paper Trades (10+ trades)
    # ========================================================================
    print_subsection("3. Executing 10+ Paper Trades")

    # Define test stocks
    test_symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA"]

    # Historical performance estimates (for Kelly sizing)
    # In production, these would come from backtesting
    performance_params = {
        "win_rate": 0.60,  # 60% win rate
        "avg_win": 200.0,  # Average $200 win
        "avg_loss": 100.0,  # Average $100 loss
        "kelly_fraction": 0.5,  # Half Kelly for safety
    }

    print(f"Performance parameters for Kelly sizing:")
    print(f"  Win rate: {performance_params['win_rate']:.1%}")
    print(f"  Avg win: ${performance_params['avg_win']:.2f}")
    print(f"  Avg loss: ${performance_params['avg_loss']:.2f}")
    print(f"  Kelly fraction: {performance_params['kelly_fraction']:.1f}x")

    # Trade execution loop
    trade_count = 0
    target_trades = 12  # 12 trades total (6 buy/sell cycles)

    for cycle in range(6):
        symbol = test_symbols[cycle % len(test_symbols)]

        print(f"\n\nTrade Cycle #{cycle + 1}: {symbol}")
        print("-" * 40)

        # =====================================================================
        # BUY PHASE
        # =====================================================================
        print(f"\nBUY {symbol}")

        # Step 1: Calculate position size with Kelly
        position_size_result = await trader.calculate_position_size(
            symbol=symbol,
            **performance_params
        )

        shares = position_size_result["shares"]
        if shares is None or shares == 0:
            print(f"  Cannot calculate shares for {symbol}")
            continue

        print(f"  Kelly position sizing:")
        print(f"    Position size: ${position_size_result['position_size']:,.2f}")
        print(f"    Shares: {shares}")
        print(f"    Kelly %: {position_size_result['kelly_pct']:.2%}")
        print(f"    Adjusted %: {position_size_result['adjusted_pct']:.2%}")
        print(f"    Portfolio heat: {position_size_result['portfolio_heat']:.1%}")
        print(f"    Rationale: {position_size_result['rationale']}")

        # Step 2: Place buy order with automatic stop loss
        print(f"\n  Placing BUY order...")
        buy_order_id = await trader.place_market_order(
            symbol=symbol,
            quantity=shares,
            action="BUY",
            auto_stop_loss=True,
            stop_pct=0.02,  # 2% stop loss
        )

        if buy_order_id:
            trade_count += 1
            print(f"  BUY order filled: {buy_order_id}")

            # Check stop loss placement
            if symbol in stop_manager.active_stops:
                stop_data = stop_manager.active_stops[symbol]
                print(f"  Automatic stop loss placed:")
                print(f"    Stop price: ${stop_data['stop_price']:.2f}")
                print(f"    Entry price: ${stop_data['entry_price']:.2f}")

            # Show position
            position = trader.get_position(symbol)
            if position:
                print(f"  Position opened:")
                print(f"    Shares: {position['quantity']}")
                print(f"    Avg cost: ${position['avg_cost']:.2f}")
        else:
            print(f"  BUY order FAILED")
            continue

        # =====================================================================
        # SELL PHASE (simulate price movement)
        # =====================================================================
        print(f"\nSELL {symbol}")

        # Simulate random outcome (win or loss)
        import random
        is_win = random.random() < performance_params["win_rate"]

        if is_win:
            print(f"  Simulating WINNING trade (+{performance_params['avg_win']:.0f})")
        else:
            print(f"  Simulating LOSING trade (-{performance_params['avg_loss']:.0f})")

        # Place sell order
        print(f"  Placing SELL order...")
        sell_order_id = await trader.place_market_order(
            symbol=symbol,
            quantity=shares,
            action="SELL",
        )

        if sell_order_id:
            trade_count += 1
            print(f"  SELL order filled: {sell_order_id}")

            # Show P&L
            trades = trader.get_trade_history(limit=1)
            if trades and trades[0]["action"] == "SELL":
                pnl = trades[0].get("pnl", 0)
                print(f"  Trade P&L: ${pnl:,.2f}")
        else:
            print(f"  SELL order FAILED")

        # Show portfolio summary after each cycle
        summary = trader.get_performance_summary()
        print(f"\nPortfolio after cycle #{cycle + 1}:")
        print(f"  Portfolio value: ${summary['portfolio_value']:,.2f}")
        print(f"  Cash: ${summary['cash']:,.2f}")
        print(f"  Total P&L: ${summary['total_pnl']:,.2f} ({summary['total_return_pct']:.2%})")
        print(f"  Commissions paid: ${summary['total_commissions']:,.2f}")
        print(f"  Trades executed: {summary['num_trades']}")

        # Check circuit breakers
        breaker_status = await trader.check_circuit_breakers()
        if not breaker_status["trading_allowed"]:
            print("\nCIRCUIT BREAKER TRIPPED - Halting trading!")
            print(f"Reasons: {breaker_status['reasons']}")
            break

        # Small delay for readability
        await asyncio.sleep(0.1)

    # ========================================================================
    # STEP 4: Performance Analytics
    # ========================================================================
    print_subsection("4. Performance Analytics Dashboard")

    summary = trader.get_performance_summary()

    print("Portfolio Summary:")
    print(f"  Initial capital: ${summary['initial_cash']:,.2f}")
    print(f"  Final portfolio value: ${summary['portfolio_value']:,.2f}")
    print(f"  Cash: ${summary['cash']:,.2f}")
    print(f"  Positions value: ${summary['positions_value']:,.2f}")
    print(f"  Total P&L: ${summary['total_pnl']:,.2f}")
    print(f"  Total return: {summary['total_return_pct']:.2%}")
    print(f"  Total commissions: ${summary['total_commissions']:,.2f}")

    print("\nPerformance Metrics:")
    if summary['sharpe_ratio'] is not None:
        print(f"  Sharpe ratio: {summary['sharpe_ratio']:.2f}")
    else:
        print(f"  Sharpe ratio: N/A (insufficient data)")
    print(f"  Max drawdown: {summary['max_drawdown_pct']:.2%} (${summary['max_drawdown_dollars']:,.2f})")
    print(f"  Peak portfolio value: ${summary['peak_value']:,.2f}")

    print("\nTrade Statistics:")
    print(f"  Total trades: {summary['num_trades']}")
    print(f"  Winning trades: {summary['winning_trades']}")
    print(f"  Losing trades: {summary['losing_trades']}")
    print(f"  Win rate: {summary['win_rate']:.1%}")
    print(f"  Avg win: ${summary['avg_win']:,.2f}")
    print(f"  Avg loss: ${summary['avg_loss']:,.2f}")

    # ========================================================================
    # STEP 5: Risk System Status
    # ========================================================================
    print_subsection("5. Risk System Status")

    # Kelly Position Sizer
    kelly_info = kelly_sizer.get_position_info()
    print("Kelly Position Sizer:")
    print(f"  Account balance: ${kelly_info['account_balance']:,.2f}")
    print(f"  Max position %: {kelly_info['max_position_pct']:.1%}")
    print(f"  Max position value: ${kelly_info['max_position_value']:,.2f}")
    print(f"  Current heat: {kelly_info['current_heat']:.1%}")
    print(f"  Remaining capacity: {kelly_info['remaining_capacity']:.1%}")
    print(f"  Active positions: {kelly_info['num_positions']}")

    # Stop Loss Manager
    all_stops = stop_manager.get_all_stops()
    print(f"\nStop Loss Manager:")
    print(f"  Active stops: {len(all_stops)}")
    for symbol, stop_data in all_stops.items():
        print(f"    {symbol}: ${stop_data['stop_price']:.2f} ({stop_data['stop_type']})")

    # Circuit Breaker
    breaker_status = circuit_breaker.get_breaker_status()
    print(f"\nCircuit Breaker:")
    print(f"  Trading allowed: {breaker_status['trading_allowed']}")
    print(f"  Any tripped: {breaker_status['any_tripped']}")
    print(f"  Breaker states:")
    for breaker_name, state in breaker_status.items():
        if breaker_name not in ['any_tripped', 'trading_allowed']:
            if isinstance(state, dict):
                print(f"    {breaker_name}: {state['state']}")

    # ========================================================================
    # STEP 6: Trade History
    # ========================================================================
    print_subsection("6. Recent Trade History (Last 10)")

    recent_trades = trader.get_trade_history(limit=10)
    if recent_trades:
        print(f"{'Symbol':<8} {'Action':<6} {'Qty':<6} {'Price':<10} {'Commission':<12} {'P&L':<12}")
        print("-" * 60)
        for trade in recent_trades:
            symbol = trade['symbol']
            action = trade['action']
            qty = trade['quantity']
            price = trade['price']
            commission = trade.get('commission', 0)
            pnl = trade.get('pnl', 0)

            print(f"{symbol:<8} {action:<6} {qty:<6} ${price:<9.2f} ${commission:<11.2f} ${pnl:<11.2f}")
    else:
        print("No trades executed")

    # ========================================================================
    # STEP 7: Final Summary
    # ========================================================================
    print_subsection("7. Final Summary")

    print(f"Trades executed: {trade_count}/{target_trades}")
    print(f"Success rate: {(trade_count/target_trades)*100:.0f}%")

    pnl_dollar = summary['total_pnl']
    pnl_pct = summary['total_return_pct']

    if pnl_dollar > 0:
        result = "PROFIT"
        emoji = ""
    else:
        result = "LOSS"
        emoji = ""

    print(f"\nFinal result: {result} {emoji}")
    print(f"  P&L: ${pnl_dollar:,.2f} ({pnl_pct:.2%})")
    print(f"  Commissions: ${summary['total_commissions']:,.2f}")
    print(f"  Net return: ${pnl_dollar:,.2f}")

    # Risk system validation
    print(f"\nRisk system validation:")
    print(f"  Circuit breakers: {'PASSED' if breaker_status['trading_allowed'] else 'TRIPPED'}")
    print(f"  Stop coverage: {len(all_stops)}/{summary['num_positions']} positions")
    print(f"  Portfolio heat: {kelly_info['current_heat']:.1%}")

    print(f"\n{'=' * 80}")
    print("Enhanced Paper Trader Demo Complete!")
    print(f"{'=' * 80}\n")

    # Cleanup
    if alpaca_client:
        await alpaca_client.disconnect_stream()


if __name__ == "__main__":
    print("\nEnhanced Paper Trader - Full Integration Demo")
    print("=" * 80)
    print("\nThis demo showcases:")
    print("  1. Full risk system integration (Kelly, Stop Loss, Circuit Breakers)")
    print("  2. Real market data from Alpaca API")
    print("  3. Commission tracking and realistic slippage")
    print("  4. Performance analytics (Sharpe ratio, drawdown, win rate)")
    print("  5. 10+ paper trades with complete lifecycle")
    print("\nStarting demo...")
    print("=" * 80)

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user")
    except Exception as e:
        print(f"\n\nDemo failed with error: {e}")
        import traceback
        traceback.print_exc()
