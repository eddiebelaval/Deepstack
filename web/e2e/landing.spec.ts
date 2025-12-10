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

test.describe('Landing Page', () => {
  test.describe('Page Load', () => {
    test('should load landing page successfully', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/DeepStack.*AI.*Trading/);
    });

    test('should display logo', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('deepstack').first()).toBeVisible();
    });

    test('should display hero title', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should display hero subtitle', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText(/research platform/i).first()).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should have Try Demo link', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Try Demo' })).toBeVisible();
    });

    test('should have Sign In link', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    });

    test('should have Help link in navigation', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Help' }).first()).toBeVisible();
    });
  });

  test.describe('Features Section', () => {
    test('should display AI Chat Assistant feature', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'AI Chat Assistant' })).toBeVisible();
    });

    test('should display Real-Time Market Data feature', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Real-Time Market Data' })).toBeVisible();
    });

    test('should display Emotional Firewall feature', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Emotional Firewall' })).toBeVisible();
    });
  });

  test.describe('Footer', () => {
    test('should have Help Center link', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Help Center' })).toBeVisible();
    });

    test('should have Terms link', async ({ page }) => {
      await page.goto('/');
      await dismissModals(page);
      // Scroll to footer to make link visible
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      // Use footer contentinfo to be specific about which link
      const footer = page.locator('footer, [role="contentinfo"]');
      const termsLink = footer.getByRole('link', { name: 'Terms' });
      await expect(termsLink).toBeVisible();
    });

    test('should have Privacy link', async ({ page }) => {
      await page.goto('/');
      await dismissModals(page);
      // Scroll to footer to make link visible
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      // Use footer contentinfo to be specific about which link
      const footer = page.locator('footer, [role="contentinfo"]');
      const privacyLink = footer.getByRole('link', { name: 'Privacy' });
      await expect(privacyLink).toBeVisible();
    });

    test('should have id8labs attribution link', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'built by id8labs.app' })).toBeVisible();
    });
  });

  test.describe('CTA Buttons', () => {
    test('should have Start Free Analysis button', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: /Start Free Analysis/ })).toBeVisible();
    });

    test('should have Launch DeepStack button', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: /Launch DeepStack/ })).toBeVisible();
    });
  });
});
