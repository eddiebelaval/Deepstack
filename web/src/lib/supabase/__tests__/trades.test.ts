import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchTradeEntries,
  createTradeEntry,
  updateTradeEntry,
  deleteTradeEntry,
  subscribeToTradeEntries,
} from '../trades';
import type { TradeEntry } from '@/lib/stores/trades-store';

// Create mock with vi.hoisted and return an object containing our mocks
const mocks = vi.hoisted(() => ({
  mockSupabaseClient: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../supabase', () => ({
  supabase: mocks.mockSupabaseClient,
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

// Extract for easier use in tests
const mockSupabaseClient = mocks.mockSupabaseClient;
const isSupabaseConfigured = mocks.isSupabaseConfigured;

describe('Trades Module', () => {
  const mockUser = { id: 'user123' };
  const mockTradeRow = {
    id: 'trade1',
    user_id: 'user123',
    symbol: 'AAPL',
    action: 'BUY' as const,
    quantity: 100,
    price: 150.0,
    order_type: 'MKT' as const,
    notes: 'Test trade',
    tags: ['swing', 'tech'],
    pnl: null,
    created_at: '2024-01-01T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('fetchTradeEntries', () => {
    it('should fetch all trade entries for authenticated user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockTradeRow],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const trades = await fetchTradeEntries();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('trade_journal');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });

      expect(trades).toHaveLength(1);
      expect(trades[0]).toMatchObject({
        id: 'trade1',
        userId: 'user123',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        orderType: 'MKT',
        notes: 'Test trade',
        tags: ['swing', 'tech'],
        createdAt: '2024-01-01T10:00:00Z',
      });
    });

    it('should return empty array when no user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const trades = await fetchTradeEntries();

      expect(trades).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle null values in trade data', async () => {
      const tradeWithNulls = {
        ...mockTradeRow,
        notes: null,
        tags: null,
        pnl: null,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [tradeWithNulls],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const trades = await fetchTradeEntries();

      expect(trades[0].notes).toBeUndefined();
      expect(trades[0].tags).toBeUndefined();
      expect(trades[0].pnl).toBeUndefined();
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

      await expect(fetchTradeEntries()).rejects.toThrow('Database error');
    });

    it('should handle empty trades array', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const trades = await fetchTradeEntries();

      expect(trades).toEqual([]);
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

      const trades = await fetchTradeEntries();

      expect(trades).toEqual([]);
    });

    it('should convert snake_case to camelCase', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockTradeRow],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const trades = await fetchTradeEntries();

      expect(trades[0]).toHaveProperty('userId');
      expect(trades[0]).toHaveProperty('orderType');
      expect(trades[0]).toHaveProperty('createdAt');
      expect(trades[0]).not.toHaveProperty('user_id');
      expect(trades[0]).not.toHaveProperty('order_type');
      expect(trades[0]).not.toHaveProperty('created_at');
    });
  });

  describe('createTradeEntry', () => {
    it('should create a new trade entry', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTradeRow,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const newTrade: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: 'user123',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        orderType: 'MKT',
        notes: 'Test trade',
        tags: ['swing', 'tech'],
      };

      const result = await createTradeEntry(newTrade);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('trade_journal');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        order_type: 'MKT',
        notes: 'Test trade',
        tags: ['swing', 'tech'],
        pnl: null,
      });

      expect(result).toMatchObject({
        id: 'trade1',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        orderType: 'MKT',
      });
    });

    it('should uppercase symbol when creating trade', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTradeRow,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await createTradeEntry({
        userId: 'user123',
        symbol: 'aapl',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        orderType: 'MKT',
      });

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
        })
      );
    });

    it('should throw error when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        createTradeEntry({
          userId: 'user123',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
        })
      ).rejects.toThrow('No authenticated user');
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

      await expect(
        createTradeEntry({
          userId: 'user123',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
        })
      ).rejects.toThrow('Insert failed');
    });

    it('should handle trade without optional fields', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockTradeRow, notes: null, tags: null, pnl: null },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await createTradeEntry({
        userId: 'user123',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        orderType: 'MKT',
      });

      expect(result.notes).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.pnl).toBeUndefined();
    });

    it('should create SELL trade', async () => {
      const sellRow = { ...mockTradeRow, action: 'SELL' as const, pnl: 500 };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: sellRow,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await createTradeEntry({
        userId: 'user123',
        symbol: 'AAPL',
        action: 'SELL',
        quantity: 100,
        price: 155.0,
        orderType: 'MKT',
        pnl: 500,
      });

      expect(result.action).toBe('SELL');
      expect(result.pnl).toBe(500);
    });

    it('should handle different order types', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockTradeRow, order_type: 'LMT' },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await createTradeEntry({
        userId: 'user123',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        orderType: 'LMT',
      });

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_type: 'LMT',
        })
      );
    });
  });

  describe('updateTradeEntry', () => {
    it('should update trade entry with provided fields', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateTradeEntry('trade1', {
        quantity: 150,
        price: 155.0,
        notes: 'Updated notes',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('trade_journal');
      expect(mockQuery.update).toHaveBeenCalledWith({
        quantity: 150,
        price: 155.0,
        notes: 'Updated notes',
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'trade1');
    });

    it('should uppercase symbol when updating', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateTradeEntry('trade1', { symbol: 'aapl' });

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
        })
      );
    });

    it('should convert camelCase to snake_case for database', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateTradeEntry('trade1', {
        orderType: 'LMT',
      });

      expect(mockQuery.update).toHaveBeenCalledWith({
        order_type: 'LMT',
      });
    });

    it('should only update provided fields', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateTradeEntry('trade1', { quantity: 150 });

      const updateCall = mockQuery.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('quantity', 150);
      expect(updateCall).not.toHaveProperty('price');
      expect(updateCall).not.toHaveProperty('symbol');
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
        updateTradeEntry('trade1', { quantity: 150 })
      ).rejects.toThrow('Update failed');
    });

    it('should handle all updatable fields', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateTradeEntry('trade1', {
        symbol: 'GOOGL',
        action: 'SELL',
        quantity: 50,
        price: 105.0,
        orderType: 'STP',
        notes: 'Stop loss',
        tags: ['defensive'],
        pnl: -200,
      });

      expect(mockQuery.update).toHaveBeenCalledWith({
        symbol: 'GOOGL',
        action: 'SELL',
        quantity: 50,
        price: 105.0,
        order_type: 'STP',
        notes: 'Stop loss',
        tags: ['defensive'],
        pnl: -200,
      });
    });
  });

  describe('deleteTradeEntry', () => {
    it('should delete trade entry by id', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await deleteTradeEntry('trade1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('trade_journal');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'trade1');
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

      await expect(deleteTradeEntry('trade1')).rejects.toThrow('Delete failed');
    });
  });

  describe('subscribeToTradeEntries', () => {
    it('should setup real-time subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };

      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const onUpdate = vi.fn();

      const unsubscribe = subscribeToTradeEntries(onUpdate);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('trade_journal_changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_journal',
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

      subscribeToTradeEntries(onUpdate);

      // Simulate a change
      changeCallback!();

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should handle subscription when Supabase not configured', () => {
      isSupabaseConfigured.mockReturnValue(false);

      const onUpdate = vi.fn();
      const unsubscribe = subscribeToTradeEntries(onUpdate);

      expect(mockSupabaseClient.channel).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe should not throw
      unsubscribe();

      // Reset for other tests
      isSupabaseConfigured.mockReturnValue(true);
    });
  });
});
