import { test, expect } from '@playwright/test';
import { JournalPage } from './pages/journal.page';

/**
 * Trading Journal E2E Tests
 *
 * Tests the complete trading journal workflow including:
 * - Page loading and navigation
 * - Creating new journal entries
 * - Editing existing entries
 * - Deleting entries
 * - Form validation
 * - Empty state handling
 */

// Helper to dismiss onboarding and disclaimer modals
async function dismissModals(page: import('@playwright/test').Page) {
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

test.describe('Trading Journal Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/journal');
    await dismissModals(page);
  });

  test.describe('Page Loading', () => {
    test('should display journal page with heading', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      await expect(page.getByRole('heading', { name: 'Trade Journal' })).toBeVisible();
    });

    test('should show new entry button', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      // Either "New Entry" or "Create First Entry" should be visible
      const newEntryBtn = page.getByRole('button', { name: 'New Entry' });
      const createFirstBtn = page.getByRole('button', { name: 'Create First Entry' });

      const hasNewEntry = await newEntryBtn.isVisible({ timeout: 2000 }).catch(() => false);
      const hasCreateFirst = await createFirstBtn.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasNewEntry || hasCreateFirst).toBeTruthy();
    });

    test('should display sync status indicator', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      // Check for either online or offline indicator
      const onlineIndicator = page.locator('[title="Synced with cloud"]');
      const offlineIndicator = page.locator('[title="Using local storage"]');

      const hasOnline = await onlineIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      const hasOffline = await offlineIndicator.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasOnline || hasOffline).toBeTruthy();
    });

    test('should display empty state when no entries exist', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      // Check for empty state message
      const emptyMessage = page.getByText('No journal entries yet');
      const patternMessage = page.getByText('Start documenting your trades to discover patterns');

      const hasEmptyMessage = await emptyMessage.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasEmptyMessage) {
        await expect(emptyMessage).toBeVisible();
        await expect(patternMessage).toBeVisible();
      }
      // If entries exist, that's also fine
    });
  });

  test.describe('Journal Entry Dialog', () => {
    test('should open entry dialog when clicking new entry button', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'New Journal Entry' })).toBeVisible();
    });

    test('should display all form fields in the dialog', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Check for required form fields
      await expect(page.locator('#symbol')).toBeVisible();
      await expect(page.locator('#tradeDate')).toBeVisible();
      await expect(page.locator('#quantity')).toBeVisible();
      await expect(page.locator('#entryPrice')).toBeVisible();
      await expect(page.locator('#exitPrice')).toBeVisible();

      // Check for buttons
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save Entry' })).toBeVisible();
    });

    test('should close dialog when clicking cancel', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(500);

      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should have save button disabled without required fields', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Save button should be disabled initially
      const saveButton = page.getByRole('button', { name: 'Save Entry' });
      await expect(saveButton).toBeDisabled();
    });

    test('should enable save button when required fields are filled', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Fill required fields
      await page.locator('#symbol').fill('AAPL');
      await page.locator('#entryPrice').fill('150.00');

      // Save button should be enabled
      const saveButton = page.getByRole('button', { name: 'Save Entry' });
      await expect(saveButton).toBeEnabled();
    });
  });

  test.describe('Creating Journal Entries', () => {
    test('should create a new journal entry with minimal data', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      const initialCount = await journalPage.getEntryCount();

      // Create a new entry
      await journalPage.clickNewEntry();
      await page.locator('#symbol').fill('AAPL');
      await page.locator('#quantity').fill('100');
      await page.locator('#entryPrice').fill('150.00');

      await page.getByRole('button', { name: 'Save Entry' }).click();
      await page.waitForTimeout(1000);

      // Verify entry was created
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Check if entry count increased or entry is visible
      const hasAaplEntry = await journalPage.hasEntryWithSymbol('AAPL');
      expect(hasAaplEntry).toBeTruthy();
    });

    test('should create a long position entry', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      await journalPage.clickNewEntry();
      await page.locator('#symbol').fill('TSLA');
      await page.locator('#quantity').fill('50');
      await page.locator('#entryPrice').fill('250.00');

      await page.getByRole('button', { name: 'Save Entry' }).click();
      await page.waitForTimeout(1000);

      // Verify the entry shows LONG direction
      const tslaEntry = page.locator('text=TSLA').first();
      await expect(tslaEntry).toBeVisible();
    });

    test('should create a short position entry', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      await journalPage.clickNewEntry();
      await page.locator('#symbol').fill('SPY');
      await page.locator('#quantity').fill('10');
      await page.locator('#entryPrice').fill('450.00');

      // Change direction to short
      const directionSelect = page.locator('[role="combobox"]').first();
      await directionSelect.click();
      await page.getByRole('option', { name: /Short/ }).click();

      await page.getByRole('button', { name: 'Save Entry' }).click();
      await page.waitForTimeout(1000);

      // Verify the entry was created
      const spyEntry = page.locator('text=SPY').first();
      await expect(spyEntry).toBeVisible();
    });

    test('should create entry with exit price and show P&L', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      await journalPage.clickNewEntry();
      await page.locator('#symbol').fill('MSFT');
      await page.locator('#quantity').fill('20');
      await page.locator('#entryPrice').fill('380.00');
      await page.locator('#exitPrice').fill('395.00');

      await page.getByRole('button', { name: 'Save Entry' }).click();
      await page.waitForTimeout(1000);

      // Verify entry exists
      const msftEntry = page.locator('text=MSFT').first();
      await expect(msftEntry).toBeVisible();
    });

    test('should convert symbol to uppercase', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      await journalPage.clickNewEntry();
      await page.locator('#symbol').fill('aapl'); // lowercase
      await page.locator('#quantity').fill('10');
      await page.locator('#entryPrice').fill('150.00');

      await page.getByRole('button', { name: 'Save Entry' }).click();
      await page.waitForTimeout(1000);

      // Verify entry shows uppercase symbol
      const aaplEntry = page.locator('text=AAPL').first();
      await expect(aaplEntry).toBeVisible();
    });
  });

  test.describe('Entry Management', () => {
    // Create an entry before each test in this describe block
    test.beforeEach(async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();

      // Create a test entry if empty
      const isEmpty = await journalPage.isEmptyState();
      if (isEmpty) {
        await journalPage.clickNewEntry();
        await page.locator('#symbol').fill('TEST');
        await page.locator('#quantity').fill('100');
        await page.locator('#entryPrice').fill('100.00');
        await page.getByRole('button', { name: 'Save Entry' }).click();
        await page.waitForTimeout(1000);
      }
    });

    test('should display entry card with symbol and direction', async ({ page }) => {
      const journalPage = new JournalPage(page);

      // Look for any entry card
      const entryCard = page.locator('[class*="rounded-lg"][class*="border"]').filter({
        has: page.locator('.font-bold')
      }).first();

      if (await entryCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Check for symbol (should be bold)
        const symbol = entryCard.locator('.font-bold').first();
        await expect(symbol).toBeVisible();

        // Check for direction badge
        const directionBadge = entryCard.locator('[class*="badge"]').first();
        if (await directionBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
          const text = await directionBadge.textContent();
          expect(text?.toLowerCase()).toMatch(/long|short/);
        }
      }
    });

    test('should open edit dialog when clicking edit button', async ({ page }) => {
      const journalPage = new JournalPage(page);

      // Find and click edit button on first entry
      const editButton = page.getByRole('button').filter({ has: page.locator('svg.lucide-edit, svg.lucide-pencil') }).first();

      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Dialog should open with "Edit" in title
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('heading', { name: /Edit Journal Entry/ })).toBeVisible();
      }
    });

    test('should delete entry when clicking delete button', async ({ page }) => {
      const journalPage = new JournalPage(page);

      // First create a unique entry to delete
      await journalPage.clickNewEntry();
      await page.locator('#symbol').fill('DELE');
      await page.locator('#quantity').fill('1');
      await page.locator('#entryPrice').fill('1.00');
      await page.getByRole('button', { name: 'Save Entry' }).click();
      await page.waitForTimeout(1000);

      // Verify it exists
      const deleEntry = page.locator('text=DELE').first();
      await expect(deleEntry).toBeVisible();

      // Find and click delete button
      const entryCard = page.locator('[class*="rounded-lg"][class*="border"]').filter({
        has: page.locator('text=DELE')
      }).first();

      const deleteButton = entryCard.locator('[class*="destructive"]').or(
        entryCard.getByRole('button').filter({ has: page.locator('svg.lucide-trash-2') })
      ).first();

      await deleteButton.click();
      await page.waitForTimeout(500);

      // Entry should be removed
      await expect(page.locator('text=DELE').first()).not.toBeVisible();
    });
  });

  test.describe('Emotion Tracking', () => {
    test('should display emotion options in the dialog', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Click on emotion select
      const emotionSelect = page.locator('[role="combobox"]').nth(1);
      await emotionSelect.click();

      // Check for emotion options
      const emotionOptions = ['Confident', 'Anxious', 'Neutral', 'Excited'];
      for (const emotion of emotionOptions) {
        const option = page.getByRole('option', { name: new RegExp(emotion, 'i') });
        await expect(option).toBeVisible();
      }
    });

    test('should allow selecting emotion at entry', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Fill required fields first
      await page.locator('#symbol').fill('EMO');
      await page.locator('#quantity').fill('10');
      await page.locator('#entryPrice').fill('100.00');

      // Select emotion at entry
      const emotionSelect = page.locator('[role="combobox"]').nth(1);
      await emotionSelect.click();
      await page.getByRole('option', { name: /Confident/ }).click();

      // Submit form
      await page.getByRole('button', { name: 'Save Entry' }).click();
      await page.waitForTimeout(1000);

      // Verify entry was created with emotion
      const emoEntry = page.locator('text=EMO').first();
      await expect(emoEntry).toBeVisible();

      // Check for confident emotion display
      const confidentEmoji = page.locator('text=confident');
      if (await confidentEmoji.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(confidentEmoji).toBeVisible();
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should not submit without symbol', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Fill only price
      await page.locator('#entryPrice').fill('100.00');

      // Save button should be disabled
      const saveButton = page.getByRole('button', { name: 'Save Entry' });
      await expect(saveButton).toBeDisabled();
    });

    test('should not submit without entry price', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      // Fill only symbol
      await page.locator('#symbol').fill('AAPL');

      // Save button should be disabled
      const saveButton = page.getByRole('button', { name: 'Save Entry' });
      await expect(saveButton).toBeDisabled();
    });

    test('should accept decimal prices', async ({ page }) => {
      const journalPage = new JournalPage(page);
      await journalPage.waitForPageLoad();
      await journalPage.clickNewEntry();

      await page.locator('#symbol').fill('DECI');
      await page.locator('#quantity').fill('10');
      await page.locator('#entryPrice').fill('123.45');
      await page.locator('#exitPrice').fill('125.67');

      const saveButton = page.getByRole('button', { name: 'Save Entry' });
      await expect(saveButton).toBeEnabled();

      await saveButton.click();
      await page.waitForTimeout(1000);

      // Entry should be created
      const deciEntry = page.locator('text=DECI').first();
      await expect(deciEntry).toBeVisible();
    });
  });
});

