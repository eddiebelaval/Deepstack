# Page Object Model (POM) Documentation

This directory contains the Page Object Model implementation for DeepStack E2E tests.

## Overview

The Page Object Model (POM) is a design pattern that creates an abstraction layer between test code and page-specific code. This improves test maintainability and reduces code duplication.

## Structure

```
e2e/
├── fixtures/
│   └── base.fixture.ts       # Base page class with common methods
├── pages/
│   ├── landing.page.ts       # Landing page selectors and methods
│   ├── app.page.ts           # Main app page selectors and methods
│   ├── login.page.ts         # Login page selectors and methods
│   ├── dashboard.page.ts     # Dashboard page selectors and methods
│   ├── index.ts              # Export all page objects
│   └── README.md             # This file
└── *.spec.ts                 # Test files
```

## Base Classes

### BasePage

Located in `fixtures/base.fixture.ts`, provides common functionality:

- **Modal Management**: `dismissModals()` - Centralized modal dismissal (was duplicated in 5 test files)
- **Element Checks**: `exists()`, `waitForElement()`
- **Safe Operations**: `safeClick()`, `fillIfExists()`
- **Navigation**: `goto()`, `gotoAndDismissModals()`, `verifyUrl()`
- **Scrolling**: `scrollToBottom()`, `scrollToTop()`
- **Network**: `goOffline()`, `goOnline()`, `blockApiRequests()`, `mockApiResponse()`
- **Screenshots**: `screenshot()`
- **Content**: `getContent()`, `containsText()`

### NavigationHelper

Extends `BasePage` with navigation shortcuts:
- `goToLanding()`, `goToApp()`, `goToLogin()`, `goToDashboard()`, `goToHelp()`, etc.

## Page Objects

### LandingPage

Represents the landing page (`/`) with:

**Selectors**:
- Navigation: `tryDemoLink`, `signInLink`, `helpLink`
- Hero: `logo`, `heroTitle`, `heroSubtitle`
- CTAs: `startFreeAnalysisButton`, `launchDeepStackButton`
- Features: `aiChatAssistantFeature`, `realTimeMarketDataFeature`, `emotionalFirewallFeature`
- Footer: `helpCenterLink`, `termsLink`, `privacyLink`, `id8labsLink`

**Methods**:
- `navigate()` - Go to landing page
- `clickTryDemo()` - Click Try Demo and verify navigation
- `clickSignIn()` - Click Sign In link
- `clickStartFreeAnalysis()` - Click Start Free Analysis CTA
- `clickLaunchDeepStack()` - Click Launch DeepStack CTA
- `clickHelp()` - Navigate to help
- `clickTermsInFooter()` - Scroll and click Terms
- `clickPrivacyInFooter()` - Scroll and click Privacy
- `areHeroElementsVisible()` - Check hero section
- `areNavigationLinksVisible()` - Check nav links
- `areFeatureHeadingsVisible()` - Check features
- `areCtaButtonsVisible()` - Check CTA buttons
- `areFooterLinksVisible()` - Check footer links

### AppPage

Represents the main app page (`/app`) with:

**Selectors**:
- Core: `welcomeHeading`, `chatInput`
- Market Watch: `marketWatchButton`
- Widgets: `widgetsPanel`, `addWidgetButton`
- Model: `modelSelector`
- Navigation: `dashboardLink`, `helpLink`
- Quick Actions: `analyzePortfolioButton`
- Tickers: `spyTicker`, `qqqTicker`, `diaTicker`, `aaplTicker`, `msftTicker`, `googlTicker`, `amznTicker`
- Region: `usRegionSelector`
- Timeframes: `oneDayButton`, `oneWeekButton`, `oneMonthButton`, `threeMonthButton`, `oneYearButton`, `allTimeButton`
- Price Indicators: `positiveIndicator`, `negativeIndicator`

