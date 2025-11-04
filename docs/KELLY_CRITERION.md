# Kelly Criterion Position Sizing

## Overview

The Kelly Criterion is a mathematical formula used to determine optimal position sizing in trading and investing. It maximizes long-term growth while managing risk by calculating the ideal percentage of capital to allocate to each position.

## The Formula

```
Kelly % = (W × R - L) / R

Where:
  W = Win rate (probability of winning)
  R = Win/Loss ratio (average win / average loss)
  L = Loss rate (1 - W)
```

### Example Calculation

Given a trading strategy with:
- Win rate: 55% (W = 0.55)
- Average win: $1,500
- Average loss: $1,000
- Win/Loss ratio: R = $1,500 / $1,000 = 1.5

```
Kelly % = (0.55 × 1.5 - 0.45) / 1.5
        = (0.825 - 0.45) / 1.5
        = 0.375 / 1.5
        = 0.25 (25%)
```

This means the optimal position size is 25% of your capital.

## Why Fractional Kelly?

While the Kelly Criterion provides mathematically optimal sizing, it can be aggressive in practice. **Fractional Kelly** uses a fraction of the calculated Kelly percentage for several reasons:

### Full Kelly Issues

1. **High Volatility**: Full Kelly can lead to large drawdowns
2. **Estimation Errors**: Small errors in win rate or W/L ratio can lead to oversizing
3. **Psychological Stress**: Large position sizes can be emotionally difficult
4. **Market Dynamics**: Real markets are more complex than static probabilities

### Recommended Fractions

| Fraction | Description | Risk Profile | Use Case |
|----------|-------------|--------------|----------|
| **0.25x** | Quarter Kelly | Conservative | Risk-averse traders, uncertain edge |
| **0.50x** | Half Kelly | **Recommended** | **Default for most traders** |
| 1.00x | Full Kelly | Aggressive | Only for highly confident edges |

### DeepStack Default: 0.5x (Half Kelly)

We use **Half Kelly (0.5x) as our default** because:
- Reduces volatility by ~50% compared to Full Kelly
- Only reduces long-term growth by ~25%
- Provides better risk-adjusted returns
- More robust to estimation errors
- Psychologically easier to maintain

## Position Caps and Limits

### Maximum Position Size: 25%

**Hard cap**: No single position can exceed 25% of portfolio value.

**Rationale**:
- Prevents concentration risk
- Ensures diversification
- Protects against unexpected events
- Industry best practice

Even if Kelly suggests 50%, we cap at 25%.

### Maximum Total Exposure: 100%

**Portfolio heat**: Sum of all position values cannot exceed 100% of account.

**Why**:
- No leverage (1:1 cash-to-positions)
- Conservative risk management
- Prevents margin calls
- Clear risk boundaries

### Minimum Position Size: $100

**Rationale**:
- Avoid excessive trading costs
- Commission and slippage impact
- Practicality for small positions

### Maximum Position Size: $50,000 (default)

**Absolute dollar cap** to manage liquidity and risk.

**Adjustable based on**:
- Account size
- Stock liquidity
- Risk tolerance

## Usage in DeepStack

### Basic Usage

```python
from core.risk.kelly_position_sizer import KellyPositionSizer

# Initialize sizer
sizer = KellyPositionSizer(
    account_balance=100000,
    max_position_pct=0.25,     # 25% max per position
    max_total_exposure=1.0,    # 100% max total
)

# Calculate position size
result = sizer.calculate_position_size(
    win_rate=0.55,              # 55% historical win rate
    avg_win=1500,               # $1,500 average win
    avg_loss=1000,              # $1,000 average loss
    kelly_fraction=0.5,         # Half Kelly (default)
    stock_price=100.0,          # Current stock price
    symbol="AAPL"
)

print(f"Position Size: ${result['position_size']:,.2f}")
print(f"Shares: {result['shares']}")
print(f"Rationale: {result['rationale']}")
```

### With Existing Positions

```python
# Track portfolio heat
sizer = KellyPositionSizer(
    account_balance=100000,
    current_positions={
        "AAPL": 20000,   # $20k AAPL position
        "GOOGL": 15000,  # $15k GOOGL position
    }
)

# New position will account for existing heat (35%)
result = sizer.calculate_position_size(
    win_rate=0.60,
    avg_win=2000,
    avg_loss=1000,
    kelly_fraction=0.5,
    symbol="MSFT"
)

# Remaining capacity: 65% (100% - 35% current heat)
```

### Result Structure

```python
{
    "position_size": 12500.0,        # Dollar amount to invest
    "shares": 125,                   # Number of shares (if price provided)
    "kelly_pct": 0.25,              # Raw Kelly percentage (25%)
    "adjusted_pct": 0.125,          # After fractional Kelly (12.5%)
    "win_loss_ratio": 1.5,          # Calculated W/L ratio
    "fractional_kelly": 0.5,        # Fraction applied (0.5x)
    "rationale": "Kelly sizing...", # Explanation
    "warnings": [],                 # Any warnings/caps applied
    "portfolio_heat": 0.35,         # Current portfolio exposure (35%)
}
```

## Strategy Integration

### 1. Historical Analysis

Calculate win rate and average win/loss from backtest:

```python
trades = backtest_strategy()

wins = [t for t in trades if t.profit > 0]
losses = [t for t in trades if t.profit <= 0]

win_rate = len(wins) / len(trades)
avg_win = sum(w.profit for w in wins) / len(wins)
avg_loss = abs(sum(l.profit for l in losses) / len(losses))
```

### 2. Position Sizing

Use Kelly sizer with historical stats:

```python
result = sizer.calculate_position_size(
    win_rate=win_rate,
    avg_win=avg_win,
    avg_loss=avg_loss,
    kelly_fraction=0.5,
    stock_price=current_price,
    symbol=symbol
)
```

