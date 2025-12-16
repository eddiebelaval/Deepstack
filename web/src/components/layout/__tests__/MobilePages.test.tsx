import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatHistoryPage, ChatPage, DiscoverPage, PredictionMarketsPage } from '../MobilePages';
import { useChatStore } from '@/lib/stores/chat-store';
import { useNewsStore } from '@/lib/stores/news-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { usePredictionMarkets } from '@/hooks/usePredictionMarkets';

// Mock dependencies
vi.mock('@/lib/stores/chat-store');
vi.mock('@/lib/stores/news-store');
vi.mock('@/lib/stores/ui-store');
vi.mock('@/hooks/usePredictionMarkets');

// Mock components
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: () => <div data-testid="dot-scroll-indicator">Dots</div>,
}));

vi.mock('@/components/layout/FloatingToolbar', () => ({
  FloatingToolbar: () => <div data-testid="floating-toolbar">Floating Toolbar</div>,
}));

vi.mock('@/components/mobile/MobileMarketWatcher', () => ({
  MobileMarketWatcher: () => <div data-testid="mobile-market-watcher">Market Watcher</div>,
}));

vi.mock('@/components/prediction-markets/BetsCarouselCard', () => ({
  BetsCarouselCard: () => <div data-testid="bets-card">Bets Card</div>,
}));

vi.mock('@/components/prediction-markets/PlatformBadge', () => ({
  PlatformBadge: ({ platform }: any) => <span data-testid="platform-badge">{platform}</span>,
}));

vi.mock('@/components/prediction-markets/ProbabilityBar', () => ({
  ProbabilityBar: () => <div data-testid="probability-bar">Probability Bar</div>,
}));

