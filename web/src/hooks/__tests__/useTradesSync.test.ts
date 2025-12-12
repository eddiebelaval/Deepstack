import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTradesSync } from '../useTradesSync';
import { useTradesStore, type TradeEntry } from '@/lib/stores/trades-store';
import * as supabase from '@/lib/supabase';
import * as tradesApi from '@/lib/supabase/trades';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

// Mock the trades API module
vi.mock('@/lib/supabase/trades', () => ({
  fetchTradeEntries: vi.fn(),
  createTradeEntry: vi.fn(),
  updateTradeEntry: vi.fn(),
  deleteTradeEntry: vi.fn(),
  subscribeToTradeEntries: vi.fn(),
}));

const mockTrade: TradeEntry = {
  id: 'trade-123',
  userId: 'user-456',
  symbol: 'AAPL',
  action: 'BUY',
  quantity: 100,
  price: 150.50,
  orderType: 'LMT',
  notes: 'Entry position on breakout',
  tags: ['swing-trade', 'tech'],
  pnl: 500,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('useTradesSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useTradesStore.setState({ trades: [] });

    // Default: Supabase not configured (offline mode)
    vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useTradesSync());

      expect(result.current.trades).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.addTrade).toBe('function');
      expect(typeof result.current.updateTrade).toBe('function');
      expect(typeof result.current.deleteTrade).toBe('function');
      expect(typeof result.current.getTradeById).toBe('function');
      expect(typeof result.current.getTradesBySymbol).toBe('function');
    });

    it('sets isOnline to false when Supabase is not configured', () => {
      const { result } = renderHook(() => useTradesSync());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call fetchTradeEntries when Supabase is not configured', () => {
      renderHook(() => useTradesSync());

      expect(tradesApi.fetchTradeEntries).not.toHaveBeenCalled();
    });
  });

  describe('Online Mode - Data Loading', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(() => {});
    });

    it('loads trade entries from Supabase on mount when online', async () => {
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([mockTrade]);

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(tradesApi.fetchTradeEntries).toHaveBeenCalledTimes(1);
      expect(result.current.trades).toHaveLength(1);
      expect(result.current.trades[0].id).toBe('trade-123');
      expect(result.current.isOnline).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('does not replace local trades when remote is empty', async () => {
      // Set up local state with existing trade
      useTradesStore.setState({ trades: [mockTrade] });
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([]);

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should keep local trade
      expect(result.current.trades).toHaveLength(1);
    });

    it('handles fetch error gracefully', async () => {
      vi.mocked(tradesApi.fetchTradeEntries).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load trades. Using local data.');
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Real-time Subscription', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([]);
    });

    it('subscribes to trade changes when online', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(tradesApi.subscribeToTradeEntries).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('does not subscribe when offline', () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);

      renderHook(() => useTradesSync());

      expect(tradesApi.subscribeToTradeEntries).not.toHaveBeenCalled();
    });

    it('refetches data when subscription callback is triggered', async () => {
      const updatedTrade = { ...mockTrade, quantity: 200 };
      vi.mocked(tradesApi.fetchTradeEntries)
        .mockResolvedValueOnce([mockTrade])
        .mockResolvedValueOnce([updatedTrade]);

      let subscriptionCallback: (() => Promise<void>) | null = null;
      vi.mocked(tradesApi.subscribeToTradeEntries).mockImplementation((cb) => {
        subscriptionCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useTradesSync());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.trades[0]?.quantity).toBe(100);
      });

      // Trigger subscription callback
      if (subscriptionCallback) {
        await act(async () => {
          await subscriptionCallback!();
        });
      }

      await waitFor(() => {
        expect(result.current.trades[0]?.quantity).toBe(200);
      });
    });
  });

  describe('addTrade', () => {
    const newTradeData: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      symbol: 'TSLA',
      action: 'SELL',
      quantity: 50,
      price: 200.00,
      orderType: 'MKT',
      notes: 'Taking profits',
      tags: ['profit-taking'],
    };

    it('creates trade locally when offline', async () => {
      const { result } = renderHook(() => useTradesSync());

      let createdTrade: TradeEntry | null = null;
      await act(async () => {
        createdTrade = await result.current.addTrade(newTradeData);
      });

      expect(createdTrade).toBeDefined();
      expect(createdTrade?.symbol).toBe('TSLA');
      expect(result.current.trades).toHaveLength(1);
      expect(tradesApi.createTradeEntry).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([]);
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(() => {});
      vi.mocked(tradesApi.createTradeEntry).mockResolvedValue({
        ...newTradeData,
        id: 'trade-789',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      } as TradeEntry);

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdTrade: TradeEntry | null = null;
      await act(async () => {
        createdTrade = await result.current.addTrade(newTradeData);
      });

      expect(tradesApi.createTradeEntry).toHaveBeenCalledWith(newTradeData);
      expect(createdTrade?.id).toBe('trade-789');
      expect(result.current.trades).toHaveLength(1);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([]);
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(() => {});
      vi.mocked(tradesApi.createTradeEntry).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdTrade: TradeEntry | null = null;
      await act(async () => {
        createdTrade = await result.current.addTrade(newTradeData);
      });

      // Should still create locally despite sync failure
      expect(createdTrade).toBeDefined();
      expect(result.current.trades).toHaveLength(1);
    });
  });

  describe('updateTrade', () => {
    beforeEach(() => {
      useTradesStore.setState({ trades: [mockTrade] });
    });

    it('updates trade locally when offline', async () => {
      const { result } = renderHook(() => useTradesSync());

      await act(async () => {
        await result.current.updateTrade('trade-123', { quantity: 150 });
      });

      expect(result.current.trades[0].quantity).toBe(150);
      expect(tradesApi.updateTradeEntry).not.toHaveBeenCalled();
    });

    it('syncs update to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([mockTrade]);
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(() => {});
      vi.mocked(tradesApi.updateTradeEntry).mockResolvedValue();

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTrade('trade-123', {
          quantity: 150,
          notes: 'Updated notes',
        });
      });

      expect(tradesApi.updateTradeEntry).toHaveBeenCalledWith('trade-123', {
        quantity: 150,
        notes: 'Updated notes',
      });
      expect(result.current.trades[0].quantity).toBe(150);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([mockTrade]);
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(() => {});
      vi.mocked(tradesApi.updateTradeEntry).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTrade('trade-123', { quantity: 150 });
      });

      // Should still update locally
      expect(result.current.trades[0].quantity).toBe(150);
    });
  });

  describe('deleteTrade', () => {
    beforeEach(() => {
      useTradesStore.setState({ trades: [mockTrade] });
    });

    it('deletes trade locally when offline', async () => {
      const { result } = renderHook(() => useTradesSync());

      await act(async () => {
        await result.current.deleteTrade('trade-123');
      });

      expect(result.current.trades).toHaveLength(0);
      expect(tradesApi.deleteTradeEntry).not.toHaveBeenCalled();
    });

    it('syncs deletion to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([mockTrade]);
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(() => {});
      vi.mocked(tradesApi.deleteTradeEntry).mockResolvedValue();

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTrade('trade-123');
      });

      expect(tradesApi.deleteTradeEntry).toHaveBeenCalledWith('trade-123');
      expect(result.current.trades).toHaveLength(0);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([mockTrade]);
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(() => {});
      vi.mocked(tradesApi.deleteTradeEntry).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTrade('trade-123');
      });

      // Should still delete locally
      expect(result.current.trades).toHaveLength(0);
    });
  });

  describe('getTradeById', () => {
    beforeEach(() => {
      useTradesStore.setState({ trades: [mockTrade] });
    });

    it('returns trade when found', () => {
      const { result } = renderHook(() => useTradesSync());

      const trade = result.current.getTradeById('trade-123');

      expect(trade).toBeDefined();
      expect(trade?.id).toBe('trade-123');
    });

    it('returns undefined when not found', () => {
      const { result } = renderHook(() => useTradesSync());

      const trade = result.current.getTradeById('nonexistent');

      expect(trade).toBeUndefined();
    });
  });

  describe('getTradesBySymbol', () => {
    const appleTrade2 = {
      ...mockTrade,
      id: 'trade-456',
      action: 'SELL' as const,
    };
    const teslaTrade = {
      ...mockTrade,
      id: 'trade-789',
      symbol: 'TSLA',
    };

    beforeEach(() => {
      useTradesStore.setState({ trades: [mockTrade, appleTrade2, teslaTrade] });
    });

    it('returns all trades for a symbol', () => {
      const { result } = renderHook(() => useTradesSync());

      const appleTrades = result.current.getTradesBySymbol('AAPL');

      expect(appleTrades).toHaveLength(2);
      expect(appleTrades.every(t => t.symbol === 'AAPL')).toBe(true);
    });

    it('is case-insensitive', () => {
      const { result } = renderHook(() => useTradesSync());

      const appleTrades = result.current.getTradesBySymbol('aapl');

      expect(appleTrades).toHaveLength(2);
    });

    it('returns empty array when symbol not found', () => {
      const { result } = renderHook(() => useTradesSync());

      const trades = result.current.getTradesBySymbol('GOOGL');

      expect(trades).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes on unmount', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(tradesApi.fetchTradeEntries).mockResolvedValue([]);

      const unsubscribe = vi.fn();
      vi.mocked(tradesApi.subscribeToTradeEntries).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useTradesSync());

      await waitFor(() => {
        expect(tradesApi.subscribeToTradeEntries).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
