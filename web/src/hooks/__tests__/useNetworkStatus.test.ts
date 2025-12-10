import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus, useIsOnline, useNetworkStatusStore } from '../useNetworkStatus';

describe('useNetworkStatusStore', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useNetworkStatusStore.setState({
        isOnline: true,
        wasOffline: false,
      });
    });
  });

  it('initializes with online status from navigator', () => {
    const { isOnline } = useNetworkStatusStore.getState();
    expect(typeof isOnline).toBe('boolean');
  });

  it('can update online status', () => {
    act(() => {
      useNetworkStatusStore.getState().setOnline(false);
    });

    expect(useNetworkStatusStore.getState().isOnline).toBe(false);
  });

  it('can track wasOffline status', () => {
    act(() => {
      useNetworkStatusStore.getState().setWasOffline(true);
    });

    expect(useNetworkStatusStore.getState().wasOffline).toBe(true);
  });
});

describe('useNetworkStatus', () => {
  let onlineCallback: (() => void) | undefined;
  let offlineCallback: (() => void) | undefined;

  beforeEach(() => {
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    // Reset store
    act(() => {
      useNetworkStatusStore.setState({
        isOnline: true,
        wasOffline: false,
      });
    });

    // Mock event listeners
    onlineCallback = undefined;
    offlineCallback = undefined;

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    addEventListenerSpy.mockImplementation((event: string, handler: any) => {
      if (event === 'online') {
        onlineCallback = handler;
      } else if (event === 'offline') {
        offlineCallback = handler;
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns online status from navigator', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('returns offline status when navigator is offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('initializes wasOffline as false', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.wasOffline).toBe(false);
    });

    it('initializes lastOnlineAt as null', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.lastOnlineAt).toBeNull();
    });
  });

  describe('event listeners', () => {
    it('sets up online and offline event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useNetworkStatus());

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('online/offline transitions', () => {
    it('updates to offline when offline event fires', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        if (offlineCallback) offlineCallback();
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
        expect(result.current.isOffline).toBe(true);
      });
    });

    it('sets wasOffline flag when going offline', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.wasOffline).toBe(false);

      act(() => {
        if (offlineCallback) offlineCallback();
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });
    });

    it('updates to online when online event fires', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      act(() => {
        useNetworkStatusStore.setState({ isOnline: false });
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        if (onlineCallback) onlineCallback();
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.isOffline).toBe(false);
      });
    });

    it('sets lastOnlineAt timestamp when coming online', async () => {
      // Start offline
      act(() => {
        useNetworkStatusStore.setState({ isOnline: false });
      });

      const { result } = renderHook(() => useNetworkStatus());
      const beforeTime = new Date();

      act(() => {
        if (onlineCallback) onlineCallback();
      });

      await waitFor(() => {
        expect(result.current.lastOnlineAt).toBeDefined();
        expect(result.current.lastOnlineAt).toBeInstanceOf(Date);
        expect(result.current.lastOnlineAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      });
    });
  });

  describe('clearWasOffline', () => {
    it('clears wasOffline flag', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Go offline
      act(() => {
        if (offlineCallback) offlineCallback();
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });

      // Clear flag
      act(() => {
        result.current.clearWasOffline();
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(false);
      });
    });

    it('can be used to dismiss reconnection message', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Simulate offline -> online -> dismiss message workflow
      act(() => {
        if (offlineCallback) offlineCallback();
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });

      act(() => {
        if (onlineCallback) onlineCallback();
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.wasOffline).toBe(true); // Still shows we were offline
      });

      act(() => {
        result.current.clearWasOffline();
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(false);
      });
    });
  });

  describe('state persistence across renders', () => {
    it('maintains wasOffline state across multiple online/offline cycles', async () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Go offline
      act(() => {
        if (offlineCallback) offlineCallback();
      });

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });

      // Go online
      act(() => {
        if (onlineCallback) onlineCallback();
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.wasOffline).toBe(true); // Should still be true
      });

      // Go offline again
      act(() => {
        if (offlineCallback) offlineCallback();
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
        expect(result.current.wasOffline).toBe(true); // Should remain true
      });
    });
  });
});

describe('useIsOnline', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });

    act(() => {
      useNetworkStatusStore.setState({
        isOnline: true,
        wasOffline: false,
      });
    });

    vi.clearAllMocks();
  });

  it('returns true when online', () => {
    const { result } = renderHook(() => useIsOnline());

    expect(result.current).toBe(true);
  });

  it('returns false when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    act(() => {
      useNetworkStatusStore.setState({ isOnline: false });
    });

    const { result } = renderHook(() => useIsOnline());

    expect(result.current).toBe(false);
  });

  it('updates when network status changes', async () => {
    const { result } = renderHook(() => useIsOnline());

    expect(result.current).toBe(true);

    act(() => {
      useNetworkStatusStore.getState().setOnline(false);
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
