# DeepStack Hooks Test Suite

## Overview
Comprehensive unit tests for React hooks used throughout the DeepStack application.

## Test Files

### Data Fetching Hooks (Phase 3A)
- **useHistoricalBars.test.ts** - Market data OHLCV bars fetching
- **usePredictionMarkets.test.ts** - Prediction markets API integration
- **useMarketStatus.test.ts** - Market hours and trading sessions

### Utility Hooks
- **useKeyboardShortcuts.test.ts** - Keyboard shortcut handling
- **useIsMobile.test.ts** - Mobile device detection
- **useNetworkStatus.test.ts** - Network connectivity monitoring
- **useHaptics.test.ts** - Haptic feedback (mobile)

### Authentication Hooks
- **useSession.test.ts** - User session management
- **useRequireAuth.test.ts** - Protected route authentication

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Hook Tests Only
```bash
npm test -- src/hooks/__tests__
```

### Run Specific Hook Test
```bash
npm test -- src/hooks/__tests__/useHistoricalBars.test.ts
```

### Watch Mode (for development)
```bash
npm test -- src/hooks/__tests__ --watch
```

### Coverage Report
```bash
npm test -- src/hooks/__tests__ --coverage
```

## Test Patterns

### React Hook Testing
```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches data', async () => {
    const { result } = renderHook(() => useMyHook());

    await act(async () => {
      await result.current.fetchData();
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### Zustand Store Mocking
```typescript
beforeEach(() => {
  // Reset store to initial state
  useMyStore.getState().reset();

  // Set specific state for test
  useMyStore.setState({
    items: [],
    isLoading: false,
  });
});
```

### API Mocking (Module-level)
```typescript
import * as api from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  fetchData: vi.fn(),
  postData: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(api.fetchData).mockResolvedValue({
    data: [...],
  });
});
```

### Fetch API Mocking
```typescript
global.fetch = vi.fn();

beforeEach(() => {
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({ data: [...] }),
  });
});
```

### Timer/Interval Testing
```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('auto-refreshes every minute', () => {
  renderHook(() => useMyHook({ refreshInterval: 60000 }));

  act(() => {
    vi.advanceTimersByTime(60000);
  });

  expect(mockFetch).toHaveBeenCalledTimes(2); // initial + refresh
});
```

## Best Practices

### 1. Test Independence
Each test should be completely independent:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  useStore.getState().reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### 2. Clear Test Names
Use descriptive names that explain the behavior:
```typescript
// Good
it('fetches bars with correct timeframe parameter', async () => { ... });

// Less clear
it('test fetch', () => { ... });
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('updates state when data is loaded', async () => {
  // Arrange
  const mockData = { bars: [...] };
  mockFetch.mockResolvedValue(mockData);

  // Act
  const { result } = renderHook(() => useHistoricalBars());
  await act(async () => {
    await result.current.fetchBars('SPY');
  });

  // Assert
  expect(result.current.bars).toEqual(mockData.bars);
});
```

### 4. Test Both Success and Error Paths
```typescript
it('handles successful fetch', async () => {
  mockFetch.mockResolvedValue({ data: [...] });
  // ... test success path
});

it('handles fetch error', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'));
  // ... test error handling
});
```

### 5. Verify Loading States
```typescript
it('sets loading state correctly', async () => {
  const { result } = renderHook(() => useMyHook());

  // Should start not loading
  expect(result.current.isLoading).toBe(false);

  // Should be loading during fetch
  act(() => {
    result.current.fetch();
  });
  expect(result.current.isLoading).toBe(true);

  // Should not be loading after fetch
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
});
```

## Common Gotchas

### 1. Async State Updates
Always wrap async operations in `act()` and use `waitFor()`:
```typescript
// Wrong
await result.current.fetchData();

// Correct
await act(async () => {
  await result.current.fetchData();
});

await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

### 2. Store Cleanup
Always reset stores between tests:
```typescript
beforeEach(() => {
  useMarketDataStore.getState().reset();
});
```

### 3. Mock Cleanup
Clear mocks to prevent test pollution:
```typescript
beforeEach(() => {
  vi.clearAllMocks(); // Clear call history
});

afterEach(() => {
  vi.restoreAllMocks(); // Restore original implementations
});
```

### 4. React Query Wrappers
If using React Query, provide a wrapper:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const { result } = renderHook(
  () => useMyHook(),
  { wrapper: createWrapper() }
);
```

## Coverage Goals

### Minimum Coverage Targets
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### What to Cover
1. Happy path (normal usage)
2. Error handling (network, validation, etc.)
3. Edge cases (empty data, null values, etc.)
4. Loading states
5. State transitions
6. User interactions
7. Cleanup (unmount, intervals)

### What NOT to Cover
- Third-party library internals
- Browser APIs (unless custom wrapper)
- Type definitions (TypeScript handles this)

## Debugging Tests

### View Test Output
```bash
npm test -- src/hooks/__tests__/useMyHook.test.ts --reporter=verbose
```

### Debug Single Test
```typescript
it.only('specific test to debug', () => {
  // Only this test will run
});
```

### Console Logging in Tests
```typescript
it('debugs state changes', () => {
  const { result } = renderHook(() => useMyHook());

  console.log('Initial:', result.current);

  act(() => {
    result.current.updateData();
  });

  console.log('After update:', result.current);
});
```

## Resources

### Documentation
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing React Hooks](https://react-hooks-testing-library.com/)

### Internal Docs
- [TEST_SUMMARY.md](./TEST_SUMMARY.md) - Detailed test documentation
- [Phase 3A Report](/Users/eddiebelaval/Development/deepstack/PHASE_3A_COMPLETE.md)

## Contributing

### Adding New Tests
1. Create `src/hooks/__tests__/useMyHook.test.ts`
2. Follow existing patterns (see examples above)
3. Include both success and error cases
4. Test loading states
5. Document complex test setups
6. Run tests locally before committing

### Test Review Checklist
- [ ] Tests are independent
- [ ] Clear descriptive names
- [ ] Proper cleanup (beforeEach/afterEach)
- [ ] Async operations use act/waitFor
- [ ] Both success and error paths tested
- [ ] Loading states verified
- [ ] Mocks are properly typed
- [ ] No flaky tests (run multiple times)

---

**Total Tests:** 50+
**Last Updated:** Phase 3A
**Status:** Active Development
