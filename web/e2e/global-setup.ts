/**
 * Global E2E Test Setup
 *
 * Runs once before all tests to:
 * - Verify test environment is ready
 * - Setup authentication state
 * - Clean up test data from previous runs
 * - Create necessary directories
 *
 * Usage:
 *   Add to playwright.config.ts:
 *   globalSetup: './e2e/global-setup.ts',
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test environment configuration
 */
const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  authStoragePath: './test-results/.auth',
  screenshotsPath: './test-results/screenshots',
  tracesPath: './test-results/traces',
  maxSetupTime: 60000, // 60 seconds
};

/**
 * Ensure directory exists
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Clean up old test artifacts
 */
function cleanupArtifacts(): void {
  const artifactDirs = [
    TEST_CONFIG.screenshotsPath,
    TEST_CONFIG.tracesPath,
  ];

  for (const dir of artifactDirs) {
    if (fs.existsSync(dir)) {
      // Remove files older than 7 days
      const files = fs.readdirSync(dir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}

/**
 * Verify test server is accessible
 */
async function verifyTestServer(): Promise<boolean> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const response = await page.goto(TEST_CONFIG.baseUrl, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    if (!response || response.status() >= 400) {
      console.error(`❌ Test server returned status ${response?.status()}`);
      return false;
    }

    console.log(`✅ Test server is accessible at ${TEST_CONFIG.baseUrl}`);
    return true;
  } catch (error) {
    console.error(`❌ Could not connect to test server at ${TEST_CONFIG.baseUrl}`);
    console.error(error);
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Setup authentication state for tests
 */
async function setupAuthState(): Promise<void> {
  const authStoragePath = path.join(TEST_CONFIG.authStoragePath, 'user.json');

  // Skip if auth state already exists and is recent
  if (fs.existsSync(authStoragePath)) {
    const stats = fs.statSync(authStoragePath);
    const age = Date.now() - stats.mtimeMs;
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (age < maxAge) {
      console.log('✅ Using existing authentication state');
      return;
    }
  }

  // If test credentials are provided, perform actual login
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (email && password) {
    console.log('🔐 Setting up authentication state...');

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/login`);

      // Fill login form
      await page.getByRole('textbox', { name: /email/i }).fill(email);
      await page.getByRole('textbox', { name: /password/i }).fill(password);
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Wait for successful login
      await page.waitForURL(/\/(app|dashboard)/, { timeout: 15000 });

      // Save storage state
      await context.storageState({ path: authStoragePath });
      console.log('✅ Authentication state saved');
    } catch (error) {
      console.warn('⚠️ Could not set up authentication:', error);
    } finally {
      await browser.close();
    }
  } else {
    console.log('ℹ️ No test credentials provided, skipping auth setup');
  }
}

/**
 * Global setup function
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('\n🚀 Running E2E Global Setup...\n');
  const startTime = Date.now();

  // Create necessary directories
  console.log('📁 Creating test directories...');
  ensureDir(TEST_CONFIG.authStoragePath);
  ensureDir(TEST_CONFIG.screenshotsPath);
  ensureDir(TEST_CONFIG.tracesPath);
  ensureDir('./test-results');

  // Clean up old artifacts
  console.log('🧹 Cleaning up old artifacts...');
  cleanupArtifacts();

  // Verify test server is running
  console.log('🔍 Verifying test server...');
  const serverReady = await verifyTestServer();

  if (!serverReady) {
    throw new Error(
      `Test server is not accessible at ${TEST_CONFIG.baseUrl}. ` +
      'Make sure the dev server is running or set PLAYWRIGHT_BASE_URL.'
    );
  }

  // Setup authentication state
  await setupAuthState();

  const duration = Date.now() - startTime;
  console.log(`\n✨ Global setup completed in ${duration}ms\n`);
}

export default globalSetup;
