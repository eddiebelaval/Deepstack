/**
 * Global E2E Test Teardown
 *
 * Runs once after all tests to:
 * - Clean up test data
 * - Generate test reports
 * - Archive artifacts
 *
 * Usage:
 *   Add to playwright.config.ts:
 *   globalTeardown: './e2e/global-teardown.ts',
 */

import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown function
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('\n🧹 Running E2E Global Teardown...\n');

  // Generate test summary
  const testResultsDir = './test-results';

  if (fs.existsSync(testResultsDir)) {
    // Count test artifacts
    const screenshotsDir = path.join(testResultsDir, 'screenshots');
    const tracesDir = path.join(testResultsDir, 'traces');

    let screenshotCount = 0;
    let traceCount = 0;

    if (fs.existsSync(screenshotsDir)) {
      screenshotCount = fs.readdirSync(screenshotsDir).length;
    }

    if (fs.existsSync(tracesDir)) {
      traceCount = fs.readdirSync(tracesDir).length;
    }

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      artifacts: {
        screenshots: screenshotCount,
        traces: traceCount,
      },
    };

    // Write summary file
    fs.writeFileSync(
      path.join(testResultsDir, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('📊 Test Summary:');
    console.log(`   Screenshots: ${screenshotCount}`);
    console.log(`   Traces: ${traceCount}`);
  }

  console.log('\n✨ Global teardown completed\n');
}

export default globalTeardown;
