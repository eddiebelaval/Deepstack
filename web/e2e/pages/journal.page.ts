import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../fixtures/base.fixture';

/**
 * Journal Page Object Model
 *
 * Represents the trading journal page (/journal) with all its elements and interactions.
 * Tests the journal entry creation, editing, deletion, and list views.
 */
export class JournalPage extends BasePage {
  // Header Elements
  readonly heading: Locator;
  readonly newEntryButton: Locator;
  readonly createFirstEntryButton: Locator;
  readonly syncStatusOnline: Locator;
  readonly syncStatusOffline: Locator;
  readonly entryCountBadge: Locator;

  // Empty State
  readonly emptyStateMessage: Locator;
  readonly emptyStateIcon: Locator;

  // Dialog Elements
  readonly entryDialog: Locator;
  readonly dialogTitle: Locator;
  readonly symbolInput: Locator;
  readonly tradeDateInput: Locator;
  readonly directionSelect: Locator;
  readonly quantityInput: Locator;
  readonly entryPriceInput: Locator;
  readonly exitPriceInput: Locator;
  readonly emotionAtEntrySelect: Locator;
  readonly emotionAtExitSelect: Locator;
  readonly notesEditor: Locator;
  readonly lessonsEditor: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Entry Card Elements
  readonly entryCards: Locator;
  readonly entrySymbol: Locator;
  readonly entryDirection: Locator;
  readonly entryPnl: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  // Tabs (from TradeJournal component)
  readonly tabAll: Locator;
  readonly tabOpen: Locator;
  readonly tabClosed: Locator;

  constructor(page: Page) {
    super(page);

    // Header Elements
    this.heading = page.getByRole('heading', { name: 'Trade Journal' });
    this.newEntryButton = page.getByRole('button', { name: /New Entry|Limit Reached/ });
    this.createFirstEntryButton = page.getByRole('button', { name: 'Create First Entry' });
    this.syncStatusOnline = page.locator('[title="Synced with cloud"]');
    this.syncStatusOffline = page.locator('[title="Using local storage"]');
    this.entryCountBadge = page.locator('text=/\\d+\\/10 entries|\\d+ entries/');

    // Empty State
    this.emptyStateMessage = page.getByText('No journal entries yet');
    this.emptyStateIcon = page.locator('.text-muted-foreground svg.lucide-calendar');

    // Dialog Elements
    this.entryDialog = page.getByRole('dialog');
    this.dialogTitle = page.getByRole('heading', { name: /New Journal Entry|Edit Journal Entry/ });
    this.symbolInput = page.locator('#symbol');
    this.tradeDateInput = page.locator('#tradeDate');
    this.directionSelect = page.locator('button:has-text("Long") >> nth=0').or(
      page.getByRole('combobox').filter({ hasText: /Long|Short/ }).first()
    );
    this.quantityInput = page.locator('#quantity');
    this.entryPriceInput = page.locator('#entryPrice');
    this.exitPriceInput = page.locator('#exitPrice');
    this.emotionAtEntrySelect = page.getByRole('combobox').nth(1);
    this.emotionAtExitSelect = page.getByRole('combobox').nth(2);
    this.notesEditor = page.locator('.ProseMirror').first();
    this.lessonsEditor = page.locator('.ProseMirror').last();
    this.saveButton = page.getByRole('button', { name: /Save Entry|Update Entry/ });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    // Entry Card Elements
    this.entryCards = page.locator('[class*="hover:bg-muted"]').filter({ has: page.locator('.font-bold.text-lg') });
    this.entrySymbol = page.locator('.font-bold.text-lg');
    this.entryDirection = page.locator('[class*="badge"]').filter({ hasText: /LONG|SHORT/ });
    this.entryPnl = page.locator('[class*="text-green-500"], [class*="text-red-500"]').filter({ hasText: /^\$/ });
    this.editButton = page.getByRole('button').filter({ has: page.locator('svg.lucide-edit, svg.lucide-pencil') });
    this.deleteButton = page.getByRole('button').filter({ has: page.locator('svg.lucide-trash-2') });

    // Tabs (from TradeJournal widget on /app)
    this.tabAll = page.getByRole('tab', { name: /All/ });
    this.tabOpen = page.getByRole('tab', { name: /Open/ });
    this.tabClosed = page.getByRole('tab', { name: /Closed/ });
  }

