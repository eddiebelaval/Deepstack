import { test as base, expect, Page, Route } from '@playwright/test';
import { BasePage } from './base.fixture';

/**
 * Page Object Models
 */

class LandingPage extends BasePage {
  // Expose page for direct access
  get pageObject() { return this.page; }

  async goto() {
    await this.page.goto('/');
  }

  async clickGetStarted() {
    await this.page.getByRole('button', { name: /get started/i }).click();
  }

  async clickSignIn() {
    await this.page.getByRole('link', { name: /sign in/i }).click();
  }

  async expectHeroVisible() {
    await expect(this.page.getByRole('heading', { name: /deepstack/i })).toBeVisible();
  }

  async expectFeaturesVisible() {
    const features = this.page.getByText(/feature|trade|analyze|research/i);
    await expect(features.first()).toBeVisible();
  }
}

class AppPage extends BasePage {
  // Expose page for direct access
  get pageObject() { return this.page; }

  async goto() {
    await this.page.goto('/app');
  }

  async expectWelcomeHeading() {
    await expect(this.page.getByRole('heading', { name: 'Welcome to DeepStack' })).toBeVisible();
  }

  async expectTickerBarVisible() {
    const spyTicker = this.page.getByText('SPY').first();
    const qqqTicker = this.page.getByText('QQQ').first();

    const hasSpy = await spyTicker.isVisible({ timeout: 2000 }).catch(() => false);
    const hasQqq = await qqqTicker.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasSpy || hasQqq).toBeTruthy();
  }

  async openMarketWatch() {
    const marketWatchButton = this.page.getByRole('button', { name: 'Market Watch' });
    await marketWatchButton.click();
  }

  async typeInChat(message: string) {
    const chatInput = this.page.getByRole('textbox', { name: /Ask about stocks/i });
    await chatInput.fill(message);
  }

  async submitChat() {
    const chatInput = this.page.getByRole('textbox', { name: /Ask about stocks/i });
    await chatInput.press('Enter');
  }

  async getChatInputValue() {
    const chatInput = this.page.getByRole('textbox', { name: /Ask about stocks/i });
    return await chatInput.inputValue();
  }
}

class LoginPage extends BasePage {
  // Expose page for direct access
  get pageObject() { return this.page; }

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.page.getByRole('textbox', { name: /email/i }).fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByRole('textbox', { name: /password/i }).fill(password);
  }

  async submit() {
    await this.page.getByRole('button', { name: /sign in|log in/i }).click();
  }

  async expectErrorMessage(message?: string) {
    const errorElement = this.page.getByText(message || /error|invalid|failed/i);
    await expect(errorElement.first()).toBeVisible();
  }
}

class DashboardPage extends BasePage {
  // Expose page for direct access
  get pageObject() { return this.page; }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async navigateFromApp() {
    const dashboardLink = this.page.getByRole('link', { name: /dashboard/i }).first();
    await dashboardLink.click();
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async clickRefresh() {
    const refreshButton = this.page.getByRole('button', { name: 'Refresh' });
    await refreshButton.click();
  }

  async expectPortfolioValue() {
    await expect(this.page.getByText('Portfolio Value')).toBeVisible();
  }

  async expectAccountData() {
    const accountElements = [
      this.page.getByText('Portfolio Value'),
      this.page.getByText('Cash'),
      this.page.getByText('Buying Power')
    ];

    let found = false;
    for (const element of accountElements) {
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  }

  async getPortfolioValueText() {
    const element = this.page.getByText(/\$[\d,]+\.?\d*/);
    return await element.first().textContent();
  }
}

/**
 * Mock API Fixture
 */
class MockAPI {
  constructor(public page: Page) {}

  private routes: Map<string, (route: Route) => void> = new Map();

  async mockRoute(urlPattern: string | RegExp, handler: (route: Route) => void | Promise<void>) {
    await this.page.route(urlPattern, handler);
    this.routes.set(urlPattern.toString(), handler);
  }

  async mockMarketData(ticker: string, data: any) {
    await this.page.route(`**/api/market/**${ticker}**`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });
  }

  async mockAccountData(data: any) {
    await this.page.route('**/api/account**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });
  }

  async mockChatResponse(response: string | any) {
    await this.page.route('**/api/chat**', route => {
      const body = typeof response === 'string'
        ? JSON.stringify({ message: response })
        : JSON.stringify(response);

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body
      });
    });
  }

  async mockApiError(urlPattern: string | RegExp, status: number = 500, message?: string) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message || 'Internal Server Error' })
      });
    });
  }

  async simulateNetworkError(urlPattern: string | RegExp = '**/*') {
    await this.page.route(urlPattern, route => route.abort());
  }

  async simulateSlowNetwork(urlPattern: string | RegExp, delayMs: number = 2000) {
    await this.page.route(urlPattern, async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }

  async simulateTimeout(urlPattern: string | RegExp) {
    await this.page.route(urlPattern, route => {
      // Never respond to simulate timeout
      route.abort('timedout');
    });
  }

  async mock404(urlPattern: string | RegExp) {
    await this.mockApiError(urlPattern, 404, 'Not Found');
  }

  async mock401(urlPattern: string | RegExp) {
    await this.mockApiError(urlPattern, 401, 'Unauthorized');
  }

  async mock503(urlPattern: string | RegExp) {
    await this.mockApiError(urlPattern, 503, 'Service Unavailable');
  }

  async mockMalformedResponse(urlPattern: string | RegExp) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json {{{',
      });
    });
  }

  async clearMocks() {
    await this.page.unrouteAll();
    this.routes.clear();
  }

  async mockRetryableFailure(urlPattern: string | RegExp, failureCount: number = 1) {
    let attemptCount = 0;

    await this.page.route(urlPattern, route => {
      attemptCount++;

      if (attemptCount <= failureCount) {
        route.fulfill({ status: 500 });
      } else {
        route.continue();
      }
    });
  }
}

/**
 * Extended Test Fixtures
 */
type TestFixtures = {
  landingPage: LandingPage;
  appPage: AppPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  mockApi: MockAPI;
};

export const test = base.extend<TestFixtures>({
  landingPage: async ({ page }, use) => {
    const landingPage = new LandingPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(landingPage);
  },

  appPage: async ({ page }, use) => {
    const appPage = new AppPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(appPage);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(dashboardPage);
  },

  mockApi: async ({ page }, use) => {
    const mockApi = new MockAPI(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(mockApi);
    // Cleanup after test
    await mockApi.clearMocks();
  },
});

export { expect };
