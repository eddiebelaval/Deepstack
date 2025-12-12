import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlertsSync } from '../useAlertsSync';
import { useAlertsStore, type PriceAlert, type AlertCondition } from '@/lib/stores/alerts-store';
import * as supabase from '@/lib/supabase';
import * as alertsApi from '@/lib/supabase/alerts';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  supabase: null,
}));

// Mock the alerts API module
vi.mock('@/lib/supabase/alerts', () => ({
  fetchAlerts: vi.fn(),
  createAlert: vi.fn(),
  updateAlert: vi.fn(),
  triggerAlert: vi.fn(),
  deleteAlert: vi.fn(),
  subscribeToAlerts: vi.fn(),
}));

const mockAlert: PriceAlert = {
  id: 'alert-123',
  symbol: 'AAPL',
  targetPrice: 150.0,
  condition: 'above' as AlertCondition,
  note: 'Buy signal',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  triggeredAt: null,
};

const mockTriggeredAlert: PriceAlert = {
  id: 'alert-456',
  symbol: 'TSLA',
  targetPrice: 200.0,
  condition: 'below' as AlertCondition,
  note: 'Sell signal',
  isActive: false,
  createdAt: '2024-01-01T00:00:00Z',
  triggeredAt: '2024-01-02T00:00:00Z',
};

