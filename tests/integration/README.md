# Integration Tests - Quick Reference

## Overview

This directory contains 90+ integration tests validating component interactions and data pipelines across the DeepStack trading system.

## Test Files

### 1. `test_orchestrator.py` (21 tests)
**Priority: CRITICAL** - Core trading loop coordination

Tests the TradingOrchestrator which coordinates all system components:
- Lifecycle management (start/stop)
- Trading cycle execution
- Multi-symbol processing
- Circuit breaker integration
- Error handling and recovery

**Key Achievement**: Orchestrator coverage: **0% → 76.54%**

### 2. `test_data_pipeline.py` (21 tests)
Tests data flow: Market Data → Strategy Analysis → Signal Generation

- Market data fetching (Alpaca, Alpha Vantage)
- Data transformation and validation
- Strategy analysis with real formats
- Signal generation from fundamentals
- Fallback handling for API failures

### 3. `test_risk_pipeline.py` (23 tests)
Tests risk flow: Signal → Position Sizing → Risk Checks → Approval/Rejection

- Kelly criterion position sizing
- Circuit breaker validation
- Portfolio heat calculations
- Position limit enforcement
- Stop loss integration

### 4. `test_execution_pipeline.py` (25 tests)
Tests execution flow: Order → Routing → Execution → Stop Placement → Monitoring

- Order routing by size/urgency
- TWAP/VWAP execution algorithms
- Stop loss automation
- Slippage tracking
- Multi-leg order coordination

## Running Tests

### All Integration Tests
```bash
pytest tests/integration/ -v
```

### Specific Test File
```bash
pytest tests/integration/test_orchestrator.py -v
pytest tests/integration/test_risk_pipeline.py -v
```

### Run with Coverage
```bash
pytest tests/integration/ --cov=core --cov-report=html
open htmlcov/index.html
```

### Run Specific Test
```bash
pytest tests/integration/test_orchestrator.py::test_orchestrator_start_stop_lifecycle -v
```

### Run Tests by Category
```bash
# Orchestrator tests only
pytest tests/integration/ -k "orchestrator" -v

# Risk pipeline tests only
pytest tests/integration/ -k "risk" -v

# Performance tests only
pytest tests/integration/ -k "performance" -v
```

## Test Structure

### Fixtures (in conftest.py and each test file)
- `mock_config`: Test configuration
- `mock_strategy_agent`: Strategy analysis simulation
- `mock_risk_manager`: Risk system simulation
- `mock_order_manager`: Order placement simulation
- `mock_paper_trader`: Execution simulation

### Test Categories

#### 1. Lifecycle Tests
Test component initialization and cleanup
```python
test_orchestrator_start_stop_lifecycle
test_orchestrator_status_reporting
```

#### 2. Flow Tests
Test multi-component interactions
```python
test_complete_data_pipeline_flow
test_complete_risk_pipeline_approval
test_order_submission_to_market_execution
```

#### 3. Error Handling Tests
Test graceful failure handling
```python
test_orchestrator_handles_analysis_error
test_market_data_with_all_apis_unavailable
test_execution_handles_broker_error
```

#### 4. Performance Tests
Test under load
```python
test_orchestrator_performance_with_many_symbols
test_execution_pipeline_performance
test_data_pipeline_performance
```

#### 5. Edge Case Tests
Test boundary conditions
```python
test_kelly_with_portfolio_at_capacity
test_execution_with_zero_quantity
test_risk_pipeline_with_negative_win_rate
```

## Coverage Report

### Overall: 12.46% (up from 7.08%)

### Component Highlights:
- **Orchestrator**: 76.54% (was 0%) ⭐
- **Kelly Position Sizer**: 57.26%
- **Execution Router**: 45.30%
- **Slippage Model**: 28.07%
- **VWAP Executor**: 25.29%
- **TWAP Executor**: 23.91%

## Test Patterns

### Integration Test Template
```python
@pytest.mark.asyncio
async def test_component_integration(fixture1, fixture2):
    """Test description."""
    # Arrange: Setup components
    component = Component(dependency1=fixture1, dependency2=fixture2)

    # Act: Execute integration
    result = await component.execute()

    # Assert: Validate interaction
    assert result is not None
    assert fixture1.method.called
    assert fixture2.method.called
```

