import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  subscribeToWatchlists,
  syncWatchlistsToSupabase,
} from '../watchlists';
import type { Watchlist, WatchlistItem } from '@/lib/stores/watchlist-store';

// Create mocks with vi.hoisted and return an object containing all mocks
const mocks = vi.hoisted(() => ({
  mockSupabaseClient: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
  mockWatchlistStore: {
    getState: vi.fn(),
    setSyncing: vi.fn(),
    setWatchlists: vi.fn(),
    setActiveWatchlist: vi.fn(),
    setLastSyncedAt: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../supabase', () => ({
  supabase: mocks.mockSupabaseClient,
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock('@/lib/stores/watchlist-store', () => ({
  useWatchlistStore: mocks.mockWatchlistStore,
}));

// Extract for easier use in tests
const mockSupabaseClient = mocks.mockSupabaseClient;
const mockWatchlistStore = mocks.mockWatchlistStore;
const isSupabaseConfigured = mocks.isSupabaseConfigured;

describe('Watchlists Module', () => {
  const mockUser = { id: 'user123' };
  const mockItems: WatchlistItem[] = [
    { symbol: 'AAPL', addedAt: '2024-01-01T10:00:00Z' },
    { symbol: 'GOOGL', addedAt: '2024-01-02T10:00:00Z' },
  ];
  const mockWatchlistRow = {
    id: 'watchlist1',
    user_id: 'user123',
    name: 'Tech Stocks',
    items: mockItems,
    is_default: false,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('fetchWatchlists', () => {
    it('should fetch all watchlists for authenticated user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockWatchlistRow],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const watchlists = await fetchWatchlists();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('watchlists');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });

      expect(watchlists).toHaveLength(1);
      expect(watchlists[0]).toMatchObject({
        id: 'watchlist1',
        name: 'Tech Stocks',
        items: mockItems,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      });
    });

    it('should return empty array when no user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const watchlists = await fetchWatchlists();

      expect(watchlists).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle empty items array', async () => {
      const watchlistWithNoItems = {
        ...mockWatchlistRow,
        items: [],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [watchlistWithNoItems],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const watchlists = await fetchWatchlists();

      expect(watchlists[0].items).toEqual([]);
    });

    it('should handle null items field', async () => {
      const watchlistWithNullItems = {
        ...mockWatchlistRow,
        items: null,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [watchlistWithNullItems],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const watchlists = await fetchWatchlists();

      expect(watchlists[0].items).toEqual([]);
    });

    it('should throw error on database error', async () => {
      const mockError = new Error('Database error');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(fetchWatchlists()).rejects.toThrow('Database error');
    });

    it('should handle empty watchlists array', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const watchlists = await fetchWatchlists();

      expect(watchlists).toEqual([]);
    });

    it('should handle null data response', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const watchlists = await fetchWatchlists();

      expect(watchlists).toEqual([]);
    });

    it('should fetch multiple watchlists', async () => {
      const watchlists = [
        mockWatchlistRow,
        {
          ...mockWatchlistRow,
          id: 'watchlist2',
          name: 'Growth Stocks',
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: watchlists,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await fetchWatchlists();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Tech Stocks');
      expect(result[1].name).toBe('Growth Stocks');
    });
  });

  describe('createWatchlist', () => {
    it('should create a new watchlist', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockWatchlistRow,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await createWatchlist('Tech Stocks');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('watchlists');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        name: 'Tech Stocks',
        items: [],
      });

      expect(result).toMatchObject({
        id: 'watchlist1',
        name: 'Tech Stocks',
        items: mockItems,
      });
    });

    it('should throw error when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(createWatchlist('Tech Stocks')).rejects.toThrow('No authenticated user');
    });

    it('should throw error on database error', async () => {
      const mockError = new Error('Insert failed');
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(createWatchlist('Tech Stocks')).rejects.toThrow('Insert failed');
    });

    it('should create watchlist with empty items by default', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockWatchlistRow, items: [] },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await createWatchlist('New List');

      expect(result.items).toEqual([]);
    });
  });

  describe('updateWatchlist', () => {
    it('should update watchlist name', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateWatchlist('watchlist1', { name: 'Updated Name' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('watchlists');
      expect(mockQuery.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        updated_at: expect.any(String),
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'watchlist1');
    });

    it('should update watchlist items', async () => {
      const newItems: WatchlistItem[] = [
        { symbol: 'MSFT', addedAt: '2024-01-03T10:00:00Z' },
      ];

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateWatchlist('watchlist1', { items: newItems });

      expect(mockQuery.update).toHaveBeenCalledWith({
        items: newItems,
        updated_at: expect.any(String),
      });
    });

    it('should update both name and items', async () => {
      const newItems: WatchlistItem[] = [
        { symbol: 'MSFT', addedAt: '2024-01-03T10:00:00Z' },
      ];

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateWatchlist('watchlist1', {
        name: 'New Name',
        items: newItems,
      });

      expect(mockQuery.update).toHaveBeenCalledWith({
        name: 'New Name',
        items: newItems,
        updated_at: expect.any(String),
      });
    });

    it('should only update updated_at when no changes provided', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateWatchlist('watchlist1', {});

      const updateCall = mockQuery.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('updated_at');
      expect(updateCall).not.toHaveProperty('name');
      expect(updateCall).not.toHaveProperty('items');
    });

    it('should throw error on database error', async () => {
      const mockError = new Error('Update failed');
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: mockError,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(
        updateWatchlist('watchlist1', { name: 'New Name' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteWatchlist', () => {
    it('should delete watchlist by id', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await deleteWatchlist('watchlist1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('watchlists');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'watchlist1');
    });

    it('should throw error on database error', async () => {
      const mockError = new Error('Delete failed');
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: mockError,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(deleteWatchlist('watchlist1')).rejects.toThrow('Delete failed');
    });
  });

  describe('subscribeToWatchlists', () => {
    it('should setup real-time subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };

      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const onUpdate = vi.fn();

      const unsubscribe = subscribeToWatchlists(onUpdate);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('watchlist_changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlists',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe function
      unsubscribe();
      expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should call onUpdate callback on any change', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };

      let changeCallback: () => void;

      mockChannel.on.mockImplementation((event, config, callback) => {
        changeCallback = callback;
        return mockChannel;
      });

      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const onUpdate = vi.fn();

      subscribeToWatchlists(onUpdate);

      // Simulate a change
      changeCallback!();

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should handle subscription when Supabase not configured', () => {
      isSupabaseConfigured.mockReturnValue(false);

      const onUpdate = vi.fn();
      const unsubscribe = subscribeToWatchlists(onUpdate);

      expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe should not throw
      unsubscribe();

      // Reset for other tests
      isSupabaseConfigured.mockReturnValue(true);
    });
  });

  describe('syncWatchlistsToSupabase', () => {
    const mockLocalWatchlists: Watchlist[] = [
      {
        id: 'default',
        name: 'Default',
        items: mockItems,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      },
    ];

    beforeEach(() => {
      mockWatchlistStore.getState.mockReturnValue({
        watchlists: mockLocalWatchlists,
        activeWatchlistId: null,
        setSyncing: vi.fn(),
        setWatchlists: vi.fn(),
        setActiveWatchlist: vi.fn(),
        setLastSyncedAt: vi.fn(),
      });
    });

    it('should push local watchlists to remote when remote is empty', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'watchlists') {
          return { ...mockQuery, ...mockInsert };
        }
        return mockQuery;
      });

      await syncWatchlistsToSupabase();

      const state = mockWatchlistStore.getState();
      expect(state.setSyncing).toHaveBeenCalledWith(true);
      expect(mockInsert.insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        name: 'Default',
        items: mockItems,
        is_default: true,
      });
      expect(state.setLastSyncedAt).toHaveBeenCalledWith(expect.any(String));
      expect(state.setSyncing).toHaveBeenCalledWith(false);
    });

    it('should update local store when remote has data', async () => {
      const remoteWatchlists = [mockWatchlistRow];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: remoteWatchlists,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await syncWatchlistsToSupabase();

      const state = mockWatchlistStore.getState();
      expect(state.setSyncing).toHaveBeenCalledWith(true);
      expect(state.setWatchlists).toHaveBeenCalledWith([
        {
          id: 'watchlist1',
          name: 'Tech Stocks',
          items: mockItems,
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
        },
      ]);
      expect(state.setSyncing).toHaveBeenCalledWith(false);
    });

    it('should set active watchlist when none is set', async () => {
      const remoteWatchlists = [mockWatchlistRow];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: remoteWatchlists,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await syncWatchlistsToSupabase();

      const state = mockWatchlistStore.getState();
      expect(state.setActiveWatchlist).toHaveBeenCalledWith('watchlist1');
    });

    it('should not set active watchlist when one already exists', async () => {
      mockWatchlistStore.getState.mockReturnValue({
        watchlists: mockLocalWatchlists,
        activeWatchlistId: 'existing',
        setSyncing: vi.fn(),
        setWatchlists: vi.fn(),
        setActiveWatchlist: vi.fn(),
        setLastSyncedAt: vi.fn(),
      });

      const remoteWatchlists = [mockWatchlistRow];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: remoteWatchlists,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await syncWatchlistsToSupabase();

      const state = mockWatchlistStore.getState();
      expect(state.setActiveWatchlist).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Sync failed');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(mockError),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await syncWatchlistsToSupabase();

      const state = mockWatchlistStore.getState();
      expect(state.setSyncing).toHaveBeenCalledWith(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error syncing watchlists:',
        mockError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await syncWatchlistsToSupabase();

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle when Supabase not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      await syncWatchlistsToSupabase();

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();

      // Reset for other tests
      isSupabaseConfigured.mockReturnValue(true);
    });
  });
});
