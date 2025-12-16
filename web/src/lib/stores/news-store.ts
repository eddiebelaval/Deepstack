import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NewsSourceProvider = 'finnhub' | 'newsapi' | 'alphavantage' | 'alpaca' | 'rss' | 'stocktwits';
export type NewsSourceFilter = 'all' | 'api' | 'rss' | 'social';
export type NewsSentiment = 'positive' | 'negative' | 'neutral' | 'bullish' | 'bearish';

// Category filter for client-side keyword-based filtering
export type NewsCategoryFilter = 'all' | 'top' | 'tech' | 'trending';

// Keywords for category classification
const TECH_KEYWORDS = ['tech', 'ai', 'artificial intelligence', 'software', 'chip', 'nvidia', 'apple', 'google', 'microsoft', 'meta', 'amazon', 'tesla', 'semiconductor', 'cloud', 'data center', 'startup', 'crypto', 'bitcoin', 'blockchain', 'cybersecurity'];
const TOP_SOURCES = ['reuters', 'bloomberg', 'wsj', 'wall street journal', 'financial times', 'cnbc', 'marketwatch', 'fortune', 'barrons'];

// Helper to categorize articles client-side
export function categorizeArticle(article: NewsArticle): { isTech: boolean; isTop: boolean } {
  const headlineLower = article.headline.toLowerCase();
  const sourceLower = article.source.toLowerCase();

  const isTech = TECH_KEYWORDS.some(kw => headlineLower.includes(kw));
  const isTop = TOP_SOURCES.some(src => sourceLower.includes(src));

  return { isTech, isTop };
}

export type NewsArticle = {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  source_provider?: NewsSourceProvider;
  publishedAt: string;
  symbols?: string[];
  sentiment?: NewsSentiment;
  sentiment_score?: number;
  imageUrl?: string;
  author?: string;
  // StockTwits-specific
  engagement?: {
    likes?: number;
    comments?: number;
  };
};

export type SourceHealthStatus = {
  configured: boolean;
  healthy: boolean;
};

export type SourcesHealth = {
  sources: Record<string, SourceHealthStatus>;
  overall_healthy: boolean;
  total_sources: number;
  healthy_sources: number;
};

// Auto-refresh interval: 5 minutes
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
// Page size for pagination
const PAGE_SIZE = 30;

interface NewsState {
  // Core data
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  filterSymbol: string | null;

  // Source filtering
  sourceFilter: NewsSourceFilter;
  includeSocial: boolean;

  // Source metadata from aggregated endpoint
  sourceCounts: Record<string, number>;
  totalFetched: number;
  totalReturned: number;
  totalAvailable: number;

  // Source health
  sourcesHealth: SourcesHealth | null;

  // Pagination (offset-based)
  currentOffset: number;
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
  setSourceFilter: (filter: NewsSourceFilter) => void;
  setIncludeSocial: (include: boolean) => void;
  markAsViewed: () => void;
  setAutoRefresh: (enabled: boolean) => void;
  checkForNewArticles: () => Promise<number>;
  fetchSourcesHealth: () => Promise<void>;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      articles: [],
      isLoading: false,
      error: null,
      filterSymbol: null,
      sourceFilter: 'all',
      includeSocial: true,
      sourceCounts: {},
      totalFetched: 0,
      totalReturned: 0,
      totalAvailable: 0,
      sourcesHealth: null,
      currentOffset: 0,
      hasMore: true,
      isLoadingMore: false,
      lastFetchTime: null,
      newArticleCount: 0,
      autoRefreshEnabled: true,

