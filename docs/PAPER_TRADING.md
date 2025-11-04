# Enhanced Paper Trading System

Production-ready paper trading simulator for DeepStack with full risk system integration, real market data, and comprehensive performance analytics.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Integration Guide](#integration-guide)
6. [Performance Analytics](#performance-analytics)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)
9. [API Reference](#api-reference)
10. [Examples](#examples)

---

## Overview

The Enhanced Paper Trader simulates real trading with zero financial risk while providing production-grade features:

- **Real Market Data**: Integrates with Alpaca API for live price feeds
- **Risk Systems**: Full integration with Kelly Position Sizer, Stop Loss Manager, and Circuit Breakers
- **Commission Modeling**: Realistic commission tracking (per-trade and per-share)
- **Slippage Simulation**: Volatility-based slippage model considering order size
- **Performance Analytics**: Sharpe ratio, max drawdown, win rate, and more
- **Market Hours**: NYSE market hours enforcement (optional)

### Key Differentiators

Unlike basic paper trading simulators, this implementation:

1. **Integrates all risk systems** before every trade
2. **Uses real market data** (no mocks in production)
3. **Tracks realistic costs** (commissions, slippage)
4. **Provides production-grade analytics** (institutional-quality metrics)
5. **Enforces pre-trade validation** (circuit breakers MUST pass)

---

## Features

### 1. Risk System Integration

#### Kelly Position Sizing
- Automatically calculates optimal position sizes
- Respects portfolio heat limits
- Adjusts for existing positions
- Provides detailed rationale for sizing decisions

#### Stop Loss Management
- Automatic stop placement on every buy order
- Multiple stop types (fixed %, ATR-based, trailing)
- Never-downgrade rule enforcement
- 100% position coverage

#### Circuit Breakers
- Daily loss limit protection
- Maximum drawdown protection
- Consecutive loss limit
- Volatility spike detection
- Immediate trading halt when tripped

### 2. Real Market Data

```python
# Alpaca Integration
alpaca = AlpacaClient(
    api_key="your_api_key",
    secret_key="your_secret_key"
)

trader = PaperTrader(
    config=config,
    alpaca_client=alpaca,  # Real-time quotes
    enable_risk_systems=True
)
```

**Fallback Hierarchy:**
1. Alpaca real-time quote
2. Cached price (if recent)
3. Order rejection (fail-safe)

### 3. Commission & Slippage

#### Commission Models

```python
# Fixed per-trade
trader = PaperTrader(
    commission_per_trade=1.0  # $1 per trade
)

# Per-share
trader = PaperTrader(
    commission_per_share=0.005  # $0.005/share
)

# Blended (both)
trader = PaperTrader(
    commission_per_trade=1.0,
    commission_per_share=0.005
)
```

#### Enhanced Slippage Model

Considers:
- **Base slippage**: 5 basis points
- **Order size impact**: Larger orders = more slippage
- **Volatility multiplier**: Adjustable for market conditions
- **Random component**: Realistic variance

```python
# Formula
slippage = (base + size_impact) × volatility × random_factor
```

### 4. Performance Analytics

#### Metrics Provided

1. **Sharpe Ratio**
   - Annualized risk-adjusted returns
   - Formula: `(mean_return - risk_free_rate) / std_return`

2. **Maximum Drawdown**
   - Peak-to-trough decline
   - Both percentage and dollar amounts

3. **Trade Statistics**
   - Total trades, wins, losses
   - Win rate calculation
   - Average win/loss amounts
   - Largest win/loss tracking

4. **Commission Tracking**
   - Total commissions paid
   - Commission impact on returns

### 5. Market Hours Enforcement

```python
trader = PaperTrader(
    enforce_market_hours=True  # NYSE hours: 9:30 AM - 4:00 PM ET
)
```

- Automatic timezone handling (ET)
- Weekend detection
- Pre-market/after-hours rejection

---

## Architecture

### Integration Pattern

Every trade follows this workflow:

```
1. Check circuit breakers → HALT if tripped
2. Check market hours → REJECT if closed
3. Calculate position size (Kelly) → Get optimal shares
4. Get market price (Alpaca) → REJECT if unavailable
5. Calculate slippage & commission → Realistic fill
6. Execute trade → Update portfolio
7. Place automatic stop loss → Protect position
8. Update performance metrics → Track analytics
```

### Component Dependencies

```
PaperTrader
    ├── AlpacaClient (market data)
    ├── KellyPositionSizer (position sizing)
    ├── StopLossManager (stop placement)
    ├── CircuitBreaker (trading halt)
    └── SQLite (persistence)
```

### Database Schema

**Positions Table:**
```sql
CREATE TABLE positions (
    symbol TEXT PRIMARY KEY,
    quantity INTEGER,
    avg_cost REAL,
    market_value REAL,
    unrealized_pnl REAL,
    realized_pnl REAL,
    updated_at TIMESTAMP
)
```

**Orders Table:**
```sql
CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    symbol TEXT,
    action TEXT,
    quantity INTEGER,
    order_type TEXT,
    status TEXT,
    filled_avg_price REAL,
    commission REAL,
    slippage REAL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

**Trades Table:**
```sql
CREATE TABLE trades (
    trade_id TEXT PRIMARY KEY,
    symbol TEXT,
    action TEXT,
    quantity INTEGER,
    price REAL,
    commission REAL,
    pnl REAL,
    timestamp TIMESTAMP,
    order_id TEXT
)
```

**Performance Snapshots:**
```sql
CREATE TABLE performance_snapshots (
    id INTEGER PRIMARY KEY,
    timestamp TIMESTAMP,
    portfolio_value REAL,
    cash REAL,
    positions_value REAL,
    total_pnl REAL,
    total_commissions REAL,
    num_positions INTEGER,
    num_trades INTEGER
)
```

---

## Quick Start

### Basic Setup

```python
import asyncio
from core.broker.paper_trader import PaperTrader
from core.config import Config
from core.data.alpaca_client import AlpacaClient

async def main():
    # 1. Initialize configuration
    config = Config()

    # 2. Set up Alpaca client
    alpaca = AlpacaClient(
        api_key="your_api_key",
        secret_key="your_secret_key",
        base_url="https://paper-api.alpaca.markets"
    )

    # 3. Create paper trader (risk systems auto-created)
    trader = PaperTrader(
        config=config,
        alpaca_client=alpaca,
        enable_risk_systems=True,  # Enable Kelly, Stops, Breakers
        commission_per_trade=1.0,
        commission_per_share=0.005
    )

    # 4. Check circuit breakers
    status = await trader.check_circuit_breakers()
    if not status["trading_allowed"]:
        print("Trading halted!")
        return

    # 5. Calculate position size
    sizing = await trader.calculate_position_size(
        symbol="AAPL",
        win_rate=0.60,
        avg_win=200.0,
        avg_loss=100.0
    )

    # 6. Place order (auto stop loss)
    order_id = await trader.place_market_order(
        symbol="AAPL",
        quantity=sizing["shares"],
        action="BUY",
        auto_stop_loss=True,
        stop_pct=0.02
    )

    # 7. Check performance
    summary = trader.get_performance_summary()
    print(f"Portfolio: ${summary['portfolio_value']:,.2f}")
    print(f"Sharpe: {summary['sharpe_ratio']:.2f}")

asyncio.run(main())
```

---

## Integration Guide

### Step-by-Step Integration

#### 1. Initialize Risk Systems

```python
from core.risk.kelly_position_sizer import KellyPositionSizer
from core.risk.stop_loss_manager import StopLossManager
from core.risk.circuit_breaker import CircuitBreaker

# Kelly Sizer
kelly = KellyPositionSizer(
    account_balance=100000,
    max_position_pct=0.25,      # 25% max per position
    max_total_exposure=1.0       # 100% max total
)

# Stop Manager
stops = StopLossManager(
    account_balance=100000,
    max_risk_per_trade=0.02,    # 2% max risk
    default_stop_pct=0.02        # 2% default stop
)

# Circuit Breaker
breaker = CircuitBreaker(
    initial_portfolio_value=100000,
    daily_loss_limit=0.03,       # 3% daily loss
    max_drawdown_limit=0.10,     # 10% max drawdown
    consecutive_loss_limit=5     # 5 losses in a row
)
```

#### 2. Create Paper Trader

```python
trader = PaperTrader(
    config=config,
    alpaca_client=alpaca,
    kelly_sizer=kelly,           # Custom Kelly
    stop_manager=stops,          # Custom stops
    circuit_breaker=breaker,     # Custom breaker
    enable_risk_systems=True,    # Enable integration
    commission_per_trade=1.0,
    commission_per_share=0.005,
    enforce_market_hours=True,   # NYSE hours
    slippage_volatility_multiplier=1.0
)
```

#### 3. Pre-Trade Validation

```python
# ALWAYS check circuit breakers first
breaker_status = await trader.check_circuit_breakers()

if not breaker_status["trading_allowed"]:
    print("TRADING HALTED!")
    print(f"Reasons: {breaker_status['reasons']}")
    return  # Do not trade

# Check for warnings
if breaker_status["warnings"]:
    print(f"Warnings: {breaker_status['warnings']}")
```

#### 4. Position Sizing

```python
# Calculate optimal position size
sizing = await trader.calculate_position_size(
    symbol="AAPL",
    win_rate=0.60,        # From backtesting
    avg_win=200.0,        # From backtesting
    avg_loss=100.0,       # From backtesting
    kelly_fraction=0.5    # Half Kelly for safety
)

# Review sizing decision
print(f"Position size: ${sizing['position_size']:,.2f}")
print(f"Shares: {sizing['shares']}")
print(f"Rationale: {sizing['rationale']}")
print(f"Warnings: {sizing['warnings']}")

# Validate
if sizing['shares'] == 0:
    print("Cannot size position!")
    return
```

#### 5. Order Execution

```python
# Place order with automatic stop loss
order_id = await trader.place_market_order(
    symbol="AAPL",
    quantity=sizing["shares"],
    action="BUY",
    auto_stop_loss=True,   # Automatic stop placement
    stop_pct=0.02          # 2% stop
)

if order_id:
    print(f"Order filled: {order_id}")

    # Verify stop was placed
    if "AAPL" in trader.stop_manager.active_stops:
        stop = trader.stop_manager.active_stops["AAPL"]
        print(f"Stop placed at ${stop['stop_price']:.2f}")
else:
    print("Order failed!")
```

#### 6. Manual Stop Loss (Optional)

```python
# For advanced scenarios
stop_data = await trader.place_stop_loss(
    symbol="AAPL",
    entry_price=150.0,
    position_size=15000.0,
    stop_type="trailing",   # or "fixed_pct", "atr_based"
    stop_pct=0.05          # 5% trailing stop
)

if stop_data:
    print(f"Stop placed: ${stop_data['stop_price']:.2f}")
    print(f"Risk: ${stop_data['risk_amount']:.2f}")
```

---

## Performance Analytics

### Getting Analytics

```python
# Comprehensive summary
summary = trader.get_performance_summary()

print(f"Portfolio Value: ${summary['portfolio_value']:,.2f}")
print(f"Total P&L: ${summary['total_pnl']:,.2f}")
print(f"Return: {summary['total_return_pct']:.2%}")
print(f"Sharpe Ratio: {summary['sharpe_ratio']:.2f}")
print(f"Max Drawdown: {summary['max_drawdown_pct']:.2%}")
print(f"Win Rate: {summary['win_rate']:.1%}")
print(f"Commissions: ${summary['total_commissions']:.2f}")
```

### Individual Metrics

#### Sharpe Ratio

```python
sharpe = trader.calculate_sharpe_ratio(risk_free_rate=0.02)
if sharpe is not None:
    print(f"Sharpe Ratio: {sharpe:.2f}")

    # Interpretation:
    # > 3.0: Excellent
    # > 2.0: Very good
    # > 1.0: Good
    # < 1.0: Poor
else:
    print("Insufficient data for Sharpe ratio")
```

#### Max Drawdown

```python
drawdown = trader.calculate_max_drawdown()

print(f"Max Drawdown: {drawdown['max_drawdown_pct']:.2%}")
print(f"Peak Value: ${drawdown['peak_value']:,.2f}")
print(f"Current Value: ${drawdown['current_value']:,.2f}")
print(f"Drawdown Amount: ${drawdown['max_drawdown_dollars']:,.2f}")
```

#### Trade Statistics

```python
stats = trader.get_trade_statistics()

print(f"Total Trades: {stats['total_trades']}")
print(f"Win Rate: {stats['win_rate']:.1%}")
print(f"Avg Win: ${stats['avg_win']:,.2f}")
print(f"Avg Loss: ${stats['avg_loss']:,.2f}")
print(f"Largest Win: ${stats['largest_win']:,.2f}")
print(f"Largest Loss: ${stats['largest_loss']:,.2f}")
print(f"Total Commissions: ${stats['total_commissions']:,.2f}")
```

### Trade History

```python
# Get recent trades
trades = trader.get_trade_history(limit=10)

for trade in trades:
    print(f"{trade['symbol']}: {trade['action']} {trade['quantity']} @ ${trade['price']:.2f}")
    print(f"  Commission: ${trade['commission']:.2f}")
    print(f"  P&L: ${trade['pnl']:.2f}")
```

---

## Configuration

### Environment Variables

```bash
# Alpaca API (required for real data)
export ALPACA_API_KEY="your_api_key"
export ALPACA_SECRET_KEY="your_secret_key"

# Optional
export PAPER_TRADER_INITIAL_CASH=100000
export PAPER_TRADER_COMMISSION_PER_TRADE=1.0
export PAPER_TRADER_COMMISSION_PER_SHARE=0.005
```

### Configuration Options

```python
trader = PaperTrader(
    config=config,                           # DeepStack config
    alpaca_client=alpaca,                    # Market data client
    kelly_sizer=kelly,                       # Position sizer (optional)
    stop_manager=stops,                      # Stop manager (optional)
    circuit_breaker=breaker,                 # Circuit breaker (optional)
    enable_risk_systems=True,                # Enable risk integration
    commission_per_trade=1.0,                # Fixed commission ($)
    commission_per_share=0.005,              # Per-share commission ($)
    enforce_market_hours=True,               # NYSE hours only
    slippage_volatility_multiplier=1.0       # Slippage adjustment
)
```

### Risk System Defaults

**Kelly Position Sizer:**
- `max_position_pct`: 0.25 (25% max per position)
- `max_total_exposure`: 1.0 (100% portfolio max)
- `min_position_size`: $100
- `max_position_size`: $50,000

**Stop Loss Manager:**
- `max_risk_per_trade`: 0.02 (2% max)
- `default_stop_pct`: 0.02 (2% default)
- `min_stop_distance`: 0.005 (0.5% min)
- `max_stop_distance`: 0.10 (10% max)

**Circuit Breaker:**
- `daily_loss_limit`: 0.03 (3% daily)
- `max_drawdown_limit`: 0.10 (10% max)
- `consecutive_loss_limit`: 5 losses
- `volatility_threshold`: 40.0 VIX

---

## Best Practices

### 1. Always Check Circuit Breakers

```python
# BEFORE EVERY TRADE
status = await trader.check_circuit_breakers()
if not status["trading_allowed"]:
    return  # Do not trade
```

### 2. Use Kelly for Position Sizing

```python
# Calculate based on backtesting results
sizing = await trader.calculate_position_size(
    symbol="AAPL",
    win_rate=0.60,      # From your backtest
    avg_win=200.0,      # From your backtest
    avg_loss=100.0,     # From your backtest
    kelly_fraction=0.5  # Half Kelly for safety
)
```

### 3. Enable Automatic Stop Losses

```python
# ALWAYS use auto_stop_loss=True
order_id = await trader.place_market_order(
    symbol="AAPL",
    quantity=shares,
    action="BUY",
    auto_stop_loss=True,  # CRITICAL
    stop_pct=0.02
)
```

### 4. Monitor Performance Metrics

```python
# After each trade
summary = trader.get_performance_summary()

# Watch for:
# - Declining Sharpe ratio
# - Increasing drawdown
# - Falling win rate
# - Rising commission costs
```

### 5. Test Before Live Trading

```python
# Use paper trader to:
# 1. Validate strategy logic
# 2. Test risk system integration
# 3. Measure realistic costs
# 4. Verify performance metrics
# 5. Ensure circuit breakers work
```

### 6. Realistic Commission Settings

```python
# Match your broker's fees
# Interactive Brokers example:
trader = PaperTrader(
    commission_per_trade=1.0,    # $1 min
    commission_per_share=0.005   # $0.005/share
)

# Robinhood example (zero commission):
trader = PaperTrader(
    commission_per_trade=0.0,
    commission_per_share=0.0
)
```

---

## API Reference

### Core Methods

#### `place_market_order(symbol, quantity, action, auto_stop_loss=True, stop_pct=0.02)`
Place market order with risk integration.

**Parameters:**
- `symbol` (str): Stock symbol
- `quantity` (int): Number of shares
- `action` (str): "BUY" or "SELL"
- `auto_stop_loss` (bool): Auto-place stop loss
- `stop_pct` (float): Stop loss percentage

**Returns:** Order ID or None

#### `check_circuit_breakers()`
Check if trading is allowed.

**Returns:**
```python
{
    "trading_allowed": bool,
    "breakers_tripped": List[str],
    "reasons": List[str],
    "warnings": List[str]
}
```

#### `calculate_position_size(symbol, win_rate, avg_win, avg_loss, kelly_fraction=0.5)`
Calculate optimal position size using Kelly.

**Returns:**
```python
{
    "position_size": float,
    "shares": int,
    "kelly_pct": float,
    "adjusted_pct": float,
    "rationale": str,
    "warnings": List[str]
}
```

#### `place_stop_loss(symbol, entry_price, position_size, stop_type, stop_pct)`
Manually place stop loss.

**Returns:** Stop loss details dict

#### `get_performance_summary()`
Get comprehensive performance metrics.

**Returns:**
```python
{
    "portfolio_value": float,
    "total_pnl": float,
    "total_return_pct": float,
    "sharpe_ratio": float,
    "max_drawdown_pct": float,
    "win_rate": float,
    "total_commissions": float,
    ...
}
```

### Helper Methods

- `is_market_hours()`: Check if market is open
- `get_positions()`: Get all positions
- `get_position(symbol)`: Get specific position
- `get_trade_history(limit)`: Get recent trades
- `calculate_sharpe_ratio(risk_free_rate)`: Calculate Sharpe
- `calculate_max_drawdown()`: Calculate drawdown
- `get_trade_statistics()`: Get trade stats
- `reset_portfolio()`: Reset for testing

---

## Examples

### Example 1: Simple Trade

```python
async def simple_trade():
    trader = PaperTrader(config, alpaca, enable_risk_systems=True)

    # Buy
    order_id = await trader.place_market_order("AAPL", 100, "BUY")

    # ... wait for profit ...

    # Sell
    await trader.place_market_order("AAPL", 100, "SELL")

    # Check results
    summary = trader.get_performance_summary()
    print(f"P&L: ${summary['total_pnl']:,.2f}")
```

### Example 2: Full Risk Integration

```python
async def full_integration():
    trader = PaperTrader(config, alpaca, enable_risk_systems=True)

    # 1. Check breakers
    if not (await trader.check_circuit_breakers())["trading_allowed"]:
        return

    # 2. Calculate size
    sizing = await trader.calculate_position_size(
        "AAPL", 0.60, 200, 100
    )

    # 3. Place order (auto stop)
    order_id = await trader.place_market_order(
        "AAPL", sizing["shares"], "BUY", auto_stop_loss=True
    )

    # 4. Verify
    if "AAPL" in trader.stop_manager.active_stops:
        print("Stop placed!")
```

### Example 3: Multiple Positions

```python
async def multiple_positions():
    trader = PaperTrader(config, alpaca, enable_risk_systems=True)

    symbols = ["AAPL", "MSFT", "GOOGL"]

    for symbol in symbols:
        sizing = await trader.calculate_position_size(
            symbol, 0.60, 200, 100
        )

        await trader.place_market_order(
            symbol, sizing["shares"], "BUY", auto_stop_loss=True
        )

    # Check portfolio heat
    kelly_info = trader.kelly_sizer.get_position_info()
    print(f"Portfolio heat: {kelly_info['current_heat']:.1%}")
```

---

## Troubleshooting

### No Market Data

**Problem:** Orders fail with "Could not get market price"

**Solutions:**
1. Check Alpaca credentials
2. Verify API connectivity
3. Check Alpaca API health
4. Review price cache settings

### Circuit Breakers Tripping

**Problem:** Trading halted unexpectedly

**Solutions:**
1. Check `breaker_status["reasons"]`
2. Review recent trade P&L
3. Check portfolio drawdown
4. Consider resetting breakers (carefully!)

### Position Sizing Returns Zero

**Problem:** Kelly returns 0 shares

**Solutions:**
1. Check win rate (must be > 0 and < 1)
2. Verify avg_win > 0 and avg_loss > 0
3. Check portfolio heat (may be at capacity)
4. Review market price availability

### Commissions Too High

**Problem:** Returns eaten by commissions

**Solutions:**
1. Increase position sizes
2. Reduce commission rates
3. Trade less frequently
4. Use commission-free broker settings

---

## Next Steps

1. **Run the Example**: `python examples/paper_trading_example.py`
2. **Review Tests**: See `tests/unit/test_paper_trader.py` for usage patterns
3. **Integrate into Strategy**: Use paper trader for backtesting
4. **Measure Performance**: Track Sharpe, drawdown, win rate
5. **Validate Risk Systems**: Ensure circuit breakers work
6. **Go Live**: When ready, switch to live broker

---

## Support

- **Documentation**: `/docs/PAPER_TRADING.md` (this file)
- **Examples**: `/examples/paper_trading_example.py`
- **Tests**: `/tests/unit/test_paper_trader.py`
- **Source**: `/core/broker/paper_trader.py`

---

**Version**: 2.0 (Enhanced with Risk Systems)
**Last Updated**: November 2024
**Status**: Production Ready
