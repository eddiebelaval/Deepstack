# Migration Guide: Converting Tests to Page Object Model

This guide shows how to migrate existing E2E tests to use the new Page Object Model.

## Quick Reference

### Before (Old Pattern)
```typescript
test('test name', async ({ page }) => {
  await page.goto('/app');

  // Dismiss modals manually
  const dismissDisclaimer = page.getByRole('button', { name: 'Dismiss disclaimer' });
  if (await dismissDisclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissDisclaimer.click();
  }

  await page.getByRole('button', { name: 'Market Watch' }).click();
});
```

### After (New Pattern)
```typescript
import { AppPage } from './pages';

test('test name', async ({ page }) => {
  const appPage = new AppPage(page);

  await appPage.navigate(); // Automatically dismisses modals
  await appPage.clickMarketWatch();
});
```

## Step-by-Step Migration

### Step 1: Import Page Objects

Add imports at the top of your test file:

```typescript
import { test, expect } from '@playwright/test';
import { LandingPage, AppPage, DashboardPage } from './pages';
```

### Step 2: Create Page Object Instances

Inside each test, create instances of the page objects you need:

```typescript
test('my test', async ({ page }) => {
  const landingPage = new LandingPage(page);
  const appPage = new AppPage(page);
  // ... use them in your test
});
```

### Step 3: Replace Navigation

**Before:**
```typescript
await page.goto('/app');
```

**After:**
```typescript
const appPage = new AppPage(page);
await appPage.navigate(); // Automatically dismisses modals
```

### Step 4: Replace Modal Dismissal

**Before:**
```typescript
async function dismissModals(page: Page) {
  const dismissDisclaimer = page.getByRole('button', { name: 'Dismiss disclaimer' });
  if (await dismissDisclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissDisclaimer.click();
  }
  // ... more dismissals
}

await dismissModals(page);
```

**After:**
```typescript
const appPage = new AppPage(page);
await appPage.dismissModals(); // Centralized in BasePage
```

Or even better, use `navigate()` which calls it automatically:
```typescript
await appPage.navigate(); // Includes dismissModals()
```

### Step 5: Replace Element Selectors

**Before:**
```typescript
await page.getByRole('button', { name: 'Market Watch' }).click();
await page.getByRole('textbox', { name: /Ask about stocks/ }).fill('test');
const spyTicker = page.getByText('SPY').first();
```

**After:**
```typescript
await appPage.clickMarketWatch();
await appPage.typeInChat('test');
await expect(appPage.spyTicker).toBeVisible();
```

### Step 6: Replace Conditional Checks

**Before:**
```typescript
const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
  await dashboardLink.click();
  await expect(page).toHaveURL(/\/dashboard/);
}
```

**After:**
```typescript
if (await appPage.exists(appPage.dashboardLink)) {
  await appPage.goToDashboard(); // Includes URL verification
}
```

Or use the safer method:
```typescript
await appPage.goToDashboard(); // Already checks existence internally
```

## Real Migration Examples

### Example 1: landing.spec.ts

**Before:**
```typescript
test('should have Try Demo link', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Try Demo' })).toBeVisible();
});

test('should navigate from landing to app', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Try Demo' }).click();
  await expect(page).toHaveURL(/\/app/);
});
```

**After:**
```typescript
import { LandingPage } from './pages';

test('should have Try Demo link', async ({ page }) => {
  const landingPage = new LandingPage(page);
  await landingPage.navigate();
  await expect(landingPage.tryDemoLink).toBeVisible();
});

test('should navigate from landing to app', async ({ page }) => {
  const landingPage = new LandingPage(page);
  await landingPage.navigate();
  await landingPage.clickTryDemo(); // Includes URL verification
});
```

### Example 2: app.spec.ts

**Before:**
```typescript
test('should display welcome message', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();
});

test('should display chat input', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('textbox', { name: /Ask about stocks/ })).toBeVisible();
});

test('should display Market Watch button', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('button', { name: 'Market Watch' })).toBeVisible();
});
```

**After:**
```typescript
import { AppPage } from './pages';

test('should display welcome message', async ({ page }) => {
  const appPage = new AppPage(page);
  await appPage.navigate();
  await expect(appPage.welcomeHeading).toBeVisible();
});

test('should display chat input', async ({ page }) => {
  const appPage = new AppPage(page);
  await appPage.navigate();
  await expect(appPage.chatInput).toBeVisible();
});

test('should display Market Watch button', async ({ page }) => {
  const appPage = new AppPage(page);
  await appPage.navigate();
  await expect(appPage.marketWatchButton).toBeVisible();
});
```

Or group them:
```typescript
test('should display core UI elements', async ({ page }) => {
  const appPage = new AppPage(page);
  await appPage.navigate();

  await expect(appPage.welcomeHeading).toBeVisible();
  await expect(appPage.chatInput).toBeVisible();
  await expect(appPage.marketWatchButton).toBeVisible();
});
```

### Example 3: navigation.spec.ts with dismissModals

**Before:**
```typescript
async function dismissModals(page: Page) {
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

test('should navigate to terms from footer', async ({ page }) => {
  await page.goto('/');
  await dismissModals(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const footer = page.locator('footer, [role="contentinfo"]');
  const termsLink = footer.getByRole('link', { name: 'Terms' });
  await termsLink.click();
  await expect(page).toHaveURL(/\/terms/);
});
```

**After:**
```typescript
import { LandingPage } from './pages';

test('should navigate to terms from footer', async ({ page }) => {
  const landingPage = new LandingPage(page);
  await landingPage.navigate();
  await landingPage.clickTermsInFooter(); // Includes scroll, modal dismissal, and URL verification
});
```

