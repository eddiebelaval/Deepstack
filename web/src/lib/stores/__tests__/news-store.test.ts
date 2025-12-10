import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNewsStore } from '../news-store';
import { act } from '@testing-library/react';
import type { NewsArticle } from '../news-store';

// Mock fetch
global.fetch = vi.fn();

describe('useNewsStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useNewsStore.setState({
        articles: [],
        isLoading: false,
        error: null,
        filterSymbol: null,
        page: 1,
        hasMore: true,
        isLoadingMore: false,
        lastFetchTime: null,
        newArticleCount: 0,
        autoRefreshEnabled: true,
      });
    });

    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty articles array', () => {
      const state = useNewsStore.getState();
      expect(state.articles).toEqual([]);
    });

    it('is not loading initially', () => {
      const state = useNewsStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('has no error initially', () => {
      const state = useNewsStore.getState();
      expect(state.error).toBeNull();
    });

    it('has no symbol filter', () => {
      const state = useNewsStore.getState();
      expect(state.filterSymbol).toBeNull();
    });

    it('starts at page 1', () => {
      const state = useNewsStore.getState();
      expect(state.page).toBe(1);
    });

    it('has more pages initially', () => {
      const state = useNewsStore.getState();
      expect(state.hasMore).toBe(true);
    });

    it('is not loading more initially', () => {
      const state = useNewsStore.getState();
      expect(state.isLoadingMore).toBe(false);
    });

    it('has no last fetch time', () => {
      const state = useNewsStore.getState();
      expect(state.lastFetchTime).toBeNull();
    });

    it('has zero new articles', () => {
      const state = useNewsStore.getState();
      expect(state.newArticleCount).toBe(0);
    });

    it('has auto-refresh enabled', () => {
      const state = useNewsStore.getState();
      expect(state.autoRefreshEnabled).toBe(true);
    });
  });

  describe('fetchNews', () => {
    const mockArticles: NewsArticle[] = [
      {
        id: '1',
        headline: 'Apple announces new product',
        summary: 'Apple unveils latest innovation',
        url: 'https://example.com/1',
        source: 'TechNews',
        publishedAt: '2024-01-15T10:00:00Z',
        symbols: ['AAPL'],
        sentiment: 'positive',
      },
      {
        id: '2',
        headline: 'Market update',
        summary: 'Markets close higher',
        url: 'https://example.com/2',
        source: 'MarketWatch',
        publishedAt: '2024-01-15T11:00:00Z',
        sentiment: 'neutral',
      },
    ];

    it('fetches news successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: mockArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      const state = useNewsStore.getState();
      expect(state.articles).toEqual(mockArticles);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets loading state while fetching', async () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ articles: mockArticles }),
              });
            }, 100);
          })
      );

      const fetchPromise = useNewsStore.getState().fetchNews();

      // Check loading state immediately
      expect(useNewsStore.getState().isLoading).toBe(true);

      await act(async () => {
        await fetchPromise;
      });

      expect(useNewsStore.getState().isLoading).toBe(false);
    });

    it('fetches news with symbol filter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: mockArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews('AAPL');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
    });

    it('updates last fetch time', async () => {
      const beforeTime = Date.now();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: mockArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      const lastFetchTime = useNewsStore.getState().lastFetchTime;
      expect(lastFetchTime).not.toBeNull();
      expect(lastFetchTime!).toBeGreaterThanOrEqual(beforeTime);
    });

    it('resets to page 1 on fetch', async () => {
      act(() => {
        useNewsStore.setState({ page: 3 });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: mockArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      expect(useNewsStore.getState().page).toBe(1);
    });

    it('sets hasMore to true when full page returned', async () => {
      const fullPage = Array.from({ length: 15 }, (_, i) => ({
        ...mockArticles[0],
        id: `article-${i}`,
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: fullPage }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      expect(useNewsStore.getState().hasMore).toBe(true);
    });

    it('sets hasMore to false when partial page returned', async () => {
      const partialPage = mockArticles.slice(0, 5);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: partialPage }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      expect(useNewsStore.getState().hasMore).toBe(false);
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      const state = useNewsStore.getState();
      expect(state.error).toBe('Failed to fetch news');
      expect(state.isLoading).toBe(false);
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      const state = useNewsStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('counts new articles when not resetting', async () => {
      act(() => {
        useNewsStore.setState({
          articles: [{ ...mockArticles[0], id: 'existing-1' }],
        });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          articles: [
            { ...mockArticles[0], id: 'existing-1' },
            { ...mockArticles[1], id: 'new-1' },
          ],
        }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews(undefined, false);
      });

      expect(useNewsStore.getState().newArticleCount).toBe(1);
    });

    it('resets new article count when reset is true', async () => {
      act(() => {
        useNewsStore.setState({ newArticleCount: 5 });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: mockArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews(undefined, true);
      });

      expect(useNewsStore.getState().newArticleCount).toBe(0);
    });

    it('handles empty articles in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await act(async () => {
        await useNewsStore.getState().fetchNews();
      });

      expect(useNewsStore.getState().articles).toEqual([]);
    });
  });

  describe('loadMore', () => {
    const mockArticles: NewsArticle[] = Array.from({ length: 15 }, (_, i) => ({
      id: `article-${i}`,
      headline: `Article ${i}`,
      summary: `Summary ${i}`,
      url: `https://example.com/${i}`,
      source: 'News',
      publishedAt: new Date().toISOString(),
    }));

    const moreArticles: NewsArticle[] = Array.from({ length: 15 }, (_, i) => ({
      id: `article-more-${i}`,
      headline: `More Article ${i}`,
      summary: `More Summary ${i}`,
      url: `https://example.com/more/${i}`,
      source: 'News',
      publishedAt: new Date().toISOString(),
    }));

    beforeEach(() => {
      act(() => {
        useNewsStore.setState({
          articles: mockArticles,
          page: 1,
          hasMore: true,
        });
      });
    });

    it('loads more articles', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: moreArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().loadMore();
      });

      const state = useNewsStore.getState();
      expect(state.articles).toHaveLength(30);
      expect(state.page).toBe(2);
    });

    it('sets loading more state', async () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ articles: moreArticles }),
              });
            }, 100);
          })
      );

      const loadPromise = useNewsStore.getState().loadMore();

      expect(useNewsStore.getState().isLoadingMore).toBe(true);

      await act(async () => {
        await loadPromise;
      });

      expect(useNewsStore.getState().isLoadingMore).toBe(false);
    });

    it('does not load if already loading more', async () => {
      act(() => {
        useNewsStore.setState({ isLoadingMore: true });
      });

      await act(async () => {
        await useNewsStore.getState().loadMore();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not load if no more pages', async () => {
      act(() => {
        useNewsStore.setState({ hasMore: false });
      });

      await act(async () => {
        await useNewsStore.getState().loadMore();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deduplicates articles', async () => {
      const duplicateArticles = [
        mockArticles[0], // Duplicate
        { ...mockArticles[0], id: 'unique-1' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: duplicateArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().loadMore();
      });

      const state = useNewsStore.getState();
      const articleIds = state.articles.map((a) => a.id);
      const uniqueIds = new Set(articleIds);
      expect(articleIds.length).toBe(uniqueIds.size);
    });

    it('includes symbol filter in request', async () => {
      act(() => {
        useNewsStore.setState({ filterSymbol: 'AAPL' });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: moreArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().loadMore();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
    });

    it('handles load more errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Load more error'));

      await act(async () => {
        await useNewsStore.getState().loadMore();
      });

      expect(useNewsStore.getState().isLoadingMore).toBe(false);
      // Should not crash or change articles
      expect(useNewsStore.getState().articles).toHaveLength(15);
    });
  });

  describe('setFilterSymbol', () => {
    it('sets symbol filter', () => {
      act(() => {
        useNewsStore.getState().setFilterSymbol('AAPL');
      });

      expect(useNewsStore.getState().filterSymbol).toBe('AAPL');
    });

    it('resets page to 1', () => {
      act(() => {
        useNewsStore.setState({ page: 3 });
        useNewsStore.getState().setFilterSymbol('TSLA');
      });

      expect(useNewsStore.getState().page).toBe(1);
    });

    it('sets hasMore to true', () => {
      act(() => {
        useNewsStore.setState({ hasMore: false });
        useNewsStore.getState().setFilterSymbol('MSFT');
      });

      expect(useNewsStore.getState().hasMore).toBe(true);
    });

    it('fetches news with new filter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: [] }),
      });

      await act(async () => {
        useNewsStore.getState().setFilterSymbol('GOOGL');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=GOOGL')
      );
    });
  });

  describe('clearFilter', () => {
    it('clears symbol filter', () => {
      act(() => {
        useNewsStore.setState({ filterSymbol: 'AAPL' });
      });

      act(() => {
        useNewsStore.getState().clearFilter();
      });

      expect(useNewsStore.getState().filterSymbol).toBeNull();
    });

    it('resets page to 1', () => {
      act(() => {
        useNewsStore.setState({ page: 3, filterSymbol: 'AAPL' });
        useNewsStore.getState().clearFilter();
      });

      expect(useNewsStore.getState().page).toBe(1);
    });

    it('fetches all news', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: [] }),
      });

      await act(async () => {
        useNewsStore.getState().clearFilter();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.not.stringContaining('symbol=')
      );
    });
  });

  describe('markAsViewed', () => {
    it('resets new article count to zero', () => {
      act(() => {
        useNewsStore.setState({ newArticleCount: 10 });
        useNewsStore.getState().markAsViewed();
      });

      expect(useNewsStore.getState().newArticleCount).toBe(0);
    });
  });

  describe('setAutoRefresh', () => {
    it('enables auto refresh', () => {
      act(() => {
        useNewsStore.setState({ autoRefreshEnabled: false });
        useNewsStore.getState().setAutoRefresh(true);
      });

      expect(useNewsStore.getState().autoRefreshEnabled).toBe(true);
    });

    it('disables auto refresh', () => {
      act(() => {
        useNewsStore.getState().setAutoRefresh(false);
      });

      expect(useNewsStore.getState().autoRefreshEnabled).toBe(false);
    });
  });

  describe('checkForNewArticles', () => {
    const existingArticles: NewsArticle[] = [
      {
        id: '1',
        headline: 'Existing Article',
        summary: 'Summary',
        url: 'https://example.com/1',
        source: 'News',
        publishedAt: new Date().toISOString(),
      },
    ];

    const newArticles: NewsArticle[] = [
      {
        id: '2',
        headline: 'New Article',
        summary: 'Summary',
        url: 'https://example.com/2',
        source: 'News',
        publishedAt: new Date().toISOString(),
      },
      ...existingArticles,
    ];

    beforeEach(() => {
      act(() => {
        useNewsStore.setState({ articles: existingArticles });
      });
    });

    it('detects new articles', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: newArticles }),
      });

      let count = 0;
      await act(async () => {
        count = await useNewsStore.getState().checkForNewArticles();
      });

      expect(count).toBe(1);
      expect(useNewsStore.getState().newArticleCount).toBe(1);
    });

    it('returns 0 when no new articles', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: existingArticles }),
      });

      let count = 0;
      await act(async () => {
        count = await useNewsStore.getState().checkForNewArticles();
      });

      expect(count).toBe(0);
      expect(useNewsStore.getState().newArticleCount).toBe(0);
    });

    it('accumulates new article count', async () => {
      act(() => {
        useNewsStore.setState({ newArticleCount: 3 });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: newArticles }),
      });

      await act(async () => {
        await useNewsStore.getState().checkForNewArticles();
      });

      expect(useNewsStore.getState().newArticleCount).toBe(4);
    });

    it('handles fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Error'));

      let count = -1;
      await act(async () => {
        count = await useNewsStore.getState().checkForNewArticles();
      });

      expect(count).toBe(0);
    });

    it('includes symbol filter in request', async () => {
      act(() => {
        useNewsStore.setState({ filterSymbol: 'AAPL' });
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: [] }),
      });

      await act(async () => {
        await useNewsStore.getState().checkForNewArticles();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AAPL')
      );
    });
  });
});
