# Data Fetching Hooks Test Suite - Phase 3A

## Overview
Comprehensive unit tests for React data fetching hooks in DeepStack.

## Test Files Created

### 1. useHistoricalBars.test.ts (16 tests)
**Location:** `/Users/eddiebelaval/Development/deepstack/web/src/hooks/__tests__/useHistoricalBars.test.ts`

**Coverage:**
- Initial state validation
- Auto-fetch on mount with active symbol
- Auto-fetch disabled when `autoFetch: false`
- Correct API parameters (symbol, timeframe, limit)
- Data transformation (backend format to OHLCVBar)
- Sorting bars by time ascending
- HTTP error handling
- Network error handling
- Store timeframe preference
- Symbol change triggers refetch
- Timeframe change triggers refetch
- Loading state management
- Empty symbol handling
- Duplicate fetch prevention (when bars exist)

**Mocks:**
- `global.fetch` for API calls
- `useMarketDataStore` for state management
- `useTradingStore` for active symbol/timeframe

**Key Test Patterns:**
```typescript
// Store reset in beforeEach
useMarketDataStore.getState().reset();
useTradingStore.setState({ activeSymbol: 'SPY', timeframe: '1d' });

// Mock fetch response
(global.fetch as any).mockResolvedValue({
  ok: true,
  json: async () => ({ bars: [...] })
});

// Test refetch on state change
act(() => {
  useTradingStore.setState({ activeSymbol: 'AAPL' });
});
```

---

### 2. useMarketStatus.test.ts (16 tests)
**Location:** `/Users/eddiebelaval/Development/deepstack/web/src/hooks/__tests__/useMarketStatus.test.ts`

**Coverage:**
- Initial state validation
- Valid session types (regular, premarket, afterhours, closed)
- Type safety (boolean, string)
- Manual refresh functionality
- Auto-refresh at custom interval
- Default 60-second refresh interval
- Cleanup on unmount
- Time calculation for open market
- Time calculation for closed market
- Null time when no next event
- Market transition (open -> closed)
- Premarket session handling
- Afterhours session handling
- Initial mount refresh
- `useIsMarketOpen` boolean return
- Market status change detection

**Mocks:**
- `@/lib/market-hours` module (getMarketStatus, formatTimeUntil)
- Fake timers for interval testing

**Key Test Patterns:**
```typescript
// Use fake timers for intervals
vi.useFakeTimers();

// Mock market hours module
vi.mocked(marketHours.getMarketStatus).mockReturnValue({
  isOpen: true,
  session: 'regular',
  message: 'Market is open',
  nextClose: new Date('2024-01-01T16:00:00Z'),
});

// Test interval triggers
act(() => {
  vi.advanceTimersByTime(60000);
});
```

---

### 3. usePredictionMarkets.test.ts (20 tests)
**Location:** `/Users/eddiebelaval/Development/deepstack/web/src/hooks/__tests__/usePredictionMarkets.test.ts`

**Coverage:**
- Initial state validation
- Load trending markets successfully
- Load new markets successfully
- Apply filters (category, source)
- Loading error handling
- Search by query
- Empty search triggers loadMarkets
- Search error handling
- Load market detail
- Market detail error handling
- Add market to watchlist
- Remove market from watchlist
- Check watchlist membership
- Update filters
- Unavailable flag handling
- Feed type switching (trending/new)
- Loading state during API calls
- Error clearing on success
- Watchlist item updates

**Mocks:**
- `@/lib/api/prediction-markets` module
- `usePredictionMarketsStore` for state

**Key Test Patterns:**
```typescript
// Mock API module
vi.mock('@/lib/api/prediction-markets', () => ({
  fetchTrendingMarkets: vi.fn(),
  fetchNewMarkets: vi.fn(),
  searchMarkets: vi.fn(),
  fetchMarketDetail: vi.fn(),
}));

// Mock market data
const mockMarket: PredictionMarket = {
  id: 'mock-market-1',
  platform: 'polymarket',
  title: 'Will Bitcoin reach $100k?',
  // ... complete type-safe market object
};

// Test async actions
await act(async () => {
  await result.current.loadMarkets('trending');
});
```

---

## Test Statistics

| Hook | Tests | Coverage Areas |
|------|-------|----------------|
| useHistoricalBars | 16 | Fetching, Transformation, State, Errors |
| useMarketStatus | 16 | Status, Timing, Sessions, Refresh |
| usePredictionMarkets | 20 | CRUD, Search, Watchlist, Filters |
| **Total** | **52** | **Complete data fetching coverage** |

---

## Running Tests

### Run all hook tests
```bash
npm test -- src/hooks/__tests__
```

### Run specific hook test
```bash
npm test -- src/hooks/__tests__/useHistoricalBars.test.ts
npm test -- src/hooks/__tests__/useMarketStatus.test.ts
npm test -- src/hooks/__tests__/usePredictionMarkets.test.ts
```

### Run with coverage
```bash
npm test -- src/hooks/__tests__ --coverage
```

### Watch mode
```bash
npm test -- src/hooks/__tests__ --watch
```

---

## Test Architecture

### Store Mocking Pattern
All Zustand stores are reset in `beforeEach`:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  useMarketDataStore.getState().reset();
  useTradingStore.setState({ /* initial state */ });
});
```

### API Mocking Pattern
Module-level mocking for API clients:
```typescript
vi.mock('@/lib/api/prediction-markets', () => ({
  fetchTrendingMarkets: vi.fn(),
  // ... other functions
}));
```

### Async Testing Pattern
Using `act()` and `waitFor()` for async operations:
```typescript
await act(async () => {
  await result.current.fetchBars('SPY');
});

await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

---

## Dependencies

### Test Utilities
- `vitest` - Test runner
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - DOM matchers
- `happy-dom` - DOM environment

### Mocking Strategy
- **Stores:** Direct Zustand store manipulation
- **APIs:** Module-level vi.mock()
- **Browser APIs:** Global mocks (fetch, timers)
- **Time:** vi.useFakeTimers() for intervals

---

## Next Steps

### Additional Hooks to Test (Phase 3B)
- `useInsightsData.ts` - Complex calculations hook
- `usePortfolio.ts` - Portfolio management hook
- `useJournalSync.ts` - Sync hook
- `useThesisSync.ts` - Sync hook
- `useTradesSync.ts` - Sync hook

### Integration Tests
Consider adding integration tests for:
- Hook + Component interactions
- Multiple hooks working together
- Real API integration (optional)

### Performance Tests
- Large dataset handling
- Memo/callback stability
- Re-render optimization

---

## Notes

### Why These Tests Matter
1. **Confidence** - Safe refactoring without breaking functionality
2. **Documentation** - Tests show how hooks should be used
3. **Regression Prevention** - Catch bugs before production
4. **Type Safety** - Verify TypeScript types work correctly

### Test Quality Guidelines
- Each test should be independent
- Clear test names describing behavior
- Proper cleanup in afterEach
- Mock only external dependencies
- Test both success and error paths
- Verify loading states

---

**Phase 3A Complete:** 52 comprehensive unit tests covering all primary data fetching hooks.
