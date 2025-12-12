import { test, expect } from '@playwright/test';
import { LandingPage, AppPage, LoginPage, DashboardPage } from './pages';

/**
 * Example tests demonstrating Page Object Model usage
 *
 * These tests show how to use the new POM structure.
 * After reviewing, you can migrate existing tests to use these patterns.
 *
 * NOTE: Some tests are marked .skip because they are TEMPLATES showing patterns,
 * not actual tests. They may need customization for your specific app state.
 */

test.describe('Page Object Model Examples', () => {
  test.describe('Landing Page Examples', () => {
    test('should navigate and interact with landing page', async ({ page }) => {
      const landingPage = new LandingPage(page);

      // Navigate to landing page
      await landingPage.navigate();

      // Verify page loaded
      await landingPage.verifyPageTitle();

      // Check above-the-fold sections are visible
      expect(await landingPage.areHeroElementsVisible()).toBeTruthy();
      expect(await landingPage.areNavigationLinksVisible()).toBeTruthy();

      // Navigate to app (test core POM navigation)
      await landingPage.clickTryDemo();
    });

    test('should navigate to different pages from landing', async ({ page }) => {
      const landingPage = new LandingPage(page);

      await landingPage.navigate();

      // Test different navigation paths
      await landingPage.clickStartFreeAnalysis();
      await expect(page).toHaveURL(/\/app/);

      // Navigate back
      await landingPage.navigate();
      await landingPage.clickHelp();
      await expect(page).toHaveURL(/\/help/);

      // Test footer navigation
      await landingPage.navigate();
      await landingPage.clickTermsInFooter();
      await expect(page).toHaveURL(/\/terms/);
    });
  });

  test.describe('App Page Examples', () => {
    test('should interact with app page elements', async ({ page }) => {
      const appPage = new AppPage(page);

      // Navigate with automatic modal dismissal
      await appPage.navigate();

      // Verify core UI loaded
      expect(await appPage.isCoreUiLoaded()).toBeTruthy();

      // Type in chat
      await appPage.typeInChat('What is the price of AAPL?');
      expect(await appPage.getChatInputValue()).toBe('What is the price of AAPL?');

      // Wait for market data
      await appPage.waitForMarketData();

      // Check tickers
      const tickerCount = await appPage.countVisibleTickers();
      expect(tickerCount).toBeGreaterThanOrEqual(2);

      // Switch timeframe
      await appPage.selectTimeframe('1W');

      // Toggle market watch
      await appPage.toggleMarketWatch();
    });

    test('should verify market data loaded', async ({ page }) => {
      const appPage = new AppPage(page);

      await appPage.navigateAndWait();

      // Check if specific tickers are visible
      if (await appPage.isTickerVisible('SPY')) {
        await expect(appPage.spyTicker).toBeVisible();
      }

      if (await appPage.isTickerVisible('QQQ')) {
        await expect(appPage.qqqTicker).toBeVisible();
      }

      // Verify price data exists
      expect(await appPage.hasPriceData()).toBeTruthy();

      // Check timeframes
      const timeframeCount = await appPage.countVisibleTimeframes();
      expect(timeframeCount).toBeGreaterThanOrEqual(2);
    });

    test('should interact with widgets', async ({ page }) => {
      const appPage = new AppPage(page);

      await appPage.navigate();

      // Check widgets panel
      if (await appPage.isWidgetsPanelVisible()) {
        await expect(appPage.widgetsPanel).toBeVisible();
      }

      // Click add widget
      await appPage.clickAddWidget();

      // Check if dialog opened
      if (await appPage.isDialogOrMenuOpen()) {
        // Dialog is open
        await appPage.screenshot('add-widget-dialog');
      }
    });
  });

  test.describe('Login Page Examples', () => {
    test('should handle login page or redirect', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.navigate();

      // Handle potential redirect
      const state = await loginPage.handlePotentialRedirect();

      if (state === 'login') {
        // On login page
        expect(await loginPage.isLogoVisible()).toBeTruthy();

        // Check if magic link form is available
        if (await loginPage.isMagicLinkFormAvailable()) {
          await loginPage.enterEmail('test@example.com');
          expect(await loginPage.getEmailValue()).toBe('test@example.com');
        }

        // Check if Google sign in is available
        if (await loginPage.isGoogleSignInAvailable()) {
          await expect(loginPage.googleSignInButton).toBeVisible();
        }
      } else {
        // Redirected (already logged in)
        expect(await loginPage.isLogoVisible()).toBeTruthy();
      }
    });
  });

  test.describe('Dashboard Page Examples', () => {
    test('should interact with dashboard', async ({ page }) => {
      const appPage = new AppPage(page);
      const dashboardPage = new DashboardPage(page);

      // Navigate to app first
      await appPage.navigate();

      // Navigate to dashboard if link exists
      if (await appPage.exists(appPage.dashboardLink)) {
        await appPage.goToDashboard();

        // Verify dashboard loaded
        await dashboardPage.verifyPageLoaded();

        // Wait for account data
        if (await dashboardPage.waitForAccountData()) {
          // Data loaded successfully
          expect(await dashboardPage.areAccountSummaryCardsVisible()).toBeTruthy();
        }

        // Test automation controls
        if (await dashboardPage.areAutomationControlsVisible()) {
          await expect(dashboardPage.startButton).toBeVisible();
          await expect(dashboardPage.stopButton).toBeVisible();
          await expect(dashboardPage.refreshButton).toBeVisible();
        }

        // Refresh data
        await dashboardPage.clickRefresh();
      }
    });

    test('should check dashboard load states', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      await dashboardPage.navigate();

      // Get load state
      const loadState = await dashboardPage.getDashboardLoadState();

      if (loadState === 'loaded') {
        expect(await dashboardPage.areAccountSummaryCardsVisible()).toBeTruthy();
      } else if (loadState === 'error') {
        expect(await dashboardPage.hasErrorMessage()).toBeTruthy();

        // Check for retry option
        if (await dashboardPage.hasRetryButton()) {
          await dashboardPage.screenshot('error-with-retry');
        }
      }
    });
  });

  test.describe('Complete User Flow Examples', () => {
    test('user journey from landing to dashboard', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const appPage = new AppPage(page);
      const dashboardPage = new DashboardPage(page);

      // Start at landing
      await landingPage.navigate();
      await expect(landingPage.logo).toBeVisible();

      // Navigate to app
      await landingPage.clickTryDemo();

      // Verify app loaded
      await appPage.verifyPageLoaded();
      expect(await appPage.isCoreUiLoaded()).toBeTruthy();

      // Wait for market data
      await appPage.waitForMarketData();

      // Type in chat
      await appPage.typeInChat('Analyze my portfolio');

      // Navigate to dashboard if available
      if (await appPage.exists(appPage.dashboardLink)) {
        await appPage.goToDashboard();

        // Verify dashboard
        await dashboardPage.verifyPageLoaded();
      }
    });

    test('test with network mocking', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      // Mock API error
      await dashboardPage.mockApiResponse('**/api/account**', {
        status: 500,
        body: { error: 'Internal Server Error' }
      });

      await dashboardPage.navigate();

      // Check error handling
      const loadState = await dashboardPage.getDashboardLoadState();
      expect(loadState).toBe('error');
    });

    test('test offline behavior', async ({ page }) => {
      const appPage = new AppPage(page);

      // Load app first
      await appPage.navigate();
      await appPage.waitFor(1000);

      // Verify app is working
      await expect(appPage.welcomeHeading).toBeVisible();

      // Go offline
      await appPage.goOffline();
      await appPage.waitFor(1000);

      // App should maintain current state
      if (await appPage.exists(appPage.welcomeHeading)) {
        await expect(appPage.welcomeHeading).toBeVisible();
      }

      // Go back online
      await appPage.goOnline();
      await appPage.waitFor(1000);

      // App should recover
      await expect(appPage.welcomeHeading).toBeVisible();
    });
  });

  test.describe('Base Method Examples', () => {
    test('using base methods for common tasks', async ({ page }) => {
      const appPage = new AppPage(page);

      await appPage.navigate();

      // Safe click - only clicks if element exists
      await appPage.safeClick(appPage.marketWatchButton);

      // Check existence with timeout
      const hasAnalyzeButton = await appPage.exists(appPage.analyzePortfolioButton, 2000);
      if (hasAnalyzeButton) {
        await appPage.clickAnalyzePortfolio();
      }

      // Get text content
      const welcomeText = await appPage.getTextContent(appPage.welcomeHeading);
      expect(welcomeText).toContain('DeepStack');

      // Check if page contains text
      const hasTickers = await appPage.containsText(/SPY|QQQ|DIA/);
      expect(hasTickers).toBeTruthy();

      // Scroll operations
      await appPage.scrollToBottom();
      await appPage.scrollToTop();
    });

    test('using viewport and screenshot helpers', async ({ page }) => {
      const landingPage = new LandingPage(page);

      await landingPage.navigate();

      // Mobile viewport
      await landingPage.setViewport(375, 667);
      await landingPage.screenshot('landing-mobile');

      // Tablet viewport
      await landingPage.setViewport(768, 1024);
      await landingPage.screenshot('landing-tablet');

      // Desktop viewport
      await landingPage.setViewport(1920, 1080);
      await landingPage.screenshot('landing-desktop');
    });
  });
});
