/**
 * Performance E2E Tests
 *
 * Tests Core Web Vitals and page performance metrics.
 * These tests run in a dedicated browser profile to avoid interference.
 *
 * Run with:
 *   npm run test:e2e -- --project=performance
 *   npm run test:e2e -- performance.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  measurePageLoad,
  measureCoreWebVitals,
  assertPerformance,
  logPerformanceReport,
  getResourceBreakdown,
  WEB_VITALS_THRESHOLDS,
} from './utils/performance';
import { waitForStable, disableAnimations } from './utils/reliability';

// Helper to dismiss modals
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

test.describe('Performance - Landing Page', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    const metrics = await measurePageLoad(page);
    logPerformanceReport(metrics, 'Landing Page');

    // Assert performance thresholds
    expect(metrics.ttfb).toBeLessThan(WEB_VITALS_THRESHOLDS.TTFB.needsImprovement);
    expect(metrics.loadComplete).toBeLessThan(5000); // 5 seconds max

    // Check Core Web Vitals
    const vitals = await measureCoreWebVitals(page, 5000);

    if (vitals.fcp) {
      expect(vitals.fcp).toBeLessThan(WEB_VITALS_THRESHOLDS.FCP.needsImprovement);
    }

    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(WEB_VITALS_THRESHOLDS.LCP.needsImprovement);
    }

    if (vitals.cls !== undefined) {
      expect(vitals.cls).toBeLessThan(WEB_VITALS_THRESHOLDS.CLS.needsImprovement);
    }
  });

  test('should have reasonable resource count and size', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    const metrics = await measurePageLoad(page);

    // Resource count should be manageable
    expect(metrics.resourceCount).toBeLessThan(100);

    // Total transfer size should be under 3MB
    expect(metrics.totalTransferSize).toBeLessThan(3 * 1024 * 1024);

    // DOM should not be too complex
    if (metrics.domNodeCount) {
      expect(metrics.domNodeCount).toBeLessThan(2000);
    }
  });

  test('should have optimized resource breakdown', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    const breakdown = await getResourceBreakdown(page);

    console.log('Resource breakdown:');
    for (const [type, data] of Object.entries(breakdown)) {
      console.log(`  ${type}: ${data.count} resources, ${(data.size / 1024).toFixed(2)}KB`);
    }

    // Check specific resource types
    if (breakdown.img) {
      expect(breakdown.img.count).toBeLessThan(30);
    }

    if (breakdown.script) {
      expect(breakdown.script.count).toBeLessThan(20);
    }
  });
});

test.describe('Performance - App Page', () => {
  test('should load within acceptable time', async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);
    await waitForStable(page);

    const metrics = await measurePageLoad(page);
    logPerformanceReport(metrics, 'App Page');

    // App page has more complexity, allow longer load time
    expect(metrics.loadComplete).toBeLessThan(8000); // 8 seconds max
    expect(metrics.ttfb).toBeLessThan(WEB_VITALS_THRESHOLDS.TTFB.needsImprovement);
  });

  test('should maintain performance with interactions', async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);
    await waitForStable(page);

    // Measure initial state
    const initialMetrics = await measurePageLoad(page);

    // Perform some interactions
    const chatInput = page.getByRole('textbox', { name: /Ask about stocks/i });
    if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chatInput.fill('What is the price of AAPL?');
      await chatInput.clear();
    }

    // Measure after interactions
    const afterMetrics = await measurePageLoad(page);

    // DOM should not grow significantly
    if (initialMetrics.domNodeCount && afterMetrics.domNodeCount) {
      const growth = afterMetrics.domNodeCount / initialMetrics.domNodeCount;
      expect(growth).toBeLessThan(1.5); // Max 50% growth
    }
  });
});

test.describe('Performance - Navigation', () => {
  test('should have fast navigation between pages', async ({ page }) => {
    // Start at landing
    await page.goto('/');
    await waitForStable(page);

    // Navigate to app
    const startTime = Date.now();
    await page.getByRole('link', { name: 'Try Demo' }).click();
    await page.waitForURL(/\/app/);
    const appLoadTime = Date.now() - startTime;

    expect(appLoadTime).toBeLessThan(5000); // 5 seconds max for navigation

    await dismissModals(page);

    // Navigate to help
    const helpLink = page.getByRole('link', { name: 'Help' }).first();
    if (await helpLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      const helpStartTime = Date.now();
      await helpLink.click();
      await page.waitForURL(/\/help/);
      const helpLoadTime = Date.now() - helpStartTime;

      expect(helpLoadTime).toBeLessThan(3000); // 3 seconds max
    }
  });
});

test.describe('Performance - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should perform well on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    const metrics = await measurePageLoad(page);
    logPerformanceReport(metrics, 'Landing Page (Mobile)');

    // Mobile should still meet thresholds
    expect(metrics.ttfb).toBeLessThan(WEB_VITALS_THRESHOLDS.TTFB.needsImprovement);
    expect(metrics.loadComplete).toBeLessThan(6000); // 6 seconds max on mobile
  });
});

test.describe('Performance - Animation Impact', () => {
  test('should perform better with animations disabled', async ({ page }) => {
    // Disable animations
    await disableAnimations(page);

    await page.goto('/');
    await waitForStable(page);

    const metrics = await measurePageLoad(page);
    const vitals = await measureCoreWebVitals(page, 3000);

    // With animations disabled, CLS should be minimal
    if (vitals.cls !== undefined) {
      expect(vitals.cls).toBeLessThan(WEB_VITALS_THRESHOLDS.CLS.good);
    }
  });

  test('should have smooth animations when enabled', async ({ page }) => {
    // Set prefers-reduced-motion to no-preference
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await page.goto('/');
    await waitForStable(page);

    // Measure CLS during animation period
    const vitals = await measureCoreWebVitals(page, 5000);

    // Even with animations, CLS should be acceptable
    if (vitals.cls !== undefined) {
      expect(vitals.cls).toBeLessThan(WEB_VITALS_THRESHOLDS.CLS.needsImprovement);
    }
  });
});

test.describe('Performance - Caching', () => {
  test('should leverage browser caching on reload', async ({ page }) => {
    // First load
    await page.goto('/');
    await waitForStable(page);
    const firstLoadMetrics = await measurePageLoad(page);

    // Reload (should use cache)
    await page.reload();
    await waitForStable(page);
    const reloadMetrics = await measurePageLoad(page);

    console.log('First load:', firstLoadMetrics.loadComplete, 'ms');
    console.log('Reload:', reloadMetrics.loadComplete, 'ms');

    // Reload should be faster (cache hit)
    // Note: This may not always be true due to various factors
    // But transfer size should be lower
    expect(reloadMetrics.totalTransferSize).toBeLessThanOrEqual(firstLoadMetrics.totalTransferSize);
  });
});

test.describe('Performance Assertions', () => {
  test('should pass comprehensive performance check', async ({ page }) => {
    await page.goto('/');
    await waitForStable(page);

    // Use assertPerformance for comprehensive check
    await assertPerformance(page, {
      maxLoadTime: 8000,
      maxTTFB: 2000,
      maxFCP: 3000,
      maxLCP: 4000,
      maxCLS: 0.25,
      maxResourceCount: 150,
      maxTransferSize: 5 * 1024 * 1024, // 5MB
      maxDomNodes: 2500,
    });
  });
});
