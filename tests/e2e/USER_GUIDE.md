# DeepStack E2E Testing - User Guide

## What are E2E Tests?

End-to-end (E2E) tests simulate complete user workflows and system behaviors. Unlike unit tests that check individual components, E2E tests verify that the entire system works together correctly from start to finish.

Think of it like this:
- **Unit Test**: "Does the engine start?"
- **Integration Test**: "Do the engine and transmission work together?"
- **E2E Test**: "Can I drive from point A to point B?"

### Why E2E Tests Matter

1. **Catch Integration Issues**: Components might work individually but fail when combined
2. **Validate User Workflows**: Ensure users can actually accomplish their goals
3. **Document Behavior**: Tests serve as executable documentation
4. **Prevent Regressions**: Ensure new changes don't break existing functionality
5. **Build Confidence**: Verify the complete system works as expected

## DeepStack E2E Test Scenarios

We use BDD (Behavior-Driven Development) with Gherkin syntax to write tests that are readable by both technical and non-technical stakeholders.

### Test Scenarios Overview

DeepStack includes **7 complete E2E test scenarios** covering all major trading workflows:

#### 1. Deep Value Trade Execution
**File**: `tests/e2e/features/deep_value_trade.feature`

Tests the complete workflow for identifying and executing value-based trades.

**Scenarios**:
- Execute deep value trade with strong fundamentals
- Reject trade when circuit breaker trips
- Calculate appropriate position size based on Kelly criterion

**What it tests**:
- Fundamental analysis (PE ratio, PB ratio)
- Signal generation for undervalued stocks
- Position sizing with Kelly criterion
- Circuit breaker protection
- Order execution and stop loss placement

**Example**:
```gherkin
Given "VALUE" stock has PE ratio 8.0 and PB ratio 0.6
And "VALUE" is trading at 50.00 dollars
When the strategy agent analyzes "VALUE"
Then a BUY signal should be generated
And the position should appear in the portfolio
```

#### 2. Squeeze Hunter Trade Execution
**File**: `tests/e2e/features/squeeze_hunter_trade.feature`

Tests detection and execution of short squeeze opportunities.

**Scenarios**:
- Execute squeeze trade with high short interest
- Reject squeeze trade with low volume

**What it tests**:
- Short interest analysis
- Days-to-cover calculation
- Volume trend detection
- Squeeze score calculation (>75 for entry)
- Trailing stop placement

**Example**:
```gherkin
Given "SQUZ" stock has 45 percent short interest
And "SQUZ" has 8 days to cover
When the squeeze hunter analyzes "SQUZ"
Then a STRONG_BUY signal should be generated
And a tight trailing stop should be placed
```

#### 3. Tax Loss Harvesting
**File**: `tests/e2e/features/tax_loss_harvesting.feature`

Tests automated tax optimization through loss harvesting.

**Scenarios**:
- Harvest losses while respecting wash sale rules
- Skip harvesting when wash sale rule applies

**What it tests**:
- Loss detection (>$1,000 threshold)
- Wash sale rule compliance (30-day window)
- Tax lot tracking
- Replacement security selection
- Loss realization timing

**Example**:
```gherkin
Given the portfolio holds "TECH" with 5000 dollar loss
And "TECH" was purchased 45 days ago
When the tax loss harvester runs
Then "TECH" should be sold to harvest the loss
And a similar replacement security should be purchased
```

#### 4. Circuit Breaker Protection
**File**: `tests/e2e/features/circuit_breaker.feature`

Tests risk management and circuit breaker functionality.

**Scenarios**:
- Trigger circuit breaker on daily loss limit
- Trigger circuit breaker on position loss limit

**What it tests**:
- Daily loss tracking (-3% threshold)
- Position-level loss tracking (-10% threshold)
- Trade blocking when breakers trip
- Emergency position exit
- Breaker reset conditions

**Example**:
```gherkin
Given the portfolio has lost 3 percent today
When the strategy attempts to place a new trade
Then the circuit breaker should trip
And all new trades should be blocked
```

#### 5. Regime-Based Rebalancing
**File**: `tests/e2e/features/regime_rebalancing.feature`

Tests portfolio rebalancing based on market regime changes.

**Scenarios**:
- Rebalance from bull to bear regime
- Rebalance from bear to bull regime

