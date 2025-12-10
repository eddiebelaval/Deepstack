# Trading Components Unit Tests

## Overview

Comprehensive unit tests for trading components using Vitest and React Testing Library.

## Test Coverage

### Components Tested

1. **OrderPanel** (`OrderPanel.test.tsx`)
   - Order form rendering and validation
   - Buy/Sell order placement
   - Order type selection (Market, Limit, Stop)
   - Quantity selection with slider
   - Price calculations
   - Emotional Firewall integration
   - Loading states
   - Error handling

2. **PositionCard** (`PositionCard.test.tsx`)
   - Position display (symbol, quantity, prices)
   - P&L calculations (realized and unrealized)
   - Long/Short position indicators
   - Trade history display
   - Position expansion/collapse
   - Close position functionality
   - Symbol selection

3. **WatchlistPanel** (`WatchlistPanel.test.tsx`)
   - Watchlist rendering
   - Symbol display with live quotes
   - Multiple watchlist management
   - Symbol search and add
   - Symbol notes
   - Online/offline status
   - Drag-and-drop ordering
   - Context menu actions
   - Significant price movement indicators

4. **PositionsPanel** (`PositionsPanel.test.tsx`)
   - Portfolio summary calculations
   - Position list rendering
   - P&L aggregation (long and short)
   - Empty state handling
   - Add position flow
   - Position card interactions
   - Value formatting

## Test Results

Current Status: **85/118 tests passing** (72% pass rate)

### Passing Tests
- Basic component rendering
- P&L calculations
- Position display logic
- Watchlist management
- Empty states
- Symbol selection
- Loading states

### Known Issues

1. **Radix UI Select Interaction** (14 tests)
   - Issue: `hasPointerCapture` function not available in test environment
   - Affects: Order type selection tests in OrderPanel
   - Workaround: Added pointer event mocks in setup.ts
   - Status: Partially resolved, some timeout issues remain

2. **Text Formatting** (2 tests)
   - Issue: Number formatting with commas
   - Example: Expected `-$1000.00`, got `-$1,000.00`
   - Status: Fixed in most tests

3. **Test Timeouts** (17 tests)
   - Issue: Some async operations timing out at 1s
   - Likely cause: Radix UI portal rendering issues
   - Status: Under investigation

## Running Tests

```bash
# Run all trading component tests
npm run test:run -- src/components/trading/__tests__/

# Run specific test file
npm run test:run -- src/components/trading/__tests__/OrderPanel.test.tsx

# Run with coverage
npm run test:coverage -- src/components/trading/

# Run in watch mode
npm run test -- src/components/trading/__tests__/
```

## Test Patterns Used

### 1. Component Rendering
```typescript
it('renders component with correct data', () => {
  render(<Component data={mockData} />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### 2. User Interactions
```typescript
it('handles user click', async () => {
  const user = userEvent.setup();
  render(<Component onAction={mockFn} />);

  await user.click(screen.getByRole('button', { name: /action/i }));
  expect(mockFn).toHaveBeenCalled();
});
```

### 3. Async Operations
```typescript
it('loads data asynchronously', async () => {
  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

### 4. Mock Setup
```typescript
beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useStore).mockReturnValue({
    data: mockData,
    action: mockAction,
  } as any);
});
```

## Mocked Dependencies

- `@/lib/stores/trading-store` - Trading state management
- `@/lib/stores/market-data-store` - Live market quotes
- `@/lib/stores/positions-store` - Position management
- `@/hooks/usePortfolio` - Portfolio operations
- `@/hooks/useUser` - User authentication and tier
- `@/hooks/useWatchlistSync` - Watchlist synchronization
- `sonner` - Toast notifications
- `fetch` - API calls (emotional firewall)

## Future Improvements

1. **Fix Radix UI Interactions**
   - Investigate portal rendering in tests
   - Consider using Radix Testing Library utilities
   - Add better event mocking

2. **Increase Coverage**
   - Add edge case tests
   - Test error boundaries
   - Add accessibility tests
   - Test keyboard navigation

3. **Performance Tests**
   - Test large watchlists
   - Test many positions
   - Test rapid updates

4. **Integration Tests**
   - Component interaction flows
   - Full trade placement flow
   - Watchlist to order flow

## Maintenance Notes

- Tests use `happy-dom` for fast DOM simulation
- Pointer event mocks required for Radix UI components
- Number formatting varies by locale - use flexible matchers
- Async tests need proper `waitFor` usage
- Clean up mocks in `afterEach` hooks

## Related Documentation

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](../../../__tests__/README.md)
