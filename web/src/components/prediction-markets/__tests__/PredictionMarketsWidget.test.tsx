import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PredictionMarketsWidget } from '../PredictionMarketsWidget';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import * as predictionMarketsApi from '@/lib/api/prediction-markets';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

// Mock the API module
vi.mock('@/lib/api/prediction-markets', () => ({
  fetchTrendingMarkets: vi.fn(),
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock child components
vi.mock('../PlatformBadge', () => ({
  PlatformBadge: ({ platform }: { platform: string }) => (
    <span data-testid="platform-badge">{platform}</span>
  ),
}));

vi.mock('../ProbabilityBar', () => ({
  ProbabilityBar: ({ yesPrice, compact }: { yesPrice: number; compact?: boolean }) => (
    <div data-testid="probability-bar" data-yes-price={yesPrice} data-compact={compact}>
      {Math.round(yesPrice * 100)}% Yes
    </div>
  ),
}));

describe('PredictionMarketsWidget', () => {
  const mockMarkets: PredictionMarket[] = [
    {
      id: 'market-1',
      platform: 'polymarket',
      title: 'Will BTC reach $100k by end of year?',
      category: 'Crypto',
      yesPrice: 0.65,
      noPrice: 0.35,
      volume: 1500000,
      status: 'active',
      url: 'https://polymarket.com/market/1',
    },
    {
      id: 'market-2',
      platform: 'kalshi',
      title: 'Will unemployment rate drop below 4%?',
      category: 'Economics',
      yesPrice: 0.42,
      noPrice: 0.58,
      volume: 850000,
      status: 'active',
      url: 'https://kalshi.com/market/2',
    },
    {
      id: 'market-3',
      platform: 'polymarket',
      title: 'Will S&P 500 hit new all-time high this quarter?',
      category: 'Finance',
      yesPrice: 0.78,
      noPrice: 0.22,
      volume: 2300000,
      status: 'active',
      url: 'https://polymarket.com/market/3',
    },
    {
      id: 'market-4',
      platform: 'kalshi',
      title: 'Will Fed raise rates in next meeting?',
      category: 'Economics',
      yesPrice: 0.12,
      noPrice: 0.88,
      volume: 650000,
      status: 'active',
      url: 'https://kalshi.com/market/4',
    },
    {
      id: 'market-5',
      platform: 'polymarket',
      title: 'Will ETH flip BTC in market cap this year?',
      category: 'Crypto',
      yesPrice: 0.08,
      noPrice: 0.92,
      volume: 450000,
      status: 'active',
      url: 'https://polymarket.com/market/5',
    },
  ];

  beforeEach(() => {
    // Reset store state before each test
    usePredictionMarketsStore.setState({
      watchlist: [],
      markets: [],
      selectedMarket: null,
      isLoading: false,
      error: null,
    });

    // Setup default mock implementation
    vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
      markets: mockMarkets,
    });

    // Clear all timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders skeleton loading state initially', () => {
      const { container } = render(<PredictionMarketsWidget />);

      // Should render 5 skeleton items
      const skeletons = container.querySelectorAll('.space-y-2.p-3.rounded-lg');
      expect(skeletons.length).toBe(5);
    });

    it('shows skeleton while loading', async () => {
      // Delay the API response
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ markets: mockMarkets }), 100))
      );

      render(<PredictionMarketsWidget />);

      // Should show loading state
      const skeletons = screen.getAllByRole('generic').filter((el) =>
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Loading', () => {
    it('fetches and displays trending markets on mount', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledWith({ limit: 5 });
      });

      expect(screen.getByText(/Will BTC reach \$100k/)).toBeInTheDocument();
      expect(screen.getByText(/Will unemployment rate drop/)).toBeInTheDocument();
    });

    it('renders all 5 markets correctly', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      // Check all markets are rendered by checking for each title (truncated or not)
      mockMarkets.forEach((market) => {
        // Use title attribute since visible text may be truncated
        const titleElement = screen.getByTitle(market.title);
        expect(titleElement).toBeInTheDocument();
      });
    });

    it('displays market details correctly', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      // Check first market details (may appear multiple times due to multiple markets)
      expect(screen.getAllByText('Crypto').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Vol: $1.5M')).toBeInTheDocument();

      // Check platform badges
      const badges = screen.getAllByTestId('platform-badge');
      expect(badges.length).toBe(5);
    });

    it('displays probability bars for each market', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      const probabilityBars = screen.getAllByTestId('probability-bar');
      expect(probabilityBars.length).toBe(5);

      // Check first probability bar
      expect(probabilityBars[0]).toHaveAttribute('data-yes-price', '0.65');
      expect(probabilityBars[0]).toHaveAttribute('data-compact', 'true');
    });

    it('renders View All Markets button', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      const viewAllButton = screen.getByRole('link', { name: /View All Markets/i });
      expect(viewAllButton).toBeInTheDocument();
      expect(viewAllButton).toHaveAttribute('href', '/prediction-markets');
    });
  });

  describe('Error Handling', () => {
    it('displays error state when API fails', async () => {
      const errorMessage = 'Failed to fetch markets';
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('retries loading when retry button is clicked', async () => {
      const user = userEvent.setup();

      // First call fails
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Setup successful retry
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValueOnce({
        markets: mockMarkets,
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledTimes(2);
    });

    it('handles generic error objects', async () => {
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockRejectedValue(
        'String error'
      );

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load markets')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no markets available', async () => {
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('No markets available')).toBeInTheDocument();
      });
    });

    it('does not show View All Markets button in empty state', async () => {
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('No markets available')).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /View All Markets/i })).not.toBeInTheDocument();
    });
  });

  describe('Watchlist Integration', () => {
    it('displays watchlist count when items exist', async () => {
      usePredictionMarketsStore.setState({
        watchlist: [
          {
            id: 'watch-1',
            platform: 'polymarket',
            externalMarketId: 'market-1',
            marketTitle: 'Test Market',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'watch-2',
            platform: 'kalshi',
            externalMarketId: 'market-2',
            marketTitle: 'Test Market 2',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('hides watchlist count when empty', async () => {
      usePredictionMarketsStore.setState({ watchlist: [] });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      // Watchlist count should not be present
      const header = screen.getByText('Prediction Markets').closest('div');
      expect(header).not.toHaveTextContent(/^\d+$/);
    });
  });

  describe('Title Truncation', () => {
    it('truncates long market titles', async () => {
      const longTitleMarket: PredictionMarket = {
        id: 'long-market',
        platform: 'polymarket',
        title: 'This is a very long market title that should be truncated because it exceeds the maximum length allowed',
        category: 'Test',
        yesPrice: 0.5,
        noPrice: 0.5,
        volume: 100000,
        status: 'active',
        url: 'https://example.com',
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [longTitleMarket],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const truncatedText = screen.getByText(/This is a very long market title/);
        expect(truncatedText).toBeInTheDocument();
        expect(truncatedText.textContent?.length).toBeLessThanOrEqual(53); // 50 chars + '...'
      });
    });

    it('does not truncate short titles', async () => {
      const shortTitleMarket: PredictionMarket = {
        id: 'short-market',
        platform: 'kalshi',
        title: 'Short title',
        category: 'Test',
        yesPrice: 0.5,
        noPrice: 0.5,
        volume: 100000,
        status: 'active',
        url: 'https://example.com',
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [shortTitleMarket],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const titleElement = screen.getByText('Short title');
        expect(titleElement.textContent).toBe('Short title');
      });
    });

    it('includes full title in title attribute for accessibility', async () => {
      const longTitleMarket: PredictionMarket = {
        id: 'long-market',
        platform: 'polymarket',
        title: 'This is a very long market title that should be truncated',
        category: 'Test',
        yesPrice: 0.5,
        noPrice: 0.5,
        volume: 100000,
        status: 'active',
        url: 'https://example.com',
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [longTitleMarket],
      });

      const { container } = render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const titleElement = container.querySelector('[title]');
        expect(titleElement).toHaveAttribute(
          'title',
          'This is a very long market title that should be truncated'
        );
      });
    });
  });

  describe('Volume Formatting', () => {
    it('formats volume in millions', async () => {
      const millionVolumeMarket: PredictionMarket = {
        ...mockMarkets[0],
        volume: 2500000,
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [millionVolumeMarket],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Vol: $2.5M')).toBeInTheDocument();
      });
    });

    it('formats volume in thousands', async () => {
      const thousandVolumeMarket: PredictionMarket = {
        ...mockMarkets[0],
        volume: 45000,
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [thousandVolumeMarket],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Vol: $45.0K')).toBeInTheDocument();
      });
    });

    it('formats volume under 1000 without suffix', async () => {
      const smallVolumeMarket: PredictionMarket = {
        ...mockMarkets[0],
        volume: 500,
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [smallVolumeMarket],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Vol: $500')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets up auto-refresh interval on mount', async () => {
      render(<PredictionMarketsWidget />);

      // Wait for initial load with real timers
      await waitFor(() => {
        expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time by 60 seconds
      vi.advanceTimersByTime(60000);

      // Wait for the second call
      await waitFor(() => {
        expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledTimes(2);
      }, { timeout: 10000 });
    }, 15000);

    it('clears interval on unmount', async () => {
      const { unmount } = render(<PredictionMarketsWidget />);

      // Wait for initial load
      await waitFor(() => {
        expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledTimes(1);
      });

      const callCountBeforeUnmount = vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mock.calls.length;

      unmount();

      // Fast-forward time by 60 seconds
      vi.advanceTimersByTime(60000);

      // Give a small amount of time for any pending promises
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not call again after unmount
      expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledTimes(callCountBeforeUnmount);
    }, 15000);

    it('continues refreshing after errors', async () => {
      // First call succeeds
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValueOnce({
        markets: mockMarkets,
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledTimes(1);
      });

      // Second call fails
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockRejectedValueOnce(
        new Error('Network error')
      );

      vi.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Third call succeeds
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValueOnce({
        markets: mockMarkets,
      });

      vi.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(predictionMarketsApi.fetchTrendingMarkets).toHaveBeenCalledTimes(3);
      }, { timeout: 10000 });
    }, 15000);
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      const heading = screen.getByText('Prediction Markets');
      expect(heading).toBeInTheDocument();
    });

    it('has accessible button labels', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      const viewAllButton = screen.getByRole('link', { name: /View All Markets/i });
      expect(viewAllButton).toBeInTheDocument();
    });

    it('has accessible retry button in error state', async () => {
      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockRejectedValue(
        new Error('Error')
      );

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /Retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('Market Item Interactions', () => {
    it('renders market items with hover effect', async () => {
      const { container } = render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      const marketItem = container.querySelector('.hover\\:bg-slate-900');
      expect(marketItem).toBeInTheDocument();
    });

    it('displays all market information in market item', async () => {
      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Will BTC reach/)).toBeInTheDocument();
      });

      // Get first market item - need to go up to the container div with proper structure
      const titleElement = screen.getByTitle('Will BTC reach $100k by end of year?');
      // Navigate up to find the market container with all info
      const firstMarket = titleElement.closest('.rounded-lg.border.border-slate-800');
      expect(firstMarket).toBeInTheDocument();

      if (firstMarket) {
        const marketContainer = within(firstMarket);

        // Check title
        expect(marketContainer.getByTitle('Will BTC reach $100k by end of year?')).toBeInTheDocument();

        // Check category
        expect(marketContainer.getByText('Crypto')).toBeInTheDocument();

        // Check volume
        expect(marketContainer.getByText(/Vol: \$/)).toBeInTheDocument();

        // Check platform badge
        expect(marketContainer.getByTestId('platform-badge')).toBeInTheDocument();

        // Check probability bar
        expect(marketContainer.getByTestId('probability-bar')).toBeInTheDocument();
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles markets with zero volume', async () => {
      const zeroVolumeMarket: PredictionMarket = {
        ...mockMarkets[0],
        volume: 0,
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [zeroVolumeMarket],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Vol: $0')).toBeInTheDocument();
      });
    });

    it('handles markets with extreme probability values', async () => {
      const extremeProbMarkets: PredictionMarket[] = [
        { ...mockMarkets[0], yesPrice: 0.99, noPrice: 0.01 },
        { ...mockMarkets[1], yesPrice: 0.01, noPrice: 0.99 },
      ];

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: extremeProbMarkets,
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        const probabilityBars = screen.getAllByTestId('probability-bar');
        expect(probabilityBars[0]).toHaveAttribute('data-yes-price', '0.99');
        expect(probabilityBars[1]).toHaveAttribute('data-yes-price', '0.01');
      });
    });

    it('handles missing optional market fields gracefully', async () => {
      const minimalMarket: PredictionMarket = {
        id: 'minimal',
        platform: 'polymarket',
        title: 'Minimal Market',
        category: 'Test',
        yesPrice: 0.5,
        noPrice: 0.5,
        volume: 0,
        status: 'active',
        url: 'https://example.com',
      };

      vi.mocked(predictionMarketsApi.fetchTrendingMarkets).mockResolvedValue({
        markets: [minimalMarket],
      });

      render(<PredictionMarketsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Minimal Market')).toBeInTheDocument();
      });
    });
  });
});