### Example 4: market-data-refresh.spec.ts

**Before:**
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/app');
  await dismissModals(page);
});

test('should display market ticker prices', async ({ page }) => {
  await page.waitForTimeout(1000);

  const spyTicker = page.getByText('SPY').first();
  if (await spyTicker.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(spyTicker).toBeVisible();

    const pricePattern = /\$?\d+\.\d{2}|\d+\.\d{2}%|[+-]\d+\.\d{2}/;
    const pageContent = await page.content();
    expect(pageContent).toMatch(pricePattern);
  }
});
```

**After:**
```typescript
import { AppPage } from './pages';

let appPage: AppPage;

test.beforeEach(async ({ page }) => {
  appPage = new AppPage(page);
  await appPage.navigate(); // Includes dismissModals
});

test('should display market ticker prices', async () => {
  await appPage.waitForMarketData();

  if (await appPage.isTickerVisible('SPY')) {
    await expect(appPage.spyTicker).toBeVisible();
    expect(await appPage.hasPriceData()).toBeTruthy();
  }
});
```

### Example 5: trading-flow.spec.ts

**Before:**
```typescript
test('should show add widget button', async ({ page }) => {
  const addWidgetButton = page.getByRole('button', { name: 'Add Widget' });
  if (await addWidgetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expect(addWidgetButton).toBeVisible();
  }
});

test('should allow opening add widget dialog', async ({ page }) => {
  const addWidgetButton = page.getByRole('button', { name: 'Add Widget' });
  if (await addWidgetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addWidgetButton.click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole('dialog');
    const menu = page.getByRole('menu');

    const dialogVisible = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
    const menuVisible = await menu.isVisible({ timeout: 1000 }).catch(() => false);

    expect(dialogVisible || menuVisible).toBeTruthy();
  }
});
```

**After:**
```typescript
import { AppPage } from './pages';

test('should show add widget button', async ({ page }) => {
  const appPage = new AppPage(page);
  await appPage.navigate();

  if (await appPage.exists(appPage.addWidgetButton)) {
    await expect(appPage.addWidgetButton).toBeVisible();
  }
});

test('should allow opening add widget dialog', async ({ page }) => {
  const appPage = new AppPage(page);
  await appPage.navigate();

  await appPage.clickAddWidget();
  expect(await appPage.isDialogOrMenuOpen()).toBeTruthy();
});
```

## Common Patterns

### Pattern 1: Conditional Element Interaction

**Before:**
```typescript
const element = page.getByRole('button', { name: 'Something' });
if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
  await element.click();
}
```

**After:**
```typescript
const appPage = new AppPage(page);
await appPage.safeClick(appPage.someButton);
// or
if (await appPage.exists(appPage.someButton)) {
  await appPage.someButton.click();
}
```

### Pattern 2: Scrolling to Footer

**Before:**
```typescript
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
const footer = page.locator('footer, [role="contentinfo"]');
const link = footer.getByRole('link', { name: 'Something' });
await link.click();
```

**After:**
```typescript
const landingPage = new LandingPage(page);
await landingPage.scrollToBottom();
await landingPage.privacyLink.click(); // Already scoped to footer
```

### Pattern 3: Network Mocking

**Before:**
```typescript
await page.route('**/api/**', route => route.abort());
await page.goto('/app');
```

**After:**
```typescript
const appPage = new AppPage(page);
await appPage.blockApiRequests();
await appPage.navigate();
```

### Pattern 4: Multiple Page Navigation

**Before:**
```typescript
await page.goto('/');
await page.getByRole('link', { name: 'Try Demo' }).click();
await expect(page).toHaveURL(/\/app/);

const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
  await dashboardLink.click();
  await expect(page).toHaveURL(/\/dashboard/);
}
```

**After:**
```typescript
const landingPage = new LandingPage(page);
const appPage = new AppPage(page);

await landingPage.navigate();
await landingPage.clickTryDemo(); // Verifies URL

await appPage.goToDashboard(); // Checks existence and verifies URL
```

## Benefits of Migration

1. **Less Code**: Reduced duplication, especially for `dismissModals()`
2. **Better Readability**: `appPage.clickMarketWatch()` vs `page.getByRole('button', { name: 'Market Watch' }).click()`
3. **Centralized Updates**: Change selectors in one place
4. **Type Safety**: Autocomplete for all page elements and methods
5. **Built-in Verification**: Many methods include URL verification
6. **Error Handling**: Safe methods handle non-existent elements gracefully

## Checklist for Migration

- [ ] Import page objects at top of file
- [ ] Replace `page.goto()` with `pageObject.navigate()`
- [ ] Remove local `dismissModals()` function
- [ ] Replace raw selectors with page object properties
- [ ] Use page object methods instead of manual element interactions
- [ ] Replace conditional checks with `exists()` or `safeClick()`
- [ ] Remove manual `waitForTimeout()` where page object methods handle it
- [ ] Update assertions to use page object properties
- [ ] Test the migrated file to ensure it works
- [ ] Delete old helper functions that are now in BasePage

## Next Steps

1. Start with simple test files (e.g., `landing.spec.ts`)
2. Migrate one test at a time
3. Run tests after each migration to verify
4. Once comfortable, tackle more complex files
5. Update this guide with new patterns you discover

## Need Help?

- See `example-pom-usage.spec.ts` for comprehensive examples
- Check `e2e/pages/README.md` for detailed documentation
- Review the page object files themselves - they're well-commented
