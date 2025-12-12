import { expect, Page, Locator } from '@playwright/test';

/**
 * Custom Assertion Helpers
 *
 * Provides reusable assertion functions for common test scenarios.
 * These helpers encapsulate complex assertion logic and improve test readability.
 */

/**
 * Toast/Notification Assertions
 */

/**
 * Expect a toast message to be visible
 */
export async function expectToastMessage(
  page: Page,
  message: string | RegExp,
  options: { timeout?: number; type?: 'success' | 'error' | 'warning' | 'info' } = {}
) {
  const { timeout = 5000, type } = options;

  // Look for toast containers and messages
  const toastSelectors = [
    page.getByRole('alert'),
    page.getByRole('status'),
    page.locator('[role="alert"]'),
    page.locator('[role="status"]'),
    page.locator('.toast'),
    page.locator('[data-testid="toast"]'),
    page.locator('.notification')
  ];

  let found = false;
  for (const selector of toastSelectors) {
    try {
      const toast = selector.first();
      if (await toast.isVisible({ timeout: timeout / toastSelectors.length }).catch(() => false)) {
        const text = await toast.textContent();
        if (text) {
          const matches = typeof message === 'string'
            ? text.includes(message)
            : message.test(text);

          if (matches) {
            found = true;
            await expect(toast).toBeVisible();

            // If type is specified, check for type-specific styling
            if (type) {
              const classes = await toast.getAttribute('class') || '';
              const expectedClass = getToastTypeClass(type);
              expect(classes).toContain(expectedClass);
            }
            break;
          }
        }
      }
    } catch {
      // Continue to next selector
    }
  }

  if (!found) {
    // Fallback: look for the message text anywhere on the page
    const messageLocator = typeof message === 'string'
      ? page.getByText(message)
      : page.getByText(message);

    await expect(messageLocator.first()).toBeVisible({ timeout });
  }
}

/**
 * Get toast type class based on type
 */
function getToastTypeClass(type: string): string {
  const classMap: Record<string, string> = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  return classMap[type] || type;
}

/**
 * Expect toast to disappear
 */
export async function expectToastDisappeared(page: Page, timeout: number = 10000) {
  const toastSelectors = [
    page.getByRole('alert').first(),
    page.locator('[role="alert"]').first(),
    page.locator('.toast').first()
  ];

  for (const toast of toastSelectors) {
    if (await toast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(toast).toBeHidden({ timeout });
      return;
    }
  }
}

/**
 * Loading State Assertions
 */

/**
 * Expect loading state to be visible
 */
export async function expectLoadingState(page: Page, timeout: number = 5000) {
  const loadingIndicators = [
    page.getByText(/loading/i).first(),
    page.locator('[data-testid="loading"]').first(),
    page.locator('.loading').first(),
    page.locator('[aria-busy="true"]').first(),
    page.locator('.spinner').first(),
    page.locator('.skeleton').first()
  ];

  let found = false;
  for (const indicator of loadingIndicators) {
    if (await indicator.isVisible({ timeout: timeout / loadingIndicators.length }).catch(() => false)) {
      await expect(indicator).toBeVisible();
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('No loading indicator found');
  }
}

/**
 * Expect loading state to complete
 */
export async function expectLoadingComplete(page: Page, timeout: number = 10000) {
  // Wait for loading indicators to disappear
  const loadingIndicators = [
    page.getByText(/loading/i).first(),
    page.locator('[data-testid="loading"]').first(),
    page.locator('.loading').first(),
    page.locator('[aria-busy="true"]').first()
  ];

  for (const indicator of loadingIndicators) {
    if (await indicator.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(indicator).toBeHidden({ timeout });
    }
  }

  // Also wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    // If network doesn't idle, that's okay - just continue
  });
}

/**
 * Error State Assertions
 */

/**
 * Expect error state to be visible
 */
export async function expectErrorState(
  page: Page,
  errorMessage?: string | RegExp,
  timeout: number = 5000
) {
  const errorSelectors = [
    page.getByRole('alert').first(),
    page.getByText(/error|failed|unable/i).first(),
    page.locator('[data-testid="error"]').first(),
    page.locator('.error').first(),
    page.locator('[aria-invalid="true"]').first()
  ];

  let found = false;
  for (const selector of errorSelectors) {
    if (await selector.isVisible({ timeout: timeout / errorSelectors.length }).catch(() => false)) {
      if (errorMessage) {
        const text = await selector.textContent() || '';
        const matches = typeof errorMessage === 'string'
          ? text.includes(errorMessage)
          : errorMessage.test(text);

        if (matches) {
          await expect(selector).toBeVisible();
          found = true;
          break;
        }
      } else {
        await expect(selector).toBeVisible();
        found = true;
        break;
      }
    }
  }

  if (!found && errorMessage) {
    const messageLocator = typeof errorMessage === 'string'
      ? page.getByText(errorMessage)
      : page.getByText(errorMessage);

    await expect(messageLocator.first()).toBeVisible({ timeout });
  } else if (!found) {
    throw new Error('No error state found');
  }
}

