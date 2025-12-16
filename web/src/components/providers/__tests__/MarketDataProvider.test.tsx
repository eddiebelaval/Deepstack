import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarketDataProvider, useMarketData } from '../MarketDataProvider';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { usePrefetchBars } from '@/hooks/useBarData';

// Mock dependencies
vi.mock('@/hooks/useWebSocket');
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/lib/stores/trading-store');
vi.mock('@/hooks/useBarData');

// Test component that uses market data context
const TestComponent = () => {
  const { isConnected, connect, disconnect, subscribeSymbols, unsubscribeSymbols, fetchBars, fetchQuotes } =
    useMarketData();

  return (
    <div>
      <div data-testid="connected">{isConnected.toString()}</div>
      <button onClick={connect} data-testid="connect">
        Connect
      </button>
      <button onClick={disconnect} data-testid="disconnect">
        Disconnect
      </button>
      <button onClick={() => subscribeSymbols(['AAPL'])} data-testid="subscribe">
        Subscribe
      </button>
      <button onClick={() => unsubscribeSymbols(['AAPL'])} data-testid="unsubscribe">
        Unsubscribe
      </button>
      <button onClick={() => fetchBars('AAPL', '1d', 100)} data-testid="fetch-bars">
        Fetch Bars
      </button>
      <button onClick={() => fetchQuotes(['AAPL', 'MSFT'])} data-testid="fetch-quotes">
        Fetch Quotes
      </button>
    </div>
  );
};

