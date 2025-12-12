# Page Object Model - Quick Reference Card

## Import

```typescript
import { LandingPage, AppPage, LoginPage, DashboardPage } from './pages';
```

## Basic Setup

```typescript
test('my test', async ({ page }) => {
  const landingPage = new LandingPage(page);
  const appPage = new AppPage(page);
  // ... use in test
});
```

## Common Methods

### Navigation
```typescript
// Navigate and dismiss modals automatically
await appPage.navigate();

// Navigate and wait for data
await appPage.navigateAndWait();

// Direct navigation
await appPage.goto('/app');
await appPage.dismissModals();
```

### Element Checks
```typescript
// Check if element exists (with timeout)
if (await appPage.exists(appPage.marketWatchButton)) { }

// Safe click (only clicks if exists)
await appPage.safeClick(appPage.marketWatchButton);

// Fill if exists (returns true if filled)
const filled = await appPage.fillIfExists(appPage.chatInput, 'test');
```

### Interactions
```typescript
// Click and verify navigation
await landingPage.clickTryDemo(); // Verifies URL is /app

// Type in input
await appPage.typeInChat('message');

// Get input value
const value = await appPage.getChatInputValue();

// Select from options
await appPage.selectTimeframe('1W');
```

### Waiting
```typescript
// Wait for timeout
await appPage.waitFor(1000);

// Wait for element
await appPage.waitForElement(appPage.welcomeHeading);

// Wait for network idle
await appPage.waitForNetworkIdle();

// Wait for market data
await appPage.waitForMarketData();
```

### Scrolling
```typescript
await landingPage.scrollToBottom();
await landingPage.scrollToTop();
```

### Network Control
```typescript
// Block API requests
await appPage.blockApiRequests();

// Mock API response
await dashboardPage.mockApiResponse('**/api/account**', {
  status: 500,
  body: { error: 'Error' }
});

// Slow down requests
await appPage.slowDownApiRequests(500);

// Go offline/online
await appPage.goOffline();
await appPage.goOnline();
```

### Screenshots
```typescript
await appPage.screenshot('error-state');
```

### Viewport
```typescript
await landingPage.setViewport(375, 667); // Mobile
await landingPage.setViewport(1920, 1080); // Desktop
```

## Page-Specific Methods

### LandingPage
```typescript
await landingPage.navigate();
await landingPage.clickTryDemo();
await landingPage.clickSignIn();
await landingPage.clickStartFreeAnalysis();
await landingPage.clickLaunchDeepStack();
await landingPage.clickTermsInFooter();
await landingPage.clickPrivacyInFooter();
await landingPage.areHeroElementsVisible();
```

### AppPage
```typescript
await appPage.navigate();
await appPage.typeInChat('message');
await appPage.clickMarketWatch();
await appPage.toggleMarketWatch();
await appPage.clickAddWidget();
await appPage.clickAnalyzePortfolio();
await appPage.goToDashboard();
await appPage.selectTimeframe('1W');
await appPage.isTickerVisible('SPY');
await appPage.countVisibleTickers();
await appPage.isMarketDataLoaded();
```

### LoginPage
```typescript
await loginPage.navigate();
await loginPage.isOnLoginPage();
await loginPage.enterEmail('test@example.com');
await loginPage.clickSendMagicLink();
await loginPage.clickGoogleSignIn();
await loginPage.submitMagicLinkForm('test@example.com');
await loginPage.handlePotentialRedirect();
```

### DashboardPage
```typescript
await dashboardPage.navigate();
await dashboardPage.clickRefresh();
await dashboardPage.clickStart();
await dashboardPage.clickStop();
await dashboardPage.areAccountSummaryCardsVisible();
await dashboardPage.getAutomationStatus(); // 'active' | 'inactive' | 'unknown'
await dashboardPage.waitForAccountData();
await dashboardPage.getDashboardLoadState(); // 'loaded' | 'loading' | 'error'
```

## Common Selectors

### LandingPage
```typescript
landingPage.tryDemoLink
landingPage.signInLink
landingPage.logo
landingPage.heroTitle
landingPage.startFreeAnalysisButton
landingPage.launchDeepStackButton
landingPage.termsLink
landingPage.privacyLink
```

### AppPage
```typescript
appPage.welcomeHeading
appPage.chatInput
appPage.marketWatchButton
appPage.widgetsPanel
appPage.addWidgetButton
appPage.modelSelector
appPage.dashboardLink
appPage.analyzePortfolioButton
appPage.spyTicker
appPage.qqqTicker
appPage.oneDayButton
appPage.oneWeekButton
appPage.usRegionSelector
```

### LoginPage
```typescript
loginPage.logo
loginPage.emailInput
loginPage.sendMagicLinkButton
loginPage.googleSignInButton
loginPage.privacyLink
loginPage.termsLink
```

### DashboardPage
```typescript
dashboardPage.dashboardHeading
dashboardPage.portfolioValue
dashboardPage.cashDisplay
dashboardPage.buyingPower
dashboardPage.startButton
dashboardPage.stopButton
dashboardPage.refreshButton
dashboardPage.automationStatusBadge
```

## Pattern Examples

### Before/After Comparison

#### Before (Raw Selectors)
```typescript
await page.goto('/app');
const disclaimer = page.getByRole('button', { name: 'Dismiss disclaimer' });
if (await disclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
  await disclaimer.click();
}
await page.getByRole('button', { name: 'Market Watch' }).click();
```

#### After (POM)
```typescript
const appPage = new AppPage(page);
await appPage.navigate(); // Includes modal dismissal
await appPage.clickMarketWatch();
```

### Multi-Page Flow
```typescript
const landingPage = new LandingPage(page);
const appPage = new AppPage(page);
const dashboardPage = new DashboardPage(page);

await landingPage.navigate();
await landingPage.clickTryDemo();
await appPage.waitForMarketData();
await appPage.goToDashboard();
await dashboardPage.clickRefresh();
```

### Conditional Interaction
```typescript
const appPage = new AppPage(page);
await appPage.navigate();

if (await appPage.exists(appPage.analyzePortfolioButton)) {
  await appPage.clickAnalyzePortfolio();
}

// Or use safe methods
await appPage.safeClick(appPage.marketWatchButton);
```

### Error Handling Test
```typescript
const dashboardPage = new DashboardPage(page);

await dashboardPage.mockApiResponse('**/api/account**', {
  status: 500,
  body: { error: 'Server error' }
});

await dashboardPage.navigate();
const state = await dashboardPage.getDashboardLoadState();
expect(state).toBe('error');
```

### Responsive Test
```typescript
const landingPage = new LandingPage(page);
await landingPage.navigate();

// Mobile
await landingPage.setViewport(375, 667);
expect(await landingPage.areNavigationLinksVisible()).toBeTruthy();

// Desktop
await landingPage.setViewport(1920, 1080);
expect(await landingPage.areNavigationLinksVisible()).toBeTruthy();
```

## Tips

1. Always use page objects instead of raw selectors
2. Use `navigate()` instead of `goto()` for automatic modal dismissal
3. Use `safeClick()` for elements that might not exist
4. Use `exists()` for conditional logic
5. Page-specific methods often include verification (e.g., URL checks)
6. Extend BasePage for new page objects
7. Screenshots are saved with timestamps for debugging

## Documentation

- **Full API Docs**: `e2e/pages/README.md`
- **Migration Guide**: `e2e/MIGRATION_GUIDE.md`
- **Examples**: `e2e/example-pom-usage.spec.ts`
- **Summary**: `e2e/POM_IMPLEMENTATION_SUMMARY.md`
