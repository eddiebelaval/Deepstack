import { Page, Locator } from '@playwright/test';
import { BasePage } from '../fixtures/base.fixture';

/**
 * Dashboard Page Object Model
 *
 * Represents the dashboard page (/dashboard) with portfolio and automation controls.
 * Based on selectors from trading-flow.spec.ts and error-recovery.spec.ts
 */
export class DashboardPage extends BasePage {
  // Page Heading
  readonly dashboardHeading: Locator;

  // Account Summary Cards
  readonly portfolioValue: Locator;
  readonly cashDisplay: Locator;
  readonly buyingPower: Locator;
  readonly dayPnl: Locator;

  // Automation Controls
  readonly automationStatusBadge: Locator;
  readonly startButton: Locator;
  readonly stopButton: Locator;
  readonly refreshButton: Locator;

  // Additional elements
  readonly activeStatusBadge: Locator;
  readonly inactiveStatusBadge: Locator;

  constructor(page: Page) {
    super(page);

    // Heading
    this.dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });

    // Account Summary
    this.portfolioValue = page.getByText('Portfolio Value');
    this.cashDisplay = page.getByText('Cash');
    this.buyingPower = page.getByText('Buying Power');
    this.dayPnl = page.getByText(/Day P&L|Day PnL/i);

    // Automation Controls
    this.startButton = page.getByRole('button', { name: 'Start' });
    this.stopButton = page.getByRole('button', { name: 'Stop' });
    this.refreshButton = page.getByRole('button', { name: 'Refresh' });

    // Status Badges
    this.activeStatusBadge = page.locator('.bg-green-900').first();
    this.inactiveStatusBadge = page.locator('.bg-slate-800').first();
    this.automationStatusBadge = page.locator('.bg-green-900, .bg-slate-800').first();
  }

  /**
   * Navigate to dashboard page
   */
  async navigate(): Promise<void> {
    await this.gotoAndDismissModals('/dashboard');
  }

  /**
   * Navigate to dashboard and wait for data to load
   */
  async navigateAndWait(): Promise<void> {
    await this.navigate();
    await this.waitFor(1500); // Allow account data to load
  }

  /**
   * Click the Refresh button
   */
  async clickRefresh(): Promise<void> {
    if (await this.exists(this.refreshButton)) {
      await this.refreshButton.click();
      await this.waitFor(500); // Wait for loading state
    }
  }

  /**
   * Click the Start button (start automation)
   */
  async clickStart(): Promise<void> {
    if (await this.exists(this.startButton)) {
      await this.startButton.click();
      await this.waitFor(500);
    }
  }

  /**
   * Click the Stop button (stop automation)
   */
  async clickStop(): Promise<void> {
    if (await this.exists(this.stopButton)) {
      await this.stopButton.click();
      await this.waitFor(500);
    }
  }

  /**
   * Check if account summary cards are visible
   */
  async areAccountSummaryCardsVisible(): Promise<boolean> {
    return (
      await this.exists(this.portfolioValue) &&
      await this.exists(this.cashDisplay) &&
      await this.exists(this.buyingPower)
    );
  }

  /**
   * Check if automation controls are visible
   */
  async areAutomationControlsVisible(): Promise<boolean> {
    const hasStatusBadge = await this.exists(this.automationStatusBadge);
    const hasStartButton = await this.exists(this.startButton);
    const hasStopButton = await this.exists(this.stopButton);
    const hasRefreshButton = await this.exists(this.refreshButton);

    return hasStatusBadge && hasStartButton && hasStopButton && hasRefreshButton;
  }

  /**
   * Get automation status (active or inactive)
   */
  async getAutomationStatus(): Promise<'active' | 'inactive' | 'unknown'> {
    if (await this.exists(this.activeStatusBadge)) {
      return 'active';
    }
    if (await this.exists(this.inactiveStatusBadge)) {
      return 'inactive';
    }
    return 'unknown';
  }

  /**
   * Check if portfolio value is displayed
   */
  async isPortfolioValueVisible(): Promise<boolean> {
    return await this.exists(this.portfolioValue);
  }

  /**
   * Check if cash display is visible
   */
  async isCashDisplayVisible(): Promise<boolean> {
    return await this.exists(this.cashDisplay);
  }

  /**
   * Check if buying power is visible
   */
  async isBuyingPowerVisible(): Promise<boolean> {
    return await this.exists(this.buyingPower);
  }

  /**
   * Verify dashboard page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await this.verifyUrl(/\/dashboard/);
    await this.waitForElement(this.dashboardHeading);
  }

  /**
   * Wait for account data to load
   * Checks if portfolio value becomes visible
   */
  async waitForAccountData(timeout: number = 5000): Promise<boolean> {
    return await this.exists(this.portfolioValue, timeout);
  }

  /**
   * Refresh and wait for data reload
   */
  async refreshAndWaitForData(): Promise<void> {
    await this.clickRefresh();
    await this.waitFor(1000);
    await this.waitForAccountData();
  }

  /**
   * Check if page shows error state
   */
  async hasErrorMessage(): Promise<boolean> {
    const errorText = this.page.getByText(/failed|error|unable/i);
    return await this.exists(errorText.first(), 3000);
  }

  /**
   * Check if retry button is available after error
   */
  async hasRetryButton(): Promise<boolean> {
    const retryButton = this.page.getByRole('button', { name: /retry|try again|refresh/i });
    return await this.exists(retryButton.first());
  }

  /**
   * Get portfolio value text if available
   */
  async getPortfolioValueText(): Promise<string | null> {
    return await this.getTextContent(this.portfolioValue);
  }

  /**
   * Get cash value text if available
   */
  async getCashValueText(): Promise<string | null> {
    return await this.getTextContent(this.cashDisplay);
  }

  /**
   * Check if dashboard has loaded with data or shows loading/error state
   */
  async getDashboardLoadState(): Promise<'loaded' | 'loading' | 'error'> {
    // Check if data is visible
    if (await this.areAccountSummaryCardsVisible()) {
      return 'loaded';
    }

    // Check for error message
    if (await this.hasErrorMessage()) {
      return 'error';
    }

    // Otherwise assume loading
    return 'loading';
  }
}
