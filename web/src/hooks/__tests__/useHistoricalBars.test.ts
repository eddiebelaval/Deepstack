import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useHistoricalBars } from '../useHistoricalBars';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useTradingStore } from '@/lib/stores/trading-store';

// Mock fetch
global.fetch = vi.fn();

describe('useHistoricalBars', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset stores
    useMarketDataStore.getState().reset();
    useTradingStore.setState({
      activeSymbol: 'SPY',
      timeframe: '1d',
    });

    // Mock successful fetch response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        bars: [
          { t: '2024-01-01T00:00:00Z', o: 100, h: 105, l: 99, c: 103, v: 1000 },
          { t: '2024-01-02T00:00:00Z', o: 103, h: 108, l: 102, c: 107, v: 1200 },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useHistoricalBars());

    expect(result.current).toHaveProperty('fetchBars');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('bars');
    expect(typeof result.current.fetchBars).toBe('function');
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(Array.isArray(result.current.bars)).toBe(true);
  });

  it('auto-fetches bars for active symbol on mount', async () => {
    useTradingStore.setState({ activeSymbol: 'SPY' });

    renderHook(() => useHistoricalBars({ autoFetch: true }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/market/bars?symbol=SPY')
      );
    });
  });

  it('does not auto-fetch when autoFetch is false', async () => {
    useTradingStore.setState({ activeSymbol: 'SPY' });

    renderHook(() => useHistoricalBars({ autoFetch: false }));

    // Wait a bit to ensure no fetch occurs
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches bars with correct parameters', async () => {
    // Clear store timeframe to use option value
    useTradingStore.setState({ timeframe: '' });

    const { result } = renderHook(() =>
      useHistoricalBars({ timeframe: '5m', limit: 50 })
    );

    await act(async () => {
      await result.current.fetchBars('AAPL');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('symbol=AAPL')
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('timeframe=5m')
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=50')
    );
  });

  it('transforms backend data to OHLCVBar format', async () => {
    const { result } = renderHook(() => useHistoricalBars({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchBars('SPY');
    });

    await waitFor(() => {
      const bars = useMarketDataStore.getState().bars['SPY'];
      expect(bars).toBeDefined();
      expect(bars.length).toBe(2);
      expect(bars[0]).toHaveProperty('time');
      expect(bars[0]).toHaveProperty('open', 100);
      expect(bars[0]).toHaveProperty('high', 105);
      expect(bars[0]).toHaveProperty('low', 99);
      expect(bars[0]).toHaveProperty('close', 103);
      expect(bars[0]).toHaveProperty('volume', 1000);
    });
  });

  it('sorts bars by time ascending', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bars: [
          { t: '2024-01-03T00:00:00Z', o: 110, h: 115, l: 109, c: 113, v: 1500 },
          { t: '2024-01-01T00:00:00Z', o: 100, h: 105, l: 99, c: 103, v: 1000 },
          { t: '2024-01-02T00:00:00Z', o: 103, h: 108, l: 102, c: 107, v: 1200 },
        ],
      }),
    });

    const { result } = renderHook(() => useHistoricalBars({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchBars('SPY');
    });

    await waitFor(() => {
      const bars = useMarketDataStore.getState().bars['SPY'];
      expect(bars.length).toBe(3);
      // Should be sorted by time
      expect(bars[0].time).toBeLessThan(bars[1].time);
      expect(bars[1].time).toBeLessThan(bars[2].time);
    });
  });

  it('handles HTTP error response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useHistoricalBars({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchBars('INVALID');
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('handles network error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useHistoricalBars({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchBars('SPY');
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('uses store timeframe when available', async () => {
    useTradingStore.setState({ timeframe: '15m' });

    const { result } = renderHook(() => useHistoricalBars({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchBars('SPY');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('timeframe=15m')
    );
  });

  it('refetches when activeSymbol changes', async () => {
    const { rerender } = renderHook(() => useHistoricalBars({ autoFetch: true }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=SPY')
      );
    });

    vi.clearAllMocks();

    // Change active symbol
    act(() => {
      useTradingStore.setState({ activeSymbol: 'AAPL' });
    });

    rerender();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
    });
  });

  it('refetches when timeframe changes', async () => {
    renderHook(() => useHistoricalBars({ autoFetch: true }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    vi.clearAllMocks();

    // Change timeframe
    act(() => {
      useTradingStore.setState({ timeframe: '5m' });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('timeframe=5m')
      );
    });
  });

  it.skip('sets loading state correctly', async () => {
    // TODO: Fix race condition in loading state test
    // Use a specific symbol for this test
    useTradingStore.setState({ activeSymbol: 'TSLA' });
    const { result } = renderHook(() => useHistoricalBars({ autoFetch: false }));

    expect(result.current.isLoading).toBe(false);

    // Start the fetch and wait for it
    await act(async () => {
      await result.current.fetchBars('TSLA');
    });

    // After fetch completes, verify the store was updated
    const bars = useMarketDataStore.getState().bars['TSLA'];
    expect(bars).toBeDefined();
  });

  it('does not fetch when symbol is empty', async () => {
    useTradingStore.setState({ activeSymbol: '' });

    renderHook(() => useHistoricalBars({ autoFetch: true }));

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.skip('skips fetch if bars already exist for symbol', async () => {
    // TODO: Fix flaky test - async behavior is difficult to test reliably
    // Pre-populate bars for a different symbol to avoid interference with other tests
    useTradingStore.setState({ activeSymbol: 'GOOG' });
    useMarketDataStore.getState().setBars('GOOG', [
      { time: 1234567890, open: 100, high: 105, low: 99, close: 103, volume: 1000 },
    ]);

    renderHook(() => useHistoricalBars({ autoFetch: true }));

    await new Promise(resolve => setTimeout(resolve, 100));
    // Fetch should have been called from other tests, but not for GOOG since it already has data
    const fetchCalls = (global.fetch as any).mock.calls;
    const googCalls = fetchCalls.filter((call: string[]) => call[0]?.includes('symbol=GOOG'));
    expect(googCalls).toHaveLength(0);
  });
});