**Methods**:
- `navigate()` - Go to app page and dismiss modals
- `navigateAndWait()` - Navigate and wait for market data
- `typeInChat(message)` - Type in chat input
- `getChatInputValue()` - Get chat input value
- `clickMarketWatch()` - Click Market Watch button
- `toggleMarketWatch()` - Open/close Market Watch
- `clickAddWidget()` - Open add widget dialog
- `clickAnalyzePortfolio()` - Click analyze portfolio quick action
- `goToDashboard()` - Navigate to dashboard
- `selectTimeframe(timeframe)` - Switch timeframe ('1D', '1W', '1M', '3M', '1Y', 'All')
- `isTickerVisible(ticker)` - Check if specific ticker is visible
- `countVisibleTickers()` - Count visible tickers
- `arePriceIndicatorsVisible()` - Check price change indicators
- `hasPriceData()` - Check for price patterns
- `areTimeframeButtonsVisible()` - Check timeframe buttons
- `countVisibleTimeframes()` - Count timeframe options
- `isCoreUiLoaded()` - Check core UI elements
- `isWidgetsPanelVisible()` - Check widgets panel
- `isMarketDataLoaded()` - Check if market data loaded
- `waitForMarketData()` - Wait for market data
- `isDialogOrMenuOpen()` - Check if dialog/menu is open

### LoginPage

Represents the login page (`/login`) with:

**Selectors**:
- Branding: `logo`
- Auth: `emailInput`, `sendMagicLinkButton`, `googleSignInButton`
- Footer: `privacyLink`, `termsLink`, `helpLink`, `id8labsLink`

**Methods**:
- `navigate()` - Go to login page
- `isOnLoginPage()` - Check if on login (not redirected)
- `enterEmail(email)` - Fill email input
- `clickSendMagicLink()` - Click Send Magic Link
- `clickGoogleSignIn()` - Click Google Sign In
- `submitMagicLinkForm(email)` - Fill and submit form
- `getEmailValue()` - Get email input value
- `isLogoVisible()` - Check logo
- `isGoogleSignInAvailable()` - Check Google option
- `isMagicLinkFormAvailable()` - Check magic link form
- `areFooterLinksVisible()` - Check footer
- `clickPrivacy()`, `clickTerms()`, `clickHelp()` - Footer navigation
- `handlePotentialRedirect()` - Handle redirect after login

### DashboardPage

Represents the dashboard page (`/dashboard`) with:

**Selectors**:
- Heading: `dashboardHeading`
- Account: `portfolioValue`, `cashDisplay`, `buyingPower`, `dayPnl`
- Automation: `startButton`, `stopButton`, `refreshButton`, `automationStatusBadge`
- Status: `activeStatusBadge`, `inactiveStatusBadge`

**Methods**:
- `navigate()` - Go to dashboard
- `navigateAndWait()` - Navigate and wait for data
- `clickRefresh()` - Refresh account data
- `clickStart()` - Start automation
- `clickStop()` - Stop automation
- `areAccountSummaryCardsVisible()` - Check account cards
- `areAutomationControlsVisible()` - Check automation controls
- `getAutomationStatus()` - Get status ('active', 'inactive', 'unknown')
- `isPortfolioValueVisible()` - Check portfolio value
- `isCashDisplayVisible()` - Check cash display
- `isBuyingPowerVisible()` - Check buying power
- `waitForAccountData()` - Wait for data to load
- `refreshAndWaitForData()` - Refresh and wait
- `hasErrorMessage()` - Check for error
- `hasRetryButton()` - Check for retry button
- `getPortfolioValueText()` - Get portfolio value text
- `getCashValueText()` - Get cash value text
- `getDashboardLoadState()` - Get state ('loaded', 'loading', 'error')

## Usage Examples

### Basic Usage

```typescript
import { test } from '@playwright/test';
import { LandingPage } from './pages';

test('should navigate from landing to app', async ({ page }) => {
  const landingPage = new LandingPage(page);

  await landingPage.navigate();
  await landingPage.clickTryDemo();
  // Automatically verifies URL is /app
});
```

### Using Base Methods

```typescript
import { test } from '@playwright/test';
import { AppPage } from './pages';

test('should dismiss modals and interact with app', async ({ page }) => {
  const appPage = new AppPage(page);

  await appPage.navigate(); // Automatically dismisses modals
  await appPage.typeInChat('What is the price of AAPL?');

  // Use base methods
  if (await appPage.exists(appPage.analyzePortfolioButton)) {
    await appPage.clickAnalyzePortfolio();
  }
});
```

