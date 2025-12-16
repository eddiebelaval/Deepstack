/**
 * Authentication Fixture for E2E Tests
 *
 * Provides authenticated test sessions for protected routes.
 * Supports both real authentication and mocked sessions.
 *
 * Usage:
 *   import { test } from '../fixtures/auth.fixture';
 *
 *   test('authenticated test', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/dashboard');
 *     // User is already logged in
 *   });
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { BasePage } from './base.fixture';

/**
 * Authentication credentials for test accounts
 * These should be set via environment variables in CI
 */
const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'test@deepstack-test.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

/**
 * Storage state file for preserving authentication between tests
 */
const STORAGE_STATE_PATH = './test-results/.auth/user.json';

/**
 * Mock session data for when real auth isn't available
 */
const MOCK_SESSION = {
  user: {
    id: 'test-user-id',
    email: 'test@deepstack-test.com',
    name: 'Test User',
    role: 'user',
  },
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 3600 * 1000, // 1 hour from now
};

/**
 * Authenticated Page Object
 *
 * Extends BasePage with authentication capabilities
 */
class AuthenticatedPage extends BasePage {
  constructor(page: Page, private context: BrowserContext) {
    super(page);
  }

  /**
   * Login with real credentials
   * Use this when you need actual authentication
   */
  async login(
    email: string = TEST_CREDENTIALS.email,
    password: string = TEST_CREDENTIALS.password
  ): Promise<void> {
    await this.page.goto('/login');

    // Fill login form
    await this.page.getByRole('textbox', { name: /email/i }).fill(email);
    await this.page.getByRole('textbox', { name: /password/i }).fill(password);
    await this.page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for redirect to app
    await this.page.waitForURL(/\/(app|dashboard)/, { timeout: 10000 });

    // Save storage state for reuse
    await this.context.storageState({ path: STORAGE_STATE_PATH });
  }

  /**
   * Mock authentication without hitting the auth server
   * Use this for faster tests that don't need real auth
   */
  async mockAuth(): Promise<void> {
    // Set up mock API responses for auth endpoints
    await this.page.route('**/auth/v1/token**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: MOCK_SESSION.access_token,
          refresh_token: MOCK_SESSION.refresh_token,
          expires_in: 3600,
          token_type: 'bearer',
          user: MOCK_SESSION.user,
        }),
      });
    });

    await this.page.route('**/auth/v1/user**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SESSION.user),
      });
    });

    // Set session in localStorage/cookies
    await this.page.addInitScript((session) => {
      // Supabase stores session in localStorage
      localStorage.setItem(
        'sb-auth-token',
        JSON.stringify({
          currentSession: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: session.user,
          },
          expiresAt: session.expires_at,
        })
      );
    }, MOCK_SESSION);
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    // Clear session from localStorage
    await this.page.evaluate(() => {
      localStorage.removeItem('sb-auth-token');
      localStorage.removeItem('supabase.auth.token');
    });

    // Navigate to landing
    await this.page.goto('/');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.page.evaluate(() => {
      return localStorage.getItem('sb-auth-token');
    });

    return session !== null;
  }

  /**
   * Get current user from session
   */
  async getCurrentUser(): Promise<typeof MOCK_SESSION.user | null> {
    const session = await this.page.evaluate(() => {
      const data = localStorage.getItem('sb-auth-token');
      if (!data) return null;
      try {
        const parsed = JSON.parse(data);
        return parsed.currentSession?.user || null;
      } catch {
        return null;
      }
    });

    return session;
  }

  /**
   * Verify user is on authenticated page
   */
  async expectAuthenticated(): Promise<void> {
    const isAuth = await this.isAuthenticated();
    expect(isAuth).toBe(true);
  }
}

/**
 * Test fixtures for authenticated tests
 */
type AuthFixtures = {
  authenticatedPage: AuthenticatedPage;
  mockAuthPage: AuthenticatedPage;
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Page with real authentication
   * Uses stored session if available, otherwise logs in
   */
  authenticatedPage: async ({ page, context }, use) => {
    const authPage = new AuthenticatedPage(page, context);

    // Check for existing session file
    try {
      await context.storageState({ path: STORAGE_STATE_PATH });
    } catch {
      // No existing session, need to login
      await authPage.login();
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(authPage);
  },

  /**
   * Page with mocked authentication
   * Faster than real auth, good for UI testing
   */
  mockAuthPage: async ({ page, context }, use) => {
    const authPage = new AuthenticatedPage(page, context);
    await authPage.mockAuth();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(authPage);
  },
});

export { expect };
export { AuthenticatedPage };
export { TEST_CREDENTIALS, MOCK_SESSION, STORAGE_STATE_PATH };