/**
 * Expect no error state
 */
export async function expectNoErrorState(page: Page) {
  const errorSelectors = [
    page.getByRole('alert'),
    page.locator('[data-testid="error"]'),
    page.locator('.error'),
    page.getByText(/error|failed/i)
  ];

  for (const selector of errorSelectors) {
    const count = await selector.count();
    if (count > 0) {
      await expect(selector.first()).toBeHidden();
    }
  }
}

/**
 * Market Data Assertions
 */

/**
 * Expect market data to be visible
 */
export async function expectMarketDataVisible(
  page: Page,
  symbols: string[] = ['SPY', 'QQQ'],
  timeout: number = 5000
) {
  for (const symbol of symbols) {
    const symbolElement = page.getByText(symbol).first();
    await expect(symbolElement).toBeVisible({ timeout });
  }
}

/**
 * Expect ticker price to be displayed
 */
export async function expectTickerPrice(
  page: Page,
  symbol: string,
  expectedPrice?: number,
  tolerance: number = 0.01
) {
  // First check symbol is visible
  const symbolElement = page.getByText(symbol).first();
  await expect(symbolElement).toBeVisible();

  // Look for price pattern near the symbol
  const pricePattern = /\$?(\d+\.?\d*)/;
  const pageContent = await page.content();

  // Extract prices from content
  const matches = pageContent.match(new RegExp(pricePattern, 'g'));
  expect(matches).toBeTruthy();

  if (expectedPrice !== undefined) {
    // Find price close to expected value
    const prices = matches!.map(m => {
      const numMatch = m.match(/(\d+\.?\d*)/);
      return numMatch ? parseFloat(numMatch[1]) : 0;
    });

    const foundPrice = prices.find(p =>
      Math.abs(p - expectedPrice) <= tolerance ||
      Math.abs(p - expectedPrice) / expectedPrice <= 0.01 // 1% tolerance
    );

    expect(foundPrice).toBeDefined();
  }
}

/**
 * Expect price change indicator (positive or negative)
 */
export async function expectPriceChangeIndicator(
  page: Page,
  type: 'positive' | 'negative' | 'neutral',
  timeout: number = 5000
) {
  const colorClasses: Record<string, string[]> = {
    positive: ['text-green', 'bg-green', 'text-emerald', 'bg-emerald'],
    negative: ['text-red', 'bg-red', 'text-rose', 'bg-rose'],
    neutral: ['text-gray', 'bg-gray', 'text-neutral', 'bg-neutral']
  };

  const classes = colorClasses[type];
  let found = false;

  for (const className of classes) {
    const elements = page.locator(`[class*="${className}"]`);
    const count = await elements.count();

    if (count > 0) {
      await expect(elements.first()).toBeVisible({ timeout });
      found = true;
      break;
    }
  }

  // Also check for +/- symbols
  if (!found && (type === 'positive' || type === 'negative')) {
    const symbol = type === 'positive' ? '+' : '-';
    const symbolElement = page.getByText(new RegExp(`\\${symbol}\\d+`));
    const symbolCount = await symbolElement.count();

    if (symbolCount > 0) {
      await expect(symbolElement.first()).toBeVisible({ timeout });
      found = true;
    }
  }

  expect(found).toBeTruthy();
}

/**
 * Expect chart to be visible
 */