describe('ChatHistoryPage', () => {
  const mockSetCurrentConversation = vi.fn();
  const mockToggleSettings = vi.fn();
  const mockOnSelectConversation = vi.fn();
  const mockOnNewChat = vi.fn();

  const mockConversations = [
    { id: '1', title: 'Chat 1', created_at: new Date().toISOString() },
    { id: '2', title: 'Chat 2', created_at: new Date(Date.now() - 86400000).toISOString() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useChatStore as any).mockReturnValue({
      conversations: mockConversations,
      currentConversationId: null,
      setCurrentConversation: mockSetCurrentConversation,
    });

    (useUIStore as any).mockReturnValue({
      toggleSettings: mockToggleSettings,
    });

    // Mock mobile swipe nav
    (window as any).__mobileSwipeNav = {
      navigateTo: vi.fn(),
    };
  });

  describe('Rendering', () => {
    it('should render the page title', () => {
      render(<ChatHistoryPage />);

      expect(screen.getByText('Threads')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<ChatHistoryPage />);

      expect(screen.getByPlaceholderText('Search threads...')).toBeInTheDocument();
    });

    it('should render conversation list', () => {
      render(<ChatHistoryPage />);

      expect(screen.getByText('Chat 1')).toBeInTheDocument();
      expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });

    it('should render floating toolbar', () => {
      render(<ChatHistoryPage />);

      expect(screen.getByTestId('floating-toolbar')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no conversations', () => {
      (useChatStore as any).mockReturnValue({
        conversations: [],
        currentConversationId: null,
        setCurrentConversation: mockSetCurrentConversation,
      });

      render(<ChatHistoryPage />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should open settings when settings button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryPage />);

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      await user.click(settingsButton);

      expect(mockToggleSettings).toHaveBeenCalled();
    });

    it('should start new chat when plus button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryPage onNewChat={mockOnNewChat} />);

      const newChatButton = screen.getByRole('button', { name: 'New Chat' });
      await user.click(newChatButton);

      expect(mockSetCurrentConversation).toHaveBeenCalledWith(null);
    });

    it('should navigate to chat when arrow button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryPage />);

      const forwardButton = screen.getByRole('button', { name: 'Go to Chat' });
      await user.click(forwardButton);

      expect((window as any).__mobileSwipeNav.navigateTo).toHaveBeenCalledWith(1);
    });

    it('should select conversation when clicked', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryPage onSelectConversation={mockOnSelectConversation} />);

      const chatItem = screen.getByText('Chat 1');
      await user.click(chatItem);

      expect(mockSetCurrentConversation).toHaveBeenCalledWith('1');
    });
  });

  describe('Conversation Grouping', () => {
    it('should render Today group for recent conversations', () => {
      render(<ChatHistoryPage />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });
});

describe('ChatPage', () => {
  it('should render children', () => {
    render(
      <ChatPage>
        <div data-testid="chat-content">Chat Content</div>
      </ChatPage>
    );

    expect(screen.getByTestId('chat-content')).toBeInTheDocument();
  });

  it('should render mobile market watcher', () => {
    render(
      <ChatPage>
        <div>Content</div>
      </ChatPage>
    );

    expect(screen.getByTestId('mobile-market-watcher')).toBeInTheDocument();
  });
});

describe('DiscoverPage', () => {
  const mockFetchNews = vi.fn();
  const mockClearFilter = vi.fn();

  const mockArticles = [
    {
      id: '1',
      headline: 'Test Article 1',
      summary: 'Summary 1',
      source: 'Test Source',
      url: 'https://example.com/1',
      publishedAt: new Date().toISOString(),
    },
    {
      id: '2',
      headline: 'Test Article 2',
      summary: 'Summary 2',
      source: 'Test Source',
      url: 'https://example.com/2',
      publishedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useNewsStore as any).mockReturnValue({
      articles: mockArticles,
      isLoading: false,
      error: null,
      filterSymbol: null,
      fetchNews: mockFetchNews,
      clearFilter: mockClearFilter,
    });
  });

  describe('Rendering', () => {
    it('should render the page title', () => {
      render(<DiscoverPage />);

      expect(screen.getByText('Discover')).toBeInTheDocument();
    });

    it('should render category pills', () => {
      render(<DiscoverPage />);

      expect(screen.getByText('For You')).toBeInTheDocument();
      expect(screen.getByText('Top Stories')).toBeInTheDocument();
      expect(screen.getByText('Tech')).toBeInTheDocument();
    });

    it('should render articles', () => {
      render(<DiscoverPage />);

      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      expect(screen.getByText('Test Article 2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      (useNewsStore as any).mockReturnValue({
        articles: [],
        isLoading: true,
        error: null,
        filterSymbol: null,
        fetchNews: mockFetchNews,
        clearFilter: mockClearFilter,
      });

      const { container } = render(<DiscoverPage />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message', () => {
      (useNewsStore as any).mockReturnValue({
        articles: [],
        isLoading: false,
        error: 'Failed to load news',
        filterSymbol: null,
        fetchNews: mockFetchNews,
        clearFilter: mockClearFilter,
      });

      render(<DiscoverPage />);

      expect(screen.getByText('Failed to load news')).toBeInTheDocument();
    });
  });

  describe('Filter', () => {
    it('should show filter indicator when filter is active', () => {
      (useNewsStore as any).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        error: null,
        filterSymbol: 'AAPL',
        fetchNews: mockFetchNews,
        clearFilter: mockClearFilter,
      });

      render(<DiscoverPage />);

      expect(screen.getByText('Filtered: AAPL')).toBeInTheDocument();
    });

    it('should clear filter when filter button is clicked', async () => {
      const user = userEvent.setup();
      (useNewsStore as any).mockReturnValue({
        articles: mockArticles,
        isLoading: false,
        error: null,
        filterSymbol: 'AAPL',
        fetchNews: mockFetchNews,
        clearFilter: mockClearFilter,
      });

      render(<DiscoverPage />);

      const filterButton = screen.getByText('Filtered: AAPL');
      await user.click(filterButton);

      expect(mockClearFilter).toHaveBeenCalled();
    });
  });
});