**What it tests**:
- Market regime detection
- Regime transition handling
- Portfolio allocation adjustment
- Strategy activation/deactivation
- Risk parameter updates

**Example**:
```gherkin
Given the market regime is BULL
And the portfolio is allocated for bull market
When the regime changes to BEAR
Then the portfolio should rebalance for bear market
And defensive strategies should be activated
```

#### 6. Covered Call Strategy
**File**: `tests/e2e/features/covered_call.feature`

Tests income generation through covered call writing.

**Scenarios**:
- Write covered calls on existing positions
- Close covered calls before expiration

**What it tests**:
- Position eligibility (100+ shares)
- Strike price selection (5% OTM)
- Premium collection
- Assignment risk management
- Early closing logic

**Example**:
```gherkin
Given the portfolio holds 200 shares of "BLUE"
And "BLUE" is trading at 100.00 dollars
When the covered call strategy runs
Then a call option should be written at 105.00 strike
And premium should be collected
```

#### 7. Pairs Trading
**File**: `tests/e2e/features/pairs_trade.feature`

Tests statistical arbitrage through pairs trading.

**Scenarios**:
- Execute pairs trade on spread divergence
- Close pairs trade on spread convergence

**What it tests**:
- Pair correlation analysis (>0.8)
- Spread calculation and Z-score
- Mean reversion detection
- Position entry/exit timing
- Hedge ratio maintenance

**Example**:
```gherkin
Given "PAIR_A" and "PAIR_B" are 90 percent correlated
And the spread Z-score is 2.5
When the pairs trader analyzes the spread
Then "PAIR_A" should be shorted
And "PAIR_B" should be bought
And the hedge ratio should be maintained
```

## Running E2E Tests

### Prerequisites

1. **Install Dependencies**:
```bash
# Install pytest and E2E testing tools
pip install pytest pytest-bdd pytest-asyncio pytest-cov

# Install DeepStack in development mode
pip install -e .
```

2. **Verify Installation**:
```bash
# Check pytest is working
pytest --version

# List E2E tests
pytest tests/e2e/ --collect-only
```

### Run All E2E Tests

```bash
# Run complete E2E suite
python3 -m pytest tests/e2e/ -v

# With detailed output
python3 -m pytest tests/e2e/ -vv -s

# With coverage
python3 -m pytest tests/e2e/ -v --cov=core --cov-report=html
```

### Run Specific Feature

```bash
# Run deep value trade tests
pytest tests/e2e/features/deep_value_trade.feature -v

# Run squeeze hunter tests
pytest tests/e2e/features/squeeze_hunter_trade.feature -v

# Run tax loss harvesting tests
pytest tests/e2e/features/tax_loss_harvesting.feature -v
```

### Run Specific Scenario

```bash
# Run by scenario name (use quotes)
pytest tests/e2e/ -k "Execute deep value trade with strong fundamentals" -v

# Run all squeeze-related scenarios
pytest tests/e2e/ -k "squeeze" -v

# Run all circuit breaker scenarios
pytest tests/e2e/ -k "circuit" -v
```

### Run with Markers

```bash
# Run only E2E tests
pytest -m e2e -v

# Run only BDD scenarios
pytest -m bdd -v

# Run E2E and integration tests
pytest -m "e2e or integration" -v
```

## Understanding Test Results

### Successful Test Output

```bash
tests/e2e/features/deep_value_trade.feature::test_execute_deep_value_trade PASSED [100%]

======================== 1 passed in 0.45s =========================
```

**What this means**:
- Test feature file identified
- Specific scenario executed
- PASSED = All steps succeeded
- 100% = Test progress
- 0.45s = Execution time

### Failed Test Output

```bash
tests/e2e/features/squeeze_hunter_trade.feature::test_squeeze_score FAILED [100%]

________________________ test_squeeze_score _________________________

    def test_squeeze_score():
>       assert squeeze_score > 75
E       AssertionError: assert 60 > 75

tests/e2e/step_defs/test_squeeze_hunter_steps.py:45: AssertionError
======================== 1 failed in 0.52s ==========================
```

**What this means**:
- Test failed at assertion
- Expected: squeeze_score > 75
- Actual: squeeze_score = 60
- File and line number provided for debugging
- Review the step implementation to understand why

### Test Output with Steps

