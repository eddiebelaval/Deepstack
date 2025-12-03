# E2E Testing Quick Start Guide

## Run Tests

### Run All E2E Tests
```bash
source venv/bin/activate
pytest tests/e2e/ -v
```

### Run Single Test
```bash
pytest tests/e2e/step_defs/test_deep_value_steps.py::test_execute_deep_value_trade_with_strong_fundamentals -v
```

### Run with Coverage
```bash
pytest tests/e2e/ -v --cov=core --cov-report=html
open htmlcov/index.html  # View coverage report
```

## Test Results

```
test_execute_deep_value_trade_with_strong_fundamentals PASSED
test_reject_trade_when_circuit_breaker_trips PASSED
test_calculate_appropriate_position_size_based_on_kelly_criterion PASSED

3 passed in 1.23s
```

## What These Tests Validate

1. **Complete Trading Workflow**: Stock analysis → Position sizing → Order execution → Stop loss placement
2. **Risk Management**: Circuit breaker halts trading when daily loss exceeds limits
3. **Position Sizing**: Kelly criterion calculates appropriate position sizes based on confidence

## Files

- `conftest.py` - Test fixtures (complete trading system)
- `features/deep_value_trade.feature` - BDD scenarios in Gherkin
- `step_defs/test_deep_value_steps.py` - Test implementation

## Coverage Impact

- Strategy Agent: 40% (was 19%)
- Paper Trader: 51% (was 27%)
- Circuit Breaker: 56% (was 22%)
- Kelly Position Sizer: 62% (was 29%)

## Dependencies

All required dependencies are already installed:
- pytest-bdd (BDD framework)
- responses (HTTP mocking)
- freezegun (time freezing)
- pytest-timeout (test timeouts)
- pytest-xdist (parallel execution)

## Troubleshooting

### Tests fail to import modules
**Solution**: Ensure you're in the project root directory and venv is activated

### Tests are slow
**Solution**: Use `-n auto` flag for parallel execution: `pytest tests/e2e/ -n auto`

### Coverage not generated
**Solution**: Install pytest-cov: `pip install pytest-cov`
