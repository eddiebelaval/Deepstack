import { describe, it, expect, beforeEach } from 'vitest';
import { usePredictionMarketsStore } from '../prediction-markets-store';
import { act } from '@testing-library/react';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

describe('usePredictionMarketsStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      usePredictionMarketsStore.setState({
        markets: [],
        watchlist: [],
        selectedMarket: null,
        filters: {
          source: 'all',
          category: null,
          status: 'active',
          search: '',
          sort: 'volume',
        },
        isLoading: false,
        isLoadingMore: false,
        hasMore: true,
        error: null,
        lastFetchTime: null,
        autoRefreshEnabled: true,
        newMarketsCount: 0,
      });
    });
  });

  describe('initial state', () => {
    it('has empty markets array', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.markets).toEqual([]);
    });

    it('has empty watchlist', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.watchlist).toEqual([]);
    });

    it('has no selected market', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.selectedMarket).toBeNull();
    });

    it('has default filters', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.filters).toEqual({
        source: 'all',
        category: null,
        status: 'active',
        search: '',
        sort: 'volume',
      });
    });

    it('is not loading initially', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isLoadingMore).toBe(false);
    });

    it('has more markets initially', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.hasMore).toBe(true);
    });

    it('has no error initially', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.error).toBeNull();
    });

    it('has no last fetch time', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.lastFetchTime).toBeNull();
    });

    it('has auto-refresh enabled', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.autoRefreshEnabled).toBe(true);
    });

    it('has zero new markets count', () => {
      const state = usePredictionMarketsStore.getState();
      expect(state.newMarketsCount).toBe(0);
    });
  });

  describe('filters', () => {
    describe('setFilters', () => {
      it('updates source filter', () => {
        act(() => {
          usePredictionMarketsStore.getState().setFilters({ source: 'polymarket' });
        });

        expect(usePredictionMarketsStore.getState().filters.source).toBe('polymarket');
      });

      it('updates category filter', () => {
        act(() => {
          usePredictionMarketsStore.getState().setFilters({ category: 'politics' });
        });

        expect(usePredictionMarketsStore.getState().filters.category).toBe('politics');
      });

      it('updates status filter', () => {
        act(() => {
          usePredictionMarketsStore.getState().setFilters({ status: 'closed' });
        });

        expect(usePredictionMarketsStore.getState().filters.status).toBe('closed');
      });

      it('updates search filter', () => {
        act(() => {
          usePredictionMarketsStore.getState().setFilters({ search: 'election' });
        });

        expect(usePredictionMarketsStore.getState().filters.search).toBe('election');
      });

      it('updates sort filter', () => {
        act(() => {
          usePredictionMarketsStore.getState().setFilters({ sort: 'expiration' });
        });

        expect(usePredictionMarketsStore.getState().filters.sort).toBe('expiration');
      });

      it('updates multiple filters at once', () => {
        act(() => {
          usePredictionMarketsStore.getState().setFilters({
            source: 'kalshi',
            category: 'sports',
            status: 'active',
            search: 'championship',
          });
        });

        const filters = usePredictionMarketsStore.getState().filters;
        expect(filters.source).toBe('kalshi');
        expect(filters.category).toBe('sports');
        expect(filters.status).toBe('active');
        expect(filters.search).toBe('championship');
      });

      it('preserves unchanged filters', () => {
        act(() => {
          usePredictionMarketsStore.getState().setFilters({ source: 'polymarket' });
        });

        const filters = usePredictionMarketsStore.getState().filters;
        expect(filters.status).toBe('active'); // Default value preserved
        expect(filters.sort).toBe('volume'); // Default value preserved
      });
    });
  });

  describe('market selection', () => {
    const mockMarket: PredictionMarket = {
      id: 'market-1',
      platform: 'polymarket',
      title: 'Will it rain tomorrow?',
      description: 'Market description',
      category: 'weather',
      status: 'active',
      yesPrice: 0.65,
      noPrice: 0.35,
      volume: 10000,
      url: 'https://polymarket.com/market/1',
      endDate: new Date(Date.now() + 86400000).toISOString(),
    };

    describe('setSelectedMarket', () => {
      it('sets selected market', () => {
        act(() => {
          usePredictionMarketsStore.getState().setSelectedMarket(mockMarket);
        });

        expect(usePredictionMarketsStore.getState().selectedMarket).toEqual(mockMarket);
      });

      it('clears selected market with null', () => {
        act(() => {
          usePredictionMarketsStore.getState().setSelectedMarket(mockMarket);
          usePredictionMarketsStore.getState().setSelectedMarket(null);
        });

        expect(usePredictionMarketsStore.getState().selectedMarket).toBeNull();
      });

      it('replaces previously selected market', () => {
        const market2: PredictionMarket = {
          ...mockMarket,
          id: 'market-2',
          title: 'Different market',
        };

        act(() => {
          usePredictionMarketsStore.getState().setSelectedMarket(mockMarket);
          usePredictionMarketsStore.getState().setSelectedMarket(market2);
        });

        expect(usePredictionMarketsStore.getState().selectedMarket?.id).toBe('market-2');
      });
    });
  });

  describe('markets management', () => {
    const mockMarkets: PredictionMarket[] = [
      {
        id: 'market-1',
        platform: 'polymarket',
        title: 'Market 1',
        description: 'Description 1',
        category: 'politics',
        status: 'active',
        yesPrice: 0.60,
        noPrice: 0.40,
        volume: 10000,
        url: 'https://polymarket.com/market/1',
        endDate: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        id: 'market-2',
        platform: 'kalshi',
        title: 'Market 2',
        description: 'Description 2',
        category: 'sports',
        status: 'active',
        yesPrice: 0.55,
        noPrice: 0.45,
        volume: 5000,
        url: 'https://kalshi.com/market/2',
        endDate: new Date(Date.now() + 172800000).toISOString(),
      },
    ];

    describe('setMarkets', () => {
      it('replaces all markets', () => {
        act(() => {
          usePredictionMarketsStore.getState().setMarkets(mockMarkets);
        });

        expect(usePredictionMarketsStore.getState().markets).toEqual(mockMarkets);
      });

      it('updates last fetch time', () => {
        const beforeTime = Date.now();

        act(() => {
          usePredictionMarketsStore.getState().setMarkets(mockMarkets);
        });

        const lastFetchTime = usePredictionMarketsStore.getState().lastFetchTime;
        expect(lastFetchTime).not.toBeNull();
        expect(lastFetchTime!).toBeGreaterThanOrEqual(beforeTime);
      });

      it('sets hasMore to true for full page', () => {
        // PAGE_SIZE = 30 in the store
        const fullPage = Array.from({ length: 30 }, (_, i) => ({
          ...mockMarkets[0],
          id: `market-${i}`,
        }));

        act(() => {
          usePredictionMarketsStore.getState().setMarkets(fullPage);
        });

        expect(usePredictionMarketsStore.getState().hasMore).toBe(true);
      });

      it('sets hasMore to false for partial page', () => {
        act(() => {
          usePredictionMarketsStore.getState().setMarkets(mockMarkets);
        });

        expect(usePredictionMarketsStore.getState().hasMore).toBe(false);
      });
    });

    describe('appendMarkets', () => {
      beforeEach(() => {
        act(() => {
          usePredictionMarketsStore.getState().setMarkets([mockMarkets[0]]);
        });
      });

      it('appends markets to existing list', () => {
        act(() => {
          usePredictionMarketsStore.getState().appendMarkets([mockMarkets[1]]);
        });

        const markets = usePredictionMarketsStore.getState().markets;
        expect(markets).toHaveLength(2);
        expect(markets[1].id).toBe('market-2');
      });

      it('updates hasMore based on new markets count', () => {
        // PAGE_SIZE = 30 in the store
        const moreMarkets = Array.from({ length: 30 }, (_, i) => ({
          ...mockMarkets[0],
          id: `market-more-${i}`,
        }));

        act(() => {
          usePredictionMarketsStore.getState().appendMarkets(moreMarkets);
        });

        expect(usePredictionMarketsStore.getState().hasMore).toBe(true);
      });
    });
  });

  describe('loading states', () => {
    describe('setLoading', () => {
      it('sets loading to true', () => {
        act(() => {
          usePredictionMarketsStore.getState().setLoading(true);
        });

        expect(usePredictionMarketsStore.getState().isLoading).toBe(true);
      });

      it('sets loading to false', () => {
        act(() => {
          usePredictionMarketsStore.getState().setLoading(false);
        });

        expect(usePredictionMarketsStore.getState().isLoading).toBe(false);
      });
    });

    describe('setError', () => {
      it('sets error message', () => {
        act(() => {
          usePredictionMarketsStore.getState().setError('Something went wrong');
        });

        expect(usePredictionMarketsStore.getState().error).toBe('Something went wrong');
      });

      it('clears error with null', () => {
        act(() => {
          usePredictionMarketsStore.getState().setError('Error');
          usePredictionMarketsStore.getState().setError(null);
        });

        expect(usePredictionMarketsStore.getState().error).toBeNull();
      });
    });
  });

  describe('auto-refresh', () => {
    describe('setLastFetchTime', () => {
      it('sets last fetch time', () => {
        const now = Date.now();

        act(() => {
          usePredictionMarketsStore.getState().setLastFetchTime(now);
        });

        expect(usePredictionMarketsStore.getState().lastFetchTime).toBe(now);
      });
    });

    describe('setAutoRefresh', () => {
      it('enables auto refresh', () => {
        act(() => {
          usePredictionMarketsStore.setState({ autoRefreshEnabled: false });
          usePredictionMarketsStore.getState().setAutoRefresh(true);
        });

        expect(usePredictionMarketsStore.getState().autoRefreshEnabled).toBe(true);
      });

      it('disables auto refresh', () => {
        act(() => {
          usePredictionMarketsStore.getState().setAutoRefresh(false);
        });

        expect(usePredictionMarketsStore.getState().autoRefreshEnabled).toBe(false);
      });
    });

    describe('setNewMarketsCount', () => {
      it('sets new markets count', () => {
        act(() => {
          usePredictionMarketsStore.getState().setNewMarketsCount(5);
        });

        expect(usePredictionMarketsStore.getState().newMarketsCount).toBe(5);
      });
    });

    describe('markAsViewed', () => {
      it('resets new markets count to zero', () => {
        act(() => {
          usePredictionMarketsStore.setState({ newMarketsCount: 10 });
          usePredictionMarketsStore.getState().markAsViewed();
        });

        expect(usePredictionMarketsStore.getState().newMarketsCount).toBe(0);
      });
    });
  });

  describe('watchlist', () => {
    const mockWatchlistItem = {
      platform: 'polymarket' as const,
      externalMarketId: 'ext-123',
      marketTitle: 'Will it rain?',
      marketCategory: 'weather',
      notes: 'Watch this closely',
      alertThresholdHigh: 0.75,
      alertThresholdLow: 0.25,
    };

    describe('addToWatchlist', () => {
      it('adds item to watchlist', () => {
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist(mockWatchlistItem);
        });

        const watchlist = usePredictionMarketsStore.getState().watchlist;
        expect(watchlist).toHaveLength(1);
        expect(watchlist[0].platform).toBe('polymarket');
      });

      it('generates unique id', () => {
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist(mockWatchlistItem);
        });

        const item = usePredictionMarketsStore.getState().watchlist[0];
        expect(item.id).toMatch(/^pm-watch-\d+-\d+$/);
      });

      it('sets timestamps', () => {
        const beforeTime = new Date().toISOString();

        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist(mockWatchlistItem);
        });

        const item = usePredictionMarketsStore.getState().watchlist[0];
        expect(item.createdAt).toBeDefined();
        expect(item.updatedAt).toBeDefined();
        expect(new Date(item.createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(beforeTime).getTime()
        );
      });

      it('adds to beginning of list', () => {
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist(mockWatchlistItem);
          usePredictionMarketsStore.getState().addToWatchlist({
            ...mockWatchlistItem,
            externalMarketId: 'ext-456',
            marketTitle: 'Different market',
          });
        });

        const watchlist = usePredictionMarketsStore.getState().watchlist;
        expect(watchlist[0].externalMarketId).toBe('ext-456');
      });
    });

    describe('removeFromWatchlist', () => {
      beforeEach(() => {
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist(mockWatchlistItem);
        });
      });

      it('removes item by id', () => {
        const itemId = usePredictionMarketsStore.getState().watchlist[0].id;

        act(() => {
          usePredictionMarketsStore.getState().removeFromWatchlist(itemId);
        });

        expect(usePredictionMarketsStore.getState().watchlist).toHaveLength(0);
      });

      it('only removes matching item', () => {
        // Add a second item with a different externalMarketId
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist({
            ...mockWatchlistItem,
            externalMarketId: 'ext-456',
          });
        });

        const items = usePredictionMarketsStore.getState().watchlist;
        // Items are added to beginning, so ext-456 is at index 0, ext-123 is at index 1
        expect(items).toHaveLength(2);
        const firstId = items[0].id; // This is ext-456

        act(() => {
          usePredictionMarketsStore.getState().removeFromWatchlist(firstId);
        });

        const remaining = usePredictionMarketsStore.getState().watchlist;
        expect(remaining).toHaveLength(1);
        // After removing ext-456, ext-123 should remain
        expect(remaining[0].externalMarketId).toBe('ext-123');
      });

      it('does nothing for non-existent id', () => {
        act(() => {
          usePredictionMarketsStore.getState().removeFromWatchlist('nonexistent-id');
        });

        expect(usePredictionMarketsStore.getState().watchlist).toHaveLength(1);
      });
    });

    describe('updateWatchlistItem', () => {
      let itemId: string;

      beforeEach(() => {
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist(mockWatchlistItem);
        });
        itemId = usePredictionMarketsStore.getState().watchlist[0].id;
      });

      it('updates alert threshold high', () => {
        act(() => {
          usePredictionMarketsStore.getState().updateWatchlistItem(itemId, {
            alertThresholdHigh: 0.80,
          });
        });

        const item = usePredictionMarketsStore.getState().watchlist[0];
        expect(item.alertThresholdHigh).toBe(0.80);
      });

      it('updates alert threshold low', () => {
        act(() => {
          usePredictionMarketsStore.getState().updateWatchlistItem(itemId, {
            alertThresholdLow: 0.20,
          });
        });

        const item = usePredictionMarketsStore.getState().watchlist[0];
        expect(item.alertThresholdLow).toBe(0.20);
      });

      it('updates notes', () => {
        act(() => {
          usePredictionMarketsStore.getState().updateWatchlistItem(itemId, {
            notes: 'Updated note',
          });
        });

        const item = usePredictionMarketsStore.getState().watchlist[0];
        expect(item.notes).toBe('Updated note');
      });

      it('updates updatedAt timestamp', async () => {
        const originalUpdatedAt = usePredictionMarketsStore.getState().watchlist[0].updatedAt;

        await new Promise((r) => setTimeout(r, 10));

        act(() => {
          usePredictionMarketsStore.getState().updateWatchlistItem(itemId, {
            notes: 'New note',
          });
        });

        const newUpdatedAt = usePredictionMarketsStore.getState().watchlist[0].updatedAt;
        expect(newUpdatedAt).not.toBe(originalUpdatedAt);
      });

      it('preserves other properties', () => {
        const originalItem = usePredictionMarketsStore.getState().watchlist[0];

        act(() => {
          usePredictionMarketsStore.getState().updateWatchlistItem(itemId, {
            alertThresholdHigh: 0.85,
          });
        });

        const updatedItem = usePredictionMarketsStore.getState().watchlist[0];
        expect(updatedItem.platform).toBe(originalItem.platform);
        expect(updatedItem.marketTitle).toBe(originalItem.marketTitle);
        expect(updatedItem.createdAt).toBe(originalItem.createdAt);
      });

      it('does nothing for non-existent id', () => {
        const originalWatchlist = usePredictionMarketsStore.getState().watchlist;

        act(() => {
          usePredictionMarketsStore.getState().updateWatchlistItem('nonexistent-id', {
            notes: 'Should not update',
          });
        });

        expect(usePredictionMarketsStore.getState().watchlist).toEqual(originalWatchlist);
      });
    });

    describe('isInWatchlist', () => {
      beforeEach(() => {
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist(mockWatchlistItem);
        });
      });

      it('returns true for existing item', () => {
        const isInWatchlist = usePredictionMarketsStore
          .getState()
          .isInWatchlist('polymarket', 'ext-123');

        expect(isInWatchlist).toBe(true);
      });

      it('returns false for non-existent platform', () => {
        const isInWatchlist = usePredictionMarketsStore
          .getState()
          .isInWatchlist('kalshi', 'ext-123');

        expect(isInWatchlist).toBe(false);
      });

      it('returns false for non-existent market id', () => {
        const isInWatchlist = usePredictionMarketsStore
          .getState()
          .isInWatchlist('polymarket', 'ext-999');

        expect(isInWatchlist).toBe(false);
      });

      it('matches both platform and market id', () => {
        act(() => {
          usePredictionMarketsStore.getState().addToWatchlist({
            ...mockWatchlistItem,
            platform: 'kalshi',
            externalMarketId: 'ext-456',
          });
        });

        expect(
          usePredictionMarketsStore.getState().isInWatchlist('polymarket', 'ext-123')
        ).toBe(true);
        expect(
          usePredictionMarketsStore.getState().isInWatchlist('kalshi', 'ext-456')
        ).toBe(true);
        expect(
          usePredictionMarketsStore.getState().isInWatchlist('polymarket', 'ext-456')
        ).toBe(false);
      });
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      act(() => {
        // Modify all state
        usePredictionMarketsStore.getState().setMarkets([
          {
            id: 'market-1',
            platform: 'polymarket',
            title: 'Market',
            description: 'Description',
            category: 'politics',
            status: 'active',
            yesPrice: 0.60,
            noPrice: 0.40,
            volume: 10000,
            url: 'https://polymarket.com/market/1',
          },
        ]);
        usePredictionMarketsStore.getState().setSelectedMarket({
          id: 'market-1',
          platform: 'polymarket',
          title: 'Market',
          description: 'Description',
          category: 'politics',
          status: 'active',
          yesPrice: 0.60,
          noPrice: 0.40,
          volume: 10000,
          url: 'https://polymarket.com/market/1',
        });
        usePredictionMarketsStore.getState().setFilters({ source: 'polymarket' });
        usePredictionMarketsStore.getState().setError('Test error');
        usePredictionMarketsStore.getState().setNewMarketsCount(5);

        // Reset
        usePredictionMarketsStore.getState().reset();
      });

      const state = usePredictionMarketsStore.getState();
      expect(state.markets).toEqual([]);
      expect(state.selectedMarket).toBeNull();
      expect(state.filters).toEqual({
        source: 'all',
        category: null,
        status: 'active',
        search: '',
        sort: 'volume',
      });
      expect(state.error).toBeNull();
      expect(state.newMarketsCount).toBe(0);
    });
  });
});