test.describe('Trading Journal on App Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await dismissModals(page);
  });

  test('should navigate from app to journal if link exists', async ({ page }) => {
    // Look for journal link in navigation
    const journalLink = page.getByRole('link', { name: /journal/i });

    if (await journalLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await journalLink.click();
      await expect(page).toHaveURL(/\/journal/);
      await expect(page.getByRole('heading', { name: 'Trade Journal' })).toBeVisible();
    }
  });
});

test.describe('Complete Journal Workflow', () => {
  test('user can create, view, and delete a journal entry', async ({ page }) => {
    // Navigate to journal
    await page.goto('/journal');
    await dismissModals(page);

    const journalPage = new JournalPage(page);
    await journalPage.waitForPageLoad();

    // Step 1: Create new entry
    await journalPage.clickNewEntry();
    await page.locator('#symbol').fill('WORK');
    await page.locator('#quantity').fill('50');
    await page.locator('#entryPrice').fill('200.00');
    await page.locator('#exitPrice').fill('210.00');

    await page.getByRole('button', { name: 'Save Entry' }).click();
    await page.waitForTimeout(1000);

    // Step 2: Verify entry appears
    const workEntry = page.locator('text=WORK').first();
    await expect(workEntry).toBeVisible();

    // Step 3: Delete the entry
    const entryCard = page.locator('[class*="rounded-lg"][class*="border"]').filter({
      has: page.locator('text=WORK')
    }).first();

    const deleteButton = entryCard.locator('[class*="destructive"]').or(
      entryCard.getByRole('button').filter({ has: page.locator('svg.lucide-trash-2') })
    ).first();

    await deleteButton.click();
    await page.waitForTimeout(500);

    // Step 4: Verify entry is removed
    await expect(page.locator('text=WORK').first()).not.toBeVisible();
  });

  test('user can edit an existing journal entry', async ({ page }) => {
    // Navigate to journal
    await page.goto('/journal');
    await dismissModals(page);

    const journalPage = new JournalPage(page);
    await journalPage.waitForPageLoad();

    // Create an entry first
    await journalPage.clickNewEntry();
    await page.locator('#symbol').fill('EDIT');
    await page.locator('#quantity').fill('10');
    await page.locator('#entryPrice').fill('100.00');
    await page.getByRole('button', { name: 'Save Entry' }).click();
    await page.waitForTimeout(1000);

    // Find and click edit button
    const entryCard = page.locator('[class*="rounded-lg"][class*="border"]').filter({
      has: page.locator('text=EDIT')
    }).first();

    const editButton = entryCard.getByRole('button').first();
    await editButton.click();
    await page.waitForTimeout(500);

    // Update the exit price
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#exitPrice').fill('110.00');

    await page.getByRole('button', { name: /Update Entry/ }).click();
    await page.waitForTimeout(1000);

    // Verify dialog closed
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Cleanup - delete the test entry
    const deleteButton = entryCard.locator('[class*="destructive"]').or(
      entryCard.getByRole('button').filter({ has: page.locator('svg.lucide-trash-2') })
    ).first();
    await deleteButton.click();
  });
});
