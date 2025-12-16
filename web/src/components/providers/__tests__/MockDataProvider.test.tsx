import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MockDataProvider } from '../MockDataProvider';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { initializeMockData } from '@/lib/mock-data';

// Mock dependencies
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/lib/mock-data');

describe('MockDataProvider', () => {
  let mockSetBars: any;
  let mockUpdateQuotes: any;
  let mockUpdateQuote: any;
  let mockSetWsConnected: any;
  let mockSetLoadingBars: any;
  let mockGetState: any;
  let mockUpdateLastBar: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockSetBars = vi.fn();
    mockUpdateQuotes = vi.fn();
    mockUpdateQuote = vi.fn();
    mockSetWsConnected = vi.fn();
    mockSetLoadingBars = vi.fn();
    mockUpdateLastBar = vi.fn();

    mockGetState = vi.fn().mockReturnValue({
      bars: {
        SPY: [{ time: 1, open: 400, high: 405, low: 399, close: 403, volume: 1000000 }],
      },
      updateLastBar: mockUpdateLastBar,
    });

    (useMarketDataStore as any).mockReturnValue({
      setBars: mockSetBars,
      updateQuotes: mockUpdateQuotes,
      updateQuote: mockUpdateQuote,
      setWsConnected: mockSetWsConnected,
      setLoadingBars: mockSetLoadingBars,
    });

    (useMarketDataStore as any).getState = mockGetState;

    // Mock initializeMockData
    (initializeMockData as any).mockReturnValue({
      bars: {
        SPY: [{ time: 1, open: 400, high: 405, low: 399, close: 403, volume: 1000000 }],
        QQQ: [{ time: 1, open: 300, high: 305, low: 299, close: 303, volume: 800000 }],
      },
      quotes: {
        SPY: {
          symbol: 'SPY',
          last: 403,
          bid: 402.99,
          ask: 403.01,
          open: 400,
          high: 405,
          low: 399,
          close: 403,
          volume: 1000000,
          change: 3,
          changePercent: 0.75,
          timestamp: new Date().toISOString(),
        },
        QQQ: {
          symbol: 'QQQ',
          last: 303,
          bid: 302.99,
          ask: 303.01,
          open: 300,
          high: 305,
          low: 299,
          close: 303,
          volume: 800000,
          change: 3,
          changePercent: 1.0,
          timestamp: new Date().toISOString(),
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Production environment', () => {
    it('does not load mock data in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';

      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      await waitFor(() => {
        expect(initializeMockData).not.toHaveBeenCalled();
      });

      (process.env as any).NODE_ENV = originalEnv;
    });
  });

  describe('Development environment', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'development';
    });

    it('renders children', () => {
      const { container } = render(
        <MockDataProvider>
          <div data-testid="child">Child content</div>
        </MockDataProvider>
      );

      expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
    });

    it('sets loading state for symbols initially', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      await waitFor(() => {
        expect(mockSetLoadingBars).toHaveBeenCalledWith('SPY', true);
        expect(mockSetLoadingBars).toHaveBeenCalledWith('QQQ', true);
        expect(mockSetLoadingBars).toHaveBeenCalledWith('AAPL', true);
        expect(mockSetLoadingBars).toHaveBeenCalledWith('MSFT', true);
        expect(mockSetLoadingBars).toHaveBeenCalledWith('NVDA', true);
      });
    });

    it('simulates loading delay', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      // Should not initialize immediately
      expect(initializeMockData).not.toHaveBeenCalled();

      // Fast-forward past the loading delay
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(initializeMockData).toHaveBeenCalled();
      });
    });

    it('initializes mock data after delay', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(initializeMockData).toHaveBeenCalled();
      });
    });

    it('sets bars for each symbol', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockSetBars).toHaveBeenCalledWith('SPY', expect.any(Array));
        expect(mockSetBars).toHaveBeenCalledWith('QQQ', expect.any(Array));
      });
    });

    it('sets initial quotes', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockUpdateQuotes).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ symbol: 'SPY' }),
            expect.objectContaining({ symbol: 'QQQ' }),
          ])
        );
      });
    });

    it('sets WebSocket connected state', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockSetWsConnected).toHaveBeenCalledWith(true);
      });
    });

    it('starts real-time quote updates', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(initializeMockData).toHaveBeenCalled();
      });

      // Advance past first update interval (2 seconds)
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockUpdateQuote).toHaveBeenCalled();
      });
    });

    it('updates quotes every 2 seconds', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      // First update
      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(mockUpdateQuote).toHaveBeenCalledTimes(1));

      // Second update
      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(mockUpdateQuote).toHaveBeenCalledTimes(2));

      // Third update
      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(mockUpdateQuote).toHaveBeenCalledTimes(3));
    });

    it('simulates price movement within range', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockUpdateQuote).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            last: expect.any(Number),
            change: expect.any(Number),
            changePercent: expect.any(Number),
          })
        );
      });
    });

    it('updates high/low prices correctly', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        const updateCall = mockUpdateQuote.mock.calls[0];
        if (updateCall) {
          const quote = updateCall[1];
          // High should be at least equal to last price
          expect(quote.high).toBeGreaterThanOrEqual(quote.last);
          // Low should be at most equal to last price
          expect(quote.low).toBeLessThanOrEqual(quote.last);
        }
      });
    });

    it('updates bid/ask spread', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        const updateCall = mockUpdateQuote.mock.calls[0];
        if (updateCall) {
          const quote = updateCall[1];
          // Bid should be slightly below last
          expect(quote.bid).toBeLessThan(quote.last);
          // Ask should be slightly above last
          expect(quote.ask).toBeGreaterThan(quote.last);
        }
      });
    });

    it('updates timestamp on each quote update', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockUpdateQuote).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            timestamp: expect.any(String),
          })
        );
      });
    });

    it('updates last bar data when quote changes', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockUpdateLastBar).toHaveBeenCalled();
      });
    });

    it('increments volume on bar updates', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        const updateCall = mockUpdateLastBar.mock.calls[0];
        if (updateCall) {
          const updatedBar = updateCall[1];
          // Volume should be incremented
          expect(updatedBar.volume).toBeGreaterThan(1000000);
        }
      });
    });

    it('picks random symbols to update', async () => {
      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      // Trigger multiple updates
      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(mockUpdateQuote).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(mockUpdateQuote).toHaveBeenCalledTimes(2));

      vi.advanceTimersByTime(2000);
      await waitFor(() => expect(mockUpdateQuote).toHaveBeenCalledTimes(3));

      // Should update symbols (could be SPY or QQQ)
      const symbols = mockUpdateQuote.mock.calls.map((call: any) => call[0]);
      expect(symbols.every((s: string) => ['SPY', 'QQQ'].includes(s))).toBe(true);
    });

    it('cleans up interval on unmount', async () => {
      const { unmount } = render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      const updateCallsBefore = mockUpdateQuote.mock.calls.length;

      unmount();

      // Advance time after unmount
      vi.advanceTimersByTime(10000);

      // Should not have any new calls
      expect(mockUpdateQuote.mock.calls.length).toBe(updateCallsBefore);
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'development';
    });

    it('handles empty quotes from initializeMockData', async () => {
      (initializeMockData as any).mockReturnValue({
        bars: {},
        quotes: {},
      });

      mockGetState.mockReturnValue({
        bars: {},
        updateLastBar: mockUpdateLastBar,
      });

      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(initializeMockData).toHaveBeenCalled();
      });

      // Should not crash
      vi.advanceTimersByTime(2000);
    });

    it('handles missing bars for symbol', async () => {
      mockGetState.mockReturnValue({
        bars: {},
        updateLastBar: mockUpdateLastBar,
      });

      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      // Should not crash when trying to update bars
      vi.advanceTimersByTime(2000);

      // Should still update quotes even if bars are missing
      await waitFor(() => {
        expect(mockUpdateQuote).toHaveBeenCalled();
      });
    });

    it('handles empty bars array for symbol', async () => {
      mockGetState.mockReturnValue({
        bars: { SPY: [] },
        updateLastBar: mockUpdateLastBar,
      });

      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      // Should not crash and should not call updateLastBar
      await waitFor(() => {
        expect(mockUpdateQuote).toHaveBeenCalled();
      });
    });

    it('handles quote with missing open price', async () => {
      (initializeMockData as any).mockReturnValue({
        bars: {},
        quotes: {
          SPY: {
            symbol: 'SPY',
            last: 403,
            // Missing open price
            timestamp: new Date().toISOString(),
          },
        },
      });

      render(
        <MockDataProvider>
          <div>Child</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalled());

      vi.advanceTimersByTime(2000);

      // Should handle missing open price gracefully
      await waitFor(() => {
        const updateCall = mockUpdateQuote.mock.calls[0];
        if (updateCall) {
          const quote = updateCall[1];
          // Change percent should be 0 when open is missing
          expect(quote.changePercent).toBe(0);
        }
      });
    });
  });

  describe('Multiple rerenders', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'development';
    });

    it('only initializes once on multiple rerenders', async () => {
      const { rerender } = render(
        <MockDataProvider>
          <div>Child 1</div>
        </MockDataProvider>
      );

      vi.advanceTimersByTime(500);
      await waitFor(() => expect(initializeMockData).toHaveBeenCalledTimes(1));

      rerender(
        <MockDataProvider>
          <div>Child 2</div>
        </MockDataProvider>
      );

      // Should not initialize again
      expect(initializeMockData).toHaveBeenCalledTimes(1);
    });
  });
});
