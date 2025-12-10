# DeepStack Store Unit Tests - Phase 2A & 2B

## Overview
This directory contains comprehensive unit tests for DeepStack's Zustand state management stores, covering both trading and UI-related functionality.

## Test Files Created

---
## Phase 2A: Trading Stores

### 1. trades-store.test.ts (50+ tests)
Tests for the `useTradesStore` Zustand store that manages trade journal entries.

**Test Coverage:**
- ✅ Initial state verification
- ✅ addTrade action (11 tests)
  - Basic trade creation
  - Unique ID generation
  - Timestamp handling (createdAt, updatedAt)
  - Optional fields (notes, tags, pnl, userId)
  - All order types (MKT, LMT, STP)
  - Return value verification
- ✅ updateTrade action (5 tests)
  - Property updates
  - Timestamp updates
  - Isolation (doesn't affect other trades)
  - Error handling
  - P&L updates
- ✅ deleteTrade action (3 tests)
  - Single trade removal
  - Selective deletion
  - Error handling
- ✅ getTradeById selector (3 tests)
  - Find by ID
  - Non-existent ID handling
  - Multiple trades scenarios
- ✅ getTradesBySymbol selector (5 tests)
  - Symbol filtering
  - Case-insensitive search
  - Empty results
  - Mixed case handling
  - Immutability verification
- ✅ Persistence configuration
- ✅ Complex scenarios (3 tests)
  - Rapid successive trades
  - Order maintenance
  - Full CRUD workflow

**Key Testing Patterns:**
```typescript
// Reset before each test
beforeEach(() => {
  act(() => {
    useTradesStore.setState({ trades: [] });
  });
});

// Test actions within act()
act(() => {
  const trade = addTrade({
    symbol: 'SPY',
    action: 'BUY',
    quantity: 100,
    price: 595.50,
    orderType: 'MKT',
  });
});
```

---

### 2. positions-store.test.ts (45+ tests)
Tests for the `usePositionsStore` Zustand store that manages trading positions with P&L calculations.

**Test Coverage:**
- ✅ Initial state verification
- ✅ addPosition action (7 tests)
  - Position creation
  - Unique ID generation
  - Long/short positions
  - Optional fields (notes, currentPrice)
- ✅ updatePosition action (3 tests)
  - Property updates
  - Isolation
  - Error handling
- ✅ removePosition action (2 tests)
  - Deletion
  - Selective removal
- ✅ updatePrice action (3 tests)
  - Price updates by symbol
  - Multiple positions with same symbol
  - Symbol isolation
- ✅ clearAllPositions action
- ✅ calculatePositionPnL function (6 tests)
  - Long positions with profit/loss
  - Short positions with profit/loss
  - Missing currentPrice handling
  - Zero cost basis handling
- ✅ Selectors (11 tests)
  - selectPositionsWithPnL
  - selectTotalPortfolioValue
  - selectTotalCostBasis
  - selectTotalPnL
  - selectTotalPnLPercent
  - selectPositionById
  - selectPositionsBySymbol
  - selectLongPositions
  - selectShortPositions
  - selectPortfolioSummary
- ✅ Persistence configuration

**P&L Calculation Examples:**
```typescript
// Long position profit
const position: Position = {
  id: 'test-1',
  symbol: 'AAPL',
  shares: 100,
  avgCost: 190.00,
  currentPrice: 193.42,
  side: 'long',
  openDate: '2024-12-01',
};

const result = calculatePositionPnL(position);
// marketValue: 19342 (100 * 193.42)
// costBasis: 19000 (100 * 190.00)
// pnl: 342 (profit)
// pnlPercent: 1.8%

// Short position profit (price drops)
const shortPosition: Position = {
  symbol: 'RIVN',
  shares: 100,
  avgCost: 15.00,
  currentPrice: 12.50,
  side: 'short',
};
// pnl: 250 (cost - market = profit when shorting)
```

---

### 3. trading-store.test.ts (55+ tests)
Tests for the `useTradingStore` Zustand store that manages trading UI state (charts, indicators, panels).

**Test Coverage:**
- ✅ Initial state verification
- ✅ setActiveSymbol action (2 tests)
- ✅ setChartType action (3 tests)
  - Candlestick, line, area
- ✅ setTimeframe action (7 tests)
  - All timeframes: 1m, 5m, 15m, 1h, 4h, 1d, 1w
- ✅ Overlay Symbols (8 tests)
  - addOverlaySymbol (6 tests)
    - Basic addition
    - Multiple overlays
    - Duplicate prevention
    - Active symbol exclusion
    - 4-symbol limit
  - removeOverlaySymbol (2 tests)
  - clearOverlays (1 test)
- ✅ Indicators (20+ tests)
  - addIndicator (11 tests)
    - All indicator types: SMA, EMA, RSI, MACD, BOLLINGER
    - Unique ID generation
    - Duplicate prevention
    - Default params per type
    - Visibility
    - Default colors
  - removeIndicator (3 tests)
  - toggleIndicator (2 tests)
  - updateIndicatorParams (3 tests)
  - updateIndicatorColor (2 tests)
- ✅ Panel Toggles (3 tests)
  - toggleWatchlist
  - toggleOrderPanel
  - toggleChatPanel
- ✅ reset action (1 test)
- ✅ Persistence configuration
- ✅ Complex scenarios (2 tests)
  - Full trading setup workflow
  - Indicator state maintenance

**Indicator Testing Pattern:**
```typescript
// Add indicator with default config
act(() => {
  addIndicator('SMA');
});

const { indicators } = useTradingStore.getState();
expect(indicators[0].type).toBe('SMA');
expect(indicators[0].params.period).toBe(20); // Default
expect(indicators[0].visible).toBe(true);

// Update indicator params
act(() => {
  updateIndicatorParams(indicatorId, { period: 50 });
});
```

---

## Phase 2B: UI State Stores

### 4. chat-store.test.ts (44 tests)
Tests for the `useChatStore` Zustand store that manages chat conversations and AI interactions.

**Test Coverage:**
- ✅ Initial state verification (7 tests)
- ✅ Conversation management (23 tests)
  - Setting current conversation
  - Managing conversation list
  - Adding/removing conversations
  - Updating conversation titles with timestamps
- ✅ Message management (7 tests)
  - Setting/adding messages
  - All message roles (system, user, assistant, data)
  - Preserving optional properties (createdAt, toolInvocations)
- ✅ Streaming state (7 tests)
  - Streaming status management
  - AI provider switching (Claude, OpenAI, Gemini, Anthropic)
  - Extended thinking toggle
- ✅ Order ticket management (5 tests)
  - Setting/clearing order tickets
  - Order types (MKT, LMT, STP)
  - Buy/Sell actions
  - Risk warnings and Kelly criterion
- ✅ State reset (1 test)

---

### 5. ui-store.test.ts (54 tests)
Tests for the `useUIStore` Zustand store that manages global UI state and panel visibility.

**Test Coverage:**
- ✅ Initial state verification (10 tests)
- ✅ Active content management (6 tests)
  - Content type switching
  - Smart chart persistence during tool usage
  - Tool panel behavior
- ✅ Market Watch Panel (7 tests)
  - Open/close/toggle operations
  - Expand/collapse functionality
  - Height management (min: 200px, max: 800px)
- ✅ Chart panel (3 tests)
  - Open/close operations
  - Collapse toggle
- ✅ Sidebar management (12 tests)
  - Left sidebar toggle/set
  - Right sidebar toggle/set
- ✅ Profile and Settings (8 tests)
  - Profile toggle/set
  - Settings toggle/set
  - Mutual exclusivity
- ✅ Widget management (4 tests)
  - Toggle widget states
  - Individual widget targeting
- ✅ Credits and Paywall (4 tests)
  - Credit updates
  - Paywall state management
- ✅ Persistence configuration

**Key Features:**
```typescript
// Smart chart persistence
setActiveContent('none') → Opens chart
setActiveContent('analysis') → Collapses chart, saves state
setActiveContent('none') → Restores chart to previous state
```

---

### 6. alerts-store.test.ts (32 tests)
Tests for the `useAlertsStore` Zustand store that manages price alerts with persistence.

**Test Coverage:**
- ✅ Initial state verification (1 test)
- ✅ Adding alerts (9 tests)
  - Alert creation with UUID generation
  - Timestamp creation (createdAt)
  - Active state initialization
  - All condition types (above, below, crosses)
  - Optional notes
  - Multiple alerts management
- ✅ Removing alerts (3 tests)
  - Delete by ID
  - Selective removal
  - Non-existent ID handling
- ✅ Updating alerts (7 tests)
  - Target price updates
  - Condition updates
  - Note updates
  - Multiple property updates
  - Property preservation
- ✅ Triggering alerts (4 tests)
  - Timestamp setting (triggeredAt)
  - Active state changes
  - Alert preservation in store
- ✅ Clearing triggered alerts (3 tests)
  - Removal of triggered alerts only
  - Preservation of active alerts
- ✅ Selector methods (5 tests)
  - getActiveAlerts
  - getTriggeredAlerts
  - Filter accuracy
- ✅ Persistence with localStorage

**Alert Condition Types:**
- `above`: Trigger when price rises above target
- `below`: Trigger when price falls below target
- `crosses`: Trigger when price crosses target (either direction)

---

### 7. calendar-store.test.ts (24 tests)
Tests for the `useCalendarStore` Zustand store that manages economic/earnings calendar events.

**Test Coverage:**
- ✅ Initial state verification (5 tests)
- ✅ Filter management (6 tests)
  - Event type filters (earnings, economic, dividend, ipo)
  - All filter option
- ✅ Date range management (2 tests)
- ✅ Event fetching (9 tests)
  - Successful fetch operations
  - Loading state transitions
  - Error handling (fetch errors, network errors)
  - Date range inclusion in API requests
  - Empty response handling
- ✅ Event filtering (7 tests)
  - Filter by event type
  - Return all events
  - Empty results handling

**Event Types:**
- `earnings`: Company earnings reports (with financial metrics)
- `economic`: Economic indicators (Fed meetings, GDP, etc.)
- `dividend`: Dividend payments
- `ipo`: Initial public offerings

---

### 8. news-store.test.ts (43 tests)
Tests for the `useNewsStore` Zustand store that manages news articles with pagination and auto-refresh.

**Test Coverage:**
- ✅ Initial state verification (10 tests)
- ✅ News fetching (13 tests)
  - Successful fetch
  - Loading state management
  - Symbol filtering
  - Pagination (page size: 15)
  - hasMore flag management
  - Error handling
  - New article counting
  - Reset behavior
- ✅ Load more functionality (8 tests)
  - Pagination
  - Loading more state
  - Article deduplication
  - Symbol filter preservation
  - Error handling
- ✅ Symbol filtering (3 tests)
  - Set symbol filter
  - Clear filter
  - Auto-fetch on filter change
- ✅ Auto-refresh (2 tests)
  - Enable/disable
- ✅ Mark as viewed (1 test)
- ✅ Check for new articles (6 tests)
  - New article detection
  - Count accumulation
  - Error handling
  - Symbol filter inclusion

**Features:**
- Page size: 15 articles
- Auto-refresh interval: 5 minutes
- Article deduplication by ID
- New article notifications
- Symbol-specific news filtering

---

### 9. prediction-markets-store.test.ts (52 tests)
Tests for the `usePredictionMarketsStore` Zustand store that manages prediction market data and watchlists.

**Test Coverage:**
- ✅ Initial state verification (10 tests)
- ✅ Filter management (7 tests)
  - Source filter (all, polymarket, kalshi)
  - Category filter
  - Status filter (active, closed, all)
  - Search filter
  - Sort filter (volume, expiration, probability, change)
  - Multiple filter updates
  - Filter preservation
- ✅ Market selection (3 tests)
  - Select market
  - Clear selection
  - Replace selection
- ✅ Markets management (6 tests)
  - Set markets
  - Append markets (pagination)
  - hasMore flag (20 markets = full page)
  - Last fetch time tracking
- ✅ Loading states (4 tests)
  - Loading flag
  - Error state
- ✅ Auto-refresh (4 tests)
  - Last fetch time
  - Auto-refresh toggle
  - New markets count
  - Mark as viewed
- ✅ Watchlist management (17 tests)
  - Add to watchlist with timestamps
  - Remove from watchlist
  - Update watchlist items
  - Check if in watchlist
  - Timestamp management (createdAt, updatedAt)
  - Property preservation
  - Alert thresholds (high/low)
  - Notes and position tracking
- ✅ State reset (1 test)
- ✅ Persistence configuration

**Supported Platforms:**
- Polymarket
- Kalshi

**Watchlist Features:**
- Alert thresholds (high/low)
- Position tracking (yes/no)
- Entry price tracking
- Quantity tracking
- Notes

---

## Running the Tests

### Run all store tests
```bash
npm test -- src/lib/stores/__tests__
```

### Run specific test file
```bash
# Phase 2A: Trading Stores
npm test -- src/lib/stores/__tests__/trades-store.test.ts
npm test -- src/lib/stores/__tests__/positions-store.test.ts
npm test -- src/lib/stores/__tests__/trading-store.test.ts

# Phase 2B: UI Stores
npm test -- src/lib/stores/__tests__/chat-store.test.ts
npm test -- src/lib/stores/__tests__/ui-store.test.ts
npm test -- src/lib/stores/__tests__/alerts-store.test.ts
npm test -- src/lib/stores/__tests__/calendar-store.test.ts
npm test -- src/lib/stores/__tests__/news-store.test.ts
npm test -- src/lib/stores/__tests__/prediction-markets-store.test.ts
```

### Run with coverage
```bash
npm run test:coverage -- src/lib/stores/__tests__/
```

### Run in watch mode
```bash
npm test -- src/lib/stores/__tests__/ --watch
```

---

## Test Statistics

### Phase 2A: Trading Stores
| Store | Test File | Test Count | Lines of Code |
|-------|-----------|------------|---------------|
| Trades | trades-store.test.ts | 50+ | ~640 |
| Positions | positions-store.test.ts | 45+ | ~620 |
| Trading | trading-store.test.ts | 55+ | ~650 |
| **Phase 2A Total** | **3 files** | **150+** | **~1,910** |

### Phase 2B: UI Stores
| Store | Test File | Test Count | Lines of Code |
|-------|-----------|------------|---------------|
| Chat | chat-store.test.ts | 44 | ~640 |
| UI | ui-store.test.ts | 54 | ~550 |
| Alerts | alerts-store.test.ts | 32 | ~470 |
| Calendar | calendar-store.test.ts | 24 | ~430 |
| News | news-store.test.ts | 43 | ~650 |
| Prediction Markets | prediction-markets-store.test.ts | 52 | ~710 |
| **Phase 2B Total** | **6 files** | **249** | **~3,450** |

### Existing Tests
| Store | Test File | Test Count | Lines of Code |
|-------|-----------|------------|---------------|
| Watchlist | watchlist-store.test.ts | 35+ | ~375 |
| Market Data | market-data-store.test.ts | 30+ | ~350 |

---

### Grand Total
| Category | Files | Tests | Lines of Code |
|----------|-------|-------|---------------|
| Phase 2A (Trading) | 3 | 150+ | ~1,910 |
| Phase 2B (UI) | 6 | 249 | ~3,450 |
| Existing | 2 | 65+ | ~725 |
| **TOTAL** | **11** | **464+** | **~6,085** |

---

## Testing Patterns Used

### 1. Store Reset Pattern
```typescript
beforeEach(() => {
  act(() => {
    useStore.setState({ /* initial state */ });
  });
});
```

### 2. Action Testing Pattern
```typescript
act(() => {
  const result = store.getState().someAction(params);
});

expect(store.getState().someProperty).toBe(expected);
```

### 3. Selector Testing Pattern
```typescript
const state = useStore.getState();
const result = someSelector(state, params);
expect(result).toBeDefined();
```

### 4. Isolation Testing
```typescript
// Verify action only affects target, not others
act(() => {
  updateItem(item1Id, updates);
});

expect(getItem(item1Id)).toMatchObject(updates);
expect(getItem(item2Id)).toEqual(originalItem2); // Unchanged
```

---

## Coverage Goals

Each test file aims for:
- ✅ 100% function coverage (all actions/selectors tested)
- ✅ 95%+ line coverage
- ✅ Edge cases covered (empty state, non-existent IDs, duplicates)
- ✅ Error handling verified
- ✅ Complex scenarios tested
- ✅ Persistence configuration verified

---

## Key Features Tested

### Trades Store
- Trade journal entry management
- CRUD operations
- Symbol-based filtering
- Timestamp management
- Optional metadata (tags, notes, pnl)

### Positions Store
- Position tracking (long/short)
- Real-time P&L calculations
- Price updates
- Portfolio-level aggregations
- Multiple positions per symbol

### Trading Store
- Chart configuration
- Symbol overlays (max 4)
- Technical indicators (5 types)
- Indicator customization (params, colors)
- Panel visibility management

---

## Next Steps

After running tests, verify:
1. All tests pass with `npm run test:run`
2. Coverage meets thresholds with `npm run test:coverage`
3. No console errors or warnings
4. Integration with actual store implementations

---

## File Locations

```
web/src/lib/stores/
├── trades-store.ts                    (Source)
├── positions-store.ts                 (Source)
├── trading-store.ts                   (Source)
├── chat-store.ts                      (Source)
├── ui-store.ts                        (Source)
├── alerts-store.ts                    (Source)
├── calendar-store.ts                  (Source)
├── news-store.ts                      (Source)
├── prediction-markets-store.ts        (Source)
├── watchlist-store.ts                 (Source)
├── market-data-store.ts               (Source)
└── __tests__/
    ├── trades-store.test.ts                ✅ Phase 2A
    ├── positions-store.test.ts             ✅ Phase 2A
    ├── trading-store.test.ts               ✅ Phase 2A
    ├── chat-store.test.ts                  ✅ Phase 2B
    ├── ui-store.test.ts                    ✅ Phase 2B
    ├── alerts-store.test.ts                ✅ Phase 2B
    ├── calendar-store.test.ts              ✅ Phase 2B
    ├── news-store.test.ts                  ✅ Phase 2B
    ├── prediction-markets-store.test.ts    ✅ Phase 2B
    ├── watchlist-store.test.ts             ✅ Existing
    ├── market-data-store.test.ts           ✅ Existing
    └── README.md                           ✅ This file
```

---

## Notes

- All tests use Vitest and React Testing Library
- Tests follow Zustand best practices with `act()` wrapper
- Store persistence is configured but not explicitly tested (implementation detail)
- Tests verify immutability where appropriate
- Complex P&L calculations are thoroughly tested with multiple scenarios
