import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useRealtimePositions,
  useRealtimeStatus,
  useRealtimeStatusStore,
} from '../useRealtimePositions';

// Mock the realtime module
const mockUnsubscribe = vi.fn();
let statusChangeCallback: ((status: string) => void) | null = null;

vi.mock('@/lib/supabase/realtime', () => ({
  onConnectionStatusChange: vi.fn((callback) => {
    statusChangeCallback = callback;
    return mockUnsubscribe;
  }),
}));

import { onConnectionStatusChange } from '@/lib/supabase/realtime';

describe('useRealtimePositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statusChangeCallback = null;
    // Reset store state
    useRealtimeStatusStore.setState({ status: 'disconnected' });
  });

  afterEach(() => {
    statusChangeCallback = null;
  });

  describe('useRealtimeStatusStore', () => {
    it('should have initial disconnected status', () => {
      const state = useRealtimeStatusStore.getState();
      expect(state.status).toBe('disconnected');
    });

    it('should update status via setStatus', () => {
      const { setStatus } = useRealtimeStatusStore.getState();

      act(() => {
        setStatus('connected');
      });

      expect(useRealtimeStatusStore.getState().status).toBe('connected');
    });

    it('should support all connection statuses', () => {
      const { setStatus } = useRealtimeStatusStore.getState();

      const statuses = ['disconnected', 'connecting', 'connected', 'error'];

      statuses.forEach((status) => {
        act(() => {
          setStatus(status as any);
        });
        expect(useRealtimeStatusStore.getState().status).toBe(status);
      });
    });
  });

  describe('useRealtimePositions hook', () => {
    it('should subscribe to connection status changes on mount', () => {
      renderHook(() => useRealtimePositions());

      expect(onConnectionStatusChange).toHaveBeenCalledTimes(1);
      expect(onConnectionStatusChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return current connection status', () => {
      const { result } = renderHook(() => useRealtimePositions());

      expect(result.current).toBe('disconnected');
    });

    it('should update when connection status changes', () => {
      const { result } = renderHook(() => useRealtimePositions());

      expect(result.current).toBe('disconnected');

      // Simulate status change
      act(() => {
        if (statusChangeCallback) {
          statusChangeCallback('connected');
        }
      });

      expect(result.current).toBe('connected');
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useRealtimePositions());

      expect(mockUnsubscribe).not.toHaveBeenCalled();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle connecting status', () => {
      const { result } = renderHook(() => useRealtimePositions());

      act(() => {
        if (statusChangeCallback) {
          statusChangeCallback('connecting');
        }
      });

      expect(result.current).toBe('connecting');
    });

    it('should handle error status', () => {
      const { result } = renderHook(() => useRealtimePositions());

      act(() => {
        if (statusChangeCallback) {
          statusChangeCallback('error');
        }
      });

      expect(result.current).toBe('error');
    });
  });

  describe('useRealtimeStatus hook', () => {
    it('should return current status from store', () => {
      const { result } = renderHook(() => useRealtimeStatus());

      expect(result.current).toBe('disconnected');
    });

    it('should update when store status changes', () => {
      const { result } = renderHook(() => useRealtimeStatus());

      act(() => {
        useRealtimeStatusStore.getState().setStatus('connected');
      });

      expect(result.current).toBe('connected');
    });

    it('should not subscribe to realtime changes directly', () => {
      // Clear previous calls
      vi.mocked(onConnectionStatusChange).mockClear();

      renderHook(() => useRealtimeStatus());

      // useRealtimeStatus doesn't call onConnectionStatusChange
      expect(onConnectionStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('multiple hook instances', () => {
    it('should share status across multiple useRealtimeStatus instances', () => {
      const { result: result1 } = renderHook(() => useRealtimeStatus());
      const { result: result2 } = renderHook(() => useRealtimeStatus());

      expect(result1.current).toBe('disconnected');
      expect(result2.current).toBe('disconnected');

      act(() => {
        useRealtimeStatusStore.getState().setStatus('connected');
      });

      expect(result1.current).toBe('connected');
      expect(result2.current).toBe('connected');
    });
  });
});
