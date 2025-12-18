import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWatchlistSync } from '../useWatchlistSync';
import { useWatchlistStore, type Watchlist, type WatchlistItem } from '@/lib/stores/watchlist-store';
import * as supabase from '@/lib/supabase';
import * as watchlistsApi from '@/lib/supabase/watchlists';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

// Mock the watchlists API module
vi.mock('@/lib/supabase/watchlists', () => ({
  fetchWatchlists: vi.fn(),
  createWatchlist: vi.fn(),
  updateWatchlist: vi.fn(),
  deleteWatchlist: vi.fn(),
  subscribeToWatchlists: vi.fn(),
}));

const mockWatchlist: Watchlist = {
  id: 'watchlist-123',
  name: 'Tech Stocks',
  items: [
    { symbol: 'AAPL', addedAt: '2024-01-01T00:00:00Z', notes: 'Apple Inc.' },
    { symbol: 'MSFT', addedAt: '2024-01-01T00:00:00Z' },
    { symbol: 'GOOGL', addedAt: '2024-01-02T00:00:00Z', notes: 'Alphabet' },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

describe('useWatchlistSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useWatchlistStore.getState().reset();

    // Default: Supabase not configured (offline mode)
    vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useWatchlistSync());

      expect(result.current.watchlists).toHaveLength(1); // Default watchlist
      expect(result.current.activeWatchlistId).toBe('default');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncedAt).toBeNull();
      expect(typeof result.current.createWatchlist).toBe('function');
      expect(typeof result.current.deleteWatchlist).toBe('function');
      expect(typeof result.current.renameWatchlist).toBe('function');
      expect(typeof result.current.addSymbol).toBe('function');
      expect(typeof result.current.removeSymbol).toBe('function');
    });

    it('sets isOnline to false when Supabase is not configured', () => {
      const { result } = renderHook(() => useWatchlistSync());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call fetchWatchlists when Supabase is not configured', () => {
      renderHook(() => useWatchlistSync());

      expect(watchlistsApi.fetchWatchlists).not.toHaveBeenCalled();
    });
  });

  describe('Online Mode - Data Loading', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
    });

    it('loads watchlists from Supabase on mount when online', async () => {
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([mockWatchlist]);

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(watchlistsApi.fetchWatchlists).toHaveBeenCalledTimes(1);
      expect(result.current.watchlists).toHaveLength(1);
      expect(result.current.watchlists[0].id).toBe('watchlist-123');
      expect(result.current.isOnline).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSyncedAt).toBeDefined();
    });

    it('sets active watchlist to first remote watchlist if none set', async () => {
      // Clear active watchlist before test
      useWatchlistStore.getState().setActiveWatchlist(null);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([mockWatchlist]);

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeWatchlistId).toBe('watchlist-123');
    });

    it('does not replace local watchlists when remote is empty', async () => {
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([]);

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should keep default watchlist
      expect(result.current.watchlists).toHaveLength(1);
      expect(result.current.watchlists[0].id).toBe('default');
    });

    it('handles fetch error gracefully', async () => {
      vi.mocked(watchlistsApi.fetchWatchlists).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load watchlists. Using local data.');
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Real-time Subscription', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([]);
    });

    it('subscribes to watchlist changes when online', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(watchlistsApi.subscribeToWatchlists).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('does not subscribe when offline', () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);

      renderHook(() => useWatchlistSync());

      expect(watchlistsApi.subscribeToWatchlists).not.toHaveBeenCalled();
    });

    it('refetches data when subscription callback is triggered', async () => {
      const updatedWatchlist = { ...mockWatchlist, name: 'Updated Name' };
      vi.mocked(watchlistsApi.fetchWatchlists)
        .mockResolvedValueOnce([mockWatchlist])
        .mockResolvedValueOnce([updatedWatchlist]);

      let subscriptionCallback: (() => void | Promise<void>) | null = null;
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockImplementation((cb) => {
        subscriptionCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useWatchlistSync());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.watchlists[0]?.name).toBe('Tech Stocks');
      });

      // Trigger subscription callback
      if (subscriptionCallback) {
        await act(async () => {
          await Promise.resolve(subscriptionCallback!());
        });
      }

      await waitFor(() => {
        expect(result.current.watchlists[0]?.name).toBe('Updated Name');
      });
    });
  });

  describe('createWatchlist', () => {
    it('creates watchlist locally when offline', async () => {
      const { result } = renderHook(() => useWatchlistSync());

      const initialCount = result.current.watchlists.length;

      let newId: string = '';
      await act(async () => {
        newId = await result.current.createWatchlist('My Crypto');
      });

      expect(newId).toBeDefined();
      expect(result.current.watchlists).toHaveLength(initialCount + 1);
      expect(watchlistsApi.createWatchlist).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([]);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
      vi.mocked(watchlistsApi.createWatchlist).mockResolvedValue({
        id: 'watchlist-789',
        name: 'My Crypto',
        items: [],
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      });

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newId: string = '';
      await act(async () => {
        newId = await result.current.createWatchlist('My Crypto');
      });

      expect(watchlistsApi.createWatchlist).toHaveBeenCalledWith('My Crypto');
      expect(newId).toBe('watchlist-789');
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([]);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
      vi.mocked(watchlistsApi.createWatchlist).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newId: string = '';
      await act(async () => {
        newId = await result.current.createWatchlist('My Crypto');
      });

      // Should still create locally despite sync failure
      expect(newId).toBeDefined();
    });
  });

  describe('deleteWatchlist', () => {
    beforeEach(() => {
      useWatchlistStore.getState().reset();
      const id = useWatchlistStore.getState().createWatchlist('Test Watchlist');
      useWatchlistStore.getState().setActiveWatchlist(id);
    });

    it('deletes watchlist locally when offline', async () => {
      const { result } = renderHook(() => useWatchlistSync());
      const watchlistId = result.current.watchlists[1].id; // Not default

      await act(async () => {
        await result.current.deleteWatchlist(watchlistId);
      });

      expect(result.current.watchlists).toHaveLength(1);
      expect(watchlistsApi.deleteWatchlist).not.toHaveBeenCalled();
    });

    it('syncs deletion to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([mockWatchlist]);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
      vi.mocked(watchlistsApi.deleteWatchlist).mockResolvedValue();

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteWatchlist('watchlist-123');
      });

      expect(watchlistsApi.deleteWatchlist).toHaveBeenCalledWith('watchlist-123');
    });
  });

  describe('renameWatchlist', () => {
    beforeEach(() => {
      useWatchlistStore.setState({
        watchlists: [mockWatchlist],
        activeWatchlistId: 'watchlist-123',
        isSyncing: false,
        lastSyncedAt: null,
      });
    });

    it('renames watchlist locally when offline', async () => {
      const { result } = renderHook(() => useWatchlistSync());

      await act(async () => {
        await result.current.renameWatchlist('watchlist-123', 'New Name');
      });

      expect(result.current.watchlists[0].name).toBe('New Name');
      expect(watchlistsApi.updateWatchlist).not.toHaveBeenCalled();
    });

    it('syncs rename to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([mockWatchlist]);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
      vi.mocked(watchlistsApi.updateWatchlist).mockResolvedValue();

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.renameWatchlist('watchlist-123', 'New Name');
      });

      expect(watchlistsApi.updateWatchlist).toHaveBeenCalledWith('watchlist-123', { name: 'New Name' });
    });
  });

  describe('addSymbol', () => {
    beforeEach(() => {
      useWatchlistStore.setState({
        watchlists: [mockWatchlist],
        activeWatchlistId: 'watchlist-123',
        isSyncing: false,
        lastSyncedAt: null,
      });
    });

    it('adds symbol locally when offline', async () => {
      const { result } = renderHook(() => useWatchlistSync());
      const initialCount = result.current.watchlists[0].items.length;

      await act(async () => {
        await result.current.addSymbol('watchlist-123', 'NVDA', 'GPU maker');
      });

      expect(result.current.watchlists[0].items).toHaveLength(initialCount + 1);
      const newItem = result.current.watchlists[0].items.find(i => i.symbol === 'NVDA');
      expect(newItem?.notes).toBe('GPU maker');
      expect(watchlistsApi.updateWatchlist).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([mockWatchlist]);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
      vi.mocked(watchlistsApi.updateWatchlist).mockResolvedValue();

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addSymbol('watchlist-123', 'NVDA');
      });

      // Should sync the updated items array
      expect(watchlistsApi.updateWatchlist).toHaveBeenCalledWith(
        'watchlist-123',
        expect.objectContaining({ items: expect.any(Array) })
      );
    });

    it('prevents duplicate symbols', async () => {
      const { result } = renderHook(() => useWatchlistSync());
      const initialCount = result.current.watchlists[0].items.length;

      await act(async () => {
        await result.current.addSymbol('watchlist-123', 'AAPL');
      });

      // Should not add duplicate
      expect(result.current.watchlists[0].items).toHaveLength(initialCount);
    });
  });

  describe('removeSymbol', () => {
    beforeEach(() => {
      useWatchlistStore.setState({
        watchlists: [mockWatchlist],
        activeWatchlistId: 'watchlist-123',
        isSyncing: false,
        lastSyncedAt: null,
      });
    });

    it('removes symbol locally when offline', async () => {
      const { result } = renderHook(() => useWatchlistSync());
      const initialCount = result.current.watchlists[0].items.length;

      await act(async () => {
        await result.current.removeSymbol('watchlist-123', 'AAPL');
      });

      expect(result.current.watchlists[0].items).toHaveLength(initialCount - 1);
      expect(result.current.watchlists[0].items.find(i => i.symbol === 'AAPL')).toBeUndefined();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([mockWatchlist]);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
      vi.mocked(watchlistsApi.updateWatchlist).mockResolvedValue();

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeSymbol('watchlist-123', 'AAPL');
      });

      expect(watchlistsApi.updateWatchlist).toHaveBeenCalledWith(
        'watchlist-123',
        expect.objectContaining({ items: expect.any(Array) })
      );
    });
  });

  describe('importSymbols', () => {
    beforeEach(() => {
      useWatchlistStore.setState({
        watchlists: [mockWatchlist],
        activeWatchlistId: 'watchlist-123',
        isSyncing: false,
        lastSyncedAt: null,
      });
    });

    it('imports multiple symbols at once', async () => {
      const { result } = renderHook(() => useWatchlistSync());
      const initialCount = result.current.watchlists[0].items.length;

      await act(async () => {
        await result.current.importSymbols('watchlist-123', ['NVDA', 'AMD', 'INTC']);
      });

      expect(result.current.watchlists[0].items).toHaveLength(initialCount + 3);
      expect(result.current.watchlists[0].items.some(i => i.symbol === 'NVDA')).toBe(true);
      expect(result.current.watchlists[0].items.some(i => i.symbol === 'AMD')).toBe(true);
      expect(result.current.watchlists[0].items.some(i => i.symbol === 'INTC')).toBe(true);
    });

    it('skips duplicate symbols during import', async () => {
      const { result } = renderHook(() => useWatchlistSync());
      const initialCount = result.current.watchlists[0].items.length;

      await act(async () => {
        await result.current.importSymbols('watchlist-123', ['AAPL', 'NVDA', 'MSFT']);
      });

      // AAPL and MSFT already exist, only NVDA should be added
      expect(result.current.watchlists[0].items).toHaveLength(initialCount + 1);
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([mockWatchlist]);
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(() => {});
      vi.mocked(watchlistsApi.updateWatchlist).mockResolvedValue();

      const { result } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.importSymbols('watchlist-123', ['NVDA', 'AMD']);
      });

      expect(watchlistsApi.updateWatchlist).toHaveBeenCalled();
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      useWatchlistStore.setState({
        watchlists: [mockWatchlist],
        activeWatchlistId: 'watchlist-123',
        isSyncing: false,
        lastSyncedAt: null,
      });
    });

    it('getActiveWatchlist returns active watchlist', () => {
      const { result } = renderHook(() => useWatchlistSync());

      const active = result.current.getActiveWatchlist();

      expect(active).toBeDefined();
      expect(active?.id).toBe('watchlist-123');
    });

    it('getWatchlistSymbols returns symbols array', () => {
      const { result } = renderHook(() => useWatchlistSync());

      const symbols = result.current.getWatchlistSymbols('watchlist-123');

      expect(symbols).toEqual(['AAPL', 'MSFT', 'GOOGL']);
    });

    it('isSymbolInWatchlist checks symbol presence', () => {
      const { result } = renderHook(() => useWatchlistSync());

      expect(result.current.isSymbolInWatchlist('watchlist-123', 'AAPL')).toBe(true);
      expect(result.current.isSymbolInWatchlist('watchlist-123', 'NVDA')).toBe(false);
    });
  });

  describe('Store operations', () => {
    beforeEach(() => {
      useWatchlistStore.setState({
        watchlists: [mockWatchlist],
        activeWatchlistId: 'watchlist-123',
        isSyncing: false,
        lastSyncedAt: null,
      });
    });

    it('setActiveWatchlist changes active watchlist', () => {
      const { result } = renderHook(() => useWatchlistSync());

      act(() => {
        result.current.setActiveWatchlist('default');
      });

      expect(result.current.activeWatchlistId).toBe('default');
    });

    it('updateSymbolNotes updates notes for a symbol', () => {
      const { result } = renderHook(() => useWatchlistSync());

      act(() => {
        result.current.updateSymbolNotes('watchlist-123', 'AAPL', 'Updated notes');
      });

      const item = result.current.watchlists[0].items.find(i => i.symbol === 'AAPL');
      expect(item?.notes).toBe('Updated notes');
    });

    it('moveSymbol reorders symbols', () => {
      const { result } = renderHook(() => useWatchlistSync());
      const initialFirst = result.current.watchlists[0].items[0].symbol;

      act(() => {
        result.current.moveSymbol('watchlist-123', 0, 2);
      });

      expect(result.current.watchlists[0].items[0].symbol).not.toBe(initialFirst);
      expect(result.current.watchlists[0].items[2].symbol).toBe(initialFirst);
    });

    it('clearWatchlist removes all symbols', () => {
      const { result } = renderHook(() => useWatchlistSync());

      act(() => {
        result.current.clearWatchlist('watchlist-123');
      });

      expect(result.current.watchlists[0].items).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes on unmount', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(watchlistsApi.fetchWatchlists).mockResolvedValue([]);

      const unsubscribe = vi.fn();
      vi.mocked(watchlistsApi.subscribeToWatchlists).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useWatchlistSync());

      await waitFor(() => {
        expect(watchlistsApi.subscribeToWatchlists).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