  /**
   * Navigate to journal page
   */
  async navigate(): Promise<void> {
    await this.gotoAndDismissModals('/journal');
  }

  /**
   * Navigate to journal page and wait for it to load
   */
  async navigateAndWait(): Promise<void> {
    await this.navigate();
    await this.waitForPageLoad();
  }

  /**
   * Wait for the journal page to load
   */
  async waitForPageLoad(): Promise<void> {
    await this.waitFor(500);
    // Wait for either heading or empty state
    const headingVisible = await this.exists(this.heading, 5000);
    if (!headingVisible) {
      // Try waiting for empty state
      await this.exists(this.emptyStateMessage, 3000);
    }
  }

  /**
   * Check if page is showing empty state
   */
  async isEmptyState(): Promise<boolean> {
    return await this.exists(this.emptyStateMessage, 2000);
  }

  /**
   * Check if journal page is loaded
   */
  async isPageLoaded(): Promise<boolean> {
    return await this.exists(this.heading, 3000);
  }

  /**
   * Click the new entry button to open the dialog
   */
  async clickNewEntry(): Promise<void> {
    const newEntryBtn = this.page.getByRole('button', { name: 'New Entry' });
    if (await this.exists(newEntryBtn, 2000)) {
      await newEntryBtn.click();
    } else {
      // Fallback to create first entry button
      await this.safeClick(this.createFirstEntryButton);
    }
    await this.waitFor(300);
  }

  /**
   * Check if the entry dialog is open
   */
  async isDialogOpen(): Promise<boolean> {
    return await this.exists(this.entryDialog, 2000);
  }

  /**
   * Fill in the journal entry form
   */
  async fillEntryForm(data: {
    symbol: string;
    tradeDate?: string;
    direction?: 'long' | 'short';
    quantity: string;
    entryPrice: string;
    exitPrice?: string;
    emotionAtEntry?: string;
    emotionAtExit?: string;
    notes?: string;
    lessonsLearned?: string;
  }): Promise<void> {
    // Fill symbol
    await this.symbolInput.fill(data.symbol);

    // Fill trade date if provided
    if (data.tradeDate) {
      await this.tradeDateInput.fill(data.tradeDate);
    }

    // Select direction if not default
    if (data.direction && data.direction !== 'long') {
      const directionTrigger = this.page.locator('[role="combobox"]').first();
      await directionTrigger.click();
      await this.page.getByRole('option', { name: /Short/ }).click();
    }

    // Fill quantity
    await this.quantityInput.fill(data.quantity);

    // Fill entry price
    await this.entryPriceInput.fill(data.entryPrice);

    // Fill exit price if provided
    if (data.exitPrice) {
      await this.exitPriceInput.fill(data.exitPrice);
    }

    // Select emotions if provided
    if (data.emotionAtEntry) {
      const emotionTrigger = this.page.locator('[role="combobox"]').nth(1);
      await emotionTrigger.click();
      await this.page.getByRole('option', { name: new RegExp(data.emotionAtEntry, 'i') }).click();
    }

    // Fill notes if provided (using contenteditable div)
    if (data.notes) {
      const notesEditor = this.page.locator('.ProseMirror').first();
      if (await this.exists(notesEditor, 1000)) {
        await notesEditor.click();
        await notesEditor.fill(data.notes);
      }
    }
  }

  /**
   * Submit the entry form
   */
  async submitEntryForm(): Promise<void> {
    await this.saveButton.click();
    await this.waitFor(500);
  }