### 3. Order Execution

Submit order with calculated size:

```python
if result['position_size'] > 0:
    broker.submit_order(
        symbol=symbol,
        quantity=result['shares'],
        order_type='MARKET'
    )
```

## Edge Cases

### Negative Kelly (No Position)

If Kelly is negative, **do not take the position**:

```python
result = sizer.calculate_position_size(
    win_rate=0.40,  # 40% win rate
    avg_win=1000,
    avg_loss=1000,  # Same size wins/losses
    kelly_fraction=0.5
)

# Kelly = (0.40 × 1.0 - 0.60) / 1.0 = -0.20
# result['position_size'] = 0.0
# result['rationale'] = "Negative edge detected..."
```

**Action**: Skip the trade. Negative Kelly indicates negative expected value.

### Portfolio at Capacity

If portfolio heat is at 100%, no new positions:

```python
sizer = KellyPositionSizer(
    account_balance=100000,
    current_positions={
        "AAPL": 40000,
        "GOOGL": 35000,
        "MSFT": 25000,
    }  # 100% heat
)

result = sizer.calculate_position_size(...)
# result['position_size'] = 0.0
# result['rationale'] = "Portfolio at capacity..."
```

**Action**: Must sell existing position first or add capital.

### Extreme Win Rates

Win rates < 10% or > 90% trigger warnings:

```python
result = sizer.calculate_position_size(
    win_rate=0.95,  # 95% win rate (suspicious)
    ...
)

# result['warnings'] = ["Extreme win rate 95.0% detected"]
```

**Action**: Review data quality, check for overfitting.

## Best Practices

### 1. Use Fractional Kelly (0.5x)

Always use fractional Kelly unless you have exceptional confidence in your edge.

### 2. Regular Rebalancing

Update positions and account balance regularly:

```python
# Daily or weekly
sizer.update_account_balance(current_balance)
sizer.update_positions(current_positions)
```

### 3. Out-of-Sample Testing

Never use in-sample stats for position sizing. Use:
- Walk-forward analysis
- Out-of-sample backtesting
- Live paper trading results

### 4. Conservative Estimates

When uncertain, be conservative:
- Lower win rate estimates
- Higher loss estimates
- Lower Kelly fraction (0.25x instead of 0.5x)

### 5. Monitor Portfolio Heat

Keep total exposure under 100% with buffer for volatility:

```python
info = sizer.get_position_info()
if info['current_heat'] > 0.80:  # 80% threshold
    print("WARNING: High portfolio heat, consider reducing")
```

## Risk Management Integration

Kelly sizing works with other risk controls:

### 1. Stop Losses

Kelly determines position size, stop loss determines risk per share:

```python
# Size position with Kelly
shares = kelly_result['shares']

# Set stop loss based on technical analysis
entry_price = 100.0
stop_price = 92.0  # 8% stop

# Risk per share = $8
# Total risk = shares × $8
```

### 2. Portfolio Heat

Kelly respects total portfolio exposure:

```python
# Never exceed max_total_exposure
# Automatically reduces sizing when heat is high
```

### 3. Daily/Weekly Loss Limits

Kelly sizing + loss limits = comprehensive risk management:

```python
# Kelly sizes positions optimally
# Loss limits protect from extreme events
# Both work together
```

## Common Mistakes

### 1. Using In-Sample Stats

**Wrong**: Using same data for strategy development and position sizing.

**Right**: Use out-of-sample or live trading stats only.

### 2. Full Kelly

**Wrong**: Using full Kelly (1.0x) without considering estimation error.

**Right**: Use half Kelly (0.5x) or quarter Kelly (0.25x).

### 3. Ignoring Caps

**Wrong**: Blindly following Kelly even when it suggests 80% position.

**Right**: Always enforce max position caps (25% in DeepStack).

### 4. Static Win Rate

**Wrong**: Using fixed win rate forever.

**Right**: Update stats regularly based on recent performance.

### 5. No Portfolio Heat Tracking

**Wrong**: Sizing each position independently.

**Right**: Consider total portfolio exposure.

## Performance Impact

### Expected Results

With proper Kelly sizing:

- **Optimal long-term growth** (maximizes geometric mean)
- **Controlled volatility** (especially with fractional Kelly)
- **Lower drawdowns** vs. fixed sizing
- **Better risk-adjusted returns** (higher Sharpe ratio)

### Comparison: Fixed vs. Kelly Sizing

| Metric | Fixed 10% | Half Kelly | Full Kelly |
|--------|-----------|------------|------------|
| Avg Position | 10% | 8-15% | 15-30% |
| Volatility | Medium | Medium | High |
| Drawdown | Moderate | Low-Moderate | High |
| Long-term Growth | Good | **Optimal** | Optimal* |
| Robustness | High | High | Low |

*Full Kelly is optimal mathematically but fragile to estimation errors.

## References

### Original Paper

J. L. Kelly Jr., "A New Interpretation of Information Rate," 1956

### Further Reading

- Ed Thorp, "The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market"
- William Poundstone, "Fortune's Formula"
- Ralph Vince, "The Mathematics of Money Management"

### Academic Research

- MacLean, Thorp, and Ziemba, "The Kelly Capital Growth Investment Criterion"
- Estrada, "Mean-Semivariance Optimization"

## Support

For questions or issues with Kelly position sizing:

1. Review this documentation
2. Check examples in `examples/kelly_criterion_example.py`
3. Run tests: `pytest tests/unit/test_kelly_position_sizer.py`
4. Review code: `core/risk/kelly_position_sizer.py`

---

**Last Updated**: 2024-11-03
**Version**: 1.0.0
**DeepStack Trading System**
