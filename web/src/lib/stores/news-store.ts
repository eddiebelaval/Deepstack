import { create } from 'zustand';

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

interface NewsState {
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  filterSymbol: string | null;
  fetchNews: (symbol?: string) => Promise<void>;
  setFilterSymbol: (symbol: string | null) => void;
  clearFilter: () => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  articles: [],
  isLoading: false,
  error: null,
  filterSymbol: null,

  fetchNews: async (symbol?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (symbol) params.append('symbol', symbol);

      const response = await fetch(`/api/news?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch news');

      const data = await response.json();
      set({ articles: data.articles || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load news',
        isLoading: false,
      });
    }
  },

  setFilterSymbol: (symbol) => set({ filterSymbol: symbol }),

  clearFilter: () => set({ filterSymbol: null }),
}));
