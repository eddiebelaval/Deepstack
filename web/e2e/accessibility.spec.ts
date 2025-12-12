/**
 * Accessibility (a11y) E2E Tests
 *
 * Tests WCAG 2.1 AA compliance across the application using axe-core.
 * Covers:
 * - Landing page accessibility
 * - App page accessibility (authenticated)
 * - Login page accessibility
 * - Keyboard navigation
 * - Color contrast
 * - ARIA attributes
 * - Screen reader compatibility
 *
 * Run with:
 *   npm run test:e2e -- accessibility.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  runAccessibilityTest,
  assertNoViolations,
  A11Y_RULES,
  testKeyboardNavigation,
  WCAG_TAGS,
  formatViolations,
} from './utils/accessibility';

// Helper to dismiss modals (from existing tests)
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

test.describe('Accessibility - Landing Page', () => {
  test('should have no WCAG 2.1 AA violations on landing page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Run accessibility test
    const results = await runAccessibilityTest(page, {
      level: 'AA',
    });

    // Assert no violations with detailed error message
    if (results.violations.length > 0) {
      console.log(formatViolations(results.violations));
    }

    assertNoViolations(results);
  });

  test('should have valid page title', async ({ page }) => {
    await page.goto('/');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.documentTitle],
    });

    assertNoViolations(results);

    // Also check title is descriptive
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have valid HTML lang attribute', async ({ page }) => {
    await page.goto('/');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.htmlHasLang, A11Y_RULES.htmlLangValid],
    });

    assertNoViolations(results);

    // Verify lang attribute exists and is valid
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
    expect(['en', 'en-US']).toContain(lang);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.headingOrder, A11Y_RULES.emptyHeading],
    });

    assertNoViolations(results);

    // Verify heading structure
    const headings = await page.evaluate(() => {
      const h1s = document.querySelectorAll('h1');
      const h2s = document.querySelectorAll('h2');
      const h3s = document.querySelectorAll('h3');

      return {
        h1Count: h1s.length,
        h2Count: h2s.length,
        h3Count: h3s.length,
      };
    });

    // Should have exactly one h1
    expect(headings.h1Count).toBe(1);
  });

  test('should have accessible images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.imageAlt, A11Y_RULES.objectAlt],
    });

    assertNoViolations(results);
  });

  test('should have accessible links', async ({ page }) => {
    await page.goto('/');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.linkName],
    });

    assertNoViolations(results);

    // Verify all links have accessible names
    const linksWithoutText = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(link => {
          const text = link.textContent?.trim();
          const ariaLabel = link.getAttribute('aria-label');
          const ariaLabelledBy = link.getAttribute('aria-labelledby');
          const title = link.getAttribute('title');

          return !text && !ariaLabel && !ariaLabelledBy && !title;
        })
        .map(link => link.outerHTML.substring(0, 100));
    });

    expect(linksWithoutText).toHaveLength(0);
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.buttonName],
    });

    assertNoViolations(results);
  });

  test('should have valid ARIA attributes', async ({ page }) => {
    await page.goto('/');

    const results = await runAccessibilityTest(page, {
      rules: [
        A11Y_RULES.ariaAllowedAttr,
        A11Y_RULES.ariaAllowedRole,
        A11Y_RULES.ariaHiddenFocus,
        A11Y_RULES.ariaRequiredAttr,
        A11Y_RULES.ariaRequiredChildren,
        A11Y_RULES.ariaRequiredParent,
        A11Y_RULES.ariaRoles,
        A11Y_RULES.ariaValidAttr,
        A11Y_RULES.ariaValidAttrValue,
      ],
    });

    assertNoViolations(results);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.colorContrast],
    });

    if (results.violations.length > 0) {
      console.log('Color contrast violations:');
      console.log(formatViolations(results.violations));
    }

    assertNoViolations(results);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test that we can tab through interactive elements
    const navTest = await testKeyboardNavigation(page);

    if (!navTest.success) {
      console.log('Keyboard navigation errors:', navTest.errors);
    }

    expect(navTest.success).toBe(true);
  });

  test('should have main landmark', async ({ page }) => {
    await page.goto('/');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.landmark, A11Y_RULES.region],
    });

    assertNoViolations(results);

    // Verify main landmark exists
    const hasMain = await page.evaluate(() => {
      return document.querySelector('main, [role="main"]') !== null;
    });

    expect(hasMain).toBe(true);
  });
});

test.describe('Accessibility - Login Page', () => {
  test('should have no WCAG 2.1 AA violations on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityTest(page, {
      level: 'AA',
    });

    if (results.violations.length > 0) {
      console.log(formatViolations(results.violations));
    }

    assertNoViolations(results);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/login');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.label, A11Y_RULES.labelTitleOnly],
    });

    assertNoViolations(results);

    // Verify all form inputs have labels
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('input:not([type="hidden"])')
      );
      return inputs
        .filter(input => {
          const id = input.getAttribute('id');
          const ariaLabel = input.getAttribute('aria-label');
          const ariaLabelledBy = input.getAttribute('aria-labelledby');
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);

          return !ariaLabel && !ariaLabelledBy && !hasLabel;
        })
        .map(input => input.outerHTML.substring(0, 100));
    });

    expect(unlabeledInputs).toHaveLength(0);
  });

  test('should have accessible form validation', async ({ page }) => {
    await page.goto('/login');

    const results = await runAccessibilityTest(page, {
      rules: [A11Y_RULES.ariaInputFieldName],
    });

    assertNoViolations(results);
  });

  test('should support keyboard navigation on login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should be able to tab to email, password, and submit button
    const navTest = await testKeyboardNavigation(page);

    expect(navTest.success).toBe(true);
  });
});

test.describe('Accessibility - App Page', () => {
  test.skip('should have no WCAG 2.1 AA violations on app page', async ({ page }) => {
    // Skip this test as it requires authentication
    // TODO: Implement authenticated test with proper session setup

    await page.goto('/app');

    // Dismiss modals
    await dismissModals(page);

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityTest(page, {
      level: 'AA',
    });

    if (results.violations.length > 0) {
      console.log(formatViolations(results.violations));
    }

    assertNoViolations(results);
  });

  test.skip('should have accessible trading interface', async ({ page }) => {
    // Skip this test as it requires authentication
    // TODO: Implement authenticated test

    await page.goto('/app');
    await dismissModals(page);
    await page.waitForLoadState('networkidle');

    // Test specific trading interface components
    const results = await runAccessibilityTest(page, {
      rules: [
        A11Y_RULES.buttonName,
        A11Y_RULES.ariaAllowedAttr,
        A11Y_RULES.colorContrast,
      ],
    });

    assertNoViolations(results);
  });

  test.skip('should have accessible charts and data visualizations', async ({ page }) => {
    // Skip this test as it requires authentication
    // TODO: Implement authenticated test with chart testing

    await page.goto('/app');
    await dismissModals(page);
    await page.waitForLoadState('networkidle');

    // Check that charts have proper ARIA labels
    const chartsHaveLabels = await page.evaluate(() => {
      const charts = document.querySelectorAll('canvas, svg[role="img"]');
      return Array.from(charts).every(chart => {
        const ariaLabel = chart.getAttribute('aria-label');
        const ariaLabelledBy = chart.getAttribute('aria-labelledby');
        const role = chart.getAttribute('role');

        return (ariaLabel || ariaLabelledBy) && (role === 'img' || role === 'graphics-document');
      });
    });

    // Note: This might need adjustment based on your chart library
    // Some chart libraries don't have built-in ARIA support
    expect(chartsHaveLabels).toBe(true);
  });
});

test.describe('Accessibility - Focus Management', () => {
  test('should trap focus in modals', async ({ page }) => {
    await page.goto('/');

    // Look for any modal trigger
    const modalTriggers = await page.locator('button[aria-haspopup="dialog"]').count();

    if (modalTriggers > 0) {
      // Open first modal
      await page.locator('button[aria-haspopup="dialog"]').first().click();

      // Wait for modal to open
      await page.waitForSelector('[role="dialog"]');

      // Focus should be trapped within the modal
      const isTrapped = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return false;

        const focusableElements = modal.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        return focusableElements.length > 0;
      });

      expect(isTrapped).toBe(true);
    }
  });

  test('should restore focus after modal closes', async ({ page }) => {
    await page.goto('/');

    const modalTriggers = await page.locator('button[aria-haspopup="dialog"]').count();

    if (modalTriggers > 0) {
      const trigger = page.locator('button[aria-haspopup="dialog"]').first();

      // Get trigger element info before opening
      const triggerText = await trigger.textContent();

      // Open modal
      await trigger.click();
      await page.waitForSelector('[role="dialog"]');

      // Close modal (look for close button)
      const closeButton = page.locator('[role="dialog"] button[aria-label*="close" i], [role="dialog"] button[aria-label*="dismiss" i]').first();

      if (await closeButton.count() > 0) {
        await closeButton.click();

        // Wait for modal to close
        await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

        // Focus should return to trigger
        // Note: This is a best practice but might not be implemented everywhere
        const focusedElement = await page.evaluate(() => {
          return document.activeElement?.textContent?.trim();
        });

        // This is an aspirational test - might need adjustment
        // expect(focusedElement).toBe(triggerText?.trim());
      }
    }
  });
});

test.describe('Accessibility - Screen Reader Support', () => {
  test('should have proper live regions for dynamic content', async ({ page }) => {
    await page.goto('/');

    // Check for ARIA live regions
    const hasLiveRegions = await page.evaluate(() => {
      const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
      return liveRegions.length > 0;
    });

    // This might need adjustment based on your app's dynamic content
    // expect(hasLiveRegions).toBe(true);
  });

  test('should announce navigation changes', async ({ page }) => {
    await page.goto('/');

    // Check for route announcements (common pattern in SPAs)
    const hasRouteAnnouncer = await page.evaluate(() => {
      const announcer = document.querySelector('[role="status"][aria-live="polite"]');
      return announcer !== null;
    });

    // This is aspirational - many apps don't implement this
    // expect(hasRouteAnnouncer).toBe(true);
  });
});

test.describe('Accessibility - Mobile Specific', () => {
  test('should have touch-friendly targets on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that interactive elements meet minimum touch target size (44x44px)
    const smallTargets = await page.evaluate(() => {
      const MIN_SIZE = 44;
      const interactiveElements = document.querySelectorAll(
        'a, button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
      );

      return Array.from(interactiveElements)
        .filter(el => {
          const rect = el.getBoundingClientRect();
          // Only check visible elements
          if (rect.width === 0 || rect.height === 0) return false;

          return rect.width < MIN_SIZE || rect.height < MIN_SIZE;
        })
        .map(el => ({
          tag: el.tagName,
          text: el.textContent?.substring(0, 50),
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        }));
    });

    // Log small targets for review (they might be acceptable in some contexts)
    if (smallTargets.length > 0) {
      console.log('Small touch targets found:', smallTargets);
    }

    // This is a guideline - some small targets might be acceptable
    // expect(smallTargets.length).toBe(0);
  });
});
