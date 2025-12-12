/**
 * Visual Regression E2E Tests
 *
 * Uses Playwright's screenshot comparison to detect unintended visual changes.
 * Tests cover:
 * - Landing page layout
 * - App page layout (authenticated)
 * - Mobile viewports
 * - Dark/light theme variations
 * - Component states (hover, focus, etc.)
 *
 * Run with:
 *   npm run test:e2e -- visual.spec.ts
 *
 * To update snapshots:
 *   npm run test:e2e -- visual.spec.ts --update-snapshots
 */

import { test, expect, Page } from '@playwright/test';

// Helper to dismiss modals (from existing tests)
async function dismissModals(page: Page) {
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

  // Wait for any animations to complete
  await page.waitForTimeout(300);
}

// Helper to wait for page to stabilize (animations, lazy loading, etc.)
async function waitForPageStable(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for any CSS animations/transitions to complete
  await page.waitForTimeout(500);

  // Hide dynamic content that changes on every render
  await page.evaluate(() => {
    // Hide elements with time-based content
    const timeElements = document.querySelectorAll('[data-testid="current-time"], .timestamp, time');
    timeElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.visibility = 'hidden';
      }
    });

    // Hide any loading spinners that might still be visible
    const spinners = document.querySelectorAll('[role="progressbar"], .spinner, [aria-busy="true"]');
    spinners.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.display = 'none';
      }
    });
  });
}

test.describe('Visual Regression - Landing Page', () => {
  test('should match landing page screenshot (desktop)', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Take full page screenshot
    await expect(page).toHaveScreenshot('landing-page-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match landing page hero section', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Screenshot just the hero section
    const hero = page.locator('main > section').first();
    await expect(hero).toHaveScreenshot('landing-hero-section.png', {
      animations: 'disabled',
    });
  });

  test('should match landing page features section', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Scroll to features section
    const features = page.locator('text=AI Chat Assistant').locator('..').locator('..');
    await features.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    await expect(features).toHaveScreenshot('landing-features-section.png', {
      animations: 'disabled',
    });
  });

  test('should match landing page navigation', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Screenshot the navigation bar
    const nav = page.locator('nav, header').first();
    await expect(nav).toHaveScreenshot('landing-navigation.png', {
      animations: 'disabled',
    });
  });

  test('should match landing page footer', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Scroll to footer
    const footer = page.locator('footer, [role="contentinfo"]').first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    await expect(footer).toHaveScreenshot('landing-footer.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Landing Page (Mobile)', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should match landing page screenshot (mobile)', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('landing-page-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match mobile navigation', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    const nav = page.locator('nav, header').first();
    await expect(nav).toHaveScreenshot('landing-navigation-mobile.png', {
      animations: 'disabled',
    });
  });

  test('should match mobile hero section', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    const hero = page.locator('main > section').first();
    await expect(hero).toHaveScreenshot('landing-hero-mobile.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Landing Page (Tablet)', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad size

  test('should match landing page screenshot (tablet)', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('landing-page-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Login Page', () => {
  test('should match login page screenshot (desktop)', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('login-page-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match login form', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);

    // Screenshot the login form specifically
    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('login-form.png', {
      animations: 'disabled',
    });
  });

  test('should match login page (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('login-page-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - App Page', () => {
  test.skip('should match app page screenshot (desktop)', async ({ page }) => {
    // Skip this test as it requires authentication
    // TODO: Implement authenticated test with proper session setup

    await page.goto('/app');
    await dismissModals(page);
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('app-page-desktop.png', {
      fullPage: false, // App might be very tall with scrolling
      animations: 'disabled',
    });
  });

  test.skip('should match app sidebar', async ({ page }) => {
    // Skip this test as it requires authentication

    await page.goto('/app');
    await dismissModals(page);
    await waitForPageStable(page);

    const sidebar = page.locator('[role="complementary"], aside, nav').first();
    await expect(sidebar).toHaveScreenshot('app-sidebar.png', {
      animations: 'disabled',
    });
  });

  test.skip('should match app main content area', async ({ page }) => {
    // Skip this test as it requires authentication

    await page.goto('/app');
    await dismissModals(page);
    await waitForPageStable(page);

    const main = page.locator('main, [role="main"]').first();
    await expect(main).toHaveScreenshot('app-main-content.png', {
      animations: 'disabled',
    });
  });

  test.skip('should match app page (mobile)', async ({ page }) => {
    // Skip this test as it requires authentication

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app');
    await dismissModals(page);
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('app-page-mobile.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Theme Variations', () => {
  test('should match landing page in light theme', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Force light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    });

    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('landing-page-light-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match landing page in dark theme', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Force dark theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });

    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('landing-page-dark-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Interactive States', () => {
  test('should match button hover states', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Find primary CTA button
    const ctaButton = page.getByRole('link', { name: /Start Free Analysis/i }).first();

    // Hover over button
    await ctaButton.hover();
    await page.waitForTimeout(100);

    await expect(ctaButton).toHaveScreenshot('button-hover-state.png', {
      animations: 'disabled',
    });
  });

  test('should match button focus states', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Find and focus a button
    const ctaButton = page.getByRole('link', { name: /Start Free Analysis/i }).first();
    await ctaButton.focus();
    await page.waitForTimeout(100);

    await expect(ctaButton).toHaveScreenshot('button-focus-state.png', {
      animations: 'disabled',
    });
  });

  test('should match navigation link states', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    const nav = page.locator('nav, header').first();

    // Hover over a navigation link
    const helpLink = page.getByRole('link', { name: 'Help' }).first();
    await helpLink.hover();
    await page.waitForTimeout(100);

    await expect(nav).toHaveScreenshot('navigation-hover-state.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'small-mobile', width: 320, height: 568 },    // iPhone SE
    { name: 'mobile', width: 375, height: 667 },          // iPhone 8
    { name: 'large-mobile', width: 414, height: 896 },    // iPhone 11 Pro Max
    { name: 'tablet', width: 768, height: 1024 },         // iPad
    { name: 'desktop', width: 1280, height: 720 },        // Small desktop
    { name: 'large-desktop', width: 1920, height: 1080 }, // Full HD
  ];

  for (const breakpoint of breakpoints) {
    test(`should match landing page at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });

      await page.goto('/');
      await waitForPageStable(page);

      await expect(page).toHaveScreenshot(`landing-${breakpoint.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
});

test.describe('Visual Regression - Error States', () => {
  test('should match 404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('404-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test.skip('should match login form with error', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);

    // Submit form without filling it out to trigger validation errors
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();
    await page.waitForTimeout(500);

    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('login-form-error.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Animation States', () => {
  test('should match page without animations', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/');
    await waitForPageStable(page);

    await expect(page).toHaveScreenshot('landing-reduced-motion.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Print Styles', () => {
  test('should match landing page print layout', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('landing-print-layout.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Cross-Browser', () => {
  // These tests will run across all configured browsers (chromium, firefox, webkit)
  // as defined in playwright.config.ts

  test('should render consistently across browsers', async ({ page, browserName }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Take screenshot with browser name in filename
    await expect(page).toHaveScreenshot(`landing-${browserName}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Component Isolation', () => {
  test('should match isolated button component', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // Screenshot a single button in isolation
    const button = page.getByRole('link', { name: /Start Free Analysis/i }).first();
    await expect(button).toHaveScreenshot('component-button.png', {
      animations: 'disabled',
    });
  });

  test('should match isolated navigation component', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    const nav = page.locator('nav, header').first();
    await expect(nav).toHaveScreenshot('component-navigation.png', {
      animations: 'disabled',
    });
  });
});
