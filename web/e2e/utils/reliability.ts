/**
 * Test Reliability Utilities
 *
 * Provides utilities to prevent flaky tests and improve test stability:
 * - Smart waiting strategies
 * - Retry mechanisms
 * - Network stability helpers
 * - Animation handling
 * - Deterministic timestamps
 *
 * Usage:
 *   import { waitForStable, retryOnFailure, mockTimestamps } from '../utils/reliability';
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Configuration for reliability utilities
 */
export const RELIABILITY_CONFIG = {
  defaultStabilityTimeout: 500,
  defaultRetryCount: 3,
  defaultRetryDelay: 1000,
  networkIdleTimeout: 5000,
  animationSettleTime: 300,
};

/**
 * Wait for page to be fully stable (no ongoing mutations)
 * Useful for preventing flaky tests due to animations or lazy loading
 */
export async function waitForStable(page: Page, timeout: number = 2000): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('load');

  // Wait for network to settle
  await page.waitForLoadState('networkidle', { timeout: RELIABILITY_CONFIG.networkIdleTimeout }).catch(() => {
    // Network may not idle, continue
  });

  // Wait for DOM stability by comparing snapshots
  let prevContent = '';
  let stableCount = 0;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout && stableCount < 3) {
    const currentContent = await page.content();
    if (currentContent === prevContent) {
      stableCount++;
    } else {
      stableCount = 0;
      prevContent = currentContent;
    }
    await page.waitForTimeout(100);
  }
}

/**
 * Wait for element to be stable (not animating)
 */
export async function waitForElementStable(
  locator: Locator,
  timeout: number = RELIABILITY_CONFIG.defaultStabilityTimeout
): Promise<void> {
  // Wait for element to be visible
  await locator.waitFor({ state: 'visible', timeout });

  // Wait for position stability
  let prevBox = await locator.boundingBox();
  let stableCount = 0;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout && stableCount < 3) {
    await locator.page().waitForTimeout(50);
    const currentBox = await locator.boundingBox();

    if (
      prevBox &&
      currentBox &&
      prevBox.x === currentBox.x &&
      prevBox.y === currentBox.y &&
      prevBox.width === currentBox.width &&
      prevBox.height === currentBox.height
    ) {
      stableCount++;
    } else {
      stableCount = 0;
      prevBox = currentBox;
    }
  }
}

/**
 * Retry an action on failure
 */
export async function retryOnFailure<T>(
  action: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    retries = RELIABILITY_CONFIG.defaultRetryCount,
    delay = RELIABILITY_CONFIG.defaultRetryDelay,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;

      if (onRetry) {
        onRetry(lastError, attempt);
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wait for a condition to be true with polling
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  options: {
    timeout?: number;
    pollInterval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 10000, pollInterval = 100, message = 'Condition not met' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

/**
 * Disable all animations on the page
 * Prevents flakiness from CSS transitions and animations
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Mock timestamps for deterministic date/time testing
 */
export async function mockTimestamps(page: Page, fixedDate: Date): Promise<void> {
  const timestamp = fixedDate.getTime();

  await page.addInitScript((ts) => {
    // Mock Date
    const OriginalDate = Date;
    (globalThis as unknown as { Date: typeof Date }).Date = class extends OriginalDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(ts);
        } else {
          // @ts-expect-error - spreading args to constructor
          super(...args);
        }
      }

      static now() {
        return ts;
      }
    } as typeof Date;
  }, timestamp);
}

/**
 * Wait for network requests to complete
 */
export async function waitForRequests(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number; minRequests?: number } = {}
): Promise<void> {
  const { timeout = 10000, minRequests = 1 } = options;

  let requestCount = 0;
  const requestPromises: Promise<void>[] = [];

  page.on('request', (request) => {
    const url = request.url();
    const matches = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);

    if (matches) {
      requestCount++;
      requestPromises.push(
        request.response().then(() => {
          // Response received
        })
      );
    }
  });

  // Wait for minimum number of requests
  const startTime = Date.now();
  while (requestCount < minRequests && Date.now() - startTime < timeout) {
    await page.waitForTimeout(100);
  }

  // Wait for all requests to complete
  await Promise.all(requestPromises);
}

/**
 * Scroll element into view and ensure it's interactive
 */
export async function scrollIntoViewAndWait(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await waitForElementStable(locator);

  // Ensure element is not covered by other elements
  await locator.waitFor({ state: 'visible' });
}

/**
 * Safe click that waits for element stability
 */
export async function safeClick(locator: Locator, options?: { force?: boolean }): Promise<void> {
  await scrollIntoViewAndWait(locator);
  await locator.click(options);
}

/**
 * Safe fill that clears field first
 */
export async function safeFill(locator: Locator, value: string): Promise<void> {
  await scrollIntoViewAndWait(locator);
  await locator.clear();
  await locator.fill(value);

  // Verify value was set
  await expect(locator).toHaveValue(value);
}

/**
 * Wait for API response and validate
 */
export async function waitForApiResponse<T>(
  page: Page,
  urlPattern: string | RegExp,
  options: {
    timeout?: number;
    validateStatus?: (status: number) => boolean;
    validateBody?: (body: T) => boolean;
  } = {}
): Promise<T> {
  const {
    timeout = 10000,
    validateStatus = (status) => status >= 200 && status < 300,
    validateBody,
  } = options;

  const response = await page.waitForResponse(
    (resp) => {
      const url = resp.url();
      const matches = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);

      if (!matches) return false;
      if (!validateStatus(resp.status())) return false;

      return true;
    },
    { timeout }
  );

  const body = (await response.json()) as T;

  if (validateBody && !validateBody(body)) {
    throw new Error(`API response validation failed for ${response.url()}`);
  }

  return body;
}

/**
 * Take a screenshot on failure (useful in afterEach hooks)
 */
export async function screenshotOnFailure(
  page: Page,
  testInfo: { status?: string; title: string },
  screenshotDir: string = 'test-results/screenshots'
): Promise<void> {
  if (testInfo.status !== 'passed') {
    const filename = testInfo.title.replace(/[^a-zA-Z0-9]/g, '_');
    await page.screenshot({
      path: `${screenshotDir}/${filename}-${Date.now()}.png`,
      fullPage: true,
    });
  }
}

/**
 * Clear all browser state (cookies, localStorage, etc.)
 */
export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Wait for fonts to be loaded
 * Prevents visual regression test flakiness
 */
export async function waitForFonts(page: Page, timeout: number = 5000): Promise<void> {
  await page.evaluate(async (timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await document.fonts.ready;
      clearTimeout(timeoutId);
    } catch {
      // Fonts loading timed out
    }
  }, timeout);
}

/**
 * Wait for images to be loaded
 */
export async function waitForImages(page: Page, timeout: number = 10000): Promise<void> {
  await page.evaluate(async (timeoutMs) => {
    const images = Array.from(document.images);
    const promises = images
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Image load timeout')), timeoutMs);
            img.onload = () => {
              clearTimeout(timeoutId);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeoutId);
              resolve(); // Don't fail on broken images
            };
          })
      );

    await Promise.all(promises);
  }, timeout);
}

/**
 * Generate unique test IDs to avoid collisions in parallel runs
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Retry wrapper for expect assertions
 */
export async function expectWithRetry<T>(
  getValue: () => Promise<T>,
  expectation: (value: T) => void,
  options: { retries?: number; delay?: number } = {}
): Promise<void> {
  const { retries = 3, delay = 500 } = options;

  await retryOnFailure(
    async () => {
      const value = await getValue();
      expectation(value);
    },
    { retries, delay }
  );
}
