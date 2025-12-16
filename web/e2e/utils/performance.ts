/**
 * Performance Monitoring Utilities for E2E Tests
 *
 * Provides utilities for measuring and asserting on performance metrics
 * including Core Web Vitals, navigation timing, and custom metrics.
 *
 * Usage:
 *   import { measurePageLoad, measureCoreWebVitals, assertPerformance } from '../utils/performance';
 */

import { Page, expect } from '@playwright/test';

/**
 * Core Web Vitals thresholds (based on Google recommendations)
 */
export const WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint (in ms)
  LCP: {
    good: 2500,
    needsImprovement: 4000,
  },
  // First Input Delay (in ms)
  FID: {
    good: 100,
    needsImprovement: 300,
  },
  // Cumulative Layout Shift (unitless)
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  // First Contentful Paint (in ms)
  FCP: {
    good: 1800,
    needsImprovement: 3000,
  },
  // Time to First Byte (in ms)
  TTFB: {
    good: 800,
    needsImprovement: 1800,
  },
  // Interaction to Next Paint (in ms)
  INP: {
    good: 200,
    needsImprovement: 500,
  },
};

/**
 * Performance metrics collected from a page
 */
export interface PerformanceMetrics {
  // Navigation Timing
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  ttfb: number;

  // Core Web Vitals
  fcp?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
  inp?: number;

  // Resource metrics
  resourceCount: number;
  totalTransferSize: number;
  totalDecodedSize: number;

  // Custom metrics
  jsHeapSize?: number;
  domNodeCount?: number;
}

/**
 * Measure page load performance metrics
 */
export async function measurePageLoad(page: Page): Promise<PerformanceMetrics> {
  // Wait for page to fully load
  await page.waitForLoadState('load');

  const metrics = await page.evaluate(() => {
    const timing = performance.timing;
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    // Calculate navigation metrics
    const navigationStart = timing.navigationStart;
    const domContentLoaded = timing.domContentLoadedEventEnd - navigationStart;
    const loadComplete = timing.loadEventEnd - navigationStart;
    const ttfb = timing.responseStart - navigationStart;

    // Calculate resource metrics
    const resourceCount = entries.length;
    const totalTransferSize = entries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
    const totalDecodedSize = entries.reduce((sum, e) => sum + (e.decodedBodySize || 0), 0);

    // Get memory info if available
    const memoryInfo = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const jsHeapSize = memoryInfo?.usedJSHeapSize;

    // Get DOM node count
    const domNodeCount = document.querySelectorAll('*').length;

    return {
      navigationStart,
      domContentLoaded,
      loadComplete,
      ttfb,
      resourceCount,
      totalTransferSize,
      totalDecodedSize,
      jsHeapSize,
      domNodeCount,
    };
  });

  return metrics;
}

/**
 * Measure Core Web Vitals using PerformanceObserver
 */
export async function measureCoreWebVitals(
  page: Page,
  timeout: number = 10000
): Promise<Partial<Pick<PerformanceMetrics, 'fcp' | 'lcp' | 'cls'>>> {
  const vitals = await page.evaluate(async (timeoutMs) => {
    return new Promise<{ fcp?: number; lcp?: number; cls?: number }>((resolve) => {
      const result: { fcp?: number; lcp?: number; cls?: number } = {};

      // FCP Observer
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          result.fcp = fcpEntry.startTime;
        }
      }).observe({ entryTypes: ['paint'] });

      // LCP Observer
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (lastEntry) {
          result.lcp = lastEntry.startTime;
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // CLS Observer
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
        result.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });

      // Resolve after timeout
      setTimeout(() => resolve(result), timeoutMs);
    });
  }, timeout);

  return vitals;
}

/**
 * Assert page performance meets thresholds
 */
