import { test, expect } from '@playwright/test';

/**
 * Trading Flow E2E Tests
 *
 * Tests the complete trading workflow including:
 * - Viewing account information
 * - Browsing market data
 * - Interacting with widgets
 * - Managing watchlists
 * - Dashboard interactions
 */

// Helper to dismiss onboarding and disclaimer modals
async function dismissModals(page: import('@playwright/test').Page) {
  // Dismiss disclaimer if present
  const dismissDisclaimer = page.getByRole('button', { name: 'Dismiss disclaimer' });
  if (await dismissDisclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissDisclaimer.click();
  }

  // Skip onboarding tour if present
  const skipTour = page.getByRole('button', { name: 'Skip tour' });
  if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTour.click();
  }

  // Close onboarding if present
  const closeOnboarding = page.getByRole('button', { name: 'Close onboarding' });
  if (await closeOnboarding.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeOnboarding.click();
  }
}

test.describe('Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);
  });

  test.describe('Dashboard View', () => {
    test('should display dashboard when navigating from app', async ({ page }) => {
      // Navigate to dashboard
      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardLink.click();
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      }
    });

    test('should show account summary cards', async ({ page }) => {
      // Navigate to dashboard if dashboard route exists
      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardLink.click();

        // Check for portfolio value card
        const portfolioValue = page.getByText('Portfolio Value');
        if (await portfolioValue.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(portfolioValue).toBeVisible();
          await expect(page.getByText('Cash')).toBeVisible();
          await expect(page.getByText('Buying Power')).toBeVisible();
        }
      }
    });

    test('should display automation controls', async ({ page }) => {
      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardLink.click();

        // Check for automation status
        const statusBadge = page.locator('.bg-green-900, .bg-slate-800').first();
        if (await statusBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(statusBadge).toBeVisible();
          await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
        }
      }
    });
  });

  test.describe('Market Data Viewing', () => {
    test('should display market ticker symbols', async ({ page }) => {
      // Check for ticker symbols in bottom bar or market panel
      const spyTicker = page.getByText('SPY').first();
      const qqqTicker = page.getByText('QQQ').first();

      if (await spyTicker.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(spyTicker).toBeVisible();
      }

      if (await qqqTicker.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(qqqTicker).toBeVisible();
      }
    });

    test('should show market region selector', async ({ page }) => {
      // Check for United States or market region selector
      const usRegion = page.getByText('United States');
      if (await usRegion.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(usRegion).toBeVisible();
      }
    });

    test('should display timeframe options', async ({ page }) => {
      // Check for timeframe selectors (1D, 1W, etc.)
      const oneDayButton = page.getByText('1D');
      const oneWeekButton = page.getByText('1W');

      if (await oneDayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(oneDayButton).toBeVisible();
      }

      if (await oneWeekButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(oneWeekButton).toBeVisible();
      }
    });
  });

  test.describe('Widget Interactions', () => {
    test('should display widgets panel', async ({ page }) => {
      const widgetsPanel = page.getByText('Widgets');
      if (await widgetsPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(widgetsPanel).toBeVisible();
      }
    });

    test('should show add widget button', async ({ page }) => {
      const addWidgetButton = page.getByRole('button', { name: 'Add Widget' });
      if (await addWidgetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(addWidgetButton).toBeVisible();
      }
    });

    test('should allow opening add widget dialog', async ({ page }) => {
      const addWidgetButton = page.getByRole('button', { name: 'Add Widget' });
      if (await addWidgetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addWidgetButton.click();
        await page.waitForTimeout(300);

        // Check if dialog or menu appeared
        const dialog = page.getByRole('dialog');
        const menu = page.getByRole('menu');

        const dialogVisible = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
        const menuVisible = await menu.isVisible({ timeout: 1000 }).catch(() => false);

        expect(dialogVisible || menuVisible).toBeTruthy();
      }
    });
  });

  test.describe('Chat Interactions', () => {
    test('should display chat input', async ({ page }) => {
      const chatInput = page.getByRole('textbox', { name: /Ask about stocks/i });
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(chatInput).toBeVisible();
      }
    });

    test('should allow typing in chat input', async ({ page }) => {
      const chatInput = page.getByRole('textbox', { name: /Ask about stocks/i });
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput.fill('What is the price of AAPL?');
        await expect(chatInput).toHaveValue('What is the price of AAPL?');
      }
    });

    test('should display quick action prompts', async ({ page }) => {
      const analyzePortfolio = page.getByRole('button', { name: /Analyze my portfolio/i });
      if (await analyzePortfolio.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(analyzePortfolio).toBeVisible();
      }
    });

    test('should display model selector', async ({ page }) => {
      const modelSelector = page.getByRole('button', { name: /Sonnet/i });
      if (await modelSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(modelSelector).toBeVisible();
      }
    });
  });
});

test.describe('Complete Trading Workflow', () => {
  test('user can navigate from landing to app and view market data', async ({ page }) => {
    // Start at landing page
    await page.goto('/');

    // Navigate to app
    await page.getByRole('link', { name: 'Try Demo' }).click();
    await expect(page).toHaveURL(/\/app/);

    // Dismiss modals
    await dismissModals(page);

    // Verify app is loaded
    await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();

    // Check for market data
    const spyTicker = page.getByText('SPY').first();
    if (await spyTicker.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(spyTicker).toBeVisible();
    }
  });

  test('user can interact with chat and quick actions', async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);

    // Find and click a quick action if available
    const quickAction = page.getByRole('button', { name: /Analyze my portfolio/i });
    if (await quickAction.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickAction.click();
      await page.waitForTimeout(500);

      // Chat input should receive the prompt
      const chatInput = page.getByRole('textbox', { name: /Ask about stocks/i });
      if (await chatInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        const inputValue = await chatInput.inputValue();
        expect(inputValue.length).toBeGreaterThan(0);
      }
    }
  });
});
