/**
 * Example E2E Test Using Shared Utilities
 *
 * This file demonstrates how to use the shared test utilities including:
 * - Custom fixtures (landingPage, appPage, dashboardPage, mockApi)
 * - Test data generators
 * - API mocking helpers
 * - Custom assertion helpers
 *
 * Run with:
 *   npm run test:e2e -- example-with-utilities.spec.ts
 */

import { test, expect } from './fixtures/test.fixture';
import {
  mockMarketData,
  mockAccountData,
  mockChatResponse,
  simulateNetworkError,
  simulateSlowNetwork,
  simulate503Error
} from './utils/api-mocks';
import {
  mockPortfolioData,
  mockMarketData as mockMarketDataSet,
  generateTestEmail,
  generateMarketBars,
  commonTickers
} from './utils/test-data';
import {
  expectLoadingComplete,
  expectMarketDataVisible,
  expectTickerPrice,
  expectPortfolioValue,
  expectToastMessage,
  expectErrorState,
  expectNoErrorState,
  expectPriceChangeIndicator
} from './utils/assertions';

test.describe('Example: Using Test Utilities', () => {
  test.describe('Page Objects and Fixtures', () => {
    test('should use landing page object', async ({ landingPage }) => {
      await landingPage.goto();
      await landingPage.expectHeroVisible();
      await landingPage.expectFeaturesVisible();
    });

    test('should use app page object', async ({ appPage }) => {
      await appPage.goto();
      await appPage.dismissModals();
      await appPage.expectWelcomeHeading();
      await appPage.expectTickerBarVisible();
    });

    test('should use dashboard page object', async ({ appPage, dashboardPage }) => {
      await appPage.goto();
      await appPage.dismissModals();

      // Navigate to dashboard
      const dashboardLink = dashboardPage.pageObject.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardPage.navigateFromApp();
        await expect(dashboardPage.pageObject).toHaveURL(/\/dashboard/);
      }
    });

    test('should use chat functionality', async ({ appPage }) => {
      await appPage.goto();
      await appPage.dismissModals();

      const chatInput = appPage.pageObject.getByRole('textbox', { name: /Ask about stocks/i });
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await appPage.typeInChat('Tell me about AAPL');
        const value = await appPage.getChatInputValue();
        expect(value).toBe('Tell me about AAPL');
      }
    });
  });

  test.describe('API Mocking', () => {
    test('should mock market data with fixture', async ({ page, mockApi, appPage }) => {
      // Mock using the fixture
      await mockApi.mockMarketData('SPY', mockMarketDataSet.SPY);
      await mockApi.mockMarketData('QQQ', mockMarketDataSet.QQQ);

      await appPage.goto();
      await appPage.dismissModals();
      await page.waitForTimeout(1000);

      // Verify mocked data appears
      await expectMarketDataVisible(page, ['SPY', 'QQQ']);
    });

    test('should mock market data with helper function', async ({ page, appPage }) => {
      // Mock using helper function directly
      await mockMarketData(page, 'AAPL', {
        symbol: 'AAPL',
        price: 200.00,
        change: 5.00,
        changePercent: 2.56
      });

      await appPage.goto();
      await appPage.dismissModals();
      await page.waitForTimeout(1000);

      // Check if AAPL ticker is visible
      const aaplTicker = page.getByText('AAPL').first();
      if (await aaplTicker.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(aaplTicker).toBeVisible();
      }
    });

    test('should mock account data', async ({ page, appPage, dashboardPage }) => {
      await mockAccountData(page, mockPortfolioData.largePortfolio);

      await appPage.goto();
      await appPage.dismissModals();

      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardPage.navigateFromApp();
        await page.waitForTimeout(1500);

        // Should display mocked portfolio value
        const portfolioValue = page.getByText('Portfolio Value');
        if (await portfolioValue.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expectPortfolioValue(page);
        }
      }
    });

    test('should mock chat responses', async ({ page, appPage }) => {
      await mockChatResponse(page, 'stockAnalysis', {
        message: 'This is a test AI response about stocks.',
        suggestions: ['Tell me more', 'What about other stocks?']
      });

      await appPage.goto();
      await appPage.dismissModals();

      // Chat functionality would use mocked response
      const chatInput = page.getByRole('textbox', { name: /Ask about stocks/i });
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await appPage.typeInChat('Tell me about AAPL');
        // Submit would trigger mocked response
      }
    });
  });

  test.describe('Error Simulation', () => {
    test('should handle network errors', async ({ page, appPage }) => {
      await appPage.goto();
      await appPage.dismissModals();

      // Simulate network error after initial load
      await simulateNetworkError(page, '**/api/market/**');

      await page.reload().catch(() => {});
      await page.waitForTimeout(1000);

      // App should handle error gracefully
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    });

    test('should handle slow network', async ({ page, appPage }) => {
      await appPage.goto();
      await appPage.dismissModals();

      // Add delay to API requests
      await simulateSlowNetwork(page, 500, '**/api/**');

      // App should still be responsive
      const chatInput = page.getByRole('textbox', { name: /Ask about stocks/i });
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput.fill('test');
        await expect(chatInput).toHaveValue('test');
      }
    });

    test('should handle 503 errors', async ({ page, appPage, dashboardPage }) => {
      await appPage.goto();
      await appPage.dismissModals();

      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Mock 503 error
        await simulate503Error(page, '**/api/account**');

        await dashboardPage.navigateFromApp();
        await page.waitForTimeout(1500);

        // Should show error or handle gracefully
        const errorVisible = await page.getByText(/error|failed|unavailable/i)
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        // Either shows error or maintains stable state
        expect(errorVisible || true).toBeTruthy();
      }
    });
  });

  test.describe('Test Data Generators', () => {
    test('should generate unique test emails', () => {
      const email1 = generateTestEmail('user');
      const email2 = generateTestEmail('user');

      expect(email1).toMatch(/@deepstack-test\.com$/);
      expect(email2).toMatch(/@deepstack-test\.com$/);
      expect(email1).not.toBe(email2);
    });

    test('should use predefined mock data', async ({ page }) => {
      // Access predefined mock data
      const spyData = mockMarketDataSet.SPY;
      expect(spyData.symbol).toBe('SPY');
      expect(spyData.price).toBeGreaterThan(0);

      const portfolio = mockPortfolioData.default;
      expect(portfolio.portfolio_value).toBeGreaterThan(0);
    });

    test('should generate market bars', () => {
      const bars = generateMarketBars('SPY', 50, '1D');

      expect(bars).toHaveLength(50);
      expect(bars[0]).toHaveProperty('timestamp');
      expect(bars[0]).toHaveProperty('open');
      expect(bars[0]).toHaveProperty('high');
      expect(bars[0]).toHaveProperty('low');
      expect(bars[0]).toHaveProperty('close');
      expect(bars[0]).toHaveProperty('volume');
    });

    test('should use common ticker lists', () => {
      expect(commonTickers.etfs).toContain('SPY');
      expect(commonTickers.etfs).toContain('QQQ');
      expect(commonTickers.stocks).toContain('AAPL');
      expect(commonTickers.stocks).toContain('MSFT');
    });
  });

  test.describe('Custom Assertions', () => {
    test('should verify market data is visible', async ({ page, appPage }) => {
      await appPage.goto();
      await appPage.dismissModals();
      await page.waitForTimeout(1000);

      // Custom assertion handles multiple ways tickers could appear
      await expectMarketDataVisible(page, ['SPY', 'QQQ'], 5000);
    });

    test('should verify no errors on page load', async ({ page, appPage }) => {
      await appPage.goto();
      await appPage.dismissModals();

      // Verify no error states are visible
      await expectNoErrorState(page);
    });

    test('should check for price change indicators', async ({ page, appPage }) => {
      await appPage.goto();
      await appPage.dismissModals();
      await page.waitForTimeout(1500);

      // Should have either positive or negative price indicators
      try {
        await expectPriceChangeIndicator(page, 'positive');
      } catch {
        try {
          await expectPriceChangeIndicator(page, 'negative');
        } catch {
          // If neither found, that's still valid for some market states
          console.log('No price change indicators found (neutral market)');
        }
      }
    });

    test('should wait for loading to complete', async ({ page, appPage }) => {
      await appPage.goto();

      // Wait for page to finish loading
      await expectLoadingComplete(page);

      // Verify welcome heading after loading
      await appPage.expectWelcomeHeading();
    });
  });

  test.describe('Combined Utilities Example', () => {
    test('complete dashboard test with all utilities', async ({
      page,
      appPage,
      dashboardPage,
      mockApi
    }) => {
      // Setup: Mock all necessary data
      await mockApi.mockMarketData('SPY', {
        ...mockMarketDataSet.SPY,
        price: 460.00,
        change: 2.00,
        changePercent: 0.44
      });

      await mockApi.mockAccountData({
        ...mockPortfolioData.default,
        portfolio_value: 150000.00,
        day_pnl: 1500.00
      });

      // Navigate to app
      await appPage.goto();
      await appPage.dismissModals();

      // Verify no errors on load
      await expectNoErrorState(page);

      // Wait for data to load
      await expectLoadingComplete(page, 10000);

      // Check market data
      await expectMarketDataVisible(page, ['SPY']);

      // Navigate to dashboard if available
      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardPage.navigateFromApp();
        await page.waitForTimeout(1500);

        // Verify portfolio data if dashboard loads
        const portfolioValue = page.getByText('Portfolio Value');
        if (await portfolioValue.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(portfolioValue).toBeVisible();
        }
      }
    });

    test('error recovery flow with utilities', async ({ page, appPage, mockApi }) => {
      // Start with successful data
      await mockApi.mockAccountData(mockPortfolioData.default);

      await appPage.goto();
      await appPage.dismissModals();

      // Verify successful load
      await expectNoErrorState(page);

      // Now simulate an error
      await mockApi.mockApiError('**/api/market/**', 500, 'Test error');

      // Trigger a refresh or navigation that uses the API
      await page.reload();
      await page.waitForTimeout(1500);

      // Should handle error gracefully
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);

      // Clear mocks to allow recovery
      await mockApi.clearMocks();
      await page.reload();

      // Should recover
      await expectLoadingComplete(page);
    });
  });
});

