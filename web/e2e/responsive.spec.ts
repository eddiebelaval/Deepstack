import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.describe('Desktop Viewport (1920x1080)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should load landing page on desktop', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('deepstack').first()).toBeVisible();
    });

    test('should show widgets panel on desktop app', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByText('Widgets')).toBeVisible();
    });
  });

  test.describe('Tablet Viewport (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should load landing page on tablet', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('deepstack').first()).toBeVisible();
    });

    test('should load app on tablet', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();
    });
  });

  test.describe('Mobile Viewport (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should load landing page on mobile', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('deepstack').first()).toBeVisible();
    });

    test('should load app on mobile', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();
    });
  });

  test.describe('Viewport Changes', () => {
    test('should handle viewport resize gracefully', async ({ page }) => {
      await page.goto('/app');

      // Start at desktop size
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(300);

      // Resize to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);

      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      // Page should still be functional
      await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' }).first()).toBeVisible();
    });
  });
});
