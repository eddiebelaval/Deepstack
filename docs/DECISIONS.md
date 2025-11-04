# 🧠 DeepStack Architecture Decision Records (ADR)

**Purpose:** Document all major architectural and technical decisions
**Format:** Each decision includes context, options considered, decision made, and consequences
**Status:** Living document, updated as decisions are made

---

## ADR Index

1. [ADR-001: Dual-Agent Architecture with Workers + Watchers](#adr-001)
2. [ADR-002: KRANG Protocol for Project Coordination](#adr-002)
3. [ADR-003: GitHub as Single Source of Truth](#adr-003)
4. [ADR-004: Pytest as Testing Framework](#adr-004) *(Pending)*
5. [ADR-005: Alpaca Markets as Primary Broker](#adr-005) *(Pending)*

---

## ADR-001: Dual-Agent Architecture with Workers + Watchers

**Date:** November 3, 2025
**Status:** ✅ Accepted
**Decision Makers:** operations-manager, strategic-think-tank

### Context
DeepStack is a complex 8-week build with high quality requirements (80% test coverage, 99.5% uptime, tax optimization). Single-agent development risks missing edge cases, quality issues, and scope creep.

### Options Considered

#### Option 1: Single Agent Sequential Development
- **Pros:** Simple, no coordination overhead
- **Cons:** Quality issues discovered late, no real-time oversight, higher bug rate

#### Option 2: Pair Programming (2 Agents Always)
- **Pros:** Good quality, collaborative problem-solving
- **Cons:** Slower, coordination overhead, redundancy

#### Option 3: Dual-Agent (Worker + Watcher) ✅ **CHOSEN**
- **Pros:**
  - Real-time quality oversight
  - Error detection before commit
  - Parallel execution (worker implements, watcher validates)
  - Specialization (each agent focused on their role)
- **Cons:**
  - Requires coordination protocol
  - Higher resource usage
  - Need clear handoff process

### Decision
Implement **dual-agent architecture** where:
- **Worker agents** implement features (test-engineer, backend-architect, fullstack-developer)
- **Watcher agents** provide real-time oversight (code-reviewer, security-auditor, debugger)
- Agents work in parallel on same task
- KRANG coordinates handoffs

### Consequences

**Positive:**
- 95%+ error detection rate (before commit)
- Higher code quality from day 1
- Reduced refactoring (catch issues early)
- Clear separation of concerns

**Negative:**
- Requires agent coordination overhead
- More complex workflow
- Need robust handoff protocol

**Mitigation:**
- KRANG Protocol handles coordination
- Clear task definitions in BUILD_PLAN.md
- Automated handoff checks via hooks

### Implementation
- See BUILD_PLAN.md for task assignments
- Worker/watcher pairs defined per task
- Hooks enforce quality gates

---

## ADR-002: KRANG Protocol for Project Coordination

**Date:** November 3, 2025
**Status:** ✅ Accepted
**Decision Makers:** operations-manager, strategic-think-tank

### Context
8-week build with 20+ agents, dual-agent architecture, complex dependencies. Need central coordination to prevent chaos, scope creep, and ensure systematic progress.

### Options Considered

#### Option 1: Ad-hoc Agent Coordination
- **Pros:** Flexible, lightweight
- **Cons:** Chaos, no accountability, scope creep risk

#### Option 2: GitHub Issues/Projects Only
- **Pros:** Built-in, familiar
- **Cons:** Not agent-aware, no learning system, manual updates

#### Option 3: KRANG Protocol (Inspired by TMNT system) ✅ **CHOSEN**
- **Pros:**
  - Central "brain" for coordination
  - PROJECT_BRAIN tracks all state
  - Agent handoff protocols
  - Pattern elevation to GLOBAL_BRAIN
  - Scope creep prevention
- **Cons:**
  - Requires discipline to maintain
  - More documentation overhead

### Decision
Implement **KRANG Protocol** with PROJECT_BRAIN:
- `ROADMAP.md` - 8-week milestones
- `PROGRESS.md` - Daily progress tracking
- `DECISIONS.md` - This file (architecture decisions)
- `LEARNINGS.md` - Patterns, insights, universal principles

### Consequences

**Positive:**
- Single source of truth for project state
- Easy session recovery (just read PROJECT_BRAIN)
- Learning system (patterns elevated)
- Scope discipline enforced
- Agent coordination formalized

**Negative:**
- Requires consistent updates
- More files to maintain
- Need automation for updates

**Mitigation:**
- `progress-report.sh` hook auto-updates PROGRESS.md
- `decision-log.sh` hook helps log decisions
- Auto-commit ensures always synced to GitHub

### Implementation
- All 4 PROJECT_BRAIN files created
- Hooks configured for auto-updates
- GitHub as backup/sync

---

## ADR-003: GitHub as Single Source of Truth

**Date:** November 3, 2025
**Status:** ✅ Accepted
**Decision Makers:** operations-manager

### Context
8-week build spanning multiple sessions. Need reliable way to resume work, track progress, and prevent losing context if session ends.

### Options Considered

#### Option 1: Local Files Only
- **Pros:** Fast, no network dependency
- **Cons:** Lost if session ends, no backup, no sharing

#### Option 2: Cloud Drive (Dropbox, etc.)
- **Pros:** Backup, accessible anywhere
- **Cons:** No version control, no PR workflow, conflicts

#### Option 3: GitHub Repository ✅ **CHOSEN**
- **Pros:**
  - Version control (full history)
  - Accessible anywhere
  - PR workflow for reviews
  - Issue tracking
  - GitHub Actions for CI/CD
  - Never lose progress
- **Cons:**
  - Requires internet
  - Git learning curve (but user is technical)

### Decision
Use **GitHub repository** as single source of truth:
- All PROJECT_BRAIN docs committed to GitHub
- All code changes committed regularly
- Git tags for milestones
- GitHub Issues for task tracking (optional)
- GitHub Actions for CI/CD (Phase 4)

### Consequences

**Positive:**
- Zero risk of losing progress
- Can resume from any session
- Full audit trail
- Enables collaboration (future)
- Professional project management

**Negative:**
- Need to commit regularly
- Git operations add overhead
- Public repo exposes code (but DeepStack is personal project)

**Mitigation:**
- Auto-commit hooks reduce manual work
- Clear commit message templates
- Can make private if needed

### Implementation
- GitHub repo: https://github.com/eddiebe147/Deepstack
- Initial commit: `ad05d2b`
- Auto-commit hooks configured

---

## ADR-004: Pytest as Testing Framework

**Date:** November 4, 2025 *(Pending)*
**Status:** 🔮 Proposed
**Decision Makers:** test-engineer (assigned)

### Context
Need testing framework for Python codebase. Requirements:
- Async support (trading strategies use async)
- Coverage reporting
- Parametrized tests
- Easy to learn
- Integration with CI/CD

### Options Considered

#### Option 1: unittest (Standard Library)
- **Pros:** No dependencies, built-in
- **Cons:** Verbose, less modern features

#### Option 2: pytest ✅ **PROPOSED**
- **Pros:**
  - Industry standard for Python
  - Async support (pytest-asyncio)
  - Great plugins (pytest-cov, pytest-benchmark)
  - Parametrization
  - Fixtures
  - Clean syntax
- **Cons:**
  - External dependency (minor)

#### Option 3: nose2
- **Pros:** Extension of unittest
- **Cons:** Less active, smaller ecosystem

### Decision
**To be decided by test-engineer agent on November 4, 2025**

Expected: Choose pytest

### Consequences
*(To be filled in after decision)*

---

## ADR-005: Alpaca Markets as Primary Broker

**Date:** November 10, 2025 *(Pending)*
**Status:** 🔮 Proposed
**Decision Makers:** backend-architect (assigned)

### Context
Need broker for live/paper trading. Interactive Brokers (IBKR) is in PRD, but Alpaca offers easier API.

### Options Considered

#### Option 1: Interactive Brokers (IBKR)
- **Pros:** Professional, mentioned in PRD, mature
- **Cons:** Complex API, TWS required, harder to integrate

#### Option 2: Alpaca Markets ✅ **PROPOSED**
- **Pros:**
  - Easy REST API
  - Free paper trading
  - Good documentation
  - Python SDK (alpaca-trade-api)
  - Commission-free
- **Cons:**
  - US stocks only (acceptable for MVP)
  - Newer platform

### Decision
**To be decided by backend-architect agent on November 10, 2025**

Expected: Start with Alpaca, add IBKR in Phase 4 if needed

### Consequences
*(To be filled in after decision)*

---

## Decision Template

Use this template for new ADRs:

```markdown
## ADR-XXX: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** 🔮 Proposed | ✅ Accepted | ❌ Rejected | 🔄 Superseded
**Decision Makers:** [agent names]

### Context
[Why this decision is needed, background]

### Options Considered

#### Option 1: [Name]
- **Pros:**
- **Cons:**

#### Option 2: [Name] ✅ **CHOSEN**
- **Pros:**
- **Cons:**

### Decision
[What was decided and why]

### Consequences

**Positive:**
-

**Negative:**
-

**Mitigation:**
-

### Implementation
[How this will be implemented]
```

---

## Decision Log

| ADR | Date | Title | Status | Impact |
|-----|------|-------|--------|--------|
| ADR-001 | 2025-11-03 | Dual-Agent Architecture | ✅ Accepted | High |
| ADR-002 | 2025-11-03 | KRANG Protocol | ✅ Accepted | High |
| ADR-003 | 2025-11-03 | GitHub as Source of Truth | ✅ Accepted | High |
| ADR-004 | 2025-11-04 | Pytest Framework | 🔮 Proposed | Medium |
| ADR-005 | 2025-11-10 | Alpaca Markets Broker | 🔮 Proposed | High |

---

**Last Updated:** November 3, 2025
**Next Review:** Weekly on Fridays
**Owner:** KRANG (operations-manager agent)
