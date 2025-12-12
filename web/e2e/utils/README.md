# E2E Test Utilities

This directory contains shared utilities, fixtures, and helpers for E2E testing with Playwright.

## Overview

The utilities are organized into four main modules:

1. **test.fixture.ts** - Extended Playwright test with custom fixtures and page objects
2. **test-data.ts** - Mock data generators for users, markets, portfolios, and more
3. **api-mocks.ts** - API mocking helpers for intercepting and simulating API responses
4. **assertions.ts** - Custom assertion helpers for common test scenarios

## Quick Start

### Using Custom Fixtures

Import the extended test and expect from the fixture:

```typescript
import { test, expect } from '../fixtures/test.fixture';

test('example test', async ({ page, appPage, mockApi }) => {
  // Use page objects
  await appPage.goto();
  await appPage.dismissModals();
  await appPage.expectWelcomeHeading();

  // Use mock API
  await mockApi.mockMarketData('SPY');
  await mockApi.mockAccountData();
});
```

## Fixtures

### Available Fixtures

All fixtures are automatically available in your test functions:

#### `landingPage`

Page object for the landing page:

```typescript
test('landing page test', async ({ landingPage }) => {
  await landingPage.goto();
  await landingPage.expectHeroVisible();
  await landingPage.clickGetStarted();
});
```

#### `appPage`

Page object for the main app page:

```typescript
test('app page test', async ({ appPage }) => {
  await appPage.goto();
  await appPage.dismissModals();
  await appPage.expectWelcomeHeading();
  await appPage.typeInChat('Tell me about AAPL');
  await appPage.submitChat();
});
```

#### `loginPage`

Page object for login functionality:

```typescript
test('login test', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.fillEmail('test@example.com');
  await loginPage.fillPassword('password123');
  await loginPage.submit();
});
```

#### `dashboardPage`

Page object for the dashboard:

```typescript
test('dashboard test', async ({ dashboardPage }) => {
  await dashboardPage.goto();
  await dashboardPage.expectPortfolioValue();
  await dashboardPage.clickRefresh();
});
```

#### `mockApi`

Mock API helper for intercepting requests:

```typescript
test('api mock test', async ({ page, mockApi }) => {
  await mockApi.mockMarketData('SPY', { price: 500, change: 10 });
  await mockApi.mockAccountData({ portfolio_value: 100000 });
  await page.goto('/app');
});
```

## Test Data

### Using Mock Data

```typescript
import {
  mockUsers,
  mockMarketData,
  mockPortfolioData,
  generateTestEmail,
  generateTestUser,
  generateMarketBars,
  generateWatchlist
} from '../utils/test-data';

test('with mock data', async ({ page }) => {
  // Use predefined mock data
  const user = mockUsers.validUser;
  const spyData = mockMarketData.SPY;
  const portfolio = mockPortfolioData.default;

  // Generate dynamic test data
  const email = generateTestEmail('test');
  const user = generateTestUser({ name: 'Custom User' });
  const bars = generateMarketBars('SPY', 100, '1D');
});
```

### Available Mock Data

- **mockUsers** - Valid, invalid, and new user credentials
- **mockMarketData** - Price data for SPY, QQQ, AAPL, MSFT, TSLA
- **mockPortfolioData** - Various portfolio scenarios (default, large, small, negative)
- **mockTradeOrders** - Buy, sell, limit, and stop loss orders
- **mockChatResponses** - AI chat responses for different scenarios
- **mockApiResponses** - Standard API response templates

### Data Generators

- `generateTestEmail(prefix)` - Unique email addresses
- `generateTestUser(overrides)` - User objects with custom fields
- `generateMarketBars(symbol, count, timeframe)` - Chart data
- `generateWatchlist(symbols)` - Watchlist with market data
- `generatePositions(symbols)` - Portfolio positions
- `generateOrderHistory(count)` - Order history records

## API Mocking

### Quick Mock Functions

```typescript
import {
  mockMarketData,
  mockAccountData,
  mockChatResponse,
  simulateNetworkError,
  simulateSlowNetwork
} from '../utils/api-mocks';

test('mocking apis', async ({ page }) => {
  // Mock successful responses
  await mockMarketData(page, 'SPY');
  await mockAccountData(page, { portfolio_value: 50000 });
  await mockChatResponse(page, 'stockAnalysis');

  // Simulate errors
  await simulateNetworkError(page, '**/api/account**');
  await simulateSlowNetwork(page, 2000, '**/api/market/**');
});
```

### Error Simulation

```typescript
import {
  simulateServerError,
  simulate404Error,
  simulate401Error,
  simulate503Error,
  simulateMalformedResponse,
  simulateTimeout
} from '../utils/api-mocks';

test('error handling', async ({ page }) => {
  // HTTP error codes
  await simulate404Error(page, '**/api/nonexistent**');
  await simulate401Error(page, '**/api/account**');
  await simulate503Error(page, '**/api/**');

  // Network issues
  await simulateTimeout(page, '**/api/slow**');
  await simulateMalformedResponse(page, '**/api/broken**');
});
```

### Advanced Mocking

```typescript
import {
  mockRetryableFailure,
  mockIntermittentFailure,
  mockWithRequestCounter
} from '../utils/api-mocks';

test('advanced mocking', async ({ page }) => {
  // Fail twice, then succeed
  const retry = await mockRetryableFailure(page, '**/api/market/**', 2);

  // 30% random failure rate
  await mockIntermittentFailure(page, '**/api/**', 0.3);

  // Count requests
  const counter = await mockWithRequestCounter(page, '**/api/market/**');
  // Later: counter.getCount()
});
```