export async function assertPerformance(
  page: Page,
  options: {
    maxLoadTime?: number;
    maxTTFB?: number;
    maxFCP?: number;
    maxLCP?: number;
    maxCLS?: number;
    maxResourceCount?: number;
    maxTransferSize?: number; // in bytes
    maxDomNodes?: number;
  } = {}
): Promise<void> {
  const {
    maxLoadTime = 10000,
    maxTTFB = WEB_VITALS_THRESHOLDS.TTFB.needsImprovement,
    maxFCP = WEB_VITALS_THRESHOLDS.FCP.needsImprovement,
    maxLCP = WEB_VITALS_THRESHOLDS.LCP.needsImprovement,
    maxCLS = WEB_VITALS_THRESHOLDS.CLS.needsImprovement,
    maxResourceCount = 200,
    maxTransferSize = 5 * 1024 * 1024, // 5MB
    maxDomNodes = 3000,
  } = options;

  const metrics = await measurePageLoad(page);

  // Assert on metrics
  expect(metrics.loadComplete).toBeLessThan(maxLoadTime);
  expect(metrics.ttfb).toBeLessThan(maxTTFB);
  expect(metrics.resourceCount).toBeLessThan(maxResourceCount);
  expect(metrics.totalTransferSize).toBeLessThan(maxTransferSize);

  if (metrics.domNodeCount !== undefined) {
    expect(metrics.domNodeCount).toBeLessThan(maxDomNodes);
  }

  // Measure Core Web Vitals
  const vitals = await measureCoreWebVitals(page, 3000);

  if (vitals.fcp !== undefined) {
    expect(vitals.fcp).toBeLessThan(maxFCP);
  }

  if (vitals.lcp !== undefined) {
    expect(vitals.lcp).toBeLessThan(maxLCP);
  }

  if (vitals.cls !== undefined) {
    expect(vitals.cls).toBeLessThan(maxCLS);
  }
}

/**
 * Measure interaction performance (click response time)
 */
export async function measureInteraction(
  page: Page,
  action: () => Promise<void>,
  expectedChange: () => Promise<void>
): Promise<number> {
  const startTime = Date.now();

  await action();
  await expectedChange();

  const endTime = Date.now();
  return endTime - startTime;
}

/**
 * Measure API response times
 */
export async function measureApiResponseTime(
  page: Page,
  urlPattern: string | RegExp
): Promise<{ url: string; duration: number }[]> {
  const responses: { url: string; duration: number }[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    const matches =
      typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);

    if (matches) {
      const timing = response.request().timing();
      if (timing) {
        responses.push({
          url,
          duration: timing.responseEnd - timing.requestStart,
        });
      }
    }
  });

  return responses;
}

/**
 * Log performance metrics to console (useful for CI)
 */
export function logPerformanceReport(metrics: PerformanceMetrics, label: string = 'Page'): void {
  console.log(`\n📊 Performance Report: ${label}`);
  console.log('─'.repeat(50));
  console.log(`  TTFB: ${metrics.ttfb}ms`);
  console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
  console.log(`  Load Complete: ${metrics.loadComplete}ms`);
  console.log(`  Resources: ${metrics.resourceCount}`);
  console.log(`  Transfer Size: ${(metrics.totalTransferSize / 1024).toFixed(2)}KB`);
  console.log(`  DOM Nodes: ${metrics.domNodeCount}`);

  if (metrics.jsHeapSize) {
    console.log(`  JS Heap: ${(metrics.jsHeapSize / 1024 / 1024).toFixed(2)}MB`);
  }

  console.log('─'.repeat(50));
}

/**
 * Wait for network to be idle with custom timeout
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    // Network didn't idle within timeout, continue anyway
  });
}

/**
 * Get resource breakdown by type
 */
export async function getResourceBreakdown(
  page: Page
): Promise<Record<string, { count: number; size: number }>> {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const breakdown: Record<string, { count: number; size: number }> = {};

    for (const entry of entries) {
      const type = entry.initiatorType || 'other';
      if (!breakdown[type]) {
        breakdown[type] = { count: 0, size: 0 };
      }
      breakdown[type].count++;
      breakdown[type].size += entry.transferSize || 0;
    }

    return breakdown;
  });
}

/**
 * Check if page has memory leaks (compare heap sizes over time)
 */
export async function checkMemoryLeaks(
  page: Page,
  action: () => Promise<void>,
  iterations: number = 5,
  threshold: number = 1.5 // 50% growth indicates potential leak
): Promise<{ hasLeak: boolean; growthRatio: number }> {
  // Get initial heap size
  const initialHeap = await page.evaluate(() => {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return memory?.usedJSHeapSize || 0;
  });

  // Perform action multiple times
  for (let i = 0; i < iterations; i++) {
    await action();

    // Force garbage collection if available
    await page.evaluate(() => {
      if (typeof (globalThis as unknown as { gc?: () => void }).gc === 'function') {
        (globalThis as unknown as { gc: () => void }).gc();
      }
    });
  }

  // Get final heap size
  const finalHeap = await page.evaluate(() => {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return memory?.usedJSHeapSize || 0;
  });

  const growthRatio = finalHeap / initialHeap;

  return {
    hasLeak: growthRatio > threshold,
    growthRatio,
  };
}
