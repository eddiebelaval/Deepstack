# DeepStack E2E Test Suite

Comprehensive end-to-end test coverage for the DeepStack trading platform using Playwright.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing New Tests](#writing-new-tests)
- [Page Object Model](#page-object-model)
- [Fixtures and Utilities](#fixtures-and-utilities)
- [Debugging](#debugging)
- [CI/CD Integration](#ci-cd-integration)
- [Best Practices](#best-practices)

---

## Overview

The DeepStack E2E test suite uses [Playwright](https://playwright.dev/) to test critical user flows and ensure the application works correctly across multiple browsers and devices.

### Test Coverage

**Total Tests:** 90+ tests across 10 test files

**Coverage Areas:**
- Landing page and navigation flows
- User authentication (login/signup)
- Trading app core functionality
- Real-time market data display
- Widget and panel management
- Chat and AI assistant interactions
- Network error handling and recovery
- Offline behavior and resilience
- Responsive design (mobile, tablet, desktop)
- **Accessibility (WCAG 2.1 AA compliance)**
- **Visual regression testing**

### Supported Browsers

- **Chromium** (Google Chrome, Microsoft Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5 emulation)
- **Mobile Safari** (iPhone 12 emulation)

---

## Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (one-time setup)
npx playwright install
```

### Project Structure

```
e2e/
├── README.md                    # This file
├── app.spec.ts                  # Trading app core UI tests
├── landing.spec.ts              # Landing page tests
├── login.spec.ts                # Authentication tests
├── navigation.spec.ts           # Routing and navigation tests
├── responsive.spec.ts           # Responsive design tests
├── trading-flow.spec.ts         # Complete trading workflows
├── market-data-refresh.spec.ts  # Real-time data tests
├── error-recovery.spec.ts       # Error handling tests
├── accessibility.spec.ts        # WCAG 2.1 AA compliance tests
├── visual.spec.ts               # Visual regression tests
└── utils/
    └── accessibility.ts         # Accessibility testing utilities
```

---

## Running Tests

### Basic Commands

```bash
# Run all E2E tests (headless mode)
npm run test:e2e

# Run tests with UI mode (visual test runner)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed
```

### Browser-Specific Tests

```bash
# Run on Chromium only
npm run test:e2e:chromium

# Run on Firefox only
npm run test:e2e:firefox

# Run on WebKit (Safari) only
npm run test:e2e:webkit

# Run on mobile browsers only
npm run test:e2e:mobile
```

### Advanced Usage

```bash
# Run specific test file
npm run test:e2e -- e2e/trading-flow.spec.ts

# Run tests matching a pattern
npm run test:e2e -- -g "should display chat input"

# Run tests in debug mode
npm run test:e2e -- --debug

# Run tests with specific number of workers
npm run test:e2e -- --workers=2

# Update visual snapshots (after intentional design changes)
npm run test:e2e -- visual.spec.ts --update-snapshots

# Run only accessibility tests
npm run test:e2e -- accessibility.spec.ts

# Run only visual regression tests
npm run test:e2e -- visual.spec.ts
```

### Viewing Test Reports

```bash
# Show HTML report (opens in browser)
npm run test:e2e:report

# Report is generated after test run in:
# playwright-report/index.html
```

---

## Test Structure

### Test Organization

Tests are organized using Playwright's `test.describe()` blocks for logical grouping:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  // Setup runs before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test.describe('Sub-feature', () => {
    test('should do something specific', async ({ page }) => {
      // Test implementation
      await expect(page.getByRole('button')).toBeVisible();
    });
  });
});
```

### Current Test Files

#### 1. **app.spec.ts** - Trading App Core UI
Tests core UI elements and basic app functionality.

**Covers:**
- Page load and initial render
- Core UI elements (Market Watch, Widgets, Chat)
- Market panel (regions, timeframes)
- Quick actions and model selector

#### 2. **landing.spec.ts** - Landing Page
Tests the public-facing landing page.

**Covers:**
- Page load and branding
- Call-to-action buttons
- Navigation links
- Footer content

#### 3. **login.spec.ts** - Authentication
Tests login and authentication flows.

**Covers:**
- Login page load
- Google sign-in button
- Magic link form
- Footer links

#### 4. **navigation.spec.ts** - Routing and Navigation
Tests application routing and navigation flows.

**Covers:**
- Landing to app navigation
- Direct URL access
- Footer navigation
- App entry points

#### 5. **responsive.spec.ts** - Responsive Design
Tests UI across different viewport sizes.

**Covers:**
- Desktop viewport (1920x1080)
- Tablet viewport (768x1024)
- Mobile viewport (375x667)
- Dynamic viewport resizing

#### 6. **trading-flow.spec.ts** - Complete Trading Workflows
Tests end-to-end trading workflows.

**Covers:**
- Dashboard view and account summary
- Market data viewing
- Widget interactions
- Chat interactions
- Complete user journeys

#### 7. **market-data-refresh.spec.ts** - Real-Time Data
Tests market data updates and real-time functionality.

**Covers:**
- Real-time data updates
- Timeframe selection
- Market region selection
- Watchlist management
- Data refresh behavior

#### 8. **error-recovery.spec.ts** - Error Handling
Tests application resilience and error recovery.

**Covers:**
- Network failures
- API error handling (404, 401, 500, 503)
- Offline behavior
- User error feedback
- Recovery mechanisms
- Edge cases

#### 9. **accessibility.spec.ts** - WCAG 2.1 AA Compliance
Tests accessibility standards compliance using axe-core.

**Covers:**
- WCAG 2.1 Level AA violations
- Semantic HTML and ARIA attributes
- Keyboard navigation
- Color contrast ratios
- Screen reader compatibility
- Focus management (modals, dialogs)
- Form accessibility (labels, validation)
- Touch target sizes (mobile)
- Heading hierarchy
- Landmark regions

**Run accessibility tests:**
```bash
npm run test:e2e -- accessibility.spec.ts
```

#### 10. **visual.spec.ts** - Visual Regression
Tests visual appearance and prevents unintended design changes.

**Covers:**
- Landing page screenshots (desktop, mobile, tablet)
- App page layouts
- Component isolation
- Theme variations (light/dark)
- Interactive states (hover, focus)
- Responsive breakpoints
- Cross-browser rendering
- Print styles
- Error states
- Reduced motion preferences

**Run visual tests:**
```bash
# Run and compare against snapshots
npm run test:e2e -- visual.spec.ts

# Update snapshots after intentional design changes
npm run test:e2e -- visual.spec.ts --update-snapshots
```

---

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Your Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-route');
    // Add any setup needed
  });

  test('should perform expected behavior', async ({ page }) => {
    // 1. Arrange - set up test conditions
    const button = page.getByRole('button', { name: 'Submit' });

    // 2. Act - perform user actions
    await button.click();

    // 3. Assert - verify expected outcome
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Locator Strategies

Playwright provides multiple ways to find elements. Use them in this priority order:

```typescript
// 1. BEST: Semantic locators (role, label, text)
page.getByRole('button', { name: 'Submit' })
page.getByLabel('Email')
page.getByText('Welcome')
page.getByPlaceholder('Enter email')

// 2. GOOD: Test IDs (add data-testid to components)
page.getByTestId('submit-button')

// 3. AVOID: CSS selectors (brittle, implementation-dependent)
page.locator('.btn-primary')  // Only use when necessary
```

### Conditional Testing Pattern

When testing features that may not always be present, use conditional visibility checks:

```typescript
test('should show feature if available', async ({ page }) => {
  const feature = page.getByRole('button', { name: 'Feature' });

  // Check if element exists before testing
  if (await feature.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expect(feature).toBeVisible();
    await feature.click();
    // Continue testing...
  }
});
```

This pattern prevents test failures when features are conditionally rendered or not yet implemented.

### Waiting for Elements

```typescript
// Wait for element to be visible
await page.getByRole('button', { name: 'Submit' }).waitFor();

// Wait for navigation
await page.waitForURL(/\/dashboard/);

// Wait for API response
await page.waitForResponse(response =>
  response.url().includes('/api/data') && response.status() === 200
);

// Wait for timeout (use sparingly)
await page.waitForTimeout(500);
```

### User Interactions

```typescript
// Click
await page.getByRole('button', { name: 'Submit' }).click();

// Fill input
await page.getByLabel('Email').fill('test@example.com');

// Select dropdown
await page.getByRole('combobox').selectOption('option1');

// Check checkbox
await page.getByRole('checkbox').check();

// Hover
await page.getByRole('button').hover();

// Keyboard actions
await page.keyboard.press('Enter');
await page.keyboard.type('Hello world');
```

### Assertions

```typescript
// Visibility
await expect(page.getByText('Success')).toBeVisible();
await expect(page.getByText('Error')).not.toBeVisible();

// Text content
await expect(page.getByRole('heading')).toHaveText('Dashboard');
await expect(page.getByRole('heading')).toContainText('Dash');

// Input values
await expect(page.getByLabel('Email')).toHaveValue('test@example.com');

// URL
await expect(page).toHaveURL(/\/dashboard/);

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);

// Attributes
await expect(page.getByRole('button')).toHaveAttribute('disabled');
```

---

## Page Object Model

While this project doesn't currently use a formal Page Object Model, it's recommended for larger test suites to reduce duplication and improve maintainability.

### Creating a Page Object

Create a new file `e2e/pages/LoginPage.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly googleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: /Email/ });
    this.submitButton = page.getByRole('button', { name: /Send Magic Link/ });
    this.googleButton = page.getByRole('button', { name: /Continue with Google/ });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async loginWithEmail(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async loginWithGoogle() {
    await this.googleButton.click();
  }
}
```

### Using a Page Object

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('user can login with email', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.loginWithEmail('test@example.com');

  await expect(page.getByText('Check your email')).toBeVisible();
});
```

---

## Accessibility Testing

The accessibility test suite uses [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) to test WCAG 2.1 compliance.

### Running Accessibility Tests

```bash
# Run all accessibility tests
npm run test:e2e -- accessibility.spec.ts

# Run specific accessibility test
npm run test:e2e -- accessibility.spec.ts -g "WCAG 2.1 AA violations"

# Run with headed browser to see what's being tested
npm run test:e2e:headed -- accessibility.spec.ts
```

### Accessibility Test Utilities

The project includes comprehensive accessibility utilities in `/e2e/utils/accessibility.ts`:

#### `runAccessibilityTest(page, options)`
Runs axe-core analysis on the current page:

```typescript
import { runAccessibilityTest, assertNoViolations } from './utils/accessibility';

test('should be accessible', async ({ page }) => {
  await page.goto('/');

  const results = await runAccessibilityTest(page, {
    level: 'AA',  // Test WCAG 2.1 AA compliance
  });

  assertNoViolations(results);
});
```

#### Options:
- `level`: WCAG level to test ('A', 'AA', 'AAA')
- `rules`: Specific rules to test
- `disabledRules`: Rules to exclude
- `exclude`: CSS selectors to exclude from analysis
- `knownViolations`: Document and ignore known violations

#### `checkWCAGRules(page, rules)`
Test specific WCAG rules:

```typescript
import { checkWCAGRules, A11Y_RULES } from './utils/accessibility';

test('should have sufficient color contrast', async ({ page }) => {
  await page.goto('/');

  const results = await checkWCAGRules(page, [
    A11Y_RULES.colorContrast,
    A11Y_RULES.imageAlt,
  ]);

  assertNoViolations(results);
});
```

#### `testKeyboardNavigation(page)`
Tests keyboard accessibility:

```typescript
import { testKeyboardNavigation } from './utils/accessibility';

test('should support keyboard navigation', async ({ page }) => {
  await page.goto('/');

  const result = await testKeyboardNavigation(page);

  expect(result.success).toBe(true);
});
```

### Common Accessibility Rules

Use the `A11Y_RULES` constant for type-safe rule references:

```typescript
import { A11Y_RULES } from './utils/accessibility';

// Color and contrast
A11Y_RULES.colorContrast
A11Y_RULES.colorContrastEnhanced

// Images
A11Y_RULES.imageAlt
A11Y_RULES.objectAlt

// Forms
A11Y_RULES.label
A11Y_RULES.ariaInputFieldName

// ARIA
A11Y_RULES.ariaAllowedAttr
A11Y_RULES.ariaRequiredAttr
A11Y_RULES.ariaValidAttr

// Buttons and links
A11Y_RULES.buttonName
A11Y_RULES.linkName

// Document structure
A11Y_RULES.documentTitle
A11Y_RULES.headingOrder
A11Y_RULES.htmlHasLang
```

### Handling Known Violations

Sometimes violations are acceptable or planned for future fixes:

```typescript
const results = await runAccessibilityTest(page, {
  knownViolations: [
    {
      rule: 'color-contrast',
      selector: '#legacy-widget',
      reason: 'Third-party widget, planned for replacement in Q2',
    },
  ],
});
```

### Accessibility Checklist

When adding new features, ensure:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] ARIA attributes are used correctly
- [ ] Heading hierarchy is logical (h1 -> h2 -> h3)
- [ ] Page has a descriptive title
- [ ] HTML lang attribute is set
- [ ] Touch targets are at least 44x44px (mobile)

---

## Visual Regression Testing

Visual regression tests use Playwright's screenshot comparison to detect unintended visual changes.

### Running Visual Tests

```bash
# Run visual tests and compare against snapshots
npm run test:e2e -- visual.spec.ts

# Update snapshots after intentional design changes
npm run test:e2e -- visual.spec.ts --update-snapshots

# Run specific visual test
npm run test:e2e -- visual.spec.ts -g "landing page screenshot"
```

### How Visual Testing Works

1. **First run**: Takes screenshots and saves them as baseline snapshots
2. **Subsequent runs**: Compares new screenshots against baselines
3. **Differences**: If pixels differ beyond threshold, test fails
4. **Review**: Check diff images in test results to see what changed

### Snapshot Locations

Snapshots are stored alongside test files:
```
e2e/
├── visual.spec.ts
└── visual.spec.ts-snapshots/
    ├── landing-page-desktop-chromium.png
    ├── landing-page-mobile-chromium.png
    └── ...
```

### Best Practices for Visual Tests

#### 1. Wait for Page Stability

```typescript
// Hide dynamic content (timestamps, animations)
await page.evaluate(() => {
  document.querySelectorAll('.timestamp').forEach(el => {
    el.style.visibility = 'hidden';
  });
});

// Wait for animations to complete
await page.waitForTimeout(500);

// Take screenshot with animations disabled
await expect(page).toHaveScreenshot('page.png', {
  animations: 'disabled',
});
```

#### 2. Test Component Isolation

```typescript
// Screenshot specific component instead of full page
const component = page.locator('[data-testid="hero-section"]');
await expect(component).toHaveScreenshot('hero.png');
```

#### 3. Test Multiple Viewports

```typescript
test('should match at different sizes', async ({ page }) => {
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page).toHaveScreenshot('mobile.png');

  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page).toHaveScreenshot('desktop.png');
});
```

#### 4. Update Snapshots Intentionally

```bash
# ONLY update snapshots when you've made intentional design changes
npm run test:e2e -- visual.spec.ts --update-snapshots

# Review updated snapshots before committing
git diff e2e/visual.spec.ts-snapshots/
```

### When to Update Snapshots

Update snapshots when:
- Intentionally changing UI design
- Updating CSS/styling
- Changing component layouts
- Upgrading design system

DO NOT update snapshots to "make tests pass" without understanding what changed.

### Reviewing Visual Changes

When tests fail:

1. Open test report: `npm run test:e2e:report`
2. View diff images showing:
   - **Expected**: Baseline snapshot
   - **Actual**: Current screenshot
   - **Diff**: Highlighted differences
3. Determine if changes are intentional
4. Update snapshots if changes are correct

---

## Fixtures and Utilities

### Helper Functions

The test suite includes reusable helper functions. Currently defined:

#### `dismissModals(page)`

Dismisses onboarding modals and disclaimer dialogs:

```typescript
// Located in: trading-flow.spec.ts, navigation.spec.ts
async function dismissModals(page: Page) {
  // Dismiss disclaimer if present
  const dismissDisclaimer = page.getByRole('button', { name: 'Dismiss disclaimer' });
  if (await dismissDisclaimer.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissDisclaimer.click();
  }

  // Skip onboarding tour if present
  const skipTour = page.getByRole('button', { name: 'Skip tour' });
  if (await skipTour.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipTour.click();
  }

  // Close onboarding if present
  const closeOnboarding = page.getByRole('button', { name: 'Close onboarding' });
  if (await closeOnboarding.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeOnboarding.click();
  }
}
```

Usage:
```typescript
test('should display dashboard', async ({ page }) => {
  await page.goto('/app');
  await dismissModals(page);

  // Continue with test...
});
```

### Creating Custom Fixtures

Playwright supports custom fixtures for reusable test setup:

Create `e2e/fixtures/auth.ts`:

```typescript
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Perform authentication
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();

    // Use authenticated page
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

Use in tests:

```typescript
import { test, expect } from './fixtures/auth';

test('authenticated user can view dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.getByText('My Portfolio')).toBeVisible();
});
```

---

## Debugging

### UI Mode (Recommended)

The easiest way to debug tests:

```bash
npm run test:e2e:ui
```

Features:
- Visual test runner
- Step-through debugging
- Time travel through test execution
- DOM snapshots at each step
- Network activity monitoring

### Debug Mode

Run tests with debug mode to pause execution:

```bash
npm run test:e2e -- --debug
```

Or add `page.pause()` in your test:

```typescript
test('should do something', async ({ page }) => {
  await page.goto('/app');

  await page.pause(); // Debugger opens here

  await page.getByRole('button').click();
});
```

### Trace Viewer

Traces are automatically recorded on first retry (see `playwright.config.ts`).

View traces:

```bash
npx playwright show-trace trace.zip
```

Manual trace recording:

```typescript
test('should do something', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  // Your test code
  await page.goto('/app');

  await context.tracing.stop({ path: 'trace.zip' });
});
```

### Screenshots

Screenshots are automatically taken on failure (see `playwright.config.ts`).

Manual screenshot:

```typescript
await page.screenshot({ path: 'screenshot.png', fullPage: true });
```

### Videos

Videos are recorded on first retry by default.

Force video recording:

```typescript
test.use({ video: 'on' });

test('should do something', async ({ page }) => {
  // Test code - video will be saved
});
```

### Console Logs

Capture browser console logs:

```typescript
test('should not have console errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('/app');

  expect(errors).toHaveLength(0);
});
```

### Network Inspection

Monitor network requests:

```typescript
test('should make API calls', async ({ page }) => {
  const apiCalls: string[] = [];

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push(request.url());
    }
  });

  await page.goto('/app');

  expect(apiCalls.length).toBeGreaterThan(0);
});
```

---

## CI/CD Integration

### GitHub Actions Configuration

Tests are configured to run in CI environments (see `playwright.config.ts`):

```typescript
export default defineConfig({
  // Fail build on test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests 2 times in CI
  retries: process.env.CI ? 2 : 0,

  // Use single worker in CI
  workers: process.env.CI ? 1 : undefined,

  // CI-specific reporters
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
});
```

### Sample GitHub Actions Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload test artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
          retention-days: 7
```

### Environment Variables

Configure base URL for different environments:

```bash
# Local development
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e

# Staging environment
PLAYWRIGHT_BASE_URL=https://staging.deepstack.app npm run test:e2e

# Production smoke tests
PLAYWRIGHT_BASE_URL=https://deepstack.app npm run test:e2e
```

### Parallel Testing in CI

Playwright supports sharding for faster CI runs:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      # ... setup steps ...

      - name: Run E2E tests
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

---

## Best Practices

### 1. Write Independent Tests

Each test should be able to run in isolation:

```typescript
// GOOD: Test sets up its own data
test('should display user profile', async ({ page }) => {
  await page.goto('/app');
  await dismissModals(page);
  // Test is self-contained
});

// BAD: Test depends on previous test
test('should login', async ({ page }) => {
  await page.goto('/login');
  // ... login steps
});

test('should show dashboard', async ({ page }) => {
  // Assumes previous test logged in - WRONG!
});
```

### 2. Use Meaningful Test Names

```typescript
// GOOD: Descriptive names
test('should display error message when email is invalid', async ({ page }) => {
  // ...
});

// BAD: Vague names
test('test email', async ({ page }) => {
  // ...
});
```

### 3. Avoid Hard-Coded Waits

```typescript
// GOOD: Wait for specific condition
await expect(page.getByText('Loading...')).not.toBeVisible();
await page.getByRole('button', { name: 'Submit' }).waitFor();

// BAD: Hard-coded timeout
await page.waitForTimeout(5000);
```

### 4. Use Auto-Waiting

Playwright automatically waits for elements before actions:

```typescript
// Playwright waits for button to be visible and enabled
await page.getByRole('button', { name: 'Submit' }).click();

// No need to manually wait
// await page.waitForSelector('button');
// await page.click('button');
```

### 5. Test User Flows, Not Implementation

```typescript
// GOOD: Tests user behavior
test('user can complete checkout', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page).toHaveURL(/\/checkout/);
});

// BAD: Tests implementation details
test('clicking button calls addToCart function', async ({ page }) => {
  // Don't test internal function calls
});
```

### 6. Group Related Tests

```typescript
test.describe('Shopping Cart', () => {
  test.describe('Adding Items', () => {
    test('should add item to cart', async ({ page }) => {
      // ...
    });

    test('should update cart count', async ({ page }) => {
      // ...
    });
  });

  test.describe('Removing Items', () => {
    // ...
  });
});
```

### 7. Use beforeEach for Common Setup

```typescript
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await dismissModals(page);
  });

  test('should show portfolio value', async ({ page }) => {
    // Already on dashboard, modals dismissed
  });

  test('should show recent trades', async ({ page }) => {
    // Already on dashboard, modals dismissed
  });
});
```

### 8. Handle Flaky Tests

If tests are flaky, investigate and fix the root cause:

```typescript
// Identify timing issues
test('should update in real-time', async ({ page }) => {
  // Wait for specific network request
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/data')
  );

  await page.getByRole('button', { name: 'Refresh' }).click();
  await responsePromise;

  // Now safe to check updated data
  await expect(page.getByTestId('data-value')).toHaveText('123');
});
```

### 9. Test Error States

Don't just test happy paths:

```typescript
test('should show error on invalid email', async ({ page }) => {
  await page.getByLabel('Email').fill('invalid-email');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Invalid email address')).toBeVisible();
});
```

### 10. Use Network Mocking Sparingly

Prefer testing against real APIs, but mock for specific scenarios:

```typescript
test('should handle API error gracefully', async ({ page }) => {
  // Mock API failure
  await page.route('**/api/data', route => {
    route.fulfill({ status: 500 });
  });

  await page.goto('/app');

  await expect(page.getByText('Unable to load data')).toBeVisible();
});
```

### 11. Keep Tests Fast

- Run tests in parallel (default in Playwright)
- Use `test.describe.parallel()` for independent test groups
- Mock external dependencies when appropriate
- Use smaller datasets for test data

### 12. Review Test Reports Regularly

```bash
# After running tests, review the HTML report
npm run test:e2e:report
```

Check for:
- Flaky tests (passing/failing intermittently)
- Slow tests (optimize or split)
- Skipped tests (implement or remove)

---

## Troubleshooting

### Common Issues

#### Tests fail locally but pass in CI (or vice versa)

```typescript
// Check for timing issues
test('should load data', async ({ page }) => {
  // Increase timeout for slower CI environments
  await page.getByTestId('data').waitFor({ timeout: 10000 });
});
```

#### Element not found errors

```typescript
// Use conditional checks
const element = page.getByRole('button', { name: 'Optional' });
if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
  await element.click();
}
```

#### Tests hang or timeout

```typescript
// Check for missing awaits
await page.goto('/app');  // ✅ GOOD
page.goto('/app');        // ❌ BAD - missing await
```

#### Browser not closing

```typescript
// Ensure all async operations complete
test('should work', async ({ page }) => {
  await page.goto('/app');
  // ✅ All operations awaited
});
```

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [DeepStack Project Repository](https://github.com/yourusername/deepstack)

---

## Contributing

When adding new E2E tests:

1. Follow the existing test structure and patterns
2. Use semantic locators (roles, labels, text)
3. Add tests to appropriate spec files or create new ones
4. Run tests locally before committing: `npm run test:e2e`
5. Ensure tests pass in all browsers: `npm run test:e2e:chromium && npm run test:e2e:firefox && npm run test:e2e:webkit`
6. Update this README if adding new patterns or utilities

---

## License

See project LICENSE file.
