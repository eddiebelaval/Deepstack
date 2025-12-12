# E2E Testing Utilities - Quick Reference

## Import Pattern

```typescript
// Extended test with fixtures
import { test, expect } from '../fixtures/test.fixture';

// Utilities (choose what you need)
import {
  mockMarketData,
  mockAccountData,
  simulateNetworkError,
  expectLoadingComplete,
  expectMarketDataVisible,
  generateTestEmail,
  mockPortfolioData
} from '../utils';
```

## Page Objects Quick Reference

```typescript
test('example', async ({ landingPage, appPage, loginPage, dashboardPage, mockApi }) => {
  // Landing Page
  await landingPage.goto();
  await landingPage.expectHeroVisible();
  await landingPage.clickGetStarted();

  // App Page
  await appPage.goto();
  await appPage.dismissModals(); // From BasePage
  await appPage.expectWelcomeHeading();
  await appPage.typeInChat('Tell me about AAPL');
  await appPage.submitChat();

  // Login Page
  await loginPage.goto();
  await loginPage.fillEmail('test@example.com');
  await loginPage.fillPassword('password');
  await loginPage.submit();

  // Dashboard Page
  await dashboardPage.goto();
  await dashboardPage.navigateFromApp();
  await dashboardPage.clickRefresh();
  await dashboardPage.expectPortfolioValue();

  // Mock API (fixture)
  await mockApi.mockMarketData('SPY', { price: 500 });
  await mockApi.mockAccountData({ portfolio_value: 100000 });
  await mockApi.mockApiError('**/api/**', 500);
  await mockApi.clearMocks();
});
```

## Mock Data Quick Reference

```typescript
import {
  mockUsers,
  mockMarketData,
  mockPortfolioData,
  generateTestEmail,
  generateMarketBars,
  commonTickers
} from '../utils/test-data';

// Predefined data
const user = mockUsers.validUser; // { email, password, name }
const spy = mockMarketData.SPY; // { symbol, price, change, ... }
const portfolio = mockPortfolioData.default; // { portfolio_value, cash, ... }

// Generators
const email = generateTestEmail(); // unique@deepstack-test.com
const bars = generateMarketBars('SPY', 100, '1D'); // 100 daily bars

// Constants
const etfs = commonTickers.etfs; // ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI']
```

## API Mocking Quick Reference

```typescript
import {
  mockMarketData,
  mockAccountData,
  simulateNetworkError,
  simulateSlowNetwork,
  simulate503Error,
  mockRetryableFailure
} from '../utils/api-mocks';

// Success scenarios
await mockMarketData(page, 'SPY');
await mockAccountData(page, { portfolio_value: 50000 });

// Error scenarios
await simulateNetworkError(page, '**/api/**');
await simulateSlowNetwork(page, 2000); // 2s delay
await simulate503Error(page, '**/api/account**');

// Advanced
await mockRetryableFailure(page, '**/api/**', 2); // Fail 2x, then succeed
```

## Assertions Quick Reference

```typescript
import {
  expectLoadingComplete,
  expectMarketDataVisible,
  expectTickerPrice,
  expectToastMessage,
  expectErrorState,
  expectNoErrorState,
  expectPortfolioValue
} from '../utils/assertions';

// Loading
await expectLoadingComplete(page);

// Market data
await expectMarketDataVisible(page, ['SPY', 'QQQ']);
await expectTickerPrice(page, 'SPY', 458.32, 0.01);

// UI feedback
await expectToastMessage(page, 'Success!', { type: 'success' });
await expectErrorState(page, 'Failed to load');
await expectNoErrorState(page);

// Portfolio
await expectPortfolioValue(page, 125000.00);
```

## Common Test Patterns

### Pattern 1: Basic Navigation Test
```typescript
test('navigate to dashboard', async ({ appPage, dashboardPage }) => {
  await appPage.goto();
  await appPage.dismissModals();
  await dashboardPage.navigateFromApp();
  await dashboardPage.expectPortfolioValue();
});
```

### Pattern 2: Test with Mocked Data
```typescript
test('show market data', async ({ page, appPage, mockApi }) => {
  await mockApi.mockMarketData('SPY', { price: 500, change: 10 });
  await appPage.goto();
  await appPage.dismissModals();
  await expectMarketDataVisible(page, ['SPY']);
});
```

### Pattern 3: Error Handling Test
```typescript
test('handle API error', async ({ page, appPage }) => {
  await appPage.goto();
  await appPage.dismissModals();

  await simulateNetworkError(page, '**/api/**');
  await page.reload();

  await expectErrorState(page);
});
```

### Pattern 4: Full Integration Test
```typescript
test('complete user flow', async ({ page, appPage, dashboardPage, mockApi }) => {
  // Setup
  await mockApi.mockMarketData('SPY');
  await mockApi.mockAccountData(mockPortfolioData.default);

  // Navigate
  await appPage.goto();
  await appPage.dismissModals();
  await expectLoadingComplete(page);

  // Interact
  await dashboardPage.navigateFromApp();
  await dashboardPage.clickRefresh();

  // Verify
  await expectMarketDataVisible(page, ['SPY']);
  await expectPortfolioValue(page);
});
```

## File Locations

- **Fixtures**: `/e2e/fixtures/test.fixture.ts`
- **Test Data**: `/e2e/utils/test-data.ts`
- **API Mocks**: `/e2e/utils/api-mocks.ts`
- **Assertions**: `/e2e/utils/assertions.ts`
- **Index**: `/e2e/utils/index.ts`
- **Documentation**: `/e2e/utils/README.md`
- **Example**: `/e2e/example-with-utilities.spec.ts`

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e -- example-with-utilities.spec.ts

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed
```

## Tips

1. Always use `dismissModals()` after navigating to `/app`
2. Use `mockApi` fixture for simple mocks, import functions for complex scenarios
3. Generate unique emails with `generateTestEmail()` instead of hardcoding
4. Custom assertions handle timeouts and fallbacks automatically
5. All page objects have access to `page` via `pageObject` property
6. Extend `BasePage` when creating new page objects

## Need Help?

- See `/e2e/utils/README.md` for detailed documentation
- Check `/e2e/example-with-utilities.spec.ts` for working examples
- All utilities are fully TypeScript typed with JSDoc comments
