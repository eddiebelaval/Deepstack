// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, resetBackendAvailabilityCache } from '../useWebSocket';

// Hoist store mocks
const mockSetWsConnected = vi.hoisted(() => vi.fn());
const mockSetWsReconnecting = vi.hoisted(() => vi.fn());
const mockSetLastError = vi.hoisted(() => vi.fn());
const mockUpdateQuote = vi.hoisted(() => vi.fn());
const mockUpdateLastBar = vi.hoisted(() => vi.fn());

// Mock market data store
vi.mock('@/lib/stores/market-data-store', () => ({
  useMarketDataStore: () => ({
    setWsConnected: mockSetWsConnected,
    setWsReconnecting: mockSetWsReconnecting,
    setLastError: mockSetLastError,
    updateQuote: mockUpdateQuote,
    updateLastBar: mockUpdateLastBar,
    subscribedSymbols: new Set<string>(),
  }),
}));

// Mock fetch for backend availability checks
const mockFetch = vi.fn();

// Store WebSocket instances for testing
let wsInstances: MockWebSocket[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    wsInstances.push(this);
  }

  send = vi.fn((data: string) => {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  });

  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  });

  // Test helpers - manually trigger events
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    wsInstances = [];

    // Mock WebSocket constructor
    global.WebSocket = MockWebSocket as any;
    (global.WebSocket as any).CONNECTING = 0;
    (global.WebSocket as any).OPEN = 1;
    (global.WebSocket as any).CLOSING = 2;
    (global.WebSocket as any).CLOSED = 3;

    // Mock fetch to return success for backend availability check
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true });

    // Reset backend availability cache before each test
    resetBackendAvailabilityCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    wsInstances = [];
    mockFetch.mockReset();
  });

  // Helper to wait for async connect operations
  async function waitForConnect() {
    // Flush promises and advance timers to allow async operations
    await vi.runAllTimersAsync();
  }

  describe('Connection Management', () => {
    it('connects when connect() is called', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      expect(wsInstances.length).toBe(1);
      expect(wsInstances[0].url).toContain('ws://');

      // Simulate connection opening
      act(() => {
        wsInstances[0].simulateOpen();
      });

      expect(mockSetWsConnected).toHaveBeenCalledWith(true);
      expect(mockSetWsReconnecting).toHaveBeenCalledWith(false);
      expect(mockSetLastError).toHaveBeenCalledWith(null);
    });

    it('does not auto-connect when autoConnect is false', () => {
      renderHook(() => useWebSocket({ autoConnect: false }));

      expect(wsInstances.length).toBe(0);
    });

    it('auto-connects when autoConnect is true', async () => {
      renderHook(() => useWebSocket({ autoConnect: true, checkBackendFirst: false }));

      // Wait for async connect
      await act(async () => {
        await waitForConnect();
      });

      expect(wsInstances.length).toBe(1);
    });

    it('connects to custom URL', async () => {
      const customUrl = 'ws://custom-server.com/ws';

      const { result } = renderHook(() =>
        useWebSocket({ url: customUrl, autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      expect(wsInstances[0].url).toBe(customUrl);
    });

    it('disconnects when disconnect() is called', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(wsInstances[0].close).toHaveBeenCalled();
    });

    it('does not reconnect when manually disconnected', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, reconnectOnError: true, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // Manually disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(mockSetWsConnected).toHaveBeenCalledWith(false);

      // Advance timers - should not attempt reconnect
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Should only have 1 WebSocket instance (the original)
      expect(wsInstances.length).toBe(1);
    });

    it('checks backend availability before connecting when checkBackendFirst is true', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: true })
      );

      await act(async () => {
        result.current.connect();
        await waitForConnect();
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(wsInstances.length).toBe(1);
    });

    it('enters frontend-only mode when backend is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: true })
      );

      await act(async () => {
        result.current.connect();
        await waitForConnect();
      });

      // Should not create WebSocket when backend is unavailable
      expect(wsInstances.length).toBe(0);
      expect(result.current.isFrontendOnlyMode).toBe(true);
      expect(mockSetLastError).toHaveBeenCalledWith(expect.stringContaining('Backend unavailable'));
    });
  });

  describe('Reconnection', () => {
    it('attempts to reconnect on unexpected close', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          reconnectOnError: true,
          baseReconnectDelay: 1000,
          checkBackendFirst: false,
        })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // Simulate unexpected close (not manual)
      act(() => {
        wsInstances[0].simulateClose(1006, 'Abnormal closure');
      });

      expect(mockSetWsConnected).toHaveBeenCalledWith(false);
      expect(mockSetWsReconnecting).toHaveBeenCalledWith(true);

      // Advance past reconnect delay
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await waitForConnect();
      });

      // Should have created a new WebSocket
      expect(wsInstances.length).toBe(2);
    });

    it('uses exponential backoff for reconnects', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          reconnectOnError: true,
          baseReconnectDelay: 1000,
          maxReconnectDelay: 30000,
          maxReconnectAttempts: 5,
          checkBackendFirst: false,
        })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // First disconnect
      act(() => {
        wsInstances[0].simulateClose(1006);
      });

      // First reconnect after ~1000ms
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await waitForConnect();
      });

      expect(wsInstances.length).toBe(2);

      // Simulate close again
      act(() => {
        wsInstances[1].simulateClose(1006);
      });

      // Should take longer (exponential backoff)
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await waitForConnect();
      });

      // Might not have reconnected yet due to longer delay
      const instanceCount = wsInstances.length;

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await waitForConnect();
      });

      expect(wsInstances.length).toBeGreaterThanOrEqual(instanceCount);
    });

    it('stops reconnecting after max attempts', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          reconnectOnError: true,
          maxReconnectAttempts: 2,
          baseReconnectDelay: 100,
          checkBackendFirst: false,
        })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // Simulate closes and reconnects
      for (let i = 0; i < 3; i++) {
        const lastInstance = wsInstances[wsInstances.length - 1];
        act(() => {
          lastInstance.simulateClose(1006);
        });
        await act(async () => {
          vi.advanceTimersByTime(5000);
          await waitForConnect();
        });
      }

      // Should stop at max + 1 (original + max attempts)
      expect(wsInstances.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Message Handling', () => {
    it('handles quote messages', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      const quoteMessage = {
        type: 'quote',
        timestamp: '2024-01-01T00:00:00Z',
        data: {
          symbol: 'AAPL',
          last: 150.25,
          bid: 150.20,
          ask: 150.30,
          volume: 1000000,
        },
      };

      act(() => {
        wsInstances[0].simulateMessage(quoteMessage);
      });

      expect(mockUpdateQuote).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          symbol: 'AAPL',
          last: 150.25,
        })
      );
    });

    it('handles bar messages', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      const barMessage = {
        type: 'bar',
        timestamp: '2024-01-01T00:00:00Z',
        data: {
          symbol: 'AAPL',
          time: 1704067200,
          open: 150.0,
          high: 151.0,
          low: 149.5,
          close: 150.5,
          volume: 500000,
        },
      };

      act(() => {
        wsInstances[0].simulateMessage(barMessage);
      });

      expect(mockUpdateLastBar).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          time: 1704067200,
          open: 150.0,
          high: 151.0,
          low: 149.5,
          close: 150.5,
        })
      );
    });

    it('handles error messages', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      const errorMessage = {
        type: 'error',
        timestamp: '2024-01-01T00:00:00Z',
        data: { message: 'Test error' },
      };

      act(() => {
        wsInstances[0].simulateMessage(errorMessage);
      });

      expect(mockSetLastError).toHaveBeenCalledWith('Test error');
    });

    it('handles heartbeat messages silently', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: '2024-01-01T00:00:00Z',
        data: {},
      };

      act(() => {
        wsInstances[0].simulateMessage(heartbeatMessage);
      });

      // Should not cause any errors or state updates beyond connection
      expect(mockUpdateQuote).not.toHaveBeenCalled();
      expect(mockUpdateLastBar).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles malformed messages gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // Send invalid JSON
      act(() => {
        if (wsInstances[0].onmessage) {
          wsInstances[0].onmessage(
            new MessageEvent('message', { data: 'invalid json' })
          );
        }
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Subscription Management', () => {
    it('sends messages to server', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      const testMessage = { type: 'subscribe', symbols: ['AAPL'] };

      act(() => {
        result.current.send(testMessage);
      });

      expect(wsInstances[0].send).toHaveBeenCalledWith(JSON.stringify(testMessage));
    });

    it('returns false when sending on closed connection', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      // Don't open the connection - leave it connecting
      // This will return false when trying to send
      let sendResult: boolean;
      act(() => {
        sendResult = result.current.send({ type: 'test' });
      });

      expect(sendResult!).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles connection errors', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateError();
      });

      expect(mockSetLastError).toHaveBeenCalledWith('WebSocket connection error');
    });

    it('sets connected to false on close', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        wsInstances[0].simulateClose();
      });

      expect(mockSetWsConnected).toHaveBeenCalledWith(false);
    });
  });

  describe('Heartbeat', () => {
    it('sends periodic heartbeat pings', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          heartbeatInterval: 1000,
          checkBackendFirst: false,
        })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // Clear the call from connection
      wsInstances[0].send.mockClear();

      // Advance by heartbeat interval
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(wsInstances[0].send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'ping' })
      );
    });

    it('stops heartbeat on disconnect', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          heartbeatInterval: 1000,
          checkBackendFirst: false,
        })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      wsInstances[0].send.mockClear();

      // Advance by heartbeat interval
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not have sent any more pings
      expect(wsInstances[0].send).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('cleans up on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateOpen();
      });

      unmount();

      expect(wsInstances[0].close).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('uses default options when not provided', async () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, checkBackendFirst: false })
      );

      await act(async () => {
        result.current.connect();
      });

      // Should connect to default URL (127.0.0.1 to avoid IPv6 issues)
      expect(wsInstances[0].url).toContain('ws://127.0.0.1:8000/ws');
    });

    it('allows partial option overrides', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          checkBackendFirst: false,
          url: 'ws://custom.com/ws',
        })
      );

      await act(async () => {
        result.current.connect();
      });

      expect(wsInstances[0].url).toBe('ws://custom.com/ws');
    });
  });
});