```bash
Feature: Deep Value Trade Execution
    Scenario: Execute deep value trade with strong fundamentals
        Given "VALUE" stock has PE ratio 8.0 and PB ratio 0.6 ... PASSED
        And "VALUE" is trading at 50.00 dollars ... PASSED
        When the strategy agent analyzes "VALUE" ... PASSED
        Then a BUY signal should be generated ... PASSED
        And the position size should be calculated ... PASSED
        And the order should be executed ... PASSED
        And the position should appear in the portfolio ... PASSED
```

**What this means**:
- Each step executed in sequence
- All steps PASSED
- Complete workflow validated

## Adding New E2E Scenarios

### Step 1: Write Feature File

Create a new `.feature` file in `tests/e2e/features/`:

```gherkin
# tests/e2e/features/my_new_feature.feature
Feature: My New Trading Feature
  As a trading system
  I want to execute a new trading strategy
  So that I can achieve better returns

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash

  Scenario: Execute new strategy successfully
    Given favorable market conditions exist
    When the new strategy analyzes the market
    Then a signal should be generated
    And a position should be opened
    And risk controls should be applied
```

### Step 2: Implement Step Definitions

Create step implementation file in `tests/e2e/step_defs/`:

```python
# tests/e2e/step_defs/test_my_new_feature_steps.py
from pytest_bdd import scenarios, given, when, then, parsers
import pytest

# Load scenarios from feature file
scenarios('../features/my_new_feature.feature')

@given('favorable market conditions exist')
def setup_market_conditions(mock_market_data):
    """Setup favorable market conditions for testing."""
    mock_market_data.set_trend('BULLISH')
    mock_market_data.set_volatility('LOW')
    assert mock_market_data.is_favorable()

@when('the new strategy analyzes the market')
def run_strategy_analysis(orchestrator):
    """Execute strategy analysis."""
    result = orchestrator.analyze_with_new_strategy()
    orchestrator.last_result = result
    assert result is not None

@then('a signal should be generated')
def verify_signal_generated(orchestrator):
    """Verify signal was generated."""
    result = orchestrator.last_result
    assert result.signal is not None
    assert result.signal.strength > 0

@then('a position should be opened')
def verify_position_opened(orchestrator):
    """Verify position was opened in portfolio."""
    positions = orchestrator.get_positions()
    assert len(positions) > 0
    assert positions[0].quantity > 0
```

### Step 3: Run Your New Tests

```bash
# Run new feature
pytest tests/e2e/features/my_new_feature.feature -v

# Debug with print statements
pytest tests/e2e/features/my_new_feature.feature -v -s
```

## BDD/Gherkin Syntax Quick Reference

### Feature Structure

```gherkin
Feature: High-level description
  As a [role]
  I want [feature]
  So that [benefit]
```

### Background (Runs before each scenario)

```gherkin
Background:
  Given common precondition 1
  And common precondition 2
```

### Scenario Structure

```gherkin
Scenario: Descriptive scenario name
  Given [initial context]
  And [more context]
  When [action occurs]
  Then [expected outcome]
  And [another expected outcome]
```

### Keywords

- **Feature**: High-level description of functionality
- **Scenario**: Specific test case
- **Background**: Steps run before each scenario
- **Given**: Initial context/preconditions
- **When**: Action/trigger
- **Then**: Expected outcome/assertion
- **And**: Continue previous keyword
- **But**: Negative assertion (less common)

### Parameterized Steps

```gherkin
# Use quotes for string parameters
Given "AAPL" stock has PE ratio 8.0
Given the portfolio has 100000 dollars

# Python step definition captures parameters
@given(parsers.parse('"{symbol}" stock has PE ratio {pe:f}'))
def set_pe_ratio(symbol, pe):
    # symbol = "AAPL", pe = 8.0
    pass

@given(parsers.parse('the portfolio has {amount:d} dollars'))
def set_cash(amount):
    # amount = 100000
    pass
```

### Scenario Outline (Data-Driven Tests)

```gherkin
Scenario Outline: Test multiple scenarios with different data
  Given stock "<symbol>" has PE ratio <pe>
  When the strategy analyzes "<symbol>"
  Then the signal should be <signal>

  Examples:
    | symbol | pe   | signal |
    | VALUE  | 8.0  | BUY    |
    | GROWTH | 45.0 | SELL   |
    | FAIR   | 15.0 | HOLD   |
```

## Best Practices

