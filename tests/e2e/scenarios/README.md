# E2E Scenario Tests - Quick Reference

## Overview

Advanced E2E scenario tests covering multi-strategy portfolios, emergency scenarios, options trading, pairs trading, and real-time WebSocket monitoring.

**Status**: 18/18 tests passing ✅

---

## Quick Start

### Run All Scenario Tests
```bash
cd /Users/eddiebelaval/Development/deepstack
python3 -m pytest tests/e2e/scenarios/ -v
```

### Run with Coverage
```bash
python3 -m pytest tests/e2e/scenarios/ -v --cov=core --cov-report=term-missing
```

### Run Specific Test File
```bash
# Multi-strategy portfolio tests
python3 -m pytest tests/e2e/scenarios/test_multi_strategy_portfolio.py -v

# Emergency scenarios
python3 -m pytest tests/e2e/scenarios/test_emergency_scenarios.py -v

# WebSocket monitoring
python3 -m pytest tests/e2e/scenarios/test_websocket_monitoring.py -v
```

### Run Single Test
```bash
python3 -m pytest tests/e2e/scenarios/test_emergency_scenarios.py::test_flash_crash_response -v
```

---

## Test Files

### 1. test_multi_strategy_portfolio.py (5 tests)
Tests for running multiple strategies simultaneously with coordinated risk management.

**Tests**:
- `test_initialize_multi_strategy_portfolio` - Setup 5 concurrent strategies
- `test_execute_trades_from_multiple_strategies` - Execute trades from different strategies
- `test_coordinate_risk_across_strategies` - Portfolio heat limits enforcement
- `test_handle_conflicting_signals` - Resolve buy/sell conflicts
- `test_rebalance_between_strategies` - Dynamic capital reallocation

**Run**:
```bash
pytest tests/e2e/scenarios/test_multi_strategy_portfolio.py -v
```

---

### 2. test_emergency_scenarios.py (6 tests)
Tests for critical failure scenarios and recovery mechanisms.

**Tests**:
- `test_flash_crash_response` - Handle 20% price drop
- `test_api_outage_recovery` - Graceful API failure handling
- `test_database_corruption_recovery` - Corrupt data rejection
- `test_network_timeout_handling` - Timeout resilience
- `test_partial_execution_recovery` - Incomplete order handling
- `test_circuit_breaker_mass_triggering` - Multiple breakers simultaneously

**Run**:
```bash
pytest tests/e2e/scenarios/test_emergency_scenarios.py -v
```

---

### 3. test_websocket_monitoring.py (7 tests)
Tests for real-time WebSocket monitoring and event broadcasting.

**Tests**:
- `test_websocket_connection_establishment` - Connection setup
- `test_realtime_position_updates` - Position change broadcasts
- `test_trade_execution_notifications` - Trade event notifications
- `test_portfolio_value_streaming` - Periodic portfolio updates
- `test_alert_broadcasting` - Alert distribution to clients
- `test_client_disconnection_handling` - Client cleanup
- `test_reconnection_recovery` - State recovery after disconnect

**Run**:
```bash
pytest tests/e2e/scenarios/test_websocket_monitoring.py -v
```

---

## Test Output

### Successful Run
```
============================= test session starts ==============================
platform darwin -- Python 3.9.6, pytest-8.4.2, pluggy-1.6.0
collecting ... collected 18 items

test_emergency_scenarios.py::test_flash_crash_response PASSED          [  5%]
test_emergency_scenarios.py::test_api_outage_recovery PASSED           [ 11%]
test_emergency_scenarios.py::test_database_corruption_recovery PASSED  [ 16%]
test_emergency_scenarios.py::test_network_timeout_handling PASSED      [ 22%]
test_emergency_scenarios.py::test_partial_execution_recovery PASSED    [ 27%]
test_emergency_scenarios.py::test_circuit_breaker_mass_triggering PASSED [ 33%]
test_multi_strategy_portfolio.py::test_initialize_multi_strategy_portfolio PASSED [ 38%]
test_multi_strategy_portfolio.py::test_execute_trades_from_multiple_strategies PASSED [ 44%]
test_multi_strategy_portfolio.py::test_coordinate_risk_across_strategies PASSED [ 50%]
test_multi_strategy_portfolio.py::test_handle_conflicting_signals PASSED [ 55%]
test_multi_strategy_portfolio.py::test_rebalance_between_strategies PASSED [ 61%]
test_websocket_monitoring.py::test_websocket_connection_establishment PASSED [ 66%]
test_websocket_monitoring.py::test_realtime_position_updates PASSED [ 72%]
test_websocket_monitoring.py::test_trade_execution_notifications PASSED [ 77%]
test_websocket_monitoring.py::test_portfolio_value_streaming PASSED [ 83%]
test_websocket_monitoring.py::test_alert_broadcasting PASSED [ 88%]
test_websocket_monitoring.py::test_client_disconnection_handling PASSED [ 94%]
test_websocket_monitoring.py::test_reconnection_recovery PASSED [100%]

======================== 18 passed in 2.16s =========================
```

