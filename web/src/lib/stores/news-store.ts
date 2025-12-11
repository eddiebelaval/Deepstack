import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NewsArticle = {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  symbols?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  imageUrl?: string;
};

// Auto-refresh interval: 5 minutes
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
// Page size for pagination
const PAGE_SIZE = 15;

interface NewsState {
  // Core data
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  filterSymbol: string | null;

  // Pagination (cursor-based)
  nextPageToken: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;

  // Auto-refresh
  lastFetchTime: number | null;
  newArticleCount: number; // Count of new articles since last view
  autoRefreshEnabled: boolean;

  // Actions
  fetchNews: (symbol?: string, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilterSymbol: (symbol: string | null) => void;
  clearFilter: () => void;
  markAsViewed: () => void;
  setAutoRefresh: (enabled: boolean) => void;
  checkForNewArticles: () => Promise<number>;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      articles: [],
      isLoading: false,
      error: null,
      filterSymbol: null,
      nextPageToken: null,
      hasMore: true,
      isLoadingMore: false,
      lastFetchTime: null,
      newArticleCount: 0,
      autoRefreshEnabled: true,

      fetchNews: async (symbol?: string, reset = true) => {
        const state = get();

        // If reset, start fresh
        if (reset) {
          set({ isLoading: true, error: null, nextPageToken: null });
        }

        try {
          const params = new URLSearchParams();
          if (symbol) params.append('symbol', symbol);
          params.append('limit', PAGE_SIZE.toString());

          const response = await fetch(`/api/news?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch news');

          const data = await response.json();
          const newArticles = data.articles || [];

          // Check for truly new articles (ones not in current list)
          const existingIds = new Set(state.articles.map(a => a.id));
          const trulyNewCount = newArticles.filter((a: NewsArticle) => !existingIds.has(a.id)).length;

          set({
            articles: newArticles,
            isLoading: false,
            hasMore: !!data.next_page_token,
            nextPageToken: data.next_page_token || null,
            lastFetchTime: Date.now(),
            newArticleCount: reset ? 0 : trulyNewCount,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load news',
            isLoading: false,
          });
        }
      },

      loadMore: async () => {
        const state = get();
        if (state.isLoadingMore || !state.hasMore || !state.nextPageToken) return;

        set({ isLoadingMore: true });

        try {
          const params = new URLSearchParams();
          if (state.filterSymbol) params.append('symbol', state.filterSymbol);
          params.append('limit', PAGE_SIZE.toString());
          params.append('page_token', state.nextPageToken);

          const response = await fetch(`/api/news?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch more news');

          const data = await response.json();
          const moreArticles = data.articles || [];

          // Deduplicate in case of overlap
          const existingIds = new Set(state.articles.map(a => a.id));
          const uniqueNewArticles = moreArticles.filter((a: NewsArticle) => !existingIds.has(a.id));

          set({
            articles: [...state.articles, ...uniqueNewArticles],
            nextPageToken: data.next_page_token || null,
            hasMore: !!data.next_page_token,
            isLoadingMore: false,
          });
        } catch (error) {
          set({ isLoadingMore: false });
          console.error('Failed to load more news:', error);
        }
      },

      setFilterSymbol: (symbol) => {
        set({ filterSymbol: symbol, nextPageToken: null, hasMore: true });
        get().fetchNews(symbol || undefined, true);
      },

      clearFilter: () => {
        set({ filterSymbol: null, nextPageToken: null, hasMore: true });
        get().fetchNews(undefined, true);
      },

      markAsViewed: () => {
        set({ newArticleCount: 0 });
      },

      setAutoRefresh: (enabled) => {
        set({ autoRefreshEnabled: enabled });
      },

      // Check for new articles without replacing the list
      checkForNewArticles: async () => {
        const state = get();
        try {
          const params = new URLSearchParams();
          if (state.filterSymbol) params.append('symbol', state.filterSymbol);
          params.append('limit', '5'); // Just check first few
          params.append('page', '1');

          const response = await fetch(`/api/news?${params.toString()}`);
          if (!response.ok) return 0;

          const data = await response.json();
          const latestArticles = data.articles || [];

          // Count how many are new
          const existingIds = new Set(state.articles.map(a => a.id));
          const newCount = latestArticles.filter((a: NewsArticle) => !existingIds.has(a.id)).length;

          if (newCount > 0) {
            set({ newArticleCount: state.newArticleCount + newCount });
          }

          return newCount;
        } catch {
          return 0;
        }
      },
    }),
    {
      name: 'deepstack-news-store',
      partialize: (state) => ({
        autoRefreshEnabled: state.autoRefreshEnabled,
        filterSymbol: state.filterSymbol,
      }),
    }
  )
);

// Hook to set up auto-refresh interval
export function useNewsAutoRefresh() {
  const { autoRefreshEnabled, checkForNewArticles, lastFetchTime } = useNewsStore();

  return {
    shouldRefresh: autoRefreshEnabled &&
      (!lastFetchTime || Date.now() - lastFetchTime > AUTO_REFRESH_INTERVAL),
    checkForNewArticles,
    interval: AUTO_REFRESH_INTERVAL,
  };
}
