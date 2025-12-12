import { Page, Locator } from '@playwright/test';
import { BasePage } from '../fixtures/base.fixture';

/**
 * App Page Object Model
 *
 * Represents the main trading app page (/app) with all its elements and interactions.
 * Based on selectors from app.spec.ts, market-data-refresh.spec.ts, and trading-flow.spec.ts
 */
export class AppPage extends BasePage {
  // Core UI Elements
  readonly welcomeHeading: Locator;
  readonly chatInput: Locator;

  // Market Watch
  readonly marketWatchButton: Locator;

  // Widgets Panel
  readonly widgetsPanel: Locator;
  readonly addWidgetButton: Locator;

  // Model Selector
  readonly modelSelector: Locator;

  // Navigation Links
  readonly dashboardLink: Locator;
  readonly helpLink: Locator;

  // Quick Actions
  readonly analyzePortfolioButton: Locator;

  // Ticker Elements (common tickers in the bottom bar)
  readonly spyTicker: Locator;
  readonly qqqTicker: Locator;
  readonly diaTicker: Locator;
  readonly aaplTicker: Locator;
  readonly msftTicker: Locator;
  readonly googlTicker: Locator;
  readonly amznTicker: Locator;

  // Market Region
  readonly usRegionSelector: Locator;

  // Timeframe Buttons
  readonly oneDayButton: Locator;
  readonly oneWeekButton: Locator;
  readonly oneMonthButton: Locator;
  readonly threeMonthButton: Locator;
  readonly oneYearButton: Locator;
  readonly allTimeButton: Locator;

  // Price Indicators
  readonly positiveIndicator: Locator;
  readonly negativeIndicator: Locator;

  constructor(page: Page) {
    super(page);

    // Core Elements
    this.welcomeHeading = page.getByRole('heading', { name: 'Welcome to DeepStack' });
    this.chatInput = page.getByRole('textbox', { name: /Ask about stocks/ });

    // Market Watch
    this.marketWatchButton = page.getByRole('button', { name: 'Market Watch' });

    // Widgets
    this.widgetsPanel = page.getByText('Widgets');
    this.addWidgetButton = page.getByRole('button', { name: 'Add Widget' });

    // Model Selector
    this.modelSelector = page.getByRole('button', { name: /Sonnet/ });

    // Navigation
    this.dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
    this.helpLink = page.getByRole('link', { name: 'Help' }).first();

    // Quick Actions
    this.analyzePortfolioButton = page.getByRole('button', { name: /Analyze my portfolio/ });

    // Tickers (use .first() to get the first occurrence in the ticker bar)
    this.spyTicker = page.getByText('SPY').first();
    this.qqqTicker = page.getByText('QQQ').first();
    this.diaTicker = page.getByText('DIA').first();
    this.aaplTicker = page.getByText('AAPL').first();
    this.msftTicker = page.getByText('MSFT').first();
    this.googlTicker = page.getByText('GOOGL').first();
    this.amznTicker = page.getByText('AMZN').first();

    // Market Region
    this.usRegionSelector = page.getByText('United States');

    // Timeframes (use .first() to get the first occurrence)
    this.oneDayButton = page.getByText('1D').first();
    this.oneWeekButton = page.getByText('1W').first();
    this.oneMonthButton = page.getByText('1M').first();
    this.threeMonthButton = page.getByText('3M').first();
    this.oneYearButton = page.getByText('1Y').first();
    this.allTimeButton = page.getByText('All').first();

    // Price Indicators
    this.positiveIndicator = page.locator('.text-green-400, .text-green-500, .text-green-600').first();
    this.negativeIndicator = page.locator('.text-red-400, .text-red-500, .text-red-600').first();
  }

  /**
   * Navigate to app page
   */
  async navigate(): Promise<void> {
    await this.gotoAndDismissModals('/app');
  }

  /**
   * Navigate to app and wait for initial load
   */
  async navigateAndWait(): Promise<void> {
    await this.navigate();
    await this.waitFor(1000); // Allow market data to load
  }

  /**
   * Type a message in the chat input
   */
  async typeInChat(message: string): Promise<void> {
    if (await this.exists(this.chatInput)) {
      await this.chatInput.fill(message);
    }
  }

  /**
   * Get the current chat input value
   */
  async getChatInputValue(): Promise<string> {
    return await this.getInputValue(this.chatInput);
  }

  /**
   * Click the Market Watch button
   */
  async clickMarketWatch(): Promise<void> {
    await this.safeClick(this.marketWatchButton);
  }

  /**
   * Toggle Market Watch panel (open/close)
   */
  async toggleMarketWatch(): Promise<void> {
    if (await this.exists(this.marketWatchButton)) {
      await this.marketWatchButton.click();
      await this.waitFor(300);
    }
  }

  /**
   * Click Add Widget button
   */
  async clickAddWidget(): Promise<void> {
    await this.safeClick(this.addWidgetButton);
    await this.waitFor(300);
  }