describe('PredictionMarketsPage', () => {
  const mockLoadMarkets = vi.fn();
  const mockLoadMoreMarkets = vi.fn();
  const mockSetFeedType = vi.fn();
  const mockToggleWatchlist = vi.fn();
  const mockIsInWatchlist = vi.fn(() => false);

  const mockMarkets = [
    {
      id: '1',
      platform: 'kalshi',
      title: 'Test Market 1',
      yesPrice: 0.65,
      volume: 100000,
      category: 'Politics',
      url: 'https://kalshi.com/1',
    },
    {
      id: '2',
      platform: 'polymarket',
      title: 'Test Market 2',
      yesPrice: 0.35,
      volume: 50000,
      category: 'Finance',
      url: 'https://polymarket.com/2',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (usePredictionMarkets as any).mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      isUnavailable: false,
      feedType: 'trending',
      hasMore: true,
      loadMarkets: mockLoadMarkets,
      loadMoreMarkets: mockLoadMoreMarkets,
      setFeedType: mockSetFeedType,
      toggleWatchlist: mockToggleWatchlist,
      isInWatchlist: mockIsInWatchlist,
    });
  });

  describe('Rendering', () => {
    it('should render the page title', () => {
      render(<PredictionMarketsPage />);

      expect(screen.getByText('Predictions')).toBeInTheDocument();
    });

    it('should render feed type tabs', () => {
      render(<PredictionMarketsPage />);

      expect(screen.getByText('Trending')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render markets', () => {
      render(<PredictionMarketsPage />);

      expect(screen.getByText('Test Market 1')).toBeInTheDocument();
      expect(screen.getByText('Test Market 2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state', () => {
      (usePredictionMarkets as any).mockReturnValue({
        markets: [],
        isLoading: true,
        isLoadingMore: false,
        error: null,
        isUnavailable: false,
        feedType: 'trending',
        hasMore: true,
        loadMarkets: mockLoadMarkets,
        loadMoreMarkets: mockLoadMoreMarkets,
        setFeedType: mockSetFeedType,
        toggleWatchlist: mockToggleWatchlist,
        isInWatchlist: mockIsInWatchlist,
      });

      render(<PredictionMarketsPage />);

      expect(screen.getByText('Loading markets...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message', () => {
      (usePredictionMarkets as any).mockReturnValue({
        markets: [],
        isLoading: false,
        isLoadingMore: false,
        error: 'Failed to load markets',
        isUnavailable: false,
        feedType: 'trending',
        hasMore: true,
        loadMarkets: mockLoadMarkets,
        loadMoreMarkets: mockLoadMoreMarkets,
        setFeedType: mockSetFeedType,
        toggleWatchlist: mockToggleWatchlist,
        isInWatchlist: mockIsInWatchlist,
      });

      render(<PredictionMarketsPage />);

      expect(screen.getByText('Failed to load markets')).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      (usePredictionMarkets as any).mockReturnValue({
        markets: [],
        isLoading: false,
        isLoadingMore: false,
        error: 'Failed to load markets',
        isUnavailable: false,
        feedType: 'trending',
        hasMore: true,
        loadMarkets: mockLoadMarkets,
        loadMoreMarkets: mockLoadMoreMarkets,
        setFeedType: mockSetFeedType,
        toggleWatchlist: mockToggleWatchlist,
        isInWatchlist: mockIsInWatchlist,
      });

      render(<PredictionMarketsPage />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Feed Type Selection', () => {
    it('should switch to new feed when tab is clicked', async () => {
      const user = userEvent.setup();
      render(<PredictionMarketsPage />);

      const newTab = screen.getByText('New');
      await user.click(newTab);

      expect(mockSetFeedType).toHaveBeenCalledWith('new');
      expect(mockLoadMarkets).toHaveBeenCalledWith('new');
    });
  });

  describe('Refresh', () => {
    it('should refresh markets when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<PredictionMarketsPage />);

      const refreshButton = screen.getByRole('button', { name: 'Refresh markets' });
      await user.click(refreshButton);

      expect(mockLoadMarkets).toHaveBeenCalledWith('trending');
    });
  });

  describe('Unavailable State', () => {
    it('should show unavailable message', () => {
      (usePredictionMarkets as any).mockReturnValue({
        markets: [],
        isLoading: false,
        isLoadingMore: false,
        error: null,
        isUnavailable: true,
        feedType: 'trending',
        hasMore: true,
        loadMarkets: mockLoadMarkets,
        loadMoreMarkets: mockLoadMoreMarkets,
        setFeedType: mockSetFeedType,
        toggleWatchlist: mockToggleWatchlist,
        isInWatchlist: mockIsInWatchlist,
      });

      render(<PredictionMarketsPage />);

      expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
    });
  });
});
