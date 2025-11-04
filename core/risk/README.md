# Risk Management Module

Production-ready risk management components for the DeepStack Trading System.

## Components

### Kelly Position Sizer (`kelly_position_sizer.py`)

Implements the Kelly Criterion formula for optimal position sizing with safety caps.

**Quick Start:**
```python
from core.risk.kelly_position_sizer import KellyPositionSizer

sizer = KellyPositionSizer(
    account_balance=100000,
    max_position_pct=0.25,
    current_positions={"AAPL": 15000}
)

result = sizer.calculate_position_size(
    win_rate=0.55,
    avg_win=1500,
    avg_loss=1000,
    kelly_fraction=0.5,
    stock_price=100.0
)

print(f"Position: ${result['position_size']:,.2f}")
print(f"Shares: {result['shares']}")
```

**Features:**
- Kelly Criterion formula: `Kelly % = (W × R - L) / R`
- Fractional Kelly (0.25x, 0.5x, 1.0x)
- 25% max per position cap
- 100% max total exposure
- Portfolio heat tracking
- Comprehensive input validation

**Documentation:** See `/docs/KELLY_CRITERION.md`

**Tests:** `tests/unit/test_kelly_position_sizer.py` (40 tests, 96.58% coverage)

**Examples:** `examples/kelly_criterion_example.py`

### Portfolio Risk (`portfolio_risk.py`)

Legacy portfolio risk management (being refactored to use Kelly sizer).

## Testing

Run all risk management tests:
```bash
pytest tests/unit/test_kelly_position_sizer.py -v
pytest tests/unit/test_portfolio_risk.py -v
```

## Coverage

Current coverage for Kelly Position Sizer:
```
core/risk/kelly_position_sizer.py     117      4  96.58%
```

## Integration

### With Strategy Agents
```python
# In strategy agent
kelly_result = self.kelly_sizer.calculate_position_size(
    win_rate=self.stats.win_rate,
    avg_win=self.stats.avg_win,
    avg_loss=self.stats.avg_loss,
    kelly_fraction=0.5
)
```

### With Order Manager
```python
if kelly_result['position_size'] > 0:
    order = broker.submit_order(
        symbol=symbol,
        quantity=kelly_result['shares']
    )
```

## Best Practices

1. **Use Fractional Kelly**: Default to 0.5x (half Kelly)
2. **Out-of-Sample Stats**: Only use live/walk-forward results
3. **Conservative Estimates**: Underestimate edge when uncertain
4. **Regular Updates**: Refresh win rates and positions
5. **Monitor Heat**: Keep buffer below max exposure

## Support

- Documentation: `docs/KELLY_CRITERION.md`
- Examples: `examples/kelly_criterion_example.py`
- Tests: `tests/unit/test_kelly_position_sizer.py`
- Code: `core/risk/kelly_position_sizer.py`