### 1. Write Clear Scenarios
```gherkin
# Good: Specific and clear
Scenario: Execute deep value trade with strong fundamentals

# Bad: Vague
Scenario: Test trading
```

### 2. Use Background for Common Setup
```gherkin
Background:
  Given the trading system is initialized
  And the portfolio has 100000 dollars in cash

# Now all scenarios have this setup
```

### 3. Keep Steps Focused
```gherkin
# Good: One action per step
Given "VALUE" stock has PE ratio 8.0
And "VALUE" has PB ratio 0.6

# Bad: Multiple actions in one step
Given "VALUE" stock has PE ratio 8.0 and PB ratio 0.6 and price 50.00
```

### 4. Test Both Success and Failure
```gherkin
Scenario: Execute trade successfully
  Given favorable conditions
  Then trade should execute

Scenario: Reject trade with unfavorable conditions
  Given unfavorable conditions
  Then trade should be rejected
```

### 5. Use Descriptive Assertions
```python
# Good: Clear assertion with message
assert signal.strength > 0.7, f"Expected strong signal, got {signal.strength}"

# Bad: Unclear assertion
assert signal
```

## Debugging E2E Tests

### Run with Verbose Output
```bash
# See all step executions
pytest tests/e2e/ -vv

# Show print statements
pytest tests/e2e/ -s

# Both
pytest tests/e2e/ -vv -s
```

### Use Python Debugger
```bash
# Drop into debugger on failure
pytest tests/e2e/ --pdb

# Drop into debugger at specific point
# Add in step definition:
import pdb; pdb.set_trace()
```

### Check Step Definitions
```bash
# Show which steps map to which functions
pytest tests/e2e/ --collect-only -v
```

### Common Issues

#### 1. Step Not Found
```
StepDefinitionNotFoundError: Step definition not found for: Given "VALUE" stock has PE ratio 8.0
```

**Solution**: Implement the missing step in a `test_*_steps.py` file:
```python
@given(parsers.parse('"{symbol}" stock has PE ratio {pe:f}'))
def set_pe_ratio(symbol, pe):
    # Implementation here
    pass
```

#### 2. Fixture Not Found
```
fixture 'orchestrator' not found
```

**Solution**: Add fixture to `conftest.py` or import from existing fixtures:
```python
@pytest.fixture
async def orchestrator():
    orch = Orchestrator()
    await orch.initialize()
    yield orch
    await orch.cleanup()
```

#### 3. Async Issues
```
RuntimeError: This event loop is already running
```

**Solution**: Use `@pytest.mark.asyncio` and `asyncio_mode = auto` in pytest.ini

## Performance Tips

### Run Tests in Parallel
```bash
# Install pytest-xdist
pip install pytest-xdist

# Run with multiple workers
pytest tests/e2e/ -n auto  # Use all CPU cores
pytest tests/e2e/ -n 4     # Use 4 workers
```

### Skip Slow Tests During Development
```bash
# Mark slow tests
@pytest.mark.slow
def test_slow_scenario():
    pass

# Skip them
pytest tests/e2e/ -m "not slow"
```

### Use Fixtures Efficiently
```python
# Session-scoped fixture (runs once)
@pytest.fixture(scope="session")
def expensive_setup():
    # This runs once for all tests
    return setup_data()

# Function-scoped fixture (runs per test)
@pytest.fixture(scope="function")
def fresh_orchestrator():
    # This runs for each test
    return Orchestrator()
```

## Getting Help

### Resources
- Main Test Documentation: `tests/README.md`
- pytest-bdd Documentation: https://pytest-bdd.readthedocs.io/
- Gherkin Reference: https://cucumber.io/docs/gherkin/reference/

### Troubleshooting
1. Check test logs: `tests/logs/pytest.log`
2. Run with verbose output: `pytest -vv -s`
3. Check CI/CD logs in GitHub Actions
4. Review existing working tests for patterns

### Support
- Create GitHub issue with test output
- Include full error message and stack trace
- Provide steps to reproduce

## Summary

E2E tests are your safety net:
- **7 feature files** covering all major workflows
- **16+ scenarios** testing success and failure cases
- **BDD/Gherkin syntax** readable by everyone
- **<2 minutes** execution time for full E2E suite
- **Automated in CI/CD** preventing regressions

When in doubt, write a test. Future you will be grateful!
