import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useScreenerStore } from '../screener-store';
import { act } from '@testing-library/react';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('useScreenerStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useScreenerStore.setState({
        filters: {
          sortBy: 'volume',
          sortOrder: 'desc',
        },
        results: [],
        isLoading: false,
        error: null,
      });
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has default filters', () => {
      const state = useScreenerStore.getState();
      expect(state.filters.sortBy).toBe('volume');
      expect(state.filters.sortOrder).toBe('desc');
      expect(state.filters.marketCapMin).toBeUndefined();
      expect(state.filters.marketCapMax).toBeUndefined();
      expect(state.filters.peRatioMin).toBeUndefined();
      expect(state.filters.peRatioMax).toBeUndefined();
      expect(state.filters.volumeMin).toBeUndefined();
      expect(state.filters.priceMin).toBeUndefined();
      expect(state.filters.priceMax).toBeUndefined();
      expect(state.filters.sector).toBeUndefined();
    });

    it('has empty results array', () => {
      const state = useScreenerStore.getState();
      expect(state.results).toEqual([]);
    });

    it('is not loading', () => {
      const state = useScreenerStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('has no error', () => {
      const state = useScreenerStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setFilter', () => {
    it('sets market cap minimum filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('marketCapMin', 1000000000);
      });

      expect(useScreenerStore.getState().filters.marketCapMin).toBe(1000000000);
    });

    it('sets market cap maximum filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('marketCapMax', 10000000000);
      });

      expect(useScreenerStore.getState().filters.marketCapMax).toBe(10000000000);
    });

    it('sets PE ratio minimum filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('peRatioMin', 10);
      });

      expect(useScreenerStore.getState().filters.peRatioMin).toBe(10);
    });

    it('sets PE ratio maximum filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('peRatioMax', 25);
      });

      expect(useScreenerStore.getState().filters.peRatioMax).toBe(25);
    });

    it('sets volume minimum filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('volumeMin', 5000000);
      });

      expect(useScreenerStore.getState().filters.volumeMin).toBe(5000000);
    });

    it('sets price minimum filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('priceMin', 50);
      });

      expect(useScreenerStore.getState().filters.priceMin).toBe(50);
    });

    it('sets price maximum filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('priceMax', 500);
      });

      expect(useScreenerStore.getState().filters.priceMax).toBe(500);
    });

    it('sets sector filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('sector', 'Technology');
      });

      expect(useScreenerStore.getState().filters.sector).toBe('Technology');
    });

    it('sets sortBy filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('sortBy', 'marketCap');
      });

      expect(useScreenerStore.getState().filters.sortBy).toBe('marketCap');
    });

    it('sets sortOrder filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('sortOrder', 'asc');
      });

      expect(useScreenerStore.getState().filters.sortOrder).toBe('asc');
    });

    it('preserves other filters when setting one filter', () => {
      act(() => {
        useScreenerStore.getState().setFilter('marketCapMin', 1000000000);
        useScreenerStore.getState().setFilter('sector', 'Healthcare');
      });

      const filters = useScreenerStore.getState().filters;
      expect(filters.marketCapMin).toBe(1000000000);
      expect(filters.sector).toBe('Healthcare');
      expect(filters.sortBy).toBe('volume');
    });
  });

  describe('resetFilters', () => {
    it('resets filters to default values', () => {
      act(() => {
        useScreenerStore.getState().setFilter('marketCapMin', 1000000000);
        useScreenerStore.getState().setFilter('sector', 'Technology');
        useScreenerStore.getState().setFilter('sortBy', 'marketCap');
        useScreenerStore.getState().resetFilters();
      });

      const filters = useScreenerStore.getState().filters;
      expect(filters.marketCapMin).toBeUndefined();
      expect(filters.sector).toBeUndefined();
      expect(filters.sortBy).toBe('volume');
      expect(filters.sortOrder).toBe('desc');
    });

    it('clears results when resetting filters', () => {
      act(() => {
        useScreenerStore.setState({ results: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 150,
            change: 2.5,
            changePercent: 1.7,
            volume: 50000000,
            marketCap: 2500000000000,
            peRatio: 28,
            sector: 'Technology',
          },
        ]});
        useScreenerStore.getState().resetFilters();
      });

      expect(useScreenerStore.getState().results).toEqual([]);
    });

    it('clears error when resetting filters', () => {
      act(() => {
        useScreenerStore.setState({ error: 'Previous error' });
        useScreenerStore.getState().resetFilters();
      });

      expect(useScreenerStore.getState().error).toBeNull();
    });
  });

  describe('runScreener', () => {
    it('sets loading state when starting', async () => {
      const mockFetch = vi.fn(() =>
        new Promise<Response>(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response), 100))
      );
      global.fetch = mockFetch as unknown as typeof fetch;

      const promise = act(async () => {
        await useScreenerStore.getState().runScreener();
      });

      // Check loading state immediately
      expect(useScreenerStore.getState().isLoading).toBe(true);

      await promise;
    });

    it('clears error when starting new screener run', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response));
      global.fetch = mockFetch;

      await act(async () => {
        useScreenerStore.setState({ error: 'Previous error' });
        await useScreenerStore.getState().runScreener();
      });

      expect(useScreenerStore.getState().error).toBeNull();
    });

    it('calls API with correct query parameters', async () => {
      const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);
      global.fetch = mockFetch;

      await act(async () => {
        useScreenerStore.getState().setFilter('marketCapMin', 1000000000);
        useScreenerStore.getState().setFilter('sector', 'Technology');
        useScreenerStore.getState().setFilter('sortBy', 'marketCap');
        await useScreenerStore.getState().runScreener();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/screener?')
      );

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('marketCapMin=1000000000');
      expect(url).toContain('sector=Technology');
      expect(url).toContain('sortBy=marketCap');
      expect(url).toContain('sortOrder=desc');
    });

    it('updates results on successful API call', async () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150,
          change: 2.5,
          changePercent: 1.7,
          volume: 50000000,
          marketCap: 2500000000000,
          peRatio: 28,
          sector: 'Technology',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          price: 300,
          change: 5.0,
          changePercent: 1.7,
          volume: 30000000,
          marketCap: 2200000000000,
          peRatio: 32,
          sector: 'Technology',
        },
      ];

      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => ({ results: mockResults }),
      } as Response));
      global.fetch = mockFetch;

      await act(async () => {
        await useScreenerStore.getState().runScreener();
      });

      expect(useScreenerStore.getState().results).toEqual(mockResults);
      expect(useScreenerStore.getState().isLoading).toBe(false);
    });

    it('sets error state on API failure', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: false,
      } as Response));
      global.fetch = mockFetch;

      await act(async () => {
        await useScreenerStore.getState().runScreener();
      });

      expect(useScreenerStore.getState().error).toBe('Screener request failed');
      expect(useScreenerStore.getState().isLoading).toBe(false);
    });

    it('handles network errors gracefully', async () => {
      const mockFetch = vi.fn(() => Promise.reject(new Error('Network error')));
      global.fetch = mockFetch;

      await act(async () => {
        await useScreenerStore.getState().runScreener();
      });

      expect(useScreenerStore.getState().error).toBe('Network error');
      expect(useScreenerStore.getState().isLoading).toBe(false);
    });

    it('handles empty results', async () => {
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response));
      global.fetch = mockFetch;

      await act(async () => {
        await useScreenerStore.getState().runScreener();
      });

      expect(useScreenerStore.getState().results).toEqual([]);
      expect(useScreenerStore.getState().error).toBeNull();
    });

    it('includes all filter parameters when set', async () => {
      const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);
      global.fetch = mockFetch;

      await act(async () => {
        useScreenerStore.getState().setFilter('marketCapMin', 1000000000);
        useScreenerStore.getState().setFilter('marketCapMax', 10000000000);
        useScreenerStore.getState().setFilter('peRatioMin', 10);
        useScreenerStore.getState().setFilter('peRatioMax', 25);
        useScreenerStore.getState().setFilter('volumeMin', 5000000);
        useScreenerStore.getState().setFilter('priceMin', 50);
        useScreenerStore.getState().setFilter('priceMax', 500);
        useScreenerStore.getState().setFilter('sector', 'Technology');
        await useScreenerStore.getState().runScreener();
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('marketCapMin=1000000000');
      expect(url).toContain('marketCapMax=10000000000');
      expect(url).toContain('peRatioMin=10');
      expect(url).toContain('peRatioMax=25');
      expect(url).toContain('volumeMin=5000000');
      expect(url).toContain('priceMin=50');
      expect(url).toContain('priceMax=500');
      expect(url).toContain('sector=Technology');
    });
  });
});