describe('useAlertsSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useAlertsStore.setState({ alerts: [] });

    // Default: Supabase not configured (offline mode)
    vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useAlertsSync());

      expect(result.current.alerts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.addAlert).toBe('function');
      expect(typeof result.current.updateAlert).toBe('function');
      expect(typeof result.current.triggerAlert).toBe('function');
      expect(typeof result.current.removeAlert).toBe('function');
      expect(typeof result.current.clearTriggered).toBe('function');
      expect(typeof result.current.getActiveAlerts).toBe('function');
      expect(typeof result.current.getTriggeredAlerts).toBe('function');
    });

    it('sets isOnline to false when Supabase is not configured', () => {
      const { result } = renderHook(() => useAlertsSync());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call fetchAlerts when Supabase is not configured', () => {
      renderHook(() => useAlertsSync());

      expect(alertsApi.fetchAlerts).not.toHaveBeenCalled();
    });
  });

  describe('Online Mode - Data Loading', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
    });

    it('loads alerts from Supabase on mount when online', async () => {
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([mockAlert, mockTriggeredAlert]);

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(alertsApi.fetchAlerts).toHaveBeenCalledTimes(1);
      expect(result.current.alerts).toHaveLength(2);
      expect(result.current.alerts[0].id).toBe('alert-123');
      expect(result.current.alerts[1].id).toBe('alert-456');
      expect(result.current.isOnline).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('does not replace local alerts when remote is empty', async () => {
      // Set local alerts before test
      useAlertsStore.setState({ alerts: [mockAlert] });
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([]);

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should keep local alerts
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].id).toBe('alert-123');
    });

    it('handles fetch error gracefully', async () => {
      vi.mocked(alertsApi.fetchAlerts).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load alerts. Using local data.');
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Real-time Subscription', () => {
    beforeEach(() => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([]);
    });

    it('subscribes to alert changes when online', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(alertsApi.subscribeToAlerts).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('does not subscribe when offline', () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(false);

      renderHook(() => useAlertsSync());

      expect(alertsApi.subscribeToAlerts).not.toHaveBeenCalled();
    });

    it('handles onInsert callback by adding new alert', async () => {
      let onInsert: ((alert: PriceAlert) => void) | null = null;

      vi.mocked(alertsApi.subscribeToAlerts).mockImplementation((insert, update, del) => {
        onInsert = insert;
        return () => {};
      });

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger onInsert
      act(() => {
        if (onInsert) onInsert(mockAlert);
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].id).toBe('alert-123');
    });

    it('handles onUpdate callback by updating existing alert', async () => {
      useAlertsStore.setState({ alerts: [mockAlert] });

      let onUpdate: ((alert: PriceAlert) => void) | null = null;

      vi.mocked(alertsApi.subscribeToAlerts).mockImplementation((insert, update, del) => {
        onUpdate = update;
        return () => {};
      });

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedAlert = { ...mockAlert, targetPrice: 160.0 };

      act(() => {
        if (onUpdate) onUpdate(updatedAlert);
      });

      expect(result.current.alerts[0].targetPrice).toBe(160.0);
    });

    it('handles onDelete callback by removing alert', async () => {
      useAlertsStore.setState({ alerts: [mockAlert] });

      let onDelete: ((alertId: string) => void) | null = null;

      vi.mocked(alertsApi.subscribeToAlerts).mockImplementation((insert, update, del) => {
        onDelete = del;
        return () => {};
      });

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        if (onDelete) onDelete('alert-123');
      });

      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('addAlert', () => {
    it('adds alert locally when offline', async () => {
      const { result } = renderHook(() => useAlertsSync());

      await act(async () => {
        await result.current.addAlert({
          symbol: 'NVDA',
          targetPrice: 500.0,
          condition: 'above',
          note: 'Breakout',
        });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].symbol).toBe('NVDA');
      expect(alertsApi.createAlert).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.createAlert).mockResolvedValue(mockAlert);

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addAlert({
          symbol: 'AAPL',
          targetPrice: 150.0,
          condition: 'above',
          note: 'Buy signal',
        });
      });

      expect(alertsApi.createAlert).toHaveBeenCalledWith({
        symbol: 'AAPL',
        targetPrice: 150.0,
        condition: 'above',
        note: 'Buy signal',
      });
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].id).toBe('alert-123');
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.createAlert).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addAlert({
          symbol: 'NVDA',
          targetPrice: 500.0,
          condition: 'above',
          note: 'Test',
        });
      });

      // Should still create locally despite sync failure
      expect(result.current.alerts).toHaveLength(1);
    });
  });

  describe('updateAlert', () => {
    beforeEach(() => {
      useAlertsStore.setState({ alerts: [mockAlert] });
    });

    it('updates alert locally when offline', async () => {
      const { result } = renderHook(() => useAlertsSync());

      await act(async () => {
        await result.current.updateAlert('alert-123', {
          targetPrice: 160.0,
          note: 'Updated note',
        });
      });

      expect(result.current.alerts[0].targetPrice).toBe(160.0);
      expect(result.current.alerts[0].note).toBe('Updated note');
      expect(alertsApi.updateAlert).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([mockAlert]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.updateAlert).mockResolvedValue();

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAlert('alert-123', {
          targetPrice: 160.0,
          isActive: false,
        });
      });

      expect(alertsApi.updateAlert).toHaveBeenCalledWith('alert-123', {
        targetPrice: 160.0,
        isActive: false,
      });
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([mockAlert]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.updateAlert).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAlert('alert-123', { targetPrice: 160.0 });
      });

      // Should still update locally
      expect(result.current.alerts[0].targetPrice).toBe(160.0);
    });
  });

  describe('triggerAlert', () => {
    beforeEach(() => {
      useAlertsStore.setState({ alerts: [mockAlert] });
    });

    it('triggers alert locally when offline', async () => {
      const { result } = renderHook(() => useAlertsSync());

      await act(async () => {
        await result.current.triggerAlert('alert-123');
      });

      expect(result.current.alerts[0].isActive).toBe(false);
      expect(result.current.alerts[0].triggeredAt).toBeDefined();
      expect(alertsApi.triggerAlert).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([mockAlert]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.triggerAlert).mockResolvedValue();

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerAlert('alert-123');
      });

      expect(alertsApi.triggerAlert).toHaveBeenCalledWith('alert-123');
      expect(result.current.alerts[0].isActive).toBe(false);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([mockAlert]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.triggerAlert).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerAlert('alert-123');
      });

      // Should still trigger locally
      expect(result.current.alerts[0].isActive).toBe(false);
    });
  });

  describe('removeAlert', () => {
    beforeEach(() => {
      useAlertsStore.setState({ alerts: [mockAlert, mockTriggeredAlert] });
    });

    it('removes alert locally when offline', async () => {
      const { result } = renderHook(() => useAlertsSync());

      await act(async () => {
        await result.current.removeAlert('alert-123');
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].id).toBe('alert-456');
      expect(alertsApi.deleteAlert).not.toHaveBeenCalled();
    });

    it('syncs to Supabase when online', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([mockAlert, mockTriggeredAlert]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.deleteAlert).mockResolvedValue();

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeAlert('alert-123');
      });

      expect(alertsApi.deleteAlert).toHaveBeenCalledWith('alert-123');
      expect(result.current.alerts).toHaveLength(1);
    });

    it('falls back to local on sync error', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([mockAlert, mockTriggeredAlert]);
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(() => {});
      vi.mocked(alertsApi.deleteAlert).mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeAlert('alert-123');
      });

      // Should still delete locally
      expect(result.current.alerts).toHaveLength(1);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      useAlertsStore.setState({ alerts: [mockAlert, mockTriggeredAlert] });
    });

    it('getActiveAlerts returns only active alerts', () => {
      const { result } = renderHook(() => useAlertsSync());

      const activeAlerts = result.current.getActiveAlerts();

      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe('alert-123');
      expect(activeAlerts[0].isActive).toBe(true);
    });

    it('getTriggeredAlerts returns only triggered alerts', () => {
      const { result } = renderHook(() => useAlertsSync());

      const triggeredAlerts = result.current.getTriggeredAlerts();

      expect(triggeredAlerts).toHaveLength(1);
      expect(triggeredAlerts[0].id).toBe('alert-456');
      expect(triggeredAlerts[0].triggeredAt).toBeDefined();
    });
  });

  describe('clearTriggered', () => {
    beforeEach(() => {
      useAlertsStore.setState({ alerts: [mockAlert, mockTriggeredAlert] });
    });

    it('clears all triggered alerts', () => {
      const { result } = renderHook(() => useAlertsSync());

      act(() => {
        result.current.clearTriggered();
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0].id).toBe('alert-123');
      expect(result.current.alerts[0].isActive).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes on unmount', async () => {
      vi.mocked(supabase.isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(alertsApi.fetchAlerts).mockResolvedValue([]);

      const unsubscribe = vi.fn();
      vi.mocked(alertsApi.subscribeToAlerts).mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useAlertsSync());

      await waitFor(() => {
        expect(alertsApi.subscribeToAlerts).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