---

## Key Test Scenarios

### Flash Crash Response
```python
# Tests circuit breaker trips on 20% price drop
# Validates positions preserved (no forced liquidation)
# Execution time: ~0.1s
```

### Multi-Strategy Coordination
```python
# Tests 5 strategies running simultaneously
# Validates portfolio heat enforcement
# Validates no simultaneous long/short
# Execution time: ~0.2s
```

### WebSocket Real-Time Updates
```python
# Tests position updates broadcast on trades
# Tests client reconnection with state recovery
# Tests alert broadcasting to all clients
# Execution time: ~0.1s per test
```

---

## Fixtures Used

All tests use the `e2e_trading_system` fixture which provides:
- Fully configured trading system
- Paper trader with $100,000 initial capital
- Risk management (Kelly sizer, stop loss, circuit breaker)
- Mock market data
- All components properly initialized

**Example**:
```python
@pytest.mark.asyncio
async def test_my_scenario(e2e_trading_system):
    trader = e2e_trading_system['trader']
    breaker = e2e_trading_system['breaker']

    # Your test logic here
    order_id = await trader.place_market_order('AAPL', 10, 'BUY')
    assert order_id is not None
```

---

## Coverage

Tests provide focused coverage of:
- Circuit breaker: 78.42% (+1.88% from Phase 4)
- Paper trader: 57.67%
- Risk management: 40-80% across modules
- Orchestrator: 34.57%

---

## Performance

- **Total tests**: 18
- **Execution time**: ~2.16 seconds
- **Average per test**: ~0.12 seconds
- **Slowest test**: ~0.2 seconds
- **Fastest test**: ~0.08 seconds

---

## Debugging

### Run with Debug Output
```bash
pytest tests/e2e/scenarios/ -v -s --log-cli-level=DEBUG
```

### Run with PDB on Failure
```bash
pytest tests/e2e/scenarios/ -v --pdb
```

### Show Test Coverage Details
```bash
pytest tests/e2e/scenarios/ -v --cov=core --cov-report=html
open htmlcov/index.html
```

---

## Common Issues

### Issue: Import errors for ib_insync
**Solution**: Optional import added to `core/broker/ibkr_client.py`. Tests run without ib_insync installed.

### Issue: Async fixture warnings
**Solution**: Using `@pytest.mark.asyncio` decorator on all async tests.

### Issue: Mock data not found
**Solution**: Add mock data to `e2e_trading_system['mock_data']` before placing orders.

---

## Advanced Usage

### Run Tests in Parallel (if pytest-xdist installed)
```bash
pytest tests/e2e/scenarios/ -v -n auto
```

### Generate JSON Report
```bash
pytest tests/e2e/scenarios/ -v --json-report --json-report-file=test_report.json
```

### Run Only Emergency Tests
```bash
pytest tests/e2e/scenarios/ -v -k "emergency"
```

### Run Only Multi-Strategy Tests
```bash
pytest tests/e2e/scenarios/ -v -k "multi_strategy"
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Scenario Tests
  run: |
    pytest tests/e2e/scenarios/ -v --cov=core --cov-report=xml

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

---

## Contact

For questions or issues with E2E scenario tests:
- Review: `/tests/e2e/PHASE4_COMPLETION_REPORT.md`
- Documentation: `/tests/e2e/README.md`

**Last Updated**: 2025-11-04