  /**
   * Cancel the entry form
   */
  async cancelEntryForm(): Promise<void> {
    await this.cancelButton.click();
    await this.waitFor(300);
  }

  /**
   * Create a new journal entry with the given data
   */
  async createEntry(data: {
    symbol: string;
    quantity: string;
    entryPrice: string;
    exitPrice?: string;
    direction?: 'long' | 'short';
  }): Promise<void> {
    await this.clickNewEntry();
    await this.fillEntryForm(data);
    await this.submitEntryForm();
  }

  /**
   * Get the number of entry cards displayed
   */
  async getEntryCount(): Promise<number> {
    await this.waitFor(300);
    // Look for card elements that contain trade info
    const cards = this.page.locator('[class*="rounded-lg"][class*="border"][class*="p-4"]').filter({
      has: this.page.locator('.font-bold')
    });
    return await cards.count();
  }

  /**
   * Get entry data from a specific card by index
   */
  async getEntryData(index: number = 0): Promise<{ symbol: string; direction: string } | null> {
    const cards = this.page.locator('[class*="rounded-lg"][class*="border"][class*="p-4"]').filter({
      has: this.page.locator('.font-bold.text-lg')
    });

    const count = await cards.count();
    if (index >= count) return null;

    const card = cards.nth(index);
    const symbol = await card.locator('.font-bold.text-lg').first().textContent();
    const directionBadge = await card.locator('[class*="badge"]').first().textContent();

    return {
      symbol: symbol?.trim() || '',
      direction: directionBadge?.toLowerCase().includes('long') ? 'long' : 'short'
    };
  }

  /**
   * Click edit button on a specific entry
   */
  async clickEditOnEntry(index: number = 0): Promise<void> {
    const cards = this.page.locator('[class*="rounded-lg"][class*="border"][class*="p-4"]').filter({
      has: this.page.locator('.font-bold.text-lg')
    });
    const editBtn = cards.nth(index).getByRole('button').filter({ has: this.page.locator('svg') }).first();
    await editBtn.click();
    await this.waitFor(300);
  }

  /**
   * Click delete button on a specific entry
   */
  async clickDeleteOnEntry(index: number = 0): Promise<void> {
    const cards = this.page.locator('[class*="rounded-lg"][class*="border"][class*="p-4"]').filter({
      has: this.page.locator('.font-bold.text-lg')
    });
    const deleteBtn = cards.nth(index).locator('[class*="destructive"], [class*="text-destructive"]').or(
      cards.nth(index).getByRole('button').filter({ has: this.page.locator('svg.lucide-trash-2') })
    );
    await deleteBtn.click();
    await this.waitFor(300);
  }

  /**
   * Switch to a specific tab
   */
  async switchTab(tab: 'all' | 'open' | 'closed'): Promise<void> {
    const tabMap = {
      all: this.tabAll,
      open: this.tabOpen,
      closed: this.tabClosed
    };
    await this.safeClick(tabMap[tab]);
    await this.waitFor(300);
  }

  /**
   * Check if sync status shows online
   */
  async isSyncOnline(): Promise<boolean> {
    return await this.exists(this.syncStatusOnline, 2000);
  }

  /**
   * Verify entry exists with specific symbol
   */
  async hasEntryWithSymbol(symbol: string): Promise<boolean> {
    const entry = this.page.locator('.font-bold.text-lg').filter({ hasText: symbol.toUpperCase() });
    return await this.exists(entry, 3000);
  }

  /**
   * Verify page displays correctly
   */
  async verifyPageElements(): Promise<void> {
    await expect(this.heading).toBeVisible();
    // Either new entry button or create first entry should be visible
    const hasNewEntry = await this.exists(this.newEntryButton, 1000);
    const hasCreateFirst = await this.exists(this.createFirstEntryButton, 1000);
    expect(hasNewEntry || hasCreateFirst).toBeTruthy();
  }
}