### Multiple Page Objects

```typescript
import { test } from '@playwright/test';
import { LandingPage, AppPage, DashboardPage } from './pages';

test('complete user flow', async ({ page }) => {
  const landingPage = new LandingPage(page);
  const appPage = new AppPage(page);
  const dashboardPage = new DashboardPage(page);

  // Navigate through pages
  await landingPage.navigate();
  await landingPage.clickTryDemo();

  // Interact with app
  await appPage.waitForMarketData();
  await appPage.goToDashboard();

  // Check dashboard
  await dashboardPage.verifyPageLoaded();
  await dashboardPage.clickRefresh();
});
```

### Using Safe Methods

```typescript
import { test } from '@playwright/test';
import { AppPage } from './pages';

test('conditional interactions', async ({ page }) => {
  const appPage = new AppPage(page);

  await appPage.navigate();

  // Safe click - only clicks if element exists
  await appPage.safeClick(appPage.marketWatchButton);

  // Fill if exists - returns true if filled
  const filled = await appPage.fillIfExists(appPage.chatInput, 'test message');

  // Check existence
  if (await appPage.isTickerVisible('SPY')) {
    // Do something
  }
});
```

### Network Mocking

```typescript
import { test } from '@playwright/test';
import { DashboardPage } from './pages';

test('handle API errors', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);

  // Mock API error
  await dashboardPage.mockApiResponse('**/api/account**', {
    status: 500,
    body: { error: 'Internal Server Error' }
  });

  await dashboardPage.navigate();

  // Check error handling
  if (await dashboardPage.hasErrorMessage()) {
    await dashboardPage.screenshot('error-state');
  }
});
```

### Viewport Testing

```typescript
import { test } from '@playwright/test';
import { LandingPage } from './pages';

test('responsive design', async ({ page }) => {
  const landingPage = new LandingPage(page);

  await landingPage.navigate();

  // Test mobile
  await landingPage.setViewport(375, 667);
  await landingPage.screenshot('mobile');

  // Test desktop
  await landingPage.setViewport(1920, 1080);
  await landingPage.screenshot('desktop');
});
```

## Migration Guide

### Before (without POM)

```typescript
test('old test', async ({ page }) => {
  await page.goto('/');

  // Dismiss modals manually
  const disclaimer = page.getByRole('button', { name: 'Dismiss disclaimer' });
  if (await disclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
    await disclaimer.click();
  }

  await page.getByRole('link', { name: 'Try Demo' }).click();
  await expect(page).toHaveURL(/\/app/);
});
```

### After (with POM)

```typescript
test('new test', async ({ page }) => {
  const landingPage = new LandingPage(page);

  await landingPage.navigate();
  await landingPage.dismissModals(); // Centralized
  await landingPage.clickTryDemo(); // Handles navigation verification
});
```

## Benefits

1. **DRY Principle**: `dismissModals()` was duplicated in 5 test files - now centralized
2. **Maintainability**: Selector changes only need updating in one place
3. **Readability**: Tests read like user actions: `landingPage.clickTryDemo()`
4. **Type Safety**: TypeScript provides autocomplete and type checking
5. **Reusability**: Common patterns (safe clicks, existence checks) in base class
6. **Error Handling**: Built-in error handling for common scenarios
7. **Documentation**: Self-documenting code with descriptive method names

## Best Practices

1. **Use Page Objects**: Always use page objects instead of raw selectors in tests
2. **Keep Tests Simple**: Tests should be high-level user flows, not implementation details
3. **Don't Test Page Objects**: Page objects are helpers, not units to test
4. **One Page Object Per Page**: Each URL/route should have its own page object
5. **Extend BasePage**: All page objects should extend BasePage for common functionality
6. **Return Types**: Methods that navigate should verify navigation succeeded
7. **Conditionals**: Use `exists()` for conditional logic instead of try-catch
8. **Screenshots**: Use `screenshot()` for debugging failures

## Future Enhancements

Potential additions:
- WidgetsPage for widget-specific interactions
- ChartPage for chart interactions
- SearchPage for ticker search
- SettingsPage for user settings
- Component objects (e.g., Modal, Navbar, Footer as reusable components)
