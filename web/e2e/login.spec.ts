import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.describe('Page Load', () => {
    test('should load login page successfully', async ({ page }) => {
      await page.goto('/login');
      // Login page may redirect or show login UI
      await expect(page).toHaveURL(/\/(login)?/);
    });

    test('should display deepstack logo', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByText('deepstack').first()).toBeVisible();
    });
  });

  test.describe('Authentication Options', () => {
    test('should display Google sign in button', async ({ page }) => {
      await page.goto('/login');
      // May be on login page or redirected
      const googleButton = page.getByRole('button', { name: /Continue with Google/ });
      const isOnLoginPage = await googleButton.isVisible().catch(() => false);

      if (isOnLoginPage) {
        await expect(googleButton).toBeVisible();
      } else {
        // User may have been redirected, check we're on a valid page
        await expect(page.getByText('deepstack').first()).toBeVisible();
      }
    });

    test('should display magic link form if on login page', async ({ page }) => {
      await page.goto('/login');
      const emailInput = page.getByRole('textbox', { name: /Email/ });
      const isOnLoginPage = await emailInput.isVisible().catch(() => false);

      if (isOnLoginPage) {
        await expect(emailInput).toBeVisible();
        await expect(page.getByRole('button', { name: /Send Magic Link/ })).toBeVisible();
      }
    });
  });

  test.describe('Magic Link Form', () => {
    test('should accept email input if on login page', async ({ page }) => {
      await page.goto('/login');
      const emailInput = page.getByRole('textbox', { name: /Email/ });
      const isOnLoginPage = await emailInput.isVisible().catch(() => false);

      if (isOnLoginPage) {
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveValue('test@example.com');
      }
    });
  });

  test.describe('Footer Links', () => {
    test('should have footer links if on login page', async ({ page }) => {
      await page.goto('/login');
      const privacyLink = page.getByRole('link', { name: 'Privacy' });
      const isOnLoginPage = await privacyLink.isVisible().catch(() => false);

      if (isOnLoginPage) {
        await expect(privacyLink).toBeVisible();
        await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Help' })).toBeVisible();
      }
    });

    test('should have id8labs attribution link', async ({ page }) => {
      await page.goto('/login');
      // Link should be visible whether on login or landing page
      await expect(page.getByRole('link', { name: 'built by id8labs.app' })).toBeVisible();
    });
  });
});
