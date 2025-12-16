import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewsPanel } from '../NewsPanel';
import { useNewsStore, useNewsAutoRefresh } from '@/lib/stores/news-store';
import { useTradingStore } from '@/lib/stores/trading-store';

// Mock dependencies
vi.mock('@/lib/stores/news-store');
vi.mock('@/lib/stores/trading-store');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock RelatedPredictionMarkets
vi.mock('@/components/news/RelatedPredictionMarkets', () => ({
  RelatedPredictionMarkets: vi.fn(() => null),
}));

describe('NewsPanel', () => {
  const mockFetchNews = vi.fn();
  const mockLoadMore = vi.fn();
  const mockSetFilterSymbol = vi.fn();
  const mockClearFilter = vi.fn();
  const mockMarkAsViewed = vi.fn();
  const mockSetAutoRefresh = vi.fn();
  const mockCheckForNewArticles = vi.fn();
  const mockSetActiveSymbol = vi.fn();

  const mockArticles = [
    {
      id: '1',
      headline: 'Apple Reports Strong Q4 Earnings',
      summary: 'Apple Inc. reported quarterly earnings that exceeded analyst expectations.',
      url: 'https://example.com/article1',
      source: 'Reuters',
      publishedAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
      symbols: ['AAPL'],
      sentiment: 'positive' as const,
    },
    {
      id: '2',
      headline: 'Market Volatility Continues',
      summary: 'Markets continue to experience high volatility amid economic uncertainty.',
      url: 'https://example.com/article2',
      source: 'Bloomberg',
      publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      symbols: ['SPY', 'QQQ'],
      sentiment: 'negative' as const,
    },
    {
      id: '3',
      headline: 'Tech Sector Analysis',
      summary: 'An in-depth look at the technology sector performance.',
      url: 'https://example.com/article3',
      source: 'CNBC',
      publishedAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
      symbols: [],
      sentiment: 'neutral' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNewsStore).mockReturnValue({
      articles: mockArticles,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      filterSymbol: null,
      hasMore: true,
      newArticleCount: 0,
      autoRefreshEnabled: true,
      fetchNews: mockFetchNews,
      loadMore: mockLoadMore,
      setFilterSymbol: mockSetFilterSymbol,
      clearFilter: mockClearFilter,
      markAsViewed: mockMarkAsViewed,
      setAutoRefresh: mockSetAutoRefresh,
      checkForNewArticles: mockCheckForNewArticles,
    } as any);

    vi.mocked(useNewsAutoRefresh).mockReturnValue({
      interval: 60000,
    });

    vi.mocked(useTradingStore).mockReturnValue({
      activeSymbol: 'AAPL',
      setActiveSymbol: mockSetActiveSymbol,
    } as any);
  });

  describe('Rendering', () => {
    it('renders news panel with header', () => {
      render(<NewsPanel />);

      expect(screen.getByText('Market News')).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(<NewsPanel />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('renders auto-refresh toggle', () => {
      render(<NewsPanel />);

      // Bell icon button for auto-refresh
      const buttons = screen.getAllByRole('button');
      const autoRefreshButton = buttons.find(btn => btn.querySelector('.lucide-bell'));
      expect(autoRefreshButton).toBeDefined();
    });

    it('shows live indicator when auto-refresh is enabled', () => {
      render(<NewsPanel />);

      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<NewsPanel />);

      expect(screen.getByPlaceholderText('Filter by symbol...')).toBeInTheDocument();
    });

    it('renders articles list', () => {
      render(<NewsPanel />);

      expect(screen.getByText('Apple Reports Strong Q4 Earnings')).toBeInTheDocument();
      expect(screen.getByText('Market Volatility Continues')).toBeInTheDocument();
      expect(screen.getByText('Tech Sector Analysis')).toBeInTheDocument();
    });

    it('shows article sources', () => {
      render(<NewsPanel />);

      expect(screen.getByText('Reuters')).toBeInTheDocument();
      expect(screen.getByText('Bloomberg')).toBeInTheDocument();
      expect(screen.getByText('CNBC')).toBeInTheDocument();
    });

    it('displays symbol badges for articles', () => {
      render(<NewsPanel />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('QQQ')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading with no articles', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: [],
        isLoading: true,
        isLoadingMore: false,
        error: null,
        filterSymbol: null,
        hasMore: true,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      // Should not show articles
      expect(screen.queryByText('Apple Reports Strong Q4 Earnings')).not.toBeInTheDocument();
    });

    it('disables refresh button when loading', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: true,
        isLoadingMore: false,
        error: null,
        filterSymbol: null,
        hasMore: true,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: [],
        isLoading: false,
        isLoadingMore: false,
        error: 'Failed to fetch news',
        filterSymbol: null,
        hasMore: false,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByText('Failed to fetch news')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no articles', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: null,
        hasMore: false,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByText('No news articles found')).toBeInTheDocument();
    });

    it('shows clear filter button when filtered with no results', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: 'TSLA',
        hasMore: false,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByRole('button', { name: /clear filter/i })).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('shows filter badge when filtered', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: 'AAPL',
        hasMore: true,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByText('Filtered: AAPL')).toBeInTheDocument();
    });

    it('filters by symbol on search submit', async () => {
      const user = userEvent.setup();
      render(<NewsPanel />);

      const input = screen.getByPlaceholderText('Filter by symbol...');
      await user.type(input, 'TSLA');

      const searchButton = screen.getAllByRole('button').find(
        btn => btn.querySelector('.lucide-search')
      );
      if (searchButton) {
        await user.click(searchButton);
      }

      expect(mockSetFilterSymbol).toHaveBeenCalledWith('TSLA');
    });

    it('converts filter symbol to uppercase', async () => {
      const user = userEvent.setup();
      render(<NewsPanel />);

      const input = screen.getByPlaceholderText('Filter by symbol...');
      await user.type(input, 'tsla');

      expect(input).toHaveValue('TSLA');
    });

    it('clears filter when X is clicked on badge', async () => {
      const user = userEvent.setup();

      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: 'AAPL',
        hasMore: true,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      // Find the X button in the filter badge
      const filterBadge = screen.getByText('Filtered: AAPL').closest('div');
      const clearButton = filterBadge?.querySelector('button');
      if (clearButton) {
        await user.click(clearButton);
      }

      expect(mockClearFilter).toHaveBeenCalled();
    });

    it('shows active symbol filter button when not filtered', () => {
      render(<NewsPanel />);

      // Should show button to filter by active symbol (AAPL)
      const buttons = screen.getAllByRole('button');
      const symbolButton = buttons.find(btn => btn.textContent === 'AAPL');
      expect(symbolButton).toBeDefined();
    });

    it('filters by active symbol when button is clicked', async () => {
      const user = userEvent.setup();
      render(<NewsPanel />);

      const buttons = screen.getAllByRole('button');
      const symbolButton = buttons.find(btn => btn.textContent === 'AAPL');
      if (symbolButton) {
        await user.click(symbolButton);
      }

      expect(mockSetFilterSymbol).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('Interactions', () => {
    it('calls refresh when button is clicked', async () => {
      const user = userEvent.setup();
      render(<NewsPanel />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockFetchNews).toHaveBeenCalled();
      expect(mockMarkAsViewed).toHaveBeenCalled();
    });

    it('toggles auto-refresh when button is clicked', async () => {
      const user = userEvent.setup();
      render(<NewsPanel />);

      const buttons = screen.getAllByRole('button');
      const autoRefreshButton = buttons.find(btn => btn.querySelector('.lucide-bell'));
      if (autoRefreshButton) {
        await user.click(autoRefreshButton);
      }

      expect(mockSetAutoRefresh).toHaveBeenCalledWith(false);
    });

    it('sets active symbol when article symbol is clicked', async () => {
      const user = userEvent.setup();
      render(<NewsPanel />);

      // Find the AAPL badge in the articles (not the filter button)
      const badges = screen.getAllByText('AAPL');
      // Click the one that's a badge (in the article)
      await user.click(badges[badges.length - 1]); // Last one should be in article

      expect(mockSetActiveSymbol).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('New Articles Notification', () => {
    it('shows new articles banner when new articles available', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: null,
        hasMore: true,
        newArticleCount: 3,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByText('3 new articles available')).toBeInTheDocument();
    });

    it('uses singular form for 1 new article', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: null,
        hasMore: true,
        newArticleCount: 1,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByText('1 new article available')).toBeInTheDocument();
    });

    it('loads new articles when banner is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: null,
        hasMore: true,
        newArticleCount: 3,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      const banner = screen.getByText('3 new articles available');
      await user.click(banner);

      expect(mockFetchNews).toHaveBeenCalled();
      expect(mockMarkAsViewed).toHaveBeenCalled();
    });
  });

  describe('Sentiment Display', () => {
    it('shows positive sentiment icon for positive articles', () => {
      render(<NewsPanel />);

      // Should have TrendingUp icon for positive sentiment
      const trendingUpIcons = document.querySelectorAll('.lucide-trending-up');
      expect(trendingUpIcons.length).toBeGreaterThan(0);
    });

    it('shows negative sentiment icon for negative articles', () => {
      render(<NewsPanel />);

      // Should have TrendingDown icon for negative sentiment
      const trendingDownIcons = document.querySelectorAll('.lucide-trending-down');
      expect(trendingDownIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Time Formatting', () => {
    it('formats recent times as minutes ago', () => {
      render(<NewsPanel />);

      expect(screen.getByText('30m ago')).toBeInTheDocument();
    });

    it('formats older times as hours ago', () => {
      render(<NewsPanel />);

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });

  describe('Article Links', () => {
    it('renders article headlines as links', () => {
      render(<NewsPanel />);

      const link = screen.getByRole('link', { name: /apple reports strong q4 earnings/i });
      expect(link).toHaveAttribute('href', 'https://example.com/article1');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Load More', () => {
    it('shows loading indicator when loading more', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        isLoadingMore: true,
        error: null,
        filterSymbol: null,
        hasMore: true,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByText('Loading more...')).toBeInTheDocument();
    });

    it('shows no more articles message when all loaded', () => {
      vi.mocked(useNewsStore).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        filterSymbol: null,
        hasMore: false,
        newArticleCount: 0,
        autoRefreshEnabled: true,
        fetchNews: mockFetchNews,
        loadMore: mockLoadMore,
        setFilterSymbol: mockSetFilterSymbol,
        clearFilter: mockClearFilter,
        markAsViewed: mockMarkAsViewed,
        setAutoRefresh: mockSetAutoRefresh,
        checkForNewArticles: mockCheckForNewArticles,
      } as any);

      render(<NewsPanel />);

      expect(screen.getByText('No more articles')).toBeInTheDocument();
    });
  });
});
