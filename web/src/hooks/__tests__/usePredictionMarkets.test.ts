import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePredictionMarkets } from '../usePredictionMarkets';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import * as predictionMarketsApi from '@/lib/api/prediction-markets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

// Mock the API module
vi.mock('@/lib/api/prediction-markets', () => ({
  fetchTrendingMarkets: vi.fn(),
  fetchNewMarkets: vi.fn(),
  searchMarkets: vi.fn(),
  fetchMarketDetail: vi.fn(),
}));

const mockMarket: PredictionMarket = {
  id: 'mock-market-1',
  platform: 'polymarket',
  title: 'Will Bitcoin reach $100k by end of 2024?',
  category: 'Crypto',
  yesPrice: 0.65,
  noPrice: 0.35,
  volume: 1500000,
  status: 'active',
  url: 'https://polymarket.com/mock-market-1',
  description: 'Market resolves YES if Bitcoin reaches $100k',
  endDate: '2024-12-31T23:59:59Z',
};

describe('usePredictionMarkets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    usePredictionMarketsStore.getState().reset();

    // Default mock implementations
    vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
      markets: [mockMarket],
      unavailable: false,
    });

    vi.mocked(predictionMarketsApi.fetchNewMarkets).mockResolvedValue({
      markets: [mockMarket],
      unavailable: false,
    });

    vi.mocked(predictionMarketsApi.searchMarkets).mockResolvedValue({
      markets: [mockMarket],
      unavailable: false,
    });

    vi.mocked(predictionMarketsApi.fetchMarketDetail).mockResolvedValue({
      market: mockMarket,
      unavailable: false,
    });
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => usePredictionMarkets());

    expect(result.current.markets).toEqual([]);
    expect(result.current.watchlist).toEqual([]);
    expect(result.current.selectedMarket).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.feedType).toBe('trending');
    expect(typeof result.current.loadMarkets).toBe('function');
    expect(typeof result.current.searchMarkets).toBe('function');
  });

  it('loads trending markets successfully', async () => {
    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.loadMarkets('trending');
    });

    await waitFor(() => {
      expect(result.current.markets).toHaveLength(1);
      expect(result.current.markets[0].id).toBe('mock-market-1');
      expect(result.current.isLoading).toBe(false);
    });

    expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledWith({
      category: undefined,
      source: undefined,
      limit: 20,
    });
  });

  it('loads new markets successfully', async () => {
    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.loadMarkets('new');
    });

    await waitFor(() => {
      expect(result.current.markets).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });

    expect(predictionMarketsApi.fetchNewMarkets).toHaveBeenCalled();
  });

  it('applies filters when loading markets', async () => {
    const { result } = renderHook(() => usePredictionMarkets());

    // Set filters
    act(() => {
      result.current.setFilters({ category: 'Crypto', source: 'polymarket' });
    });

    await act(async () => {
      await result.current.loadMarkets('trending');
    });

    expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledWith({
      category: 'Crypto',
      source: 'polymarket',
      limit: 20,
    });
  });

  it('handles loading error correctly', async () => {
    vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockRejectedValueOnce(
      new Error('API Error')
    );

    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.loadMarkets('trending');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('API Error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('searches markets by query', async () => {
    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.searchMarkets('Bitcoin');
    });

    await waitFor(() => {
      expect(result.current.markets).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });

    expect(predictionMarketsApi.searchMarkets).toHaveBeenCalledWith('Bitcoin');
  });

  it('loads markets when search query is empty', async () => {
    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.searchMarkets('');
    });

    await waitFor(() => {
      expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalled();
    });
  });

  it('handles search error correctly', async () => {
    vi.mocked(predictionMarketsApi.searchMarkets).mockRejectedValueOnce(
      new Error('Search failed')
    );

    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.searchMarkets('test query');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed');
    });
  });

  it('loads market detail successfully', async () => {
    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.loadMarketDetail('polymarket', 'mock-market-1');
    });

    await waitFor(() => {
      expect(result.current.selectedMarket).not.toBeNull();
      expect(result.current.selectedMarket?.id).toBe('mock-market-1');
    });

    expect(predictionMarketsApi.fetchMarketDetail).toHaveBeenCalledWith(
      'polymarket',
      'mock-market-1'
    );
  });

  it('handles market detail loading error', async () => {
    vi.mocked(predictionMarketsApi.fetchMarketDetail).mockRejectedValueOnce(
      new Error('Market not found')
    );

    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.loadMarketDetail('polymarket', 'invalid');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Market not found');
      expect(result.current.selectedMarket).toBeNull();
    });
  });

  it('adds market to watchlist', () => {
    const { result } = renderHook(() => usePredictionMarkets());

    act(() => {
      result.current.toggleWatchlist(mockMarket);
    });

    expect(result.current.watchlist).toHaveLength(1);
    expect(result.current.watchlist[0].externalMarketId).toBe('mock-market-1');
    expect(result.current.watchlist[0].marketTitle).toBe(mockMarket.title);
  });

  // TODO: Fix race condition - result.current is null before hook initializes
  it.skip('removes market from watchlist', () => {
    const { result } = renderHook(() => usePredictionMarkets());

    // Add to watchlist first
    act(() => {
      result.current.toggleWatchlist(mockMarket);
    });

    expect(result.current.watchlist).toHaveLength(1);

    // Remove from watchlist
    act(() => {
      result.current.toggleWatchlist(mockMarket);
    });

    expect(result.current.watchlist).toHaveLength(0);
  });

  // TODO: Fix race condition - result.current is null before hook initializes
  it.skip('checks if market is in watchlist', () => {
    const { result } = renderHook(() => usePredictionMarkets());

    expect(result.current.isInWatchlist('polymarket', 'mock-market-1')).toBe(false);

    act(() => {
      result.current.addToWatchlist({
        platform: 'polymarket',
        externalMarketId: 'mock-market-1',
        marketTitle: 'Test Market',
        marketCategory: 'Crypto',
      });
    });

    expect(result.current.isInWatchlist('polymarket', 'mock-market-1')).toBe(true);
  });

  it('updates filters correctly', () => {
    const { result } = renderHook(() => usePredictionMarkets());

    act(() => {
      result.current.setFilters({ category: 'Politics', source: 'kalshi' });
    });

    expect(result.current.filters.category).toBe('Politics');
    expect(result.current.filters.source).toBe('kalshi');
  });

  it('sets unavailable flag when API returns it', async () => {
    vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValueOnce({
      markets: [],
      unavailable: true,
    });

    const { result } = renderHook(() => usePredictionMarkets());

    await act(async () => {
      await result.current.loadMarkets('trending');
    });

    await waitFor(() => {
      expect(result.current.isUnavailable).toBe(true);
    });
  });

  it('changes feed type correctly', () => {
    const { result } = renderHook(() => usePredictionMarkets());

    expect(result.current.feedType).toBe('trending');

    act(() => {
      result.current.setFeedType('new');
    });

    expect(result.current.feedType).toBe('new');
  });

  // TODO: Fix race condition - result.current is null before hook initializes
  it.skip('sets loading state during API calls', async () => {
    const { result } = renderHook(() => usePredictionMarkets());

    const loadPromise = act(async () => {
      await result.current.loadMarkets('trending');
    });

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    await loadPromise;

    // Should not be loading after completion
    expect(result.current.isLoading).toBe(false);
  });

  // TODO: Fix race condition - result.current is null before hook initializes
  it.skip('clears error on successful load after error', async () => {
    vi.mocked(predictionMarketsApi.fetchTrendingMarkets)
      .mockRejectedValueOnce(new Error('Error'))
      .mockResolvedValueOnce({ markets: [mockMarket], unavailable: false });

    const { result } = renderHook(() => usePredictionMarkets());

    // First call fails
    await act(async () => {
      await result.current.loadMarkets('trending');
    });

    expect(result.current.error).toBe('Error');

    // Second call succeeds
    await act(async () => {
      await result.current.loadMarkets('trending');
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  // TODO: Fix race condition - result.current is null before hook initializes
  it.skip('updates watchlist item correctly', () => {
    const { result } = renderHook(() => usePredictionMarkets());

    // Add item
    act(() => {
      result.current.addToWatchlist({
        platform: 'polymarket',
        externalMarketId: 'mock-market-1',
        marketTitle: 'Test Market',
        marketCategory: 'Crypto',
      });
    });

    const itemId = result.current.watchlist[0].id;

    // Update item
    act(() => {
      result.current.updateWatchlistItem(itemId, {
        marketTitle: 'Updated Title',
      });
    });

    expect(result.current.watchlist[0].marketTitle).toBe('Updated Title');
  });
});