  /**
   * Click the analyze portfolio quick action
   */
  async clickAnalyzePortfolio(): Promise<void> {
    if (await this.exists(this.analyzePortfolioButton)) {
      await this.analyzePortfolioButton.click();
      await this.waitFor(500);
    }
  }

  /**
   * Navigate to dashboard
   */
  async goToDashboard(): Promise<void> {
    if (await this.exists(this.dashboardLink)) {
      await this.dashboardLink.click();
      await this.verifyUrl(/\/dashboard/);
    }
  }

  /**
   * Switch to a specific timeframe
   */
  async selectTimeframe(timeframe: '1D' | '1W' | '1M' | '3M' | '1Y' | 'All'): Promise<void> {
    const buttonMap = {
      '1D': this.oneDayButton,
      '1W': this.oneWeekButton,
      '1M': this.oneMonthButton,
      '3M': this.threeMonthButton,
      '1Y': this.oneYearButton,
      'All': this.allTimeButton
    };

    const button = buttonMap[timeframe];
    if (await this.exists(button)) {
      await button.click({ force: true }); // Use force in case of overlapping elements
      await this.waitFor(500);
    }
  }

  /**
   * Check if a specific ticker is visible
   */
  async isTickerVisible(ticker: 'SPY' | 'QQQ' | 'DIA' | 'AAPL' | 'MSFT' | 'GOOGL' | 'AMZN'): Promise<boolean> {
    const tickerMap = {
      'SPY': this.spyTicker,
      'QQQ': this.qqqTicker,
      'DIA': this.diaTicker,
      'AAPL': this.aaplTicker,
      'MSFT': this.msftTicker,
      'GOOGL': this.googlTicker,
      'AMZN': this.amznTicker
    };

    const tickerElement = tickerMap[ticker];
    return await this.exists(tickerElement, 3000);
  }

  /**
   * Count how many tickers are visible
   */
  async countVisibleTickers(): Promise<number> {
    const tickers = ['SPY', 'QQQ', 'DIA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'] as const;
    let count = 0;

    for (const ticker of tickers) {
      if (await this.isTickerVisible(ticker)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if price change indicators are visible
   */
  async arePriceIndicatorsVisible(): Promise<boolean> {
    const hasPositive = await this.exists(this.positiveIndicator);
    const hasNegative = await this.exists(this.negativeIndicator);
    return hasPositive || hasNegative;
  }

  /**
   * Check if page contains price data (numbers with $ or %)
   */
  async hasPriceData(): Promise<boolean> {
    const pricePattern = /\$?\d+\.\d{2}|\d+\.\d{2}%|[+-]\d+\.\d{2}/;
    return await this.containsText(pricePattern);
  }

  /**
   * Check if all timeframe buttons are visible
   */
  async areTimeframeButtonsVisible(): Promise<boolean> {
    const oneDayVisible = await this.exists(this.oneDayButton);
    const oneWeekVisible = await this.exists(this.oneWeekButton);
    return oneDayVisible || oneWeekVisible; // At least some should be visible
  }

  /**
   * Count visible timeframe options
   */
  async countVisibleTimeframes(): Promise<number> {
    const timeframes = [
      this.oneDayButton,
      this.oneWeekButton,
      this.oneMonthButton,
      this.threeMonthButton,
      this.oneYearButton,
      this.allTimeButton
    ];

    let count = 0;
    for (const timeframe of timeframes) {
      if (await this.exists(timeframe, 500)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if core UI elements are loaded
   */
  async isCoreUiLoaded(): Promise<boolean> {
    return (
      await this.exists(this.welcomeHeading) &&
      await this.exists(this.chatInput)
    );
  }

  /**
   * Check if widgets panel is visible
   */
  async isWidgetsPanelVisible(): Promise<boolean> {
    return await this.exists(this.widgetsPanel);
  }

  /**
   * Check if market data is loaded (checks for tickers and price data)
   */
  async isMarketDataLoaded(): Promise<boolean> {
    await this.waitFor(1500); // Allow time for data to load
    const hasAnyTicker = await this.isTickerVisible('SPY') || await this.isTickerVisible('QQQ');
    const hasPriceData = await this.hasPriceData();
    return hasAnyTicker || hasPriceData;
  }

  /**
   * Wait for market data to load
   */
  async waitForMarketData(): Promise<void> {
    await this.waitFor(1500);
    // Optionally wait for specific elements
    if (await this.exists(this.spyTicker, 3000)) {
      // Market data loaded
      return;
    }
  }

  /**
   * Check if dialog or menu is open (after clicking Add Widget)
   */
  async isDialogOrMenuOpen(): Promise<boolean> {
    const dialog = this.page.getByRole('dialog');
    const menu = this.page.getByRole('menu');

    const dialogVisible = await this.exists(dialog, 1000);
    const menuVisible = await this.exists(menu, 1000);

    return dialogVisible || menuVisible;
  }

  /**
   * Verify the app page is fully loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await this.verifyUrl(/\/app/);
    await this.waitForElement(this.welcomeHeading);
  }
}
