import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useJournalSync } from '../useJournalSync';
import { useJournalStore, type JournalEntry } from '@/lib/stores/journal-store';
import * as supabase from '@/lib/supabase';
import * as journalApi from '@/lib/supabase/journal';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

// Mock the journal API module
vi.mock('@/lib/supabase/journal', () => ({
  fetchJournalEntries: vi.fn(),
  createJournalEntry: vi.fn(),
  updateJournalEntry: vi.fn(),
  deleteJournalEntry: vi.fn(),
  subscribeToJournalEntries: vi.fn(),
}));

const mockEntry: JournalEntry = {
  id: 'entry-123',
  symbol: 'AAPL',
  entryType: 'trade',
  content: 'Bought 10 shares at $150',
  tags: ['buy', 'tech'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockAnalysisEntry: JournalEntry = {
  id: 'entry-456',
  symbol: 'TSLA',
  entryType: 'analysis',
  content: 'Strong support at $200',
  tags: ['technical', 'support'],
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

describe('useJournalSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useJournalStore.setState({ entries: [] });

    // Default: Supabase not configured (offline mode)
    vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useJournalSync());

      expect(result.current.entries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.addEntry).toBe('function');
      expect(typeof result.current.updateEntry).toBe('function');
      expect(typeof result.current.deleteEntry).toBe('function');
      expect(typeof result.current.getEntryById).toBe('function');
      expect(typeof result.current.getEntriesBySymbol).toBe('function');
    });

    it('sets isOnline to false when Supabase is not configured', () => {
      const { result } = renderHook(() => useJournalSync());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call fetchJournalEntries when Supabase is not configured', () => {
      renderHook(() => useJournalSync());

      expect(journalApi.fetchJournalEntries).not.toHaveBeenCalled();
    });
  });

  describe('Online Mode - Data Loading', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
    });

    it('loads entries from Supabase on mount when online', async () => {
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([mockEntry, mockAnalysisEntry]);

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(journalApi.fetchJournalEntries).toHaveBeenCalledTimes(1);
      expect(result.current.entries).toHaveLength(2);
      expect(result.current.entries[0].id).toBe('entry-123');
      expect(result.current.entries[1].id).toBe('entry-456');
      expect(result.current.isOnline).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('does not replace local entries when remote is empty', async () => {
      // Set local entries before test
      useJournalStore.setState({ entries: [mockEntry] });
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([]);

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should keep local entries
      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].id).toBe('entry-123');
    });

    it('handles fetch error gracefully', async () => {
      vi.mocked(journalApi.fetchJournalEntries).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load entries. Using local data.');
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Real-time Subscription', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([]);
    });

    it('subscribes to journal changes when online', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(journalApi.subscribeToJournalEntries).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('does not subscribe when offline', () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);

      renderHook(() => useJournalSync());

      expect(journalApi.subscribeToJournalEntries).not.toHaveBeenCalled();
    });

    it('refetches data when subscription callback is triggered', async () => {
      const updatedEntry = { ...mockEntry, content: 'Updated content' };
      vi.mocked(journalApi.fetchJournalEntries)
        .mockResolvedValueOnce([mockEntry])
        .mockResolvedValueOnce([updatedEntry]);

      let subscriptionCallback: (() => Promise<void>) | null = null;
      vi.mocked(journalApi.subscribeToJournalEntries).mockImplementation((cb) => {
        subscriptionCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useJournalSync());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.entries[0]?.content).toBe('Bought 10 shares at $150');
      });

      // Trigger subscription callback
      if (subscriptionCallback) {
        await act(async () => {
          await subscriptionCallback!();
        });
      }

      await waitFor(() => {
        expect(result.current.entries[0]?.content).toBe('Updated content');
      });
    });

    it('handles subscription callback error gracefully', async () => {
      vi.mocked(journalApi.fetchJournalEntries)
        .mockResolvedValueOnce([mockEntry])
        .mockRejectedValueOnce(new Error('Sync error'));

      let subscriptionCallback: (() => Promise<void>) | null = null;
      vi.mocked(journalApi.subscribeToJournalEntries).mockImplementation((cb) => {
        subscriptionCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger subscription callback that fails
      if (subscriptionCallback) {
        await act(async () => {
          await subscriptionCallback!();
        });
      }

      // Should still have original data
      expect(result.current.entries).toHaveLength(1);
    });
  });

  describe('addEntry', () => {
    it('adds entry locally when offline', async () => {
      const { result } = renderHook(() => useJournalSync());

      let newEntry: JournalEntry | undefined;
      await act(async () => {
        newEntry = await result.current.addEntry({
          symbol: 'NVDA',
          entryType: 'trade',
          content: 'Sold 5 shares at $500',
          tags: ['sell'],
        });
      });

      expect(newEntry).toBeDefined();
      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].symbol).toBe('NVDA');
      expect(journalApi.createJournalEntry).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([]);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
      vi.mocked(journalApi.createJournalEntry).mockResolvedValue(mockEntry);

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newEntry: JournalEntry | undefined;
      await act(async () => {
        newEntry = await result.current.addEntry({
          symbol: 'AAPL',
          entryType: 'trade',
          content: 'Bought 10 shares at $150',
          tags: ['buy', 'tech'],
        });
      });

      expect(journalApi.createJournalEntry).toHaveBeenCalledWith({
        symbol: 'AAPL',
        entryType: 'trade',
        content: 'Bought 10 shares at $150',
        tags: ['buy', 'tech'],
      });
      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].id).toBe('entry-123');
      expect(newEntry?.id).toBe('entry-123');
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([]);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
      vi.mocked(journalApi.createJournalEntry).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newEntry: JournalEntry | undefined;
      await act(async () => {
        newEntry = await result.current.addEntry({
          symbol: 'NVDA',
          entryType: 'trade',
          content: 'Test entry',
          tags: [],
        });
      });

      // Should still create locally despite sync failure
      expect(result.current.entries).toHaveLength(1);
      expect(newEntry).toBeDefined();
    });
  });

  describe('updateEntry', () => {
    beforeEach(() => {
      useJournalStore.setState({ entries: [mockEntry] });
    });

    it('updates entry locally when offline', async () => {
      const { result } = renderHook(() => useJournalSync());

      await act(async () => {
        await result.current.updateEntry('entry-123', {
          content: 'Updated content',
          tags: ['buy', 'tech', 'updated'],
        });
      });

      expect(result.current.entries[0].content).toBe('Updated content');
      expect(result.current.entries[0].tags).toEqual(['buy', 'tech', 'updated']);
      expect(journalApi.updateJournalEntry).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([mockEntry]);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
      vi.mocked(journalApi.updateJournalEntry).mockResolvedValue();

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateEntry('entry-123', {
          content: 'Updated content',
        });
      });

      expect(journalApi.updateJournalEntry).toHaveBeenCalledWith('entry-123', {
        content: 'Updated content',
      });
      expect(result.current.entries[0].content).toBe('Updated content');
    });

    it('updates updatedAt timestamp when updating', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([mockEntry]);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
      vi.mocked(journalApi.updateJournalEntry).mockResolvedValue();

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalUpdatedAt = result.current.entries[0].updatedAt;

      await act(async () => {
        await result.current.updateEntry('entry-123', {
          content: 'Updated',
        });
      });

      expect(result.current.entries[0].updatedAt).not.toBe(originalUpdatedAt);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([mockEntry]);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
      vi.mocked(journalApi.updateJournalEntry).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateEntry('entry-123', {
          content: 'Updated locally',
        });
      });

      // Should still update locally
      expect(result.current.entries[0].content).toBe('Updated locally');
    });
  });

  describe('deleteEntry', () => {
    beforeEach(() => {
      useJournalStore.setState({ entries: [mockEntry, mockAnalysisEntry] });
    });

    it('deletes entry locally when offline', async () => {
      const { result } = renderHook(() => useJournalSync());

      await act(async () => {
        await result.current.deleteEntry('entry-123');
      });

      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].id).toBe('entry-456');
      expect(journalApi.deleteJournalEntry).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([mockEntry, mockAnalysisEntry]);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
      vi.mocked(journalApi.deleteJournalEntry).mockResolvedValue();

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteEntry('entry-123');
      });

      expect(journalApi.deleteJournalEntry).toHaveBeenCalledWith('entry-123');
      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].id).toBe('entry-456');
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([mockEntry, mockAnalysisEntry]);
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(() => {});
      vi.mocked(journalApi.deleteJournalEntry).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteEntry('entry-123');
      });

      // Should still delete locally
      expect(result.current.entries).toHaveLength(1);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      useJournalStore.setState({ entries: [mockEntry, mockAnalysisEntry] });
    });

    it('getEntryById returns the correct entry', () => {
      const { result } = renderHook(() => useJournalSync());

      const entry = result.current.getEntryById('entry-123');

      expect(entry).toBeDefined();
      expect(entry?.id).toBe('entry-123');
      expect(entry?.symbol).toBe('AAPL');
    });

    it('getEntryById returns undefined for non-existent id', () => {
      const { result } = renderHook(() => useJournalSync());

      const entry = result.current.getEntryById('non-existent');

      expect(entry).toBeUndefined();
    });

    it('getEntriesBySymbol returns entries for specific symbol', () => {
      const { result } = renderHook(() => useJournalSync());

      const entries = result.current.getEntriesBySymbol('AAPL');

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('entry-123');
      expect(entries[0].symbol).toBe('AAPL');
    });

    it('getEntriesBySymbol returns empty array for symbol with no entries', () => {
      const { result } = renderHook(() => useJournalSync());

      const entries = result.current.getEntriesBySymbol('NVDA');

      expect(entries).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes on unmount', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(journalApi.fetchJournalEntries).mockResolvedValue([]);

      const unsubscribe = vi.fn();
      vi.mocked(journalApi.subscribeToJournalEntries).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useJournalSync());

      await waitFor(() => {
        expect(journalApi.subscribeToJournalEntries).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
