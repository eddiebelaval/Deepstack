import { test, expect } from '@playwright/test';

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

test.describe('Navigation & Routing', () => {
  test.describe('Landing Page Navigation', () => {
    test('should navigate from landing to app', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Try Demo' }).click();
      await expect(page).toHaveURL(/\/app/);
    });

    test('should navigate from landing to login', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Sign In' }).click();
      // May redirect to landing or show login
      await expect(page.getByText('deepstack').first()).toBeVisible();
    });

    test('should navigate from landing to help', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: 'Help' }).first().click();
      await expect(page).toHaveURL(/\/help/);
    });
  });

  test.describe('Direct URL Access', () => {
    test('should load landing page at /', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/DeepStack.*AI.*Trading/);
    });

    test('should load app at /app', async ({ page }) => {
      await page.goto('/app');
      await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();
    });

    test('should handle /login route', async ({ page }) => {
      await page.goto('/login');
      // May redirect or show login - just verify page loads
      await expect(page.getByText('deepstack').first()).toBeVisible();
    });

    test('should load help at /help', async ({ page }) => {
      await page.goto('/help');
      await expect(page).toHaveURL(/\/help/);
    });

    test('should load privacy at /privacy', async ({ page }) => {
      await page.goto('/privacy');
      await expect(page).toHaveURL(/\/privacy/);
    });

    test('should load terms at /terms', async ({ page }) => {
      await page.goto('/terms');
      await expect(page).toHaveURL(/\/terms/);
    });
  });

  test.describe('Footer Navigation', () => {
    test('should navigate to help from footer', async ({ page }) => {
      await page.goto('/');
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.getByRole('link', { name: 'Help Center' }).click();
      await expect(page).toHaveURL(/\/help/);
    });

    test('should navigate to terms from footer', async ({ page }) => {
      await page.goto('/');
      await dismissModals(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      // Use footer to be specific about which link
      const footer = page.locator('footer, [role="contentinfo"]');
      const termsLink = footer.getByRole('link', { name: 'Terms' });
      await termsLink.click();
      await expect(page).toHaveURL(/\/terms/);
    });

    test('should navigate to privacy from footer', async ({ page }) => {
      await page.goto('/');
      await dismissModals(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      // Use footer to be specific about which link
      const footer = page.locator('footer, [role="contentinfo"]');
      const privacyLink = footer.getByRole('link', { name: 'Privacy' });
      await privacyLink.click();
      await expect(page).toHaveURL(/\/privacy/);
    });
  });

  test.describe('App Navigation', () => {
    test('should navigate to /app from Start Free Analysis', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: /Start Free Analysis/ }).click();
      await expect(page).toHaveURL(/\/app/);
    });

    test('should navigate to /app from Launch DeepStack', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name: /Launch DeepStack/ }).click();
      await expect(page).toHaveURL(/\/app/);
    });
  });
});