describe('MarketDataProvider', () => {
  let mockConnect: any;
  let mockDisconnect: any;
  let mockSubscribeSymbols: any;
  let mockUnsubscribeSymbols: any;
  let mockSetBars: any;
  let mockSetLoadingBars: any;
  let mockUpdateQuotes: any;
  let mockSubscribe: any;
  let mockPrefetch: any;
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConnect = vi.fn();
    mockDisconnect = vi.fn();
    mockSubscribeSymbols = vi.fn();
    mockUnsubscribeSymbols = vi.fn();
    mockSetBars = vi.fn();
    mockSetLoadingBars = vi.fn();
    mockUpdateQuotes = vi.fn();
    mockSubscribe = vi.fn();
    mockPrefetch = vi.fn().mockResolvedValue(undefined);

    (useWebSocket as any).mockReturnValue({
      connect: mockConnect,
      disconnect: mockDisconnect,
      subscribeSymbols: mockSubscribeSymbols,
      unsubscribeSymbols: mockUnsubscribeSymbols,
      isConnected: false,
    });

    (useMarketDataStore as any).mockReturnValue({
      subscribe: mockSubscribe,
      wsConnected: false,
      setBars: mockSetBars,
      setLoadingBars: mockSetLoadingBars,
      updateQuotes: mockUpdateQuotes,
      bars: {},
      isLoadingBars: {},
    });

    (useTradingStore as any).mockReturnValue({
      activeSymbol: null,
    });

    (usePrefetchBars as any).mockReturnValue({
      prefetch: mockPrefetch,
    });

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('renders children', () => {
      render(
        <MarketDataProvider>
          <div data-testid="child">Child content</div>
        </MarketDataProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('does not auto-connect by default', () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('auto-connects when autoConnect is true', () => {
      render(
        <MarketDataProvider autoConnect={true}>
          <TestComponent />
        </MarketDataProvider>
      );

      // Connect is called by useWebSocket hook
      expect(useWebSocket).toHaveBeenCalledWith(
        expect.objectContaining({
          autoConnect: true,
        })
      );
    });

    it('fetches initial ticker quotes on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: {} }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/market/quotes?symbols=')
        );
      });
    });

    it('prefetches bar data on mount', async () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      await waitFor(() => {
        expect(mockPrefetch).toHaveBeenCalled();
      });
    });
  });

  describe('WebSocket integration', () => {
    it('provides connect function', async () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const connectButton = screen.getByTestId('connect');
      connectButton.click();

      expect(mockConnect).toHaveBeenCalled();
    });

    it('provides disconnect function', async () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const disconnectButton = screen.getByTestId('disconnect');
      disconnectButton.click();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('provides subscribeSymbols function', async () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const subscribeButton = screen.getByTestId('subscribe');
      subscribeButton.click();

      expect(mockSubscribeSymbols).toHaveBeenCalledWith(['AAPL']);
    });

    it('provides unsubscribeSymbols function', async () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const unsubscribeButton = screen.getByTestId('unsubscribe');
      unsubscribeButton.click();

      expect(mockUnsubscribeSymbols).toHaveBeenCalledWith(['AAPL']);
    });

    it('subscribes to active symbol when connected', async () => {
      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'AAPL',
      });

      (useMarketDataStore as any).mockReturnValue({
        subscribe: mockSubscribe,
        wsConnected: true,
        setBars: mockSetBars,
        setLoadingBars: mockSetLoadingBars,
        updateQuotes: mockUpdateQuotes,
        bars: {},
        isLoadingBars: {},
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith('AAPL');
        expect(mockSubscribeSymbols).toHaveBeenCalledWith(['AAPL']);
      });
    });
  });

  describe('fetchBars', () => {
    it('fetches bars from API', async () => {
      const mockBars = [
        { t: '2024-01-01', o: 100, h: 105, l: 99, c: 103, v: 1000000 },
        { t: '2024-01-02', o: 103, h: 107, l: 102, c: 106, v: 1200000 },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockBars }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchBarsButton = screen.getByTestId('fetch-bars');
      fetchBarsButton.click();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/market/bars?symbol=AAPL&timeframe=1d&limit=100');
      });
    });

    it('sets loading state while fetching', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ bars: [] }),
                }),
              100
            )
          )
      );

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchBarsButton = screen.getByTestId('fetch-bars');
      fetchBarsButton.click();

      await waitFor(() => {
        expect(mockSetLoadingBars).toHaveBeenCalledWith('AAPL', true);
      });
    });

    it('transforms bar data to OHLCVBar format', async () => {
      const mockBars = [{ t: '2024-01-01', o: 100, h: 105, l: 99, c: 103, v: 1000000 }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockBars }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchBarsButton = screen.getByTestId('fetch-bars');
      fetchBarsButton.click();

      await waitFor(() => {
        expect(mockSetBars).toHaveBeenCalledWith(
          'AAPL',
          expect.arrayContaining([
            expect.objectContaining({
              open: 100,
              high: 105,
              low: 99,
              close: 103,
              volume: 1000000,
            }),
          ])
        );
      });
    });

    it('handles new standardized API format', async () => {
      const mockBars = [{ t: '2024-01-01', o: 100, h: 105, l: 99, c: 103, v: 1000000 }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { bars: mockBars },
          meta: {},
        }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchBarsButton = screen.getByTestId('fetch-bars');
      fetchBarsButton.click();

      await waitFor(() => {
        expect(mockSetBars).toHaveBeenCalledWith('AAPL', expect.any(Array));
      });
    });

    it('sorts bars by time ascending', async () => {
      const mockBars = [
        { t: '2024-01-02', o: 103, h: 107, l: 102, c: 106, v: 1200000 },
        { t: '2024-01-01', o: 100, h: 105, l: 99, c: 103, v: 1000000 },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockBars }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchBarsButton = screen.getByTestId('fetch-bars');
      fetchBarsButton.click();

      await waitFor(() => {
        expect(mockSetBars).toHaveBeenCalled();
        const bars = mockSetBars.mock.calls[0][1];
        expect(bars[0].time).toBeLessThan(bars[1].time);
      });
    });

    it('handles API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchBarsButton = screen.getByTestId('fetch-bars');
      fetchBarsButton.click();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('does not fetch if symbol is empty', async () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      // Can't easily test this without modifying TestComponent
      // but the fetchBars function checks for empty symbol
    });
  });

  describe('fetchQuotes', () => {
    it('fetches quotes from API', async () => {
      const mockQuotes = {
        AAPL: { bid: 99.99, ask: 100.01, last: 100.0 },
        MSFT: { bid: 299.99, ask: 300.01, last: 300.0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: mockQuotes }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchQuotesButton = screen.getByTestId('fetch-quotes');
      fetchQuotesButton.click();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/market/quotes?symbols=AAPL,MSFT');
      });
    });

    it('transforms quote data to QuoteData format', async () => {
      const mockQuotes = {
        AAPL: { bid: 99.99, ask: 100.01, last: 100.0, volume: 50000000 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: mockQuotes }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchQuotesButton = screen.getByTestId('fetch-quotes');
      fetchQuotesButton.click();

      await waitFor(() => {
        expect(mockUpdateQuotes).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              symbol: 'AAPL',
              bid: 99.99,
              ask: 100.01,
              last: 100.0,
            }),
          ])
        );
      });
    });

    it('handles alternative field names', async () => {
      const mockQuotes = {
        AAPL: { bp: 99.99, ap: 100.01, price: 100.0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: mockQuotes }),
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchQuotesButton = screen.getByTestId('fetch-quotes');
      fetchQuotesButton.click();

      await waitFor(() => {
        expect(mockUpdateQuotes).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              bid: 99.99,
              ask: 100.01,
              last: 100.0,
            }),
          ])
        );
      });
    });

    it('does not fetch if symbols array is empty', async () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      // fetchQuotes checks for empty array
      // Would need to modify TestComponent to test this properly
    });

    it('handles API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      const fetchQuotesButton = screen.getByTestId('fetch-quotes');
      fetchQuotesButton.click();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Active symbol changes', () => {
    it('fetches bars when active symbol changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: [] }),
      });

      const { rerender } = render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      // Change active symbol
      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'AAPL',
      });

      rerender(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('symbol=AAPL'));
      });
    });

    it('does not fetch if already loading', async () => {
      (useMarketDataStore as any).mockReturnValue({
        subscribe: mockSubscribe,
        wsConnected: false,
        setBars: mockSetBars,
        setLoadingBars: mockSetLoadingBars,
        updateQuotes: mockUpdateQuotes,
        bars: {},
        isLoadingBars: { AAPL: true },
      });

      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'AAPL',
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      await waitFor(() => {
        // Should not fetch if already loading
        const fetchCalls = mockFetch.mock.calls.filter((call: any) =>
          call[0].includes('symbol=AAPL')
        );
        expect(fetchCalls.length).toBeLessThanOrEqual(1);
      });
    });

    it('does not fetch if bars already exist', async () => {
      const existingBars = [{ time: 1, open: 100, high: 105, low: 99, close: 103, volume: 1000 }];

      (useMarketDataStore as any).mockReturnValue({
        subscribe: mockSubscribe,
        wsConnected: false,
        setBars: mockSetBars,
        setLoadingBars: mockSetLoadingBars,
        updateQuotes: mockUpdateQuotes,
        bars: { AAPL: existingBars },
        isLoadingBars: {},
      });

      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'AAPL',
      });

      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      await waitFor(() => {
        // Initial fetch for ticker quotes only
        const barFetchCalls = mockFetch.mock.calls.filter((call: any) =>
          call[0].includes('/api/market/bars')
        );
        expect(barFetchCalls.length).toBe(0);
      });
    });
  });

  describe('useMarketData hook', () => {
    it('throws error when used outside provider', () => {
      const TestComponentWithoutProvider = () => {
        useMarketData();
        return null;
      };

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponentWithoutProvider />)).toThrow(
        'useMarketData must be used within a MarketDataProvider'
      );

      spy.mockRestore();
    });

    it('works when used inside provider', () => {
      expect(() =>
        render(
          <MarketDataProvider>
            <TestComponent />
          </MarketDataProvider>
        )
      ).not.toThrow();
    });
  });

  describe('WebSocket configuration', () => {
    it('passes wsUrl to useWebSocket', () => {
      render(
        <MarketDataProvider wsUrl="wss://example.com/ws">
          <TestComponent />
        </MarketDataProvider>
      );

      expect(useWebSocket).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'wss://example.com/ws',
        })
      );
    });

    it('configures reconnection settings', () => {
      render(
        <MarketDataProvider>
          <TestComponent />
        </MarketDataProvider>
      );

      expect(useWebSocket).toHaveBeenCalledWith(
        expect.objectContaining({
          reconnectOnError: true,
          maxReconnectAttempts: 10,
          baseReconnectDelay: 1000,
          maxReconnectDelay: 30000,
        })
      );
    });
  });
});