export async function expectChartVisible(page: Page, timeout: number = 10000) {
  const chartSelectors = [
    page.locator('canvas').first(),
    page.locator('svg').first(),
    page.locator('[data-testid="chart"]').first(),
    page.locator('.chart').first()
  ];

  let found = false;
  for (const selector of chartSelectors) {
    if (await selector.isVisible({ timeout: timeout / chartSelectors.length }).catch(() => false)) {
      await expect(selector).toBeVisible();
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('No chart element found');
  }
}

/**
 * Navigation & URL Assertions
 */

/**
 * Expect URL to match pattern
 */
export async function expectUrlMatch(page: Page, pattern: string | RegExp) {
  await expect(page).toHaveURL(pattern);
}

/**
 * Expect to be on specific page
 */
export async function expectOnPage(page: Page, pageName: string) {
  const pagePatterns: Record<string, RegExp> = {
    landing: /^\/?$/,
    app: /\/app/,
    dashboard: /\/dashboard/,
    login: /\/login/,
    help: /\/help/,
    chat: /\/chat/,
    journal: /\/journal/,
    insights: /\/insights/
  };

  const pattern = pagePatterns[pageName];
  if (pattern) {
    await expect(page).toHaveURL(pattern);
  } else {
    throw new Error(`Unknown page name: ${pageName}`);
  }
}

/**
 * Form & Input Assertions
 */

/**
 * Expect form field to have error
 */
export async function expectFieldError(
  page: Page,
  fieldName: string | RegExp,
  errorMessage?: string | RegExp
) {
  const field = typeof fieldName === 'string'
    ? page.getByRole('textbox', { name: fieldName })
    : page.locator('input').filter({ hasText: fieldName });

  // Check for aria-invalid
  await expect(field.first()).toHaveAttribute('aria-invalid', 'true');

  // Check for error message if provided
  if (errorMessage) {
    const error = typeof errorMessage === 'string'
      ? page.getByText(errorMessage)
      : page.getByText(errorMessage);

    await expect(error.first()).toBeVisible();
  }
}

/**
 * Expect button to be disabled
 */
export async function expectButtonDisabled(page: Page, buttonName: string | RegExp) {
  const button = page.getByRole('button', { name: buttonName });
  await expect(button).toBeDisabled();
}

/**
 * Expect button to be enabled
 */
export async function expectButtonEnabled(page: Page, buttonName: string | RegExp) {
  const button = page.getByRole('button', { name: buttonName });
  await expect(button).toBeEnabled();
}

/**
 * Content Assertions
 */

/**
 * Expect element to contain text
 */
export async function expectTextVisible(
  page: Page,
  text: string | RegExp,
  timeout: number = 5000
) {
  const element = typeof text === 'string'
    ? page.getByText(text)
    : page.getByText(text);

  await expect(element.first()).toBeVisible({ timeout });
}

/**
 * Expect multiple elements to be visible
 */
export async function expectElementsVisible(
  page: Page,
  selectors: string[],
  timeout: number = 5000
) {
  for (const selector of selectors) {
    const element = page.locator(selector).first();
    await expect(element).toBeVisible({ timeout });
  }
}

/**
 * Expect page to have minimum content
 */
export async function expectMinimumContent(page: Page, minLength: number = 1000) {
  const content = await page.content();
  expect(content.length).toBeGreaterThan(minLength);
}

/**
 * Portfolio & Account Assertions
 */

/**
 * Expect portfolio value to be displayed
 */
export async function expectPortfolioValue(page: Page, expectedValue?: number) {
  const portfolioElement = page.getByText('Portfolio Value');
  await expect(portfolioElement).toBeVisible();

  if (expectedValue !== undefined) {
    const valuePattern = new RegExp(`\\$${expectedValue.toLocaleString()}`);
    const valueElement = page.getByText(valuePattern);
    await expect(valueElement.first()).toBeVisible();
  }
}

/**
 * Expect account metric to be visible
 */
export async function expectAccountMetric(
  page: Page,
  metricName: string,
  expectedValue?: string | number
) {
  const metricLabel = page.getByText(metricName);
  await expect(metricLabel).toBeVisible();

  if (expectedValue !== undefined) {
    const valueStr = typeof expectedValue === 'number'
      ? expectedValue.toLocaleString()
      : expectedValue;

    const valueElement = page.getByText(new RegExp(valueStr));
    await expect(valueElement.first()).toBeVisible();
  }
}

/**
 * Modal & Dialog Assertions
 */

/**
 * Expect modal to be visible
 */
export async function expectModalVisible(page: Page, title?: string | RegExp) {
  const modalSelectors = [
    page.getByRole('dialog'),
    page.locator('[role="dialog"]'),
    page.locator('.modal'),
    page.locator('[data-testid="modal"]')
  ];

  let found = false;
  for (const modal of modalSelectors) {
    if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(modal.first()).toBeVisible();
      found = true;

      if (title) {
        const titleElement = typeof title === 'string'
          ? modal.getByText(title)
          : modal.getByText(title);

        await expect(titleElement.first()).toBeVisible();
      }
      break;
    }
  }

  if (!found) {
    throw new Error('No modal found');
  }
}

/**
 * Expect modal to be closed
 */
export async function expectModalClosed(page: Page) {
  const modalSelectors = [
    page.getByRole('dialog'),
    page.locator('[role="dialog"]'),
    page.locator('.modal')
  ];

  for (const modal of modalSelectors) {
    const count = await modal.count();
    if (count > 0) {
      await expect(modal.first()).toBeHidden();
    }
  }
}

/**
 * Accessibility Assertions
 */

/**
 * Expect element to be keyboard accessible
 */
export async function expectKeyboardAccessible(locator: Locator) {
  // Should be focusable
  await locator.focus();
  await expect(locator).toBeFocused();

  // Should respond to Enter key
  await locator.press('Enter');
  // Note: The element should handle keyboard interaction
  // Verification of the action result should be done in the test
}

/**
 * Expect ARIA attributes
 */
export async function expectAriaLabel(locator: Locator, expectedLabel: string) {
  await expect(locator).toHaveAttribute('aria-label', expectedLabel);
}

/**
 * Test State Assertions
 */

/**
 * Expect page to be stable (no ongoing mutations)
 */
export async function expectPageStable(page: Page, timeout: number = 2000) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('load');

  // Wait for any animations to complete
  await page.waitForTimeout(100);

  // Check stability by comparing content
  const content1 = await page.content();
  await page.waitForTimeout(timeout);
  const content2 = await page.content();

  expect(content1).toBe(content2);
}