      fetchNews: async (symbol?: string, reset = true) => {
        const state = get();

        // If reset, start fresh from offset 0
        if (reset) {
          set({ isLoading: true, error: null, currentOffset: 0 });
        }

        try {
          const params = new URLSearchParams();
          if (symbol) params.append('symbol', symbol);
          params.append('limit', PAGE_SIZE.toString());
          params.append('offset', '0'); // Always start from 0 for fresh fetch
          params.append('include_social', state.includeSocial.toString());

          // Always fetch all sources - filtering is done client-side by category
          // This ensures tabs always have content even if specific sources aren't available

          // Use aggregated endpoint with pagination
          const response = await fetch(`/api/news/aggregated?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch news');

          const data = await response.json();
          const newArticles = data.articles || [];

          // Check for truly new articles (ones not in current list)
          const existingIds = new Set(state.articles.map(a => a.id));
          const trulyNewCount = newArticles.filter((a: NewsArticle) => !existingIds.has(a.id)).length;

          set({
            articles: newArticles,
            isLoading: false,
            hasMore: data.has_more ?? false,
            currentOffset: PAGE_SIZE,
            lastFetchTime: Date.now(),
            newArticleCount: reset ? 0 : trulyNewCount,
            sourceCounts: data.sources || {},
            totalFetched: data.total_fetched || 0,
            totalReturned: data.total_returned || 0,
            totalAvailable: data.total_available || 0,
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

        // Don't load more if already loading or no more available
        if (state.isLoadingMore || state.isLoading || !state.hasMore) {
          return;
        }

        set({ isLoadingMore: true });

        try {
          const params = new URLSearchParams();
          if (state.filterSymbol) params.append('symbol', state.filterSymbol);
          params.append('limit', PAGE_SIZE.toString());
          params.append('offset', state.currentOffset.toString());
          params.append('include_social', state.includeSocial.toString());

          // Always fetch all - client-side filtering handles categories

          const response = await fetch(`/api/news/aggregated?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to load more news');

          const data = await response.json();
          const moreArticles = data.articles || [];

          // Append new articles to existing list (avoid duplicates)
          const existingIds = new Set(state.articles.map(a => a.id));
          const uniqueNewArticles = moreArticles.filter(
            (a: NewsArticle) => !existingIds.has(a.id)
          );

          set({
            articles: [...state.articles, ...uniqueNewArticles],
            isLoadingMore: false,
            hasMore: data.has_more ?? false,
            currentOffset: state.currentOffset + PAGE_SIZE,
            totalAvailable: data.total_available || state.totalAvailable,
          });
        } catch (error) {
          console.error('Error loading more news:', error);
          set({ isLoadingMore: false });
        }
      },

      setFilterSymbol: (symbol) => {
        set({ filterSymbol: symbol, currentOffset: 0, hasMore: true });
        get().fetchNews(symbol || undefined, true);
      },

      clearFilter: () => {
        set({ filterSymbol: null, currentOffset: 0, hasMore: true });
        get().fetchNews(undefined, true);
      },

      setSourceFilter: (filter) => {
        // Only update the filter - client-side filtering handles the rest
        // No need to re-fetch since we always have all articles
        set({ sourceFilter: filter });
      },

      setIncludeSocial: (include) => {
        set({ includeSocial: include });
        get().fetchNews(get().filterSymbol || undefined, true);
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
          params.append('limit', '10'); // Just check first few
          params.append('include_social', state.includeSocial.toString());

          // Always check all sources

          const response = await fetch(`/api/news/aggregated?${params.toString()}`);
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

      fetchSourcesHealth: async () => {
        try {
          const response = await fetch('/api/news/sources/health');
          if (!response.ok) return;

          const health = await response.json();
          set({ sourcesHealth: health });
        } catch (error) {
          console.error('Failed to fetch sources health:', error);
        }
      },
    }),
    {
      name: 'deepstack-news-store',
      partialize: (state) => ({
        autoRefreshEnabled: state.autoRefreshEnabled,
        filterSymbol: state.filterSymbol,
        sourceFilter: state.sourceFilter,
        includeSocial: state.includeSocial,
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

// Helper to get display name for source provider
export function getSourceProviderDisplay(provider?: NewsSourceProvider): string {
  const displayNames: Record<NewsSourceProvider, string> = {
    finnhub: 'Finnhub',
    newsapi: 'NewsAPI',
    alphavantage: 'Alpha Vantage',
    alpaca: 'Alpaca',
    rss: 'RSS Feed',
    stocktwits: 'StockTwits',
  };
  return provider ? displayNames[provider] || provider : 'Unknown';
}

// Helper to get provider category
export function getSourceProviderCategory(provider?: NewsSourceProvider): 'api' | 'rss' | 'social' {
  if (!provider) return 'api';
  if (provider === 'stocktwits') return 'social';
  if (provider === 'rss') return 'rss';
  return 'api';
}