## Custom Assertions

### Toast Messages

```typescript
import { expectToastMessage, expectToastDisappeared } from '../utils/assertions';

test('toast assertions', async ({ page }) => {
  // Expect specific toast
  await expectToastMessage(page, 'Success!', { type: 'success' });

  // Wait for toast to disappear
  await expectToastDisappeared(page);
});
```

### Loading States

```typescript
import { expectLoadingState, expectLoadingComplete } from '../utils/assertions';

test('loading assertions', async ({ page }) => {
  // Expect loading indicator
  await expectLoadingState(page);

  // Wait for loading to complete
  await expectLoadingComplete(page);
});
```

### Error States

```typescript
import { expectErrorState, expectNoErrorState } from '../utils/assertions';

test('error assertions', async ({ page }) => {
  // Expect error message
  await expectErrorState(page, 'Failed to load data');

  // Verify no errors
  await expectNoErrorState(page);
});
```

### Market Data

```typescript
import {
  expectMarketDataVisible,
  expectTickerPrice,
  expectPriceChangeIndicator,
  expectChartVisible
} from '../utils/assertions';

test('market data assertions', async ({ page }) => {
  // Verify tickers are visible
  await expectMarketDataVisible(page, ['SPY', 'QQQ']);

  // Check specific price
  await expectTickerPrice(page, 'SPY', 458.32, 0.01);

  // Verify price indicators
  await expectPriceChangeIndicator(page, 'positive');

  // Check chart is rendered
  await expectChartVisible(page);
});
```

### Navigation

```typescript
import { expectUrlMatch, expectOnPage } from '../utils/assertions';

test('navigation assertions', async ({ page }) => {
  // Check URL pattern
  await expectUrlMatch(page, /\/dashboard/);

  // Verify on specific page
  await expectOnPage(page, 'dashboard');
});
```

### Forms

```typescript
import {
  expectFieldError,
  expectButtonDisabled,
  expectButtonEnabled
} from '../utils/assertions';

test('form assertions', async ({ page }) => {
  // Field validation error
  await expectFieldError(page, 'Email', 'Invalid email format');

  // Button states
  await expectButtonDisabled(page, 'Submit');
  await expectButtonEnabled(page, 'Cancel');
});
```

### Portfolio

```typescript
import {
  expectPortfolioValue,
  expectAccountMetric
} from '../utils/assertions';

test('portfolio assertions', async ({ page }) => {
  // Check portfolio value
  await expectPortfolioValue(page, 125450.32);

  // Check account metrics
  await expectAccountMetric(page, 'Cash', '$45,230.15');
  await expectAccountMetric(page, 'Buying Power', '$90,460.30');
});
```

### Modals

```typescript
import { expectModalVisible, expectModalClosed } from '../utils/assertions';

test('modal assertions', async ({ page }) => {
  // Modal is open
  await expectModalVisible(page, 'Confirm Trade');

  // Modal is closed
  await expectModalClosed(page);
});
```

## Complete Example

Here's a comprehensive example using all utilities:

```typescript
import { test, expect } from '../fixtures/test.fixture';
import { mockMarketData, mockAccountData, simulateSlowNetwork } from '../utils/api-mocks';
import { mockPortfolioData, generateMarketBars } from '../utils/test-data';
import {
  expectLoadingState,
  expectLoadingComplete,
  expectMarketDataVisible,
  expectTickerPrice,
  expectPortfolioValue
} from '../utils/assertions';

test.describe('Dashboard Data Loading', () => {
  test('should load and display market data', async ({ page, appPage, dashboardPage, mockApi }) => {
    // Setup mock data
    await mockMarketData(page, 'SPY', { price: 458.32, change: 2.45 });
    await mockAccountData(page, mockPortfolioData.largePortfolio);
    await mockApi.mockMarketBars('SPY', generateMarketBars('SPY', 100, '1D'));

    // Navigate to app
    await appPage.goto();
    await appPage.dismissModals();

    // Go to dashboard
    await dashboardPage.navigateFromApp();

    // Verify loading states
    await expectLoadingState(page);
    await expectLoadingComplete(page);

    // Verify market data
    await expectMarketDataVisible(page, ['SPY']);
    await expectTickerPrice(page, 'SPY', 458.32, 0.01);

    // Verify account data
    await expectPortfolioValue(page, 1250000.00);
  });

  test('should handle slow network gracefully', async ({ page, dashboardPage }) => {
    // Simulate slow network
    await simulateSlowNetwork(page, 2000);

    await dashboardPage.goto();

    // Should show loading state
    await expectLoadingState(page);

    // Eventually loads
    await expectLoadingComplete(page, 15000);
  });
});
```

## Best Practices

1. **Use fixtures over raw page** - Page objects provide better abstraction
2. **Mock at the right level** - Use `mockApi` fixture for simple mocks, import functions for complex scenarios
3. **Generate test data** - Use generators instead of hardcoded values for unique data
4. **Chain assertions** - Custom assertions handle timeout and fallback logic
5. **Clean up mocks** - The `mockApi` fixture automatically cleans up after each test
6. **Handle modals** - Always use `appPage.dismissModals()` after navigating to `/app`

## TypeScript Support

All utilities are fully typed. Your IDE will provide:
- Autocomplete for all fixtures, functions, and data
- Type checking for parameters
- JSDoc documentation on hover

## Contributing

When adding new utilities:

1. Add them to the appropriate file (fixture, test-data, api-mocks, or assertions)
2. Export the function/class
3. Add JSDoc comments
4. Update this README with usage examples
5. Ensure TypeScript types are correct
