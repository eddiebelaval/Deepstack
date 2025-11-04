# Production Deployment Guide - DeepStack Execution Module

## Overview

The DeepStack Execution Module provides institutional-grade order execution with minimal market impact. This guide covers deployment, configuration, and operation of the production execution system.

## Table of Contents

1. [Architecture](#architecture)
2. [Components](#components)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Strategy Signal                          │
│                          ↓                                  │
│                  ExecutionRouter                            │
│         (Smart routing based on size/urgency)               │
│                          ↓                                  │
│     ┌───────────┬─────────────┬─────────────┐              │
│     │   TWAP    │    VWAP     │   Market    │              │
│     │ Executor  │  Executor   │   Orders    │              │
│     └─────┬─────┴──────┬──────┴──────┬──────┘              │
│           │            │             │                      │
│           └────────────┴─────────────┘                      │
│                       ↓                                     │
│                 OrderManager                                │
│                       ↓                                     │
│           ┌───────────┴──────────┐                          │
│      Live Trading        Paper Trading                      │
│      (IBKR Client)       (Simulation)                       │
│                                                             │
│  Monitoring: ExecutionMonitor → Alerts & Metrics            │
│  Analysis: SlippageModel → Cost Analysis                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. TWAPExecutor (Time-Weighted Average Price)

**Purpose**: Execute large orders evenly over time to minimize detection and market impact.

**Use Cases**:
- Medium to large orders ($10k - $1M+)
- Non-urgent executions
- Minimize information leakage
- Reduce market impact

**Key Features**:
- Equal-sized slices over time window
- Random timing variation to avoid pattern detection
- Configurable slices and time window
- Progress tracking and cancellation support

**Example**:
```python
from core.execution.twap import TWAPExecutor
from core.broker.order_manager import OrderManager

order_manager = OrderManager(config=config, paper_trader=paper_trader)
twap = TWAPExecutor(
    order_manager=order_manager,
    default_time_window=60,  # 60 minutes
    default_num_slices=10,    # 10 slices
)

result = await twap.execute(
    symbol="AAPL",
    total_quantity=1000,
    action="BUY",
    time_window_minutes=60,
    num_slices=10,
)
```

### 2. VWAPExecutor (Volume-Weighted Average Price)

**Purpose**: Execute orders based on historical volume patterns to minimize market impact.

**Use Cases**:
- Large institutional orders (> $100k)
- Track benchmark VWAP price
- High-volume stocks
- Minimize market impact

**Key Features**:
- Volume-based slice sizing using intraday profile
- U-shaped volume curve (high at open/close, low midday)
- Real-time VWAP tracking
- Deviation alerts

**Example**:
```python
from core.execution.vwap import VWAPExecutor

vwap = VWAPExecutor(
    order_manager=order_manager,
    vwap_deviation_threshold=0.01,  # 1% deviation alert
)

result = await vwap.execute(
    symbol="AAPL",
    total_quantity=5000,
    action="BUY",
    time_window_minutes=120,  # 2 hours
)
```

### 3. SlippageModel

**Purpose**: Estimate and track execution slippage costs.

**Key Features**:
- Multi-factor slippage estimation
- Market impact based on order size
- Bid-ask spread modeling
- Historical slippage tracking
- Execution quality scoring

**Example**:
```python
from core.execution.slippage import SlippageModel

slippage = SlippageModel(
    base_spread_bps=5.0,
    impact_coefficient=0.1,
)

estimate = slippage.estimate_slippage(
    symbol="AAPL",
    quantity=1000,
    action="BUY",
    current_price=150.0,
    avg_daily_volume=100_000_000,
)

print(f"Expected slippage: {estimate.slippage_bps:.2f} bps")
print(f"Slippage cost: ${estimate.slippage_dollars:.2f}")
```

### 4. ExecutionRouter

**Purpose**: Intelligently route orders to optimal execution algorithm.

**Routing Rules**:
- **Small orders (< $10k)**: Market orders (fast, low impact)
- **Medium orders ($10k-$100k)**: TWAP (reduce detection)
- **Large orders (> $100k)**: VWAP (minimize impact)
- **Urgent orders**: Market with slippage tolerance
- **Low urgency**: Limit orders

**Example**:
```python
from core.execution.router import ExecutionRouter

router = ExecutionRouter(
    order_manager=order_manager,
    small_order_threshold=10_000,
    large_order_threshold=100_000,
)

result = await router.route_order(
    symbol="AAPL",
    quantity=1000,
    action="BUY",
    current_price=150.0,
    urgency="NORMAL",
    avg_daily_volume=100_000_000,
)
```

### 5. ExecutionMonitor

**Purpose**: Real-time monitoring and alerting for execution quality.

**Key Features**:
- Slippage alerts (> threshold)
- Failed order tracking
- Slow execution alerts
- VWAP deviation alerts
- Daily execution summary
- Performance metrics dashboard

**Example**:
```python
from core.execution.monitor import ExecutionMonitor

monitor = ExecutionMonitor(
    slippage_threshold_bps=20.0,
    vwap_deviation_threshold=0.01,
    failed_order_threshold=3,
)

# Monitor execution
monitor.monitor_execution(execution_result)

# Get alerts
active_alerts = monitor.get_active_alerts()
for alert in active_alerts:
    print(f"[{alert.severity}] {alert.message}")

# Get daily summary
summary = monitor.get_daily_summary()
print(f"Success rate: {summary['success_rate']:.1%}")
```

---

## Installation

### Prerequisites

- Python 3.9+
- DeepStack core modules
- Broker integration (IBKR or Paper Trading)
- Market data access (Alpaca API)

### Install Dependencies

```bash
cd /path/to/deepstack
pip install -r requirements.txt
```

### Verify Installation

```bash
pytest tests/unit/test_execution.py -v
```

---

## Configuration

### Environment Variables

Create `.env` file:

```bash
# Trading Mode
TRADING_MODE=paper  # or 'live' for production

# IBKR Configuration (for live trading)
IBKR_HOST=127.0.0.1
IBKR_PORT=7497
IBKR_CLIENT_ID=1

# Alpaca API (for market data)
ALPACA_API_KEY=your_api_key
ALPACA_SECRET_KEY=your_secret_key
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

### Execution Configuration

Edit `config/config.yaml`:

```yaml
execution:
  # TWAP Settings
  twap:
    default_time_window: 60  # minutes
    default_num_slices: 10
    timing_randomization: 30  # seconds

  # VWAP Settings
  vwap:
    deviation_threshold: 0.01  # 1%

  # Slippage Model
  slippage:
    base_spread_bps: 5.0
    impact_coefficient: 0.1
    urgency_multiplier: 1.5

  # Router Thresholds
  routing:
    small_order_threshold: 10000   # $10k
    large_order_threshold: 100000  # $100k

  # Monitoring
  monitoring:
    slippage_alert_threshold: 20.0  # bps
    vwap_deviation_threshold: 0.01  # 1%
    failed_order_threshold: 3
```

---

## Usage

### Quick Start

```python
import asyncio
from core.config import Config
from core.broker.order_manager import OrderManager
from core.broker.paper_trader import PaperTrader
from core.execution.router import ExecutionRouter
from core.execution.monitor import ExecutionMonitor

async def main():
    # Setup
    config = Config.from_env()
    paper_trader = PaperTrader(config=config)
    order_manager = OrderManager(config=config, paper_trader=paper_trader)

    # Create router
    router = ExecutionRouter(order_manager=order_manager)

    # Create monitor
    monitor = ExecutionMonitor()

    # Execute order
    result = await router.route_order(
        symbol="AAPL",
        quantity=1000,
        action="BUY",
        current_price=150.0,
        urgency="NORMAL",
        avg_daily_volume=100_000_000,
    )

    # Monitor execution
    monitor.monitor_execution(result)

    # Check results
    print(f"Execution type: {result['execution_type']}")
    print(f"Average price: ${result['avg_price']:.2f}")
    print(f"Status: {result['status']}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Execution Scenarios

#### Scenario 1: Small Urgent Order

```python
# $5k order, needs immediate execution
result = await router.route_order(
    symbol="AAPL",
    quantity=33,
    action="BUY",
    current_price=150.0,
    urgency="IMMEDIATE",
)
# → Routes to: MARKET
```

#### Scenario 2: Medium Patient Order

```python
# $50k order, normal urgency
result = await router.route_order(
    symbol="MSFT",
    quantity=150,
    action="BUY",
    current_price=330.0,
    urgency="NORMAL",
)
# → Routes to: TWAP (60 minutes, 10 slices)
```

#### Scenario 3: Large Institutional Order

```python
# $500k order, minimize impact
result = await router.route_order(
    symbol="GOOGL",
    quantity=4000,
    action="BUY",
    current_price=125.0,
    urgency="NORMAL",
    avg_daily_volume=20_000_000,
)
# → Routes to: VWAP (volume-weighted execution)
```

---

## Monitoring

### Real-Time Monitoring

```python
# Create monitor
monitor = ExecutionMonitor(
    slippage_threshold_bps=20.0,
    vwap_deviation_threshold=0.01,
)

# Monitor executions
for execution in executions:
    monitor.monitor_execution(execution)

# Get active alerts
alerts = monitor.get_active_alerts()
for alert in alerts:
    if alert.severity == AlertSeverity.CRITICAL:
        send_notification(alert)
```

### Performance Dashboard

```python
# Get performance dashboard
dashboard = monitor.get_performance_dashboard()

print(f"Today's Executions: {dashboard['today']['total_executions']}")
print(f"Success Rate: {dashboard['today']['success_rate']:.1%}")
print(f"Active Alerts: {dashboard['active_alerts']['total']}")
print(f"Critical Alerts: {dashboard['active_alerts']['critical']}")
```

### Execution Quality Score

```python
# Get quality score
quality = monitor.get_execution_quality_score()

print(f"Quality Score: {quality['quality_score']:.1f}/100")
print(f"Grade: {quality['grade']}")
print("Breakdown:")
for component, score in quality['breakdown'].items():
    print(f"  {component}: {score:.1f}")
```

### Daily Summary Report

```python
# Get daily summary
summary = monitor.get_daily_summary()

print(f"Date: {summary['date']}")
print(f"Total Executions: {summary['total_executions']}")
print(f"Success Rate: {summary['success_rate']:.1%}")
print(f"Total Volume: {summary['total_volume']:,} shares")
print(f"Total Value: ${summary['total_value']:,.2f}")
print(f"Alerts Generated: {summary['alerts_generated']}")
```

---

## Troubleshooting

### Common Issues

#### Issue: Excessive Slippage

**Symptoms**: Slippage alerts, high execution costs

**Solutions**:
1. Increase time window for TWAP/VWAP
2. Increase number of slices
3. Use VWAP instead of TWAP for large orders
4. Check market liquidity before execution

#### Issue: Slow Execution

**Symptoms**: Executions taking too long

**Solutions**:
1. Reduce time window
2. Reduce number of slices
3. Use TWAP instead of VWAP
4. Consider market orders for urgent trades

#### Issue: Failed Orders

**Symptoms**: High failure rate

**Solutions**:
1. Check broker connectivity
2. Verify sufficient buying power
3. Check market hours
4. Review risk limits

#### Issue: VWAP Deviation

**Symptoms**: Execution price deviates significantly from VWAP

**Solutions**:
1. Update volume profile with recent data
2. Increase slice count
3. Avoid low-liquidity periods
4. Consider TWAP for more consistent execution

---

## Best Practices

### 1. Order Sizing

- **Small orders (< $10k)**: Use market orders for speed
- **Medium orders ($10k-$100k)**: Use TWAP to reduce detection
- **Large orders (> $100k)**: Use VWAP to minimize market impact

### 2. Timing

- **Market open (9:30-10:00 AM)**: High volume, good for VWAP
- **Midday (11:00 AM-2:00 PM)**: Low volume, use TWAP
- **Market close (3:00-4:00 PM)**: High volume, good for VWAP
- **After hours**: Use limit orders only

### 3. Slippage Management

- **Estimate slippage before execution**
- **Track actual vs estimated slippage**
- **Adjust algorithms based on historical data**
- **Set slippage tolerance thresholds**

### 4. Monitoring

- **Monitor all executions in real-time**
- **Set up alerts for anomalies**
- **Review daily execution summary**
- **Track execution quality over time**

### 5. Risk Management

- **Always validate orders before execution**
- **Use circuit breakers for trading halts**
- **Set position size limits**
- **Monitor portfolio heat**

### 6. Performance Optimization

- **Use appropriate algorithm for order size**
- **Optimize slice count vs time window**
- **Update volume profiles regularly**
- **Learn from historical executions**

---

## Production Checklist

Before deploying to production:

- [ ] Configure environment variables
- [ ] Test execution algorithms in paper trading
- [ ] Set up monitoring and alerts
- [ ] Configure slippage thresholds
- [ ] Test broker connectivity
- [ ] Review and test circuit breakers
- [ ] Set up logging and error handling
- [ ] Configure backup and failover
- [ ] Document runbook procedures
- [ ] Train operations team
- [ ] Test disaster recovery
- [ ] Monitor first week closely

---

## Support

For issues or questions:

1. Check logs in `logs/deepstack.log`
2. Review execution history in database
3. Check monitoring dashboard
4. Contact trading operations team

---

## Appendix

### Execution Metrics Glossary

- **TWAP**: Average price weighted by time
- **VWAP**: Average price weighted by volume
- **Slippage**: Difference between expected and actual execution price
- **Market Impact**: Price movement caused by order execution
- **Basis Points (bps)**: 1/100th of 1% (e.g., 10 bps = 0.10%)

### Volume Profile

Default U-shaped intraday volume distribution:
- **9:30-10:00 AM**: 15% of daily volume
- **10:00-10:30 AM**: 12% of daily volume
- **10:30 AM-3:00 PM**: 50% of daily volume (distributed evenly)
- **3:00-3:30 PM**: 12% of daily volume
- **3:30-4:00 PM**: 11% of daily volume

---

**Last Updated**: November 2024
**Version**: 1.0.0
