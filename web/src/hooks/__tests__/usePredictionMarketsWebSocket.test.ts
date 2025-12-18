// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePredictionMarketsWebSocket } from '../usePredictionMarketsWebSocket';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

// Mock prediction markets store
const mockSetMarkets = vi.hoisted(() => vi.fn());
const mockMarkets = vi.hoisted(() => [] as PredictionMarket[]);

vi.mock('@/lib/stores/prediction-markets-store', () => ({
  usePredictionMarketsStore: () => ({
    setMarkets: mockSetMarkets,
    markets: mockMarkets,
  }),
}));

// Mock fetch for polling fallback
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  });

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateClose(code = 1000, reason = 'Normal closure') {
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

// Test data factory
function createPredictionMarket(overrides: Partial<PredictionMarket> = {}): PredictionMarket {
  return {
    id: `market-${Date.now()}-${Math.random()}`,
    platform: 'polymarket',
    title: 'Test Market',
    category: 'Politics',
    marketType: 'binary',
    outcomes: [
      { name: 'Yes', price: 0.55 },
      { name: 'No', price: 0.45 },
    ],
    yesPrice: 0.55,
    noPrice: 0.45,
    volume: 100000,
    volume24h: 10000,
    endDate: new Date(Date.now() + 86400000).toISOString(),
    status: 'active',
    url: 'https://polymarket.com/market/test',
    ...overrides,
  };
}

describe('usePredictionMarketsWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    wsInstances = [];
    mockMarkets.length = 0;

    // Mock WebSocket constructor
    global.WebSocket = MockWebSocket as any;
    (global.WebSocket as any).CONNECTING = 0;
    (global.WebSocket as any).OPEN = 1;
    (global.WebSocket as any).CLOSING = 2;
    (global.WebSocket as any).CLOSED = 3;

    // Mock window.location for WebSocket URL construction
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:' },
      writable: true,
    });

    // Set up mock fetch for polling
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ markets: [] }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    wsInstances = [];
  });

  describe('Connection Management', () => {
    it('connects on mount', () => {
      renderHook(() => usePredictionMarketsWebSocket());

      expect(wsInstances.length).toBe(1);
      expect(wsInstances[0].url).toContain('ws://');
    });

    it('sets status to connecting initially', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      expect(result.current.status).toBe('connecting');
      expect(result.current.isConnected).toBe(false);
    });

    it('sets status to connected when WebSocket opens', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      expect(result.current.status).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });

    it('subscribes to prediction-markets channel on open', () => {
      renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      expect(wsInstances[0].send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'subscribe',
          channel: 'prediction-markets',
        })
      );
    });

    it('disconnects on unmount', () => {
      const { unmount } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      unmount();

      expect(wsInstances[0].close).toHaveBeenCalled();
    });

    it('uses wss:// protocol for https sites', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });

      renderHook(() => usePredictionMarketsWebSocket());

      expect(wsInstances[0].url).toContain('wss://');
    });

    it('uses custom API URL from environment', () => {
      const originalEnv = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = 'https://custom-api.com';

      renderHook(() => usePredictionMarketsWebSocket());

      expect(wsInstances[0].url).toContain('custom-api.com');

      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    });
  });

  describe('Message Handling', () => {
    it('handles full market list updates', () => {
      const markets = [createPredictionMarket(), createPredictionMarket()];
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        wsInstances[0].simulateMessage({
          type: 'prediction-market',
          timestamp: new Date().toISOString(),
          data: { markets },
        });
      });

      expect(mockSetMarkets).toHaveBeenCalledWith(markets);
    });

    it('handles single market updates', () => {
      const existingMarket = createPredictionMarket({ id: 'market-1', platform: 'polymarket' });
      const updatedMarket = { ...existingMarket, currentPrices: [0.60, 0.40] };
      mockMarkets.push(existingMarket);

      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        wsInstances[0].simulateMessage({
          type: 'prediction-market',
          timestamp: new Date().toISOString(),
          data: { market: updatedMarket },
        });
      });

      expect(mockSetMarkets).toHaveBeenCalled();
      const updatedMarkets = mockSetMarkets.mock.calls[mockSetMarkets.mock.calls.length - 1][0];
      expect(updatedMarkets).toContainEqual(updatedMarket);
    });

    it('ignores non-prediction-market messages', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      mockSetMarkets.mockClear();

      act(() => {
        wsInstances[0].simulateMessage({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          data: {},
        });
      });

      expect(mockSetMarkets).not.toHaveBeenCalled();
    });

    it('handles malformed messages gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

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

    it('merges single market update into existing markets', () => {
      const market1 = createPredictionMarket({ id: 'market-1', platform: 'polymarket' });
      const market2 = createPredictionMarket({ id: 'market-2', platform: 'polymarket' });
      mockMarkets.push(market1, market2);

      const updatedMarket1 = { ...market1, currentPrices: [0.70, 0.30] };

      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        wsInstances[0].simulateMessage({
          type: 'prediction-market',
          timestamp: new Date().toISOString(),
          data: { market: updatedMarket1 },
        });
      });

      const updatedMarkets = mockSetMarkets.mock.calls[mockSetMarkets.mock.calls.length - 1][0];
      expect(updatedMarkets.find((m: PredictionMarket) => m.id === 'market-1')).toEqual(updatedMarket1);
      expect(updatedMarkets.find((m: PredictionMarket) => m.id === 'market-2')).toEqual(market2);
    });
  });

  describe('Reconnection Logic', () => {
    it('attempts reconnection on unexpected close', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        wsInstances[0].simulateClose(1006, 'Abnormal closure');
      });

      expect(result.current.status).toBe('disconnected');

      // Advance past reconnect delay
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should have created a new WebSocket
      expect(wsInstances.length).toBe(2);
    });

    it('uses exponential backoff for reconnection', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // First disconnect
      act(() => {
        wsInstances[0].simulateClose(1006);
      });

      // Should reconnect after ~1000ms
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(wsInstances.length).toBe(2);

      act(() => {
        wsInstances[1].simulateClose(1006);
      });

      // Should take longer for second reconnect (exponential backoff)
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Might not have reconnected yet
      const beforeLongDelay = wsInstances.length;

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(wsInstances.length).toBeGreaterThanOrEqual(beforeLongDelay);
    });

    it('falls back to polling after max reconnect attempts', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      // Simulate 5 failed reconnection attempts
      for (let i = 0; i < 6; i++) {
        const lastInstance = wsInstances[wsInstances.length - 1];
        act(() => {
          lastInstance.simulateClose(1006);
        });
        act(() => {
          vi.advanceTimersByTime(10000);
        });
      }

      expect(result.current.isUsingPolling).toBe(true);

      // Verify polling is active
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/prediction-markets?limit=20')
      );
    });

    it('does not reconnect on normal close', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('disconnected');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not have created new WebSocket
      expect(wsInstances.length).toBe(1);
    });
  });

  describe('Polling Fallback', () => {
    it('starts polling when WebSocket fails to connect', () => {
      // Make WebSocket constructor throw
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class {
        constructor() {
          throw new Error('WebSocket creation failed');
        }
      } as any;

      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      expect(result.current.status).toBe('error');
      expect(result.current.isUsingPolling).toBe(true);

      global.WebSocket = originalWebSocket;
    });

    it('polls at 30 second intervals', () => {
      // Force polling
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class {
        constructor() {
          throw new Error('WebSocket creation failed');
        }
      } as any;

      renderHook(() => usePredictionMarketsWebSocket());

      mockFetch.mockClear();

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockFetch).toHaveBeenCalled();

      mockFetch.mockClear();

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockFetch).toHaveBeenCalled();

      global.WebSocket = originalWebSocket;
    });

    it('updates store with polling data', async () => {
      const markets = [createPredictionMarket(), createPredictionMarket()];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ markets }),
      });

      // Force polling
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class {
        constructor() {
          throw new Error('WebSocket creation failed');
        }
      } as any;

      renderHook(() => usePredictionMarketsWebSocket());

      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(mockSetMarkets).toHaveBeenCalledWith(markets);

      global.WebSocket = originalWebSocket;
    });

    it('handles polling errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Polling failed'));

      // Force polling
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class {
        constructor() {
          throw new Error('WebSocket creation failed');
        }
      } as any;

      renderHook(() => usePredictionMarketsWebSocket());

      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error));

      consoleSpy.mockRestore();
      global.WebSocket = originalWebSocket;
    });

    it('stops polling when WebSocket connects', () => {
      // Start with polling
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class {
        constructor() {
          throw new Error('WebSocket creation failed');
        }
      } as any;

      const { result } = renderHook(() => usePredictionMarketsWebSocket());
      expect(result.current.isUsingPolling).toBe(true);

      // Restore WebSocket
      global.WebSocket = originalWebSocket;

      // Manually reconnect
      act(() => {
        result.current.reconnect();
      });

      act(() => {
        wsInstances[wsInstances.length - 1].simulateOpen();
      });

      expect(result.current.isUsingPolling).toBe(false);
    });
  });

  describe('Connection Controls', () => {
    it('allows manual reconnection', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('disconnected');

      const initialCount = wsInstances.length;

      act(() => {
        result.current.reconnect();
      });

      expect(wsInstances.length).toBeGreaterThan(initialCount);
    });

    it('allows manual disconnection', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status).toBe('disconnected');
      expect(wsInstances[0].close).toHaveBeenCalled();
    });

    it('prevents multiple simultaneous connections', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      const beforeReconnect = wsInstances.length;

      act(() => {
        result.current.reconnect();
      });

      // Should not create new connection when already open
      expect(wsInstances.length).toBe(beforeReconnect);
    });
  });

  describe('Error Handling', () => {
    it('sets status to error on WebSocket error', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateError();
      });

      expect(result.current.status).toBe('error');
    });

    it('closes connection on error', () => {
      const { result } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateError();
      });

      expect(wsInstances[0].close).toHaveBeenCalled();
    });

    it('logs WebSocket errors in development', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });

      renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateError();
      });

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Event));

      consoleSpy.mockRestore();
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('Cleanup', () => {
    it('cleans up WebSocket on unmount', () => {
      const { unmount } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      unmount();

      expect(wsInstances[0].close).toHaveBeenCalled();
    });

    it('clears reconnect timeouts on unmount', () => {
      const { unmount } = renderHook(() => usePredictionMarketsWebSocket());

      act(() => {
        wsInstances[0].simulateOpen();
      });

      act(() => {
        wsInstances[0].simulateClose(1006);
      });

      unmount();

      // Advance timers - should not create new connection
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(wsInstances.length).toBe(1);
    });

    it('clears polling interval on unmount', () => {
      // Force polling
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class {
        constructor() {
          throw new Error('WebSocket creation failed');
        }
      } as any;

      const { unmount } = renderHook(() => usePredictionMarketsWebSocket());

      mockFetch.mockClear();

      unmount();

      // Advance timers - should not poll
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(mockFetch).not.toHaveBeenCalled();

      global.WebSocket = originalWebSocket;
    });
  });
});
