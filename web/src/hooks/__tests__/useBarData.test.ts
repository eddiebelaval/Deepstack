import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
  useBarData,
  useMultipleBarData,
  usePrefetchBars,
  useInvalidateBarData,
  barDataKeys,
  type BarData,
} from '../useBarData';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// Mock bar data
const mockBars: BarData[] = [
  { time: 1704067200, value: 48000 },
  { time: 1704153600, value: 49000 },
  { time: 1704240000, value: 50000 },
];

const mockApiResponse = {
  success: true,
  data: {
    bars: [
      { t: '2024-01-01T00:00:00Z', c: 48000 },
      { t: '2024-01-02T00:00:00Z', c: 49000 },
      { t: '2024-01-03T00:00:00Z', c: 50000 },
    ],
  },
};

describe('useBarData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query Key Factory', () => {
    it('generates correct query keys', () => {
      expect(barDataKeys.all).toEqual(['bars']);
      expect(barDataKeys.symbol('BTC', '1d')).toEqual(['bars', 'BTC', '1d']);
      expect(barDataKeys.symbol('ETH', '1h')).toEqual(['bars', 'ETH', '1h']);
    });
  });

  describe('useBarData - Single Symbol', () => {
    it('returns initial loading state', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('fetches and transforms bar data successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.bars).toHaveLength(3);
      expect(result.current.data?.bars[0]).toEqual({
        time: expect.any(Number),
        value: 48000,
      });
      expect(result.current.data?.isMock).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/market/bars?symbol=BTC&timeframe=1d&limit=365')
      );
    });

    it('handles API response variations', async () => {
      // Test different response format (without nested data)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          bars: [{ time: 1704067200, close: 48000 }],
        }),
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.bars[0].value).toBe(48000);
    });

    it('transforms timestamps correctly from string format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          bars: [{ t: '2024-01-01T00:00:00Z', c: 48000 }],
        }),
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const timestamp = result.current.data?.bars[0].time;
      expect(timestamp).toBe(Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000));
    });

    it('transforms timestamps correctly from number format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          bars: [{ time: 1704067200, close: 48000 }],
        }),
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.bars[0].time).toBe(1704067200);
    });

    it('detects mock data from API response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          bars: [{ t: '2024-01-01T00:00:00Z', c: 48000 }],
          meta: { isMock: true },
        }),
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.isMock).toBe(true);
    });

    it('handles HTTP errors', async () => {
      // Mock needs to return error for all retry attempts (initial + 2 retries = 3 calls)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.error?.message).toContain('HTTP 500');
      // Should have retried 2 times (3 total calls)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('handles network errors', async () => {
      // Mock needs to reject for all retry attempts
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.error?.message).toBe('Network error');
      // Should have retried 2 times (3 total calls)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does not fetch when symbol is null', () => {
      const { result } = renderHook(() => useBarData(null, '1d'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not fetch when enabled is false', () => {
      const { result } = renderHook(() => useBarData('BTC', '1d', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uses correct limit for different timeframes', async () => {
      const timeframes = [
        { timeframe: '1h', expectedLimit: 168 },
        { timeframe: '2h', expectedLimit: 168 },
        { timeframe: '4h', expectedLimit: 250 },
        { timeframe: '1d', expectedLimit: 365 },
        { timeframe: '1w', expectedLimit: 260 },
        { timeframe: '1mo', expectedLimit: 120 },
      ];

      for (const { timeframe, expectedLimit } of timeframes) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ bars: [] }),
        });

        renderHook(() => useBarData('BTC', timeframe), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`limit=${expectedLimit}`)
        );
      }
    });

    it('retries failed requests up to 2 times', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bars: [] }),
        });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 5000 }
      );

      // Should have tried 3 times total (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('encodes symbol in URL correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: [] }),
      });

      renderHook(() => useBarData('BTC/USD', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=BTC%2FUSD')
      );
    });
  });

  describe('useMultipleBarData', () => {
    it('fetches data for multiple symbols in parallel', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockApiResponse.data.bars }),
      });

      const { result } = renderHook(
        () => useMultipleBarData(['BTC', 'ETH'], '1d', ['#f59e0b', '#3b82f6']),
        { wrapper: createWrapper() }
      );

      // Wait for all queries to complete successfully
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
          expect(result.current.seriesData.length).toBe(2);
        },
        { timeout: 5000 }
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.seriesData[0].symbol).toBe('BTC');
      expect(result.current.seriesData[0].color).toBe('#f59e0b');
      expect(result.current.seriesData[1].symbol).toBe('ETH');
      expect(result.current.seriesData[1].color).toBe('#3b82f6');
    });

    it('uses default colors when not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockApiResponse.data.bars }),
      });

      const { result } = renderHook(() => useMultipleBarData(['BTC', 'ETH'], '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.seriesData[0].color).toBe('#f59e0b');
      expect(result.current.seriesData[1].color).toBe('#f59e0b');
    });

    it('filters out symbols with no data', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bars: mockApiResponse.data.bars }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bars: [] }),
        });

      const { result } = renderHook(() => useMultipleBarData(['BTC', 'ETH'], '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.seriesData).toHaveLength(1);
      expect(result.current.seriesData[0].symbol).toBe('BTC');
    });

    it('sets isError when any query fails', async () => {
      // First symbol succeeds, second fails (needs to fail for all retries)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bars: mockApiResponse.data.bars }),
        })
        .mockRejectedValue(new Error('Failed')); // Will be used for all retry attempts

      const { result } = renderHook(() => useMultipleBarData(['BTC', 'ETH'], '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it('detects mock data if any query returns mock', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bars: mockApiResponse.data.bars, meta: { isMock: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ bars: mockApiResponse.data.bars }),
        });

      const { result } = renderHook(() => useMultipleBarData(['BTC', 'ETH'], '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isMockData).toBe(true);
      });
    });

    it('marks all series as visible by default', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockApiResponse.data.bars }),
      });

      const { result } = renderHook(() => useMultipleBarData(['BTC', 'ETH'], '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.seriesData.forEach((series) => {
        expect(series.visible).toBe(true);
      });
    });

    it('returns individual query results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockApiResponse.data.bars }),
      });

      const { result } = renderHook(() => useMultipleBarData(['BTC', 'ETH'], '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.queries).toHaveLength(2);
      });

      await waitFor(() => {
        expect(result.current.queries[0].isSuccess).toBe(true);
      });

      expect(result.current.queries[1].isSuccess).toBe(true);
    });
  });

  describe('usePrefetchBars', () => {
    it('prefetches data without rendering', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockApiResponse.data.bars }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePrefetchBars(), { wrapper });

      await result.current.prefetch(['BTC', 'ETH'], '1d');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=BTC')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=ETH')
      );
    });

    it('prefetch uses correct stale time', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: [] }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePrefetchBars(), { wrapper });

      await result.current.prefetch(['BTC'], '1d');

      // Verify data is cached by checking subsequent hook doesn't fetch
      mockFetch.mockClear();

      renderHook(() => useBarData('BTC', '1d'), { wrapper });

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('useInvalidateBarData', () => {
    it('invalidates specific symbol and timeframe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockApiResponse.data.bars }),
      });

      const wrapper = createWrapper();

      // First fetch
      const { result: dataResult } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper,
      });

      await waitFor(() => {
        expect(dataResult.current.isSuccess).toBe(true);
      });

      mockFetch.mockClear();

      // Invalidate
      const { result: invalidateResult } = renderHook(() => useInvalidateBarData(), {
        wrapper,
      });

      invalidateResult.current.invalidate('BTC', '1d');

      // Should trigger refetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('invalidates all bar data when no parameters provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: mockApiResponse.data.bars }),
      });

      const wrapper = createWrapper();

      // Fetch multiple symbols
      renderHook(() => useBarData('BTC', '1d'), { wrapper });
      renderHook(() => useBarData('ETH', '1d'), { wrapper });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      mockFetch.mockClear();

      // Invalidate all
      const { result } = renderHook(() => useInvalidateBarData(), { wrapper });
      result.current.invalidate();

      // Should trigger refetch for both
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty bars array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ bars: [] }),
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.bars).toEqual([]);
    });

    it('handles bars with missing fields', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          bars: [
            { t: '2024-01-01T00:00:00Z' }, // Missing price
            { c: 48000 }, // Missing time
          ],
        }),
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.bars).toHaveLength(2);
      expect(result.current.data?.bars[0].value).toBe(0);
      expect(result.current.data?.bars[1].time).toBe(0);
    });

    it('handles malformed JSON response', async () => {
      // Mock needs to throw for all retry attempts
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useBarData('BTC', '1d'), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      // Should have retried 2 times (3 total calls)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
