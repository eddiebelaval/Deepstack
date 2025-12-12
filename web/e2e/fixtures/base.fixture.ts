import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model
 *
 * Provides common functionality for all page objects including:
 * - Modal dismissal (centralizes duplicated dismissModals function)
 * - Element existence checks
 * - Safe click operations
 * - Wait utilities
 * - Screenshot helpers
 * - Navigation helpers
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Dismiss onboarding and disclaimer modals
   * Centralizes the dismissModals function duplicated across 5 test files
   */
  async dismissModals(): Promise<void> {
    // Dismiss disclaimer if present
    const dismissDisclaimer = this.page.getByRole('button', { name: 'Dismiss disclaimer' });
    if (await dismissDisclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dismissDisclaimer.click();
    }

    // Skip onboarding tour if present
    const skipTour = this.page.getByRole('button', { name: 'Skip tour' });
    if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipTour.click();
    }

    // Close onboarding if present
    const closeOnboarding = this.page.getByRole('button', { name: 'Close onboarding' });
    if (await closeOnboarding.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeOnboarding.click();
    }
  }

  /**
   * Check if an element exists (is visible) with timeout
   */
  async exists(locator: Locator, timeout: number = 2000): Promise<boolean> {
    return await locator.isVisible({ timeout }).catch(() => false);
  }

  /**
   * Safely click an element with optional force
   * Useful when elements might be overlapped or not immediately clickable
   */
  async safeClick(locator: Locator, options?: { force?: boolean; timeout?: number }): Promise<void> {
    const timeout = options?.timeout || 2000;

    if (await this.exists(locator, timeout)) {
      await locator.click({ force: options?.force });
    }
  }

  /**
   * Wait for a specific timeout
   * Wrapper for page.waitForTimeout with better naming
   */
  async waitFor(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Wait for network idle state
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      // If network doesn't idle within 10s, continue anyway
    });
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Navigate to a URL and wait for load
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * Navigate to a URL, dismiss modals, and wait
   */
  async gotoAndDismissModals(url: string): Promise<void> {
    await this.goto(url);
    await this.dismissModals();
  }

  /**
   * Scroll to bottom of page (useful for footer elements)
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.waitFor(300); // Allow scroll animation to complete
  }

  /**
   * Scroll to top of page
   */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.waitFor(300);
  }

  /**
   * Get page content
   */
  async getContent(): Promise<string> {
    return await this.page.content();
  }

  /**
   * Check if page contains text
   */
  async containsText(text: string | RegExp): Promise<boolean> {
    const content = await this.getContent();
    if (typeof text === 'string') {
      return content.includes(text);
    }
    return text.test(content);
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Verify URL matches pattern
   */
  async verifyUrl(pattern: RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(locator: Locator, timeout: number = 5000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Fill an input field if it exists
   */
  async fillIfExists(locator: Locator, value: string, timeout: number = 2000): Promise<boolean> {
    if (await this.exists(locator, timeout)) {
      await locator.fill(value);
      return true;
    }
    return false;
  }

  /**
   * Click a link and verify navigation
   */
  async clickAndVerifyNavigation(locator: Locator, expectedUrlPattern: RegExp): Promise<void> {
    if (await this.exists(locator)) {
      await locator.click();
      await this.verifyUrl(expectedUrlPattern);
    }
  }

  /**
   * Set viewport size
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    await this.waitFor(300); // Allow layout to adjust
  }

  /**
   * Go offline
   */
  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true);
  }

  /**
   * Go online
   */
  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false);
  }

  /**
   * Block API requests (useful for testing error states)
   */
  async blockApiRequests(): Promise<void> {
    await this.page.route('**/api/**', route => route.abort());
  }

  /**
   * Block all network requests
   */
  async blockAllRequests(): Promise<void> {
    await this.page.route('**/*', route => route.abort());
  }

  /**
   * Mock API response
   */
  async mockApiResponse(pattern: string, response: { status: number; body?: unknown; contentType?: string }): Promise<void> {
    await this.page.route(pattern, route => {
      route.fulfill({
        status: response.status,
        contentType: response.contentType || 'application/json',
        body: response.body ? JSON.stringify(response.body) : undefined
      });
    });
  }

  /**
   * Add delay to API requests (simulate slow network)
   */
  async slowDownApiRequests(delayMs: number = 500): Promise<void> {
    await this.page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }

  /**
   * Get element text content
   */
  async getTextContent(locator: Locator): Promise<string | null> {
    if (await this.exists(locator)) {
      return await locator.textContent();
    }
    return null;
  }

  /**
   * Get input value
   */
  async getInputValue(locator: Locator): Promise<string> {
    return await locator.inputValue();
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Wait for selector with custom timeout
   */
  async waitForSelector(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }
}

/**
 * Common navigation helpers
 */
export class NavigationHelper extends BasePage {
  /**
   * Navigate to landing page
   */
  async goToLanding(): Promise<void> {
    await this.goto('/');
  }

  /**
   * Navigate to app
   */
  async goToApp(): Promise<void> {
    await this.goto('/app');
    await this.dismissModals();
  }

  /**
   * Navigate to login
   */
  async goToLogin(): Promise<void> {
    await this.goto('/login');
  }

  /**
   * Navigate to dashboard
   */
  async goToDashboard(): Promise<void> {
    await this.goto('/dashboard');
    await this.dismissModals();
  }

  /**
   * Navigate to help
   */
  async goToHelp(): Promise<void> {
    await this.goto('/help');
  }

  /**
   * Navigate to privacy page
   */
  async goToPrivacy(): Promise<void> {
    await this.goto('/privacy');
  }

  /**
   * Navigate to terms page
   */
  async goToTerms(): Promise<void> {
    await this.goto('/terms');
  }
}
