import { test, expect } from '@playwright/test';

test.describe('Trading App', () => {
  test.describe('Page Load', () => {
    test('should load app successfully', async ({ page }) => {
      await page.goto('/app');
      await expect(page).toHaveURL(/\/app/);
    });

    test('should display welcome message', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();
    });

    test('should display chat input', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('textbox', { name: /Ask about stocks/ })).toBeVisible();
    });
  });

  test.describe('Core UI Elements', () => {
    test('should display Market Watch button', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('button', { name: 'Market Watch' })).toBeVisible();
    });

    test('should display Widgets panel', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByText('Widgets')).toBeVisible();
    });

    test('should display Add Widget button', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
    });

    test('should display ticker symbols in bottom bar', async ({ page }) => {
      await page.goto('/app');
      // Check for common tickers
      await expect(page.getByText('SPY').first()).toBeVisible();
      await expect(page.getByText('QQQ').first()).toBeVisible();
    });
  });

  test.describe('Market Panel', () => {
    test('should display market region', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByText('United States')).toBeVisible();
    });

    test('should display timeframe options', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByText('1D')).toBeVisible();
      await expect(page.getByText('1W')).toBeVisible();
    });
  });

  test.describe('Quick Actions', () => {
    test('should display quick action prompts', async ({ page }) => {
      await page.goto('/app');
      // Check for one of the quick action buttons
      await expect(page.getByRole('button', { name: /Analyze my portfolio/ })).toBeVisible();
    });

    test('should display model selector', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('button', { name: /Sonnet/ })).toBeVisible();
    });
  });
});
