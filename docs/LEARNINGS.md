# 🎓 DeepStack Learnings & Pattern Library

**Purpose:** Capture insights, patterns, and universal principles discovered during build
**Goal:** Elevate project-specific learnings to GLOBAL_BRAIN for future use
**Update Frequency:** Daily (via `learnings-capture.sh` hook)

---

## 📚 Learning Categories

1. [Trading System Architecture](#trading-system-architecture)
2. [Python Best Practices](#python-best-practices)
3. [Testing Patterns](#testing-patterns)
4. [Risk Management](#risk-management)
5. [Agent Coordination](#agent-coordination)
6. [API Integration](#api-integration)
7. [Project Management](#project-management)

---

## 🏗️ Trading System Architecture

### Pattern: Agent-Based Strategy Design

**Context:** Trading strategies need to be modular, testable, and composable

**Learning:**
```python
# Good: Agent-based strategy pattern
class BaseAgent:
    def __init__(self, name, description):
        self.tools = {}
        self.config = get_config()

    def register_tool(self, tool, handler):
        self.tools[tool.name] = (tool, handler)

class StrategyAgent(BaseAgent):
    def analyze_stock(self, symbol):
        # Uses registered tools
        quote = await self._handle_get_stock_quote({"symbol": symbol})
        fundamentals = await self._handle_get_fundamentals({"symbol": symbol})
        return analysis
```

**Why It Works:**
- Separation of concerns (tools vs strategy logic)
- Easy to test (mock tools)
- Composable (mix and match strategies)
- Follows single responsibility principle

**When to Use:**
- Any multi-strategy system
- Systems needing AI integration
- Testable trading logic

**Pitfalls:**
- Don't over-abstract (YAGNI)
- Keep tool contracts simple
- Avoid deep inheritance hierarchies

**Status:** ✅ Validated in DeepStack core

---

### Pattern: Configuration-Driven Strategy Parameters

**Context:** Strategy parameters (P/E max, short interest min) change based on market conditions

**Learning:**
```yaml
# Good: YAML configuration
strategies:
  deep_value:
    enabled: true
    criteria:
      p_e_max: 10
      p_b_max: 1.0
```

```python
# Load in code
self.deep_value_config = self.config.strategies.deep_value
pe_threshold = self.deep_value_config.criteria.get("p_e_max", 15)
```

**Why It Works:**
- No code changes for parameter tuning
- Easy A/B testing
- Version controlled
- Human readable

**When to Use:**
- Strategy parameters that change
- Risk limits
- Market regime thresholds

**Pitfalls:**
- Don't put code in config
- Validate config on load
- Document all parameters

**Status:** ✅ Validated in DeepStack config

---

## 🐍 Python Best Practices

### Pattern: Type Hints for Trading Data

**Context:** Financial data has specific types (floats for prices, ints for quantities)

**Learning:**
```python
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class StockAnalysis:
    symbol: str
    deep_value_score: float  # 0-100
    squeeze_score: float     # 0-100
    target_price: float      # USD
    stop_price: float        # USD
    position_size_pct: float # 0.0-1.0
    confidence: float        # 0.0-1.0
```

**Why It Works:**
- Self-documenting
- IDE autocomplete
- mypy catches errors
- dataclass auto-generates __init__, __repr__

**When to Use:**
- All trading data structures
- API responses
- Configuration classes

**Pitfalls:**
- Don't over-use Optional (be explicit)
- Use Decimal for money if precision critical
- Validate ranges (0-100, 0.0-1.0)

**Status:** ⚠️ Partially adopted (needs more type hints)

---

## 🧪 Testing Patterns

### Pattern: Test Fixtures for Market Data

**Context:** Tests need realistic market data without calling real APIs

**Learning:** *(To be filled in during Week 1 pytest setup)*

```python
# Expected pattern:
@pytest.fixture
def sample_stock_quote():
    return {
        "symbol": "AAPL",
        "price": 150.25,
        "volume": 1000000,
        "market_cap": 2_500_000_000_000
    }

def test_deep_value_scoring(sample_stock_quote):
    # Test uses fixture
    score = calculate_deep_value_score(sample_stock_quote)
    assert 0 <= score <= 100
```

**Status:** 🔮 To be validated in Week 1

---

## 💰 Risk Management

### Pattern: Kelly Criterion with Safety Caps

**Context:** Kelly Criterion can suggest >100% allocation in favorable conditions

**Learning:** *(To be filled in during Week 3 Kelly implementation)*

```python
# Expected pattern:
def calculate_position_size(win_rate, avg_win, avg_loss):
    # Calculate full Kelly
    kelly_pct = (win_rate * avg_win - (1 - win_rate) * avg_loss) / avg_win

    # Apply fractional Kelly (0.25x for safety)
    fractional_kelly = kelly_pct * 0.25

    # Hard caps
    capped = min(fractional_kelly, 0.05)  # Never >5%

    return max(capped, 0.01)  # Minimum position
```

**Status:** 🔮 To be validated in Week 3

---

## 🤖 Agent Coordination

### Pattern: Worker + Watcher Dual-Agent

**Context:** Need quality assurance without slowing development

**Learning:**
```
Worker Agent (test-engineer):
1. Implements pytest framework
2. Writes tests
3. Commits code

Watcher Agent (code-reviewer) - PARALLEL:
1. Monitors test quality
2. Checks coverage
3. Validates test isolation
4. Reports to KRANG

KRANG:
- Receives reports from both
- Validates quality gate passed
- Approves handoff to next task
```

**Why It Works:**
- No sequential bottleneck
- Real-time quality oversight
- Catches issues before commit
- Clear separation of roles

**When to Use:**
- Complex features with quality requirements
- High-risk changes (risk management, tax logic)
- Production deployments

**Pitfalls:**
- Need clear task definition (avoid confusion)
- Watcher must have specific checks (not just "review")
- Requires coordination overhead

**Status:** ✅ Validated (ADR-001)

---

### Pattern: KRANG Protocol for Session Recovery

**Context:** Long projects span multiple sessions, need to resume seamlessly

**Learning:**
```
PROJECT_BRAIN structure:
- ROADMAP.md: Where we're going (8-week plan)
- PROGRESS.md: Where we are (daily updates)
- DECISIONS.md: Why we chose this (ADRs)
- LEARNINGS.md: What we discovered (this file)

Session Resume Process:
1. Read PROGRESS.md → Current status
2. Check "Tomorrow's Plan" → Next task
3. Review DECISIONS.md → Context for decisions
4. Check ROADMAP.md → Week/phase targets
5. Resume work
```

**Why It Works:**
- Zero context loss
- Quick resume (< 5 min)
- Full audit trail
- Learning retention

**When to Use:**
- Multi-week projects
- Team collaboration
- Any project >1 week

**Pitfalls:**
- Requires discipline to update
- Can become stale if not maintained
- Automation helps (hooks)

**Status:** ✅ Validated (ADR-002)

---

## 🔌 API Integration

### Pattern: Graceful Degradation for Market Data

**Context:** Free APIs have rate limits and may fail

**Learning:** *(To be filled in during Week 2 API integration)*

```python
# Expected pattern:
async def get_stock_quote(symbol: str) -> Dict:
    try:
        # Try primary source (Alpaca)
        return await alpaca_client.get_quote(symbol)
    except RateLimitError:
        # Fall back to secondary (Yahoo Finance)
        return await yahoo_client.get_quote(symbol)
    except APIError:
        # Use cached data if available
        cached = cache.get(f"quote:{symbol}")
        if cached and cached.age < timedelta(minutes=15):
            return cached.data
        raise DataUnavailableError(f"No data for {symbol}")
```

**Status:** 🔮 To be validated in Week 2

---

## 📊 Project Management

### Learning: Gap Analysis Before Starting

**Context:** Started DeepStack with "it's mostly done" assumption

**Discovery:**
- Actual completion: 18%
- Expected completion: 80%+
- Gap: 82% of work remaining

**Impact:**
- Prevented unrealistic timelines
- Identified critical gaps (testing, tax, regime)
- Justified 8-week plan
- Set proper expectations

**Lesson:**
> "Always do comprehensive gap analysis before large projects. What 'feels done' is often <20% complete when measured against full requirements."

**When to Apply:**
- Any project claiming ">50% done"
- Before estimating timelines
- When inheriting code
- Annual project reviews

**Status:** ✅ Validated (saved weeks of confusion)

---

### Learning: Documentation is Code Insurance

**Context:** Building PROJECT_BRAIN before coding

**Discovery:**
- GitHub as backup → Zero risk of losing progress
- PROGRESS.md → Can resume in < 5 min
- DECISIONS.md → Future self understands "why"
- LEARNINGS.md → Patterns usable in next project

**Impact:**
- Confidence to make bold changes (can always rollback)
- No "what was I thinking?" moments
- Easy to pause/resume
- Knowledge compounds

**Lesson:**
> "Documentation is not overhead—it's insurance. 30 minutes documenting saves 3 hours remembering."

**When to Apply:**
- Before any major decision
- End of each day (progress log)
- After solving tricky bug
- When discovering pattern

**Status:** ✅ Validated (this file exists!)

---

## 🔮 Patterns to Validate (Upcoming)

### Week 1 Patterns
- [ ] Pytest parametrized tests for trading strategies
- [ ] Property-based testing with hypothesis
- [ ] Coverage thresholds enforcement

### Week 2 Patterns
- [ ] API client with retry logic
- [ ] Rate limit handling
- [ ] Data caching strategies

### Week 3 Patterns
- [ ] Kelly Criterion implementation
- [ ] Stop loss enforcement
- [ ] Circuit breaker design

### Week 4 Patterns
- [ ] Paper trading simulation realism
- [ ] Terminal dashboard with Rich
- [ ] Real-time data updates

---

## 📈 Pattern Elevation Criteria

A learning becomes a **universal pattern** (elevated to GLOBAL_BRAIN) when:

1. **Validated:** Used successfully in ≥2 contexts
2. **Documented:** Has clear example code
3. **Understood:** Why it works is clear
4. **Generalizable:** Applies beyond DeepStack
5. **Teachable:** Can explain to others in <5 min

**Current Candidates for GLOBAL_BRAIN:**
- ✅ Agent-based strategy design → Universal for multi-strategy systems
- ✅ KRANG Protocol → Universal for long-running projects
- ✅ Gap analysis first → Universal for project estimation
- 🔮 Kelly with caps → Validate in Week 3
- 🔮 Worker + Watcher agents → Validate across phases

---

## 📝 Daily Learning Template

Use this template for capturing daily learnings:

```markdown
### Learning: [Short Title]

**Context:** [What situation/problem]

**Discovery:** [What you learned]

**Impact:** [How it helped]

**Lesson:**
> "[One-sentence universal principle]"

**When to Apply:** [Contexts where this helps]

**Status:** 🔮 To Validate | ✅ Validated | ❌ Invalidated
```

---

## 🎯 Learning Goals

### Week 1 Goals
- [ ] Master pytest fixtures for financial data
- [ ] Learn property-based testing
- [ ] Validate worker+watcher pattern

### Week 2 Goals
- [ ] API integration best practices
- [ ] Rate limiting patterns
- [ ] Data validation strategies

### Phase 1 Goals (Week 1-2)
- [ ] Testing patterns for trading systems
- [ ] Real data integration patterns
- [ ] Quality automation with hooks

---

**Last Updated:** November 3, 2025
**Next Update:** Daily at 6 PM (via `learnings-capture.sh` hook)
**Owner:** Splinter (mentor agent) + All agents contribute
**Elevation Review:** Weekly on Fridays (patterns → GLOBAL_BRAIN)
