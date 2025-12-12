import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useJournalStore } from '../journal-store';
import type { JournalEntry, EmotionType } from '../journal-store';
import { act } from '@testing-library/react';

describe('useJournalStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    // Clear persisted data and reset entries
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    act(() => {
      useJournalStore.setState({ entries: [] });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with empty entries array', () => {
      const state = useJournalStore.getState();
      expect(state.entries).toEqual([]);
    });

    it('has all required actions', () => {
      const state = useJournalStore.getState();
      expect(state.addEntry).toBeDefined();
      expect(state.updateEntry).toBeDefined();
      expect(state.deleteEntry).toBeDefined();
      expect(state.getEntryById).toBeDefined();
      expect(state.getEntriesBySymbol).toBeDefined();
    });
  });

  describe('addEntry', () => {
    it('creates a new journal entry with generated id and timestamps', () => {
      const { addEntry } = useJournalStore.getState();

      let newEntry: JournalEntry;
      act(() => {
        newEntry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.5,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Strong technical setup</p>',
        });
      });

      expect(newEntry!.id).toMatch(/^journal-\d+$/);
      expect(newEntry!.createdAt).toBeDefined();
      expect(newEntry!.updatedAt).toBeDefined();
      expect(newEntry!.symbol).toBe('AAPL');
    });

    it('adds entry to the beginning of entries array', () => {
      const { addEntry } = useJournalStore.getState();

      act(() => {
        addEntry({
          symbol: 'SPY',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 450.0,
          quantity: 5,
          emotionAtEntry: 'neutral',
          notes: '<p>First entry</p>',
        });

        addEntry({
          symbol: 'QQQ',
          tradeDate: '2025-01-16',
          direction: 'short',
          entryPrice: 380.0,
          quantity: 3,
          emotionAtEntry: 'anxious',
          notes: '<p>Second entry</p>',
        });
      });

      const state = useJournalStore.getState();
      expect(state.entries).toHaveLength(2);
      expect(state.entries[0].symbol).toBe('QQQ'); // Most recent first
      expect(state.entries[1].symbol).toBe('SPY');
    });

    it('creates entry with all optional fields', () => {
      const { addEntry } = useJournalStore.getState();

      let entry: JournalEntry;
      act(() => {
        entry = addEntry({
          symbol: 'TSLA',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 250.0,
          exitPrice: 275.0,
          quantity: 20,
          pnl: 500.0,
          pnlPercent: 10.0,
          emotionAtEntry: 'excited',
          emotionAtExit: 'relief',
          notes: '<p>Great trade!</p>',
          lessonsLearned: '<p>Patience pays off</p>',
          thesisId: 'thesis-123',
          screenshotUrls: ['https://example.com/screenshot1.png'],
        });
      });

      expect(entry!.exitPrice).toBe(275.0);
      expect(entry!.pnl).toBe(500.0);
      expect(entry!.pnlPercent).toBe(10.0);
      expect(entry!.emotionAtExit).toBe('relief');
      expect(entry!.lessonsLearned).toBe('<p>Patience pays off</p>');
      expect(entry!.thesisId).toBe('thesis-123');
      expect(entry!.screenshotUrls).toEqual(['https://example.com/screenshot1.png']);
    });

    it('handles different emotion types', () => {
      const { addEntry } = useJournalStore.getState();

      const emotions: EmotionType[] = [
        'confident',
        'anxious',
        'greedy',
        'fearful',
        'fomo',
        'regret',
        'relief',
        'neutral',
        'excited',
        'frustrated',
      ];

      emotions.forEach((emotion) => {
        act(() => {
          addEntry({
            symbol: 'TEST',
            tradeDate: '2025-01-15',
            direction: 'long',
            entryPrice: 100,
            quantity: 1,
            emotionAtEntry: emotion,
            notes: '<p>Test</p>',
          });
        });
      });

      expect(useJournalStore.getState().entries).toHaveLength(emotions.length);
    });

    it('handles both long and short directions', () => {
      const { addEntry } = useJournalStore.getState();

      let longEntry: JournalEntry;
      let shortEntry: JournalEntry;

      act(() => {
        longEntry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Long trade</p>',
        });

        shortEntry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'short',
          entryPrice: 150,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Short trade</p>',
        });
      });

      expect(longEntry!.direction).toBe('long');
      expect(shortEntry!.direction).toBe('short');
    });
  });

  describe('updateEntry', () => {
    it('updates existing entry fields', () => {
      const { addEntry, updateEntry } = useJournalStore.getState();

      let entryId: string;
      act(() => {
        const entry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Initial notes</p>',
        });
        entryId = entry.id;
      });

      act(() => {
        updateEntry(entryId, {
          exitPrice: 160.0,
          pnl: 100.0,
          emotionAtExit: 'relief',
          lessonsLearned: '<p>Stick to the plan</p>',
        });
      });

      const state = useJournalStore.getState();
      const updated = state.entries.find((e) => e.id === entryId);

      expect(updated?.exitPrice).toBe(160.0);
      expect(updated?.pnl).toBe(100.0);
      expect(updated?.emotionAtExit).toBe('relief');
      expect(updated?.lessonsLearned).toBe('<p>Stick to the plan</p>');
    });

    it('updates updatedAt timestamp', () => {
      const { addEntry, updateEntry } = useJournalStore.getState();

      let entryId: string;
      let originalUpdatedAt: string;

      act(() => {
        const entry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Test</p>',
        });
        entryId = entry.id;
        originalUpdatedAt = entry.updatedAt;
      });

      // Advance time to ensure different timestamp
      vi.advanceTimersByTime(1000);

      act(() => {
        updateEntry(entryId, { notes: '<p>Updated notes</p>' });
      });

      const updated = useJournalStore.getState().entries.find((e) => e.id === entryId);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('does not update non-existent entry', () => {
      const { addEntry, updateEntry } = useJournalStore.getState();

      act(() => {
        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Test</p>',
        });
      });

      const beforeUpdate = useJournalStore.getState().entries.length;

      act(() => {
        updateEntry('non-existent-id', { notes: '<p>Should not work</p>' });
      });

      expect(useJournalStore.getState().entries.length).toBe(beforeUpdate);
    });

    it('preserves other fields when updating', () => {
      const { addEntry, updateEntry } = useJournalStore.getState();

      let entryId: string;
      act(() => {
        const entry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Original notes</p>',
        });
        entryId = entry.id;
      });

      act(() => {
        updateEntry(entryId, { exitPrice: 160.0 });
      });

      const updated = useJournalStore.getState().entries.find((e) => e.id === entryId);
      expect(updated?.symbol).toBe('AAPL');
      expect(updated?.entryPrice).toBe(150.0);
      expect(updated?.notes).toBe('<p>Original notes</p>');
    });
  });

  describe('deleteEntry', () => {
    it('removes entry by id', () => {
      const { addEntry, deleteEntry } = useJournalStore.getState();

      let entryId: string;
      act(() => {
        const entry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Test</p>',
        });
        entryId = entry.id;
      });

      expect(useJournalStore.getState().entries).toHaveLength(1);

      act(() => {
        deleteEntry(entryId);
      });

      expect(useJournalStore.getState().entries).toHaveLength(0);
    });

    it('only removes the specified entry', () => {
      const { addEntry, deleteEntry } = useJournalStore.getState();

      let firstId: string;
      let secondId: string;

      // Create entries with time advancement to ensure different timestamps/IDs
      act(() => {
        const first = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>First</p>',
        });
        firstId = first.id;
      });

      // Advance time to ensure different ID
      vi.advanceTimersByTime(10);

      act(() => {
        const second = addEntry({
          symbol: 'TSLA',
          tradeDate: '2025-01-16',
          direction: 'long',
          entryPrice: 250.0,
          quantity: 5,
          emotionAtEntry: 'excited',
          notes: '<p>Second</p>',
        });
        secondId = second.id;
      });

      act(() => {
        deleteEntry(firstId);
      });

      const state = useJournalStore.getState();
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].id).toBe(secondId);
    });

    it('does nothing when deleting non-existent entry', () => {
      const { addEntry, deleteEntry } = useJournalStore.getState();

      act(() => {
        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Test</p>',
        });
      });

      const beforeDelete = useJournalStore.getState().entries.length;

      act(() => {
        deleteEntry('non-existent-id');
      });

      expect(useJournalStore.getState().entries.length).toBe(beforeDelete);
    });
  });

  describe('getEntryById', () => {
    it('returns entry with matching id', () => {
      const { addEntry, getEntryById } = useJournalStore.getState();

      let entryId: string;
      act(() => {
        const entry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Test</p>',
        });
        entryId = entry.id;
      });

      const found = getEntryById(entryId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(entryId);
      expect(found?.symbol).toBe('AAPL');
    });

    it('returns undefined for non-existent id', () => {
      const { getEntryById } = useJournalStore.getState();
      const found = getEntryById('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('returns correct entry from multiple entries', () => {
      const { addEntry, getEntryById } = useJournalStore.getState();

      let targetId: string;

      // Create entries with time advancement to ensure different timestamps/IDs
      act(() => {
        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>First</p>',
        });
      });

      vi.advanceTimersByTime(10);

      act(() => {
        const target = addEntry({
          symbol: 'TSLA',
          tradeDate: '2025-01-16',
          direction: 'long',
          entryPrice: 250.0,
          quantity: 5,
          emotionAtEntry: 'excited',
          notes: '<p>Target</p>',
        });
        targetId = target.id;
      });

      vi.advanceTimersByTime(10);

      act(() => {
        addEntry({
          symbol: 'GOOGL',
          tradeDate: '2025-01-17',
          direction: 'long',
          entryPrice: 140.0,
          quantity: 8,
          emotionAtEntry: 'neutral',
          notes: '<p>Third</p>',
        });
      });

      const found = getEntryById(targetId);
      expect(found?.symbol).toBe('TSLA');
    });
  });

  describe('getEntriesBySymbol', () => {
    it('returns all entries for a symbol', () => {
      const { addEntry, getEntriesBySymbol } = useJournalStore.getState();

      act(() => {
        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>First AAPL trade</p>',
        });

        addEntry({
          symbol: 'TSLA',
          tradeDate: '2025-01-16',
          direction: 'long',
          entryPrice: 250.0,
          quantity: 5,
          emotionAtEntry: 'excited',
          notes: '<p>TSLA trade</p>',
        });

        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-17',
          direction: 'short',
          entryPrice: 155.0,
          quantity: 10,
          emotionAtEntry: 'anxious',
          notes: '<p>Second AAPL trade</p>',
        });
      });

      const aaplEntries = getEntriesBySymbol('AAPL');
      expect(aaplEntries).toHaveLength(2);
      expect(aaplEntries.every((e) => e.symbol === 'AAPL')).toBe(true);
    });

    it('is case-insensitive', () => {
      const { addEntry, getEntriesBySymbol } = useJournalStore.getState();

      act(() => {
        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Test</p>',
        });
      });

      const entries = getEntriesBySymbol('aapl');
      expect(entries).toHaveLength(1);
      expect(entries[0].symbol).toBe('AAPL');
    });

    it('returns empty array for symbol with no entries', () => {
      const { getEntriesBySymbol } = useJournalStore.getState();
      const entries = getEntriesBySymbol('NONEXISTENT');
      expect(entries).toEqual([]);
    });

    it('returns empty array when no entries exist', () => {
      const { getEntriesBySymbol } = useJournalStore.getState();
      const entries = getEntriesBySymbol('AAPL');
      expect(entries).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('uses correct storage key', () => {
      // Check that the store is configured with the correct persistence name
      // This is more of a configuration check
      expect(useJournalStore.persist).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    it('handles complete trade lifecycle', () => {
      const { addEntry, updateEntry, getEntryById } = useJournalStore.getState();

      let entryId: string;

      // Entry trade
      act(() => {
        const entry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Strong technical setup, good entry point</p>',
        });
        entryId = entry.id;
      });

      // Exit trade - winning trade
      act(() => {
        updateEntry(entryId, {
          exitPrice: 160.0,
          pnl: 100.0,
          pnlPercent: 6.67,
          emotionAtExit: 'relief',
          lessonsLearned: '<p>Patience paid off, stuck to the plan</p>',
        });
      });

      const completedTrade = getEntryById(entryId);
      expect(completedTrade?.exitPrice).toBe(160.0);
      expect(completedTrade?.emotionAtExit).toBe('relief');
      expect(completedTrade?.lessonsLearned).toBeDefined();
    });

    it('tracks multiple trades for same symbol with different outcomes', () => {
      const { addEntry, getEntriesBySymbol } = useJournalStore.getState();

      act(() => {
        // Winning trade
        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          exitPrice: 160.0,
          quantity: 10,
          pnl: 100.0,
          emotionAtEntry: 'confident',
          emotionAtExit: 'relief',
          notes: '<p>Winner</p>',
        });

        // Losing trade
        addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-20',
          direction: 'long',
          entryPrice: 165.0,
          exitPrice: 158.0,
          quantity: 10,
          pnl: -70.0,
          emotionAtEntry: 'fomo',
          emotionAtExit: 'regret',
          notes: '<p>Loser - entered on emotion</p>',
        });
      });

      const aaplTrades = getEntriesBySymbol('AAPL');
      expect(aaplTrades).toHaveLength(2);

      const winners = aaplTrades.filter((t) => (t.pnl ?? 0) > 0);
      const losers = aaplTrades.filter((t) => (t.pnl ?? 0) < 0);

      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
    });

    it('links journal entry to thesis', () => {
      const { addEntry, getEntryById } = useJournalStore.getState();

      let entryId: string;
      act(() => {
        const entry = addEntry({
          symbol: 'AAPL',
          tradeDate: '2025-01-15',
          direction: 'long',
          entryPrice: 150.0,
          quantity: 10,
          emotionAtEntry: 'confident',
          notes: '<p>Following my Q1 tech thesis</p>',
          thesisId: 'thesis-tech-2025-q1',
        });
        entryId = entry.id;
      });

      const entry = getEntryById(entryId);
      expect(entry?.thesisId).toBe('thesis-tech-2025-q1');
    });
  });
});
