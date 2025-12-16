import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Run with:
 *   npm run test:e2e          - Run all E2E tests
 *   npm run test:e2e:ui       - Run with UI mode
 *   npm run test:e2e:headed   - Run in headed browser mode
 *
 * Advanced features:
 *   - Global setup/teardown for test isolation
 *   - Authentication state persistence
 *   - Automatic retries with trace collection
 *   - Cross-browser testing (Chromium, Firefox, WebKit)
 *   - Mobile device emulation
 *   - Parallel execution with sharding support
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Global setup and teardown
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI (with progressive backoff)
  retries: process.env.CI ? 2 : 1,

  // Parallel workers configuration
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI
    ? [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['github'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [
        ['html', { open: 'on-failure', outputFolder: 'playwright-report' }],
        ['list'],
      ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on retry
    video: 'on-first-retry',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Locale for consistent date/number formatting
    locale: 'en-US',

    // Timezone for consistent date handling
    timezoneId: 'America/New_York',

    // Color scheme preference
    colorScheme: 'dark',

    // Geolocation (for region-specific features)
    geolocation: { latitude: 40.7128, longitude: -74.0060 }, // NYC
    permissions: ['geolocation'],
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - runs first to set up authentication
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
      teardown: 'cleanup',
    },

    // Cleanup project - runs after all tests
    {
      name: 'cleanup',
      testMatch: /global-teardown\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },

    // Authenticated tests - use stored auth state
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './test-results/.auth/user.json',
      },
      testMatch: /authenticated\.spec\.ts/,
      dependencies: ['setup'],
    },

    // Performance tests - run separately to avoid interference
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Disable features that affect performance measurements
        launchOptions: {
          args: [
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-component-update',
          ],
        },
      },
      testMatch: /performance\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Test timeout
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 10 * 1000,
    // Screenshot comparison thresholds
    toHaveScreenshot: {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
    },
    toMatchSnapshot: {
      maxDiffPixels: 100,
    },
  },

  // Output directory for artifacts
  outputDir: 'test-results/',

  // Preserve output for debugging
  preserveOutput: 'failures-only',

  // Metadata for CI reporting
  metadata: {
    'playwright-version': '1.57',
    'node-version': process.version,
    'test-environment': process.env.CI ? 'ci' : 'local',
  },
});
