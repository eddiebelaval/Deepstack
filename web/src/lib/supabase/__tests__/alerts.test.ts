import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAlerts,
  createAlert,
  updateAlert,
  triggerAlert,
  deleteAlert,
  checkAlertConditions,
  subscribeToAlerts,
} from '../alerts';
import type { PriceAlert } from '@/lib/stores/alerts-store';

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

describe('Alerts Module', () => {
  const mockUser = { id: 'user123' };
  const mockAlertRow = {
    id: 'alert1',
    user_id: 'user123',
    symbol: 'AAPL',
    target_price: 150.0,
    condition: 'above' as const,
    is_active: true,
    triggered_at: null,
    note: 'Test note',
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

  describe('fetchAlerts', () => {
    it('should fetch all alerts for authenticated user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockAlertRow],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const alerts = await fetchAlerts();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('price_alerts');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        id: 'alert1',
        symbol: 'AAPL',
        targetPrice: 150.0,
        condition: 'above',
        isActive: true,
        note: 'Test note',
      });
    });

    it('should return empty array when no user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const alerts = await fetchAlerts();

      expect(alerts).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle null values in alert data', async () => {
      const alertWithNulls = {
        ...mockAlertRow,
        note: null,
        triggered_at: null,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [alertWithNulls],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const alerts = await fetchAlerts();

      expect(alerts[0].note).toBeUndefined();
      expect(alerts[0].triggeredAt).toBeUndefined();
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

      await expect(fetchAlerts()).rejects.toThrow('Database error');
    });

    it('should handle empty alerts array', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const alerts = await fetchAlerts();

      expect(alerts).toEqual([]);
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

      const alerts = await fetchAlerts();

      expect(alerts).toEqual([]);
    });
  });

  describe('createAlert', () => {
    it('should create a new alert', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAlertRow,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const newAlert = {
        symbol: 'AAPL',
        targetPrice: 150.0,
        condition: 'above' as const,
        note: 'Test note',
      };

      const result = await createAlert(newAlert);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('price_alerts');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        symbol: 'AAPL', // Should be uppercased
        target_price: 150.0,
        condition: 'above',
        note: 'Test note',
      });

      expect(result).toMatchObject({
        id: 'alert1',
        symbol: 'AAPL',
        targetPrice: 150.0,
        condition: 'above',
        isActive: true,
      });
    });

    it('should uppercase symbol when creating alert', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAlertRow,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await createAlert({
        symbol: 'aapl',
        targetPrice: 150.0,
        condition: 'above',
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
        createAlert({
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
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
        createAlert({
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
        })
      ).rejects.toThrow('Insert failed');
    });

    it('should handle alert without note', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockAlertRow, note: null },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await createAlert({
        symbol: 'AAPL',
        targetPrice: 150.0,
        condition: 'above',
      });

      expect(result.note).toBeUndefined();
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          note: undefined,
        })
      );
    });
  });

  describe('updateAlert', () => {
    it('should update alert with provided fields', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateAlert('alert1', {
        targetPrice: 155.0,
        isActive: false,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('price_alerts');
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          target_price: 155.0,
          is_active: false,
          updated_at: expect.any(String),
        })
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'alert1');
    });

    it('should only update provided fields', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateAlert('alert1', { targetPrice: 155.0 });

      const updateCall = mockQuery.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('target_price', 155.0);
      expect(updateCall).toHaveProperty('updated_at');
      expect(updateCall).not.toHaveProperty('condition');
      expect(updateCall).not.toHaveProperty('is_active');
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
        updateAlert('alert1', { targetPrice: 155.0 })
      ).rejects.toThrow('Update failed');
    });

    it('should handle all update fields', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await updateAlert('alert1', {
        targetPrice: 155.0,
        condition: 'below',
        isActive: false,
        note: 'Updated note',
      });

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          target_price: 155.0,
          condition: 'below',
          is_active: false,
          note: 'Updated note',
        })
      );
    });
  });

  describe('triggerAlert', () => {
    it('should trigger alert and mark as inactive', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await triggerAlert('alert1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('price_alerts');
      expect(mockQuery.update).toHaveBeenCalledWith({
        is_active: false,
        triggered_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'alert1');
    });

    it('should throw error on database error', async () => {
      const mockError = new Error('Trigger failed');
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: mockError,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(triggerAlert('alert1')).rejects.toThrow('Trigger failed');
    });
  });

  describe('deleteAlert', () => {
    it('should delete alert by id', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await deleteAlert('alert1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('price_alerts');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'alert1');
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

      await expect(deleteAlert('alert1')).rejects.toThrow('Delete failed');
    });
  });

  describe('checkAlertConditions', () => {
    it('should trigger alert when price is above target', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 155.0 };

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('alert1');
    });

    it('should trigger alert when price is below target', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'below',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 145.0 };

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(1);
      expect(triggered[0].id).toBe('alert1');
    });

    it('should trigger alert when price crosses target', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'crosses',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 150.005 }; // Within 0.01 threshold

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(1);
    });

    it('should not trigger inactive alerts', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
          isActive: false,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 155.0 };

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(0);
    });

    it('should not trigger when price does not meet condition', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 145.0 };

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(0);
    });

    it('should not trigger when price is not available', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { GOOGL: 100.0 }; // Different symbol

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(0);
    });

    it('should handle multiple alerts and symbols', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: 'alert2',
          symbol: 'GOOGL',
          targetPrice: 100.0,
          condition: 'below',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: 'alert3',
          symbol: 'MSFT',
          targetPrice: 200.0,
          condition: 'above',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = {
        AAPL: 155.0, // Should trigger
        GOOGL: 95.0, // Should trigger
        MSFT: 195.0, // Should NOT trigger
      };

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(2);
      expect(triggered.map((a) => a.id)).toContain('alert1');
      expect(triggered.map((a) => a.id)).toContain('alert2');
      expect(triggered.map((a) => a.id)).not.toContain('alert3');
    });

    it('should handle empty alerts array', () => {
      const triggered = checkAlertConditions([], { AAPL: 150.0 });

      expect(triggered).toEqual([]);
    });

    it('should trigger when price equals target for above condition', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 150.0 };

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(1);
    });

    it('should trigger when price equals target for below condition', () => {
      const alerts: PriceAlert[] = [
        {
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'below',
          isActive: true,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 150.0 };

      const triggered = checkAlertConditions(alerts, prices);

      expect(triggered).toHaveLength(1);
    });
  });

  describe('subscribeToAlerts', () => {
    it('should setup real-time subscription with callbacks', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(), // subscribe() returns the channel
      };

      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const onInsert = vi.fn();
      const onUpdate = vi.fn();
      const onDelete = vi.fn();

      const unsubscribe = subscribeToAlerts(onInsert, onUpdate, onDelete);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('alert_changes');
      expect(mockChannel.on).toHaveBeenCalledTimes(3);
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe function
      unsubscribe();
      expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should call onInsert callback when alert is inserted', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(), // subscribe() returns the channel
      };

      let insertCallback: (payload: any) => void;

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.event === 'INSERT') {
          insertCallback = callback;
        }
        return mockChannel;
      });

      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      const onInsert = vi.fn();
      const onUpdate = vi.fn();
      const onDelete = vi.fn();

      subscribeToAlerts(onInsert, onUpdate, onDelete);

      insertCallback!({
        new: mockAlertRow,
      });

      expect(onInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'alert1',
          symbol: 'AAPL',
          targetPrice: 150.0,
        })
      );
    });
  });
});
