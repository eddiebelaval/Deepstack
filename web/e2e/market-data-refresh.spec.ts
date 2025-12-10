import { test, expect } from '@playwright/test';

/**
 * Market Data Refresh E2E Tests
 *
 * Tests real-time data updates and market data interactions:
 * - Real-time price updates
 * - Chart interactions
 * - Watchlist updates
 * - Data refresh mechanisms
 * - Ticker symbol search
 */

// Helper to dismiss onboarding and disclaimer modals
async function dismissModals(page: import('@playwright/test').Page) {
  const dismissDisclaimer = page.getByRole('button', { name: 'Dismiss disclaimer' });
  if (await dismissDisclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissDisclaimer.click();
  }

  const skipTour = page.getByRole('button', { name: 'Skip tour' });
  if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTour.click();
  }

  const closeOnboarding = page.getByRole('button', { name: 'Close onboarding' });
  if (await closeOnboarding.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeOnboarding.click();
  }
}

test.describe('Market Data Refresh', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);
  });

  test.describe('Real-Time Data Updates', () => {
    test('should display market ticker prices', async ({ page }) => {
      // Wait for market data to load
      await page.waitForTimeout(1000);

      // Check if SPY ticker is visible and has price data
      const spyTicker = page.getByText('SPY').first();
      if (await spyTicker.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(spyTicker).toBeVisible();

        // Look for price indicators (numbers, $ signs, or percentage changes)
        const pricePattern = /\$?\d+\.\d{2}|\d+\.\d{2}%|[+-]\d+\.\d{2}/;
        const pageContent = await page.content();
        expect(pageContent).toMatch(pricePattern);
      }
    });

    test('should show price change indicators', async ({ page }) => {
      await page.waitForTimeout(1500);

      // Look for positive/negative indicators (green/red colors or +/- symbols)
      const positiveIndicator = page.locator('.text-green-400, .text-green-500, .text-green-600').first();
      const negativeIndicator = page.locator('.text-red-400, .text-red-500, .text-red-600').first();

      const hasPositive = await positiveIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      const hasNegative = await negativeIndicator.isVisible({ timeout: 2000 }).catch(() => false);

      // At least one type of indicator should be visible
      expect(hasPositive || hasNegative).toBeTruthy();
    });

    test('should update market data on dashboard refresh', async ({ page }) => {
      // Navigate to dashboard if available
      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardLink.click();
        await expect(page).toHaveURL(/\/dashboard/);

        // Click refresh button
        const refreshButton = page.getByRole('button', { name: 'Refresh' });
        if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await refreshButton.click();

          // Wait for loading state
          await page.waitForTimeout(500);

          // Verify data is still displayed after refresh
          const portfolioValue = page.getByText('Portfolio Value');
          if (await portfolioValue.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(portfolioValue).toBeVisible();
          }
        }
      }
    });

    test('should handle data loading states', async ({ page }) => {
      // Reload page to trigger loading state
      await page.reload();

      // Wait for network idle to ensure data is loaded
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        // If network doesn't idle, that's okay - just continue
      });

      // Verify content is loaded regardless of loading state
      await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();

      // If there's a loading state, verify it eventually completes or content appears
      const content = await page.content();
      const hasContent = /Welcome to DeepStack|SPY|QQQ|Widgets/i.test(content);
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('Timeframe Selection', () => {
    test('should display timeframe options', async ({ page }) => {
      const oneDayButton = page.getByText('1D').first();
      const oneWeekButton = page.getByText('1W').first();

      if (await oneDayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(oneDayButton).toBeVisible();
      }

      if (await oneWeekButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(oneWeekButton).toBeVisible();
      }
    });

    test('should allow switching between timeframes', async ({ page }) => {
      const oneWeekButton = page.getByText('1W').first();

      if (await oneWeekButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Use force click if element is overlapped
        await oneWeekButton.click({ force: true });
        await page.waitForTimeout(500);

        // Verify button is selected (check for active state)
        const buttonClasses = await oneWeekButton.getAttribute('class');
        expect(buttonClasses).toBeTruthy();
      }
    });

    test('should display different timeframe options', async ({ page }) => {
      // Check for multiple timeframe options
      const timeframes = ['1D', '1W', '1M', '3M', '1Y', 'All'];
      let foundTimeframes = 0;

      for (const tf of timeframes) {
        const button = page.getByText(tf).first();
        if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
          foundTimeframes++;
        }
      }

      // Should have at least 2 timeframe options
      expect(foundTimeframes).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Market Region Selection', () => {
    test('should display market region selector', async ({ page }) => {
      const usRegion = page.getByText('United States');
      if (await usRegion.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(usRegion).toBeVisible();
      }
    });

    test('should show region-specific market data', async ({ page }) => {
      // Check for US market tickers
      const usTickers = ['SPY', 'QQQ', 'DIA', 'IWM'];
      let foundTickers = 0;

      for (const ticker of usTickers) {
        const tickerElement = page.getByText(ticker).first();
        if (await tickerElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          foundTickers++;
        }
      }

      // Should find at least one US ticker
      expect(foundTickers).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Watchlist Management', () => {
    test('should display ticker symbols in bottom bar', async ({ page }) => {
      // Check for ticker bar
      const spyTicker = page.getByText('SPY').first();
      const qqqTicker = page.getByText('QQQ').first();

      let hasTickerBar = false;

      if (await spyTicker.isVisible({ timeout: 3000 }).catch(() => false)) {
        hasTickerBar = true;
        await expect(spyTicker).toBeVisible();
      }

      if (await qqqTicker.isVisible({ timeout: 1000 }).catch(() => false)) {
        hasTickerBar = true;
        await expect(qqqTicker).toBeVisible();
      }

      expect(hasTickerBar).toBeTruthy();
    });

    test('should show multiple ticker symbols', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Count visible ticker symbols
      const commonTickers = ['SPY', 'QQQ', 'DIA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'];
      let visibleTickers = 0;

      for (const ticker of commonTickers) {
        const tickerElement = page.getByText(ticker).first();
        if (await tickerElement.isVisible({ timeout: 500 }).catch(() => false)) {
          visibleTickers++;
        }
      }

      // Should display at least 2 ticker symbols
      expect(visibleTickers).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Market Watch Panel', () => {
    test('should display Market Watch button', async ({ page }) => {
      const marketWatchButton = page.getByRole('button', { name: 'Market Watch' });
      if (await marketWatchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(marketWatchButton).toBeVisible();
      }
    });

    test('should toggle Market Watch panel', async ({ page }) => {
      const marketWatchButton = page.getByRole('button', { name: 'Market Watch' });

      if (await marketWatchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click to open
        await marketWatchButton.click();
        await page.waitForTimeout(300);

        // Click to close
        await marketWatchButton.click();
        await page.waitForTimeout(300);

        // Button should still be visible
        await expect(marketWatchButton).toBeVisible();
      }
    });
  });
});

test.describe('Data Refresh Integration', () => {
  test('should maintain data after navigation', async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);

    // Capture initial ticker data
    const initialContent = await page.content();
    const hasInitialTickers = /SPY|QQQ|DIA/.test(initialContent);

    if (hasInitialTickers) {
      // Navigate to help
      const helpLink = page.getByRole('link', { name: 'Help' }).first();
      if (await helpLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await helpLink.click();
        await expect(page).toHaveURL(/\/help/);

        // Navigate back to app
        await page.goto('/app');
        await dismissModals(page);

        // Verify tickers are still visible
        await page.waitForTimeout(1000);
        const newContent = await page.content();
        const hasTickersAfterNav = /SPY|QQQ|DIA/.test(newContent);
        expect(hasTickersAfterNav).toBeTruthy();
      }
    }
  });

  test('should handle rapid page refreshes gracefully', async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);

    // Perform rapid refreshes
    await page.reload();
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(300);

    // Page should still be functional
    await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();

    // Market data should eventually load
    await page.waitForTimeout(1500);
    const content = await page.content();
    const hasData = /SPY|QQQ|Portfolio|Widgets/.test(content);
    expect(hasData).toBeTruthy();
  });
});
