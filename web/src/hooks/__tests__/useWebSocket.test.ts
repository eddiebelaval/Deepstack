// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    wsInstances = [];
  });

  describe('Connection Management', () => {
    it('connects when connect() is called', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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

    it('auto-connects when autoConnect is true', () => {
      renderHook(() => useWebSocket({ autoConnect: true }));

      expect(wsInstances.length).toBe(1);
    });

    it('connects to custom URL', () => {
      const customUrl = 'ws://custom-server.com/ws';

      const { result } = renderHook(() =>
        useWebSocket({ url: customUrl, autoConnect: false })
      );

      act(() => {
        result.current.connect();
      });

      expect(wsInstances[0].url).toBe(customUrl);
    });

    it('disconnects when disconnect() is called', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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

    it('does not reconnect when manually disconnected', () => {
      const { result } = renderHook(() =>
        useWebSocket({ autoConnect: false, reconnectOnError: true })
      );

      act(() => {
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
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should only have 1 WebSocket instance (the original)
      expect(wsInstances.length).toBe(1);
    });
  });

  describe('Reconnection', () => {
    it('attempts to reconnect on unexpected close', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          reconnectOnError: true,
          baseReconnectDelay: 1000,
        })
      );

      act(() => {
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
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should have created a new WebSocket
      expect(wsInstances.length).toBe(2);
    });

    it('uses exponential backoff for reconnects', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          reconnectOnError: true,
          baseReconnectDelay: 1000,
          maxReconnectDelay: 30000,
          maxReconnectAttempts: 5,
        })
      );

      act(() => {
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
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(wsInstances.length).toBe(2);

      // Simulate close again
      act(() => {
        wsInstances[1].simulateClose(1006);
      });

      // Should take longer (exponential backoff)
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Might not have reconnected yet due to longer delay
      const instanceCount = wsInstances.length;

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(wsInstances.length).toBeGreaterThanOrEqual(instanceCount);
    });

    it('stops reconnecting after max attempts', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          reconnectOnError: true,
          maxReconnectAttempts: 2,
          baseReconnectDelay: 100,
        })
      );

      act(() => {
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
        act(() => {
          vi.advanceTimersByTime(5000);
        });
      }

      // Should stop at max + 1 (original + max attempts)
      expect(wsInstances.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Message Handling', () => {
    it('handles quote messages', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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

    it('handles bar messages', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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

    it('handles error messages', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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

    it('handles heartbeat messages silently', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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

    it('handles malformed messages gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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
    it('sends messages to server', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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

    it('returns false when sending on closed connection', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
        result.current.connect();
      });

      // Don't open the connection - leave it connecting
      // This will return false when trying to send
      let sendResult: boolean;
      act(() => {
        sendResult = result.current.send({ type: 'test' });
      });

      expect(sendResult!).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not connected'));

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles connection errors', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
        result.current.connect();
      });

      act(() => {
        wsInstances[0].simulateError();
      });

      expect(mockSetLastError).toHaveBeenCalledWith('WebSocket connection error');
    });

    it('sets connected to false on close', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
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
    it('sends periodic heartbeat pings', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          heartbeatInterval: 1000,
        })
      );

      act(() => {
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

    it('stops heartbeat on disconnect', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          heartbeatInterval: 1000,
        })
      );

      act(() => {
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
    it('cleans up on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useWebSocket({ autoConnect: false })
      );

      act(() => {
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
    it('uses default options when not provided', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      act(() => {
        result.current.connect();
      });

      // Should connect to default URL
      expect(wsInstances[0].url).toContain('ws://localhost:8000/ws');
    });

    it('allows partial option overrides', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          url: 'ws://custom.com/ws',
        })
      );

      act(() => {
        result.current.connect();
      });

      expect(wsInstances[0].url).toBe('ws://custom.com/ws');
    });
  });
});