### Async Test Pattern
```python
@pytest.mark.asyncio
async def test_async_operation():
    """Test async operation."""
    result = await async_function()
    assert result is not None
```

### Mock Pattern
```python
@pytest.fixture
def mock_component():
    """Mock component for testing."""
    mock = AsyncMock()
    mock.method.return_value = expected_value
    return mock
```

## Key Integration Flows Tested

### 1. Trading Cycle Flow
```
Orchestrator → Strategy Agent → Risk Manager → Order Manager → Paper Trader
```

### 2. Data Pipeline Flow
```
Market Data APIs → Data Transformation → Strategy Analysis → Signal Generation
```

### 3. Risk Pipeline Flow
```
Signal → Kelly Position Sizing → Circuit Breaker → Portfolio Heat Check → Approval
```

### 4. Execution Pipeline Flow
```
Order Submission → Routing Decision → Execution Algorithm → Fill → Stop Placement
```

## Best Practices

### 1. Use Proper Fixtures
- Create reusable fixtures in `conftest.py`
- Use fixture scope appropriately (`function`, `module`, `session`)
- Mock external dependencies (APIs, databases)

### 2. Test Real Interactions
- Test actual component methods, not just mocks
- Validate data contracts between components
- Test error propagation through the system

### 3. Async Testing
- Always use `@pytest.mark.asyncio` for async tests
- Use `AsyncMock` for async methods
- Test async error handling

### 4. Performance Testing
- Set reasonable timeouts
- Test with realistic data volumes
- Monitor execution time

### 5. Error Testing
- Test all error paths
- Validate graceful degradation
- Ensure no crashes on bad data

## Debugging Tests

### Run with Verbose Output
```bash
pytest tests/integration/test_orchestrator.py -v -s
```

### Run with Debugging
```bash
pytest tests/integration/test_orchestrator.py --pdb
```

### Run with Logging
```bash
pytest tests/integration/test_orchestrator.py --log-cli-level=DEBUG
```

### Show Test Durations
```bash
pytest tests/integration/ --durations=10
```

## Common Issues & Solutions

### Issue: Tests Hanging
**Solution**: Check for missing `await` on async calls

### Issue: Mock Not Working
**Solution**: Use `AsyncMock` for async methods, `Mock` for sync

### Issue: Import Errors
**Solution**: Ensure `__init__.py` exists in test directories

### Issue: Coverage Not Increasing
**Solution**: Check that code paths are actually executed in tests

## Contributing New Tests

1. **Choose appropriate test file** based on pipeline
2. **Create fixtures** for dependencies
3. **Follow naming convention**: `test_<component>_<scenario>`
4. **Document test purpose** in docstring
5. **Test both happy path and errors**
6. **Add to appropriate category** (lifecycle, flow, error, performance, edge)

## Quick Test Examples

### Test Orchestrator Start/Stop
```bash
pytest tests/integration/test_orchestrator.py::test_orchestrator_start_stop_lifecycle -v
```

### Test Risk Pipeline
```bash
pytest tests/integration/test_risk_pipeline.py::test_complete_risk_pipeline_approval -v
```

### Test Data Pipeline
```bash
pytest tests/integration/test_data_pipeline.py::test_complete_data_pipeline_flow -v
```

### Test Execution
```bash
pytest tests/integration/test_execution_pipeline.py::test_order_submission_to_market_execution -v
```

## Maintenance

### Update Tests When:
- Components change interfaces
- New features added
- Bugs fixed (add regression tests)
- Performance requirements change

### Review Tests:
- Regularly check coverage reports
- Remove obsolete tests
- Update mocks to match real APIs
- Optimize slow tests

## Resources

- **Coverage Report**: `htmlcov/index.html` (after running with `--cov`)
- **Test Logs**: Check pytest output for detailed logs
- **Documentation**: See `/PHASE_3_INTEGRATION_TESTS_SUMMARY.md` for full details

---

**Total Tests**: 90
**Overall Coverage**: 12.46%
**Orchestrator Coverage**: 76.54% (was 0%)
**Status**: ✅ COMPLETE