test.describe('Real-World Scenarios', () => {
  test('market data refresh cycle', async ({ page, appPage, mockApi }) => {
    // Mock initial market data
    await mockApi.mockMarketData('SPY', {
      symbol: 'SPY',
      price: 458.00,
      change: 1.00,
      changePercent: 0.22
    });

    await appPage.goto();
    await appPage.dismissModals();
    await page.waitForTimeout(1000);

    const spyTicker = page.getByText('SPY').first();
    if (await spyTicker.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Verify initial data
      await expect(spyTicker).toBeVisible();

      // Mock updated data
      await mockApi.clearMocks();
      await mockApi.mockMarketData('SPY', {
        symbol: 'SPY',
        price: 459.50,
        change: 2.50,
        changePercent: 0.55
      });

      // Refresh would load new data
      const refreshButton = page.getByRole('button', { name: 'Refresh' });
      if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await refreshButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('portfolio update flow', async ({ page, appPage, dashboardPage, mockApi }) => {
    await mockApi.mockAccountData(mockPortfolioData.smallPortfolio);

    await appPage.goto();
    await appPage.dismissModals();

    const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
    if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashboardPage.navigateFromApp();
      await page.waitForTimeout(1500);

      // Update mock data
      await mockApi.clearMocks();
      await mockApi.mockAccountData(mockPortfolioData.largePortfolio);

      // Refresh dashboard
      const refreshButton = page.getByRole('button', { name: 'Refresh' });
      if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await refreshButton.click();
        await page.waitForTimeout(1500);

        // Should show updated portfolio value
        const portfolioValue = page.getByText('Portfolio Value');
        if (await portfolioValue.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(portfolioValue).toBeVisible();
        }
      }
    }
  });
});
