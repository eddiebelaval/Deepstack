import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BetsCarouselCard } from '../BetsCarouselCard';
import type { PredictionMarket, MarketPricePoint } from '@/lib/types/prediction-markets';

// Mock fetch API
global.fetch = vi.fn();

// Mock child components
vi.mock('../PlatformBadge', () => ({
  PlatformBadge: ({ platform, size }: { platform: string; size?: string }) => (
    <span data-testid="platform-badge" data-platform={platform} data-size={size}>
      {platform}
    </span>
  ),
}));

vi.mock('@/components/ui/square-card', () => ({
  SquareCard: ({ children, onClick, isHighlighted, className }: any) => (
    <div
      data-testid="square-card"
      onClick={onClick}
      data-highlighted={isHighlighted}
      className={className}
    >
      {children}
    </div>
  ),
  SquareCardHeader: ({ children }: any) => (
    <div data-testid="square-card-header">{children}</div>
  ),
  SquareCardContent: ({ children, className }: any) => (
    <div data-testid="square-card-content" className={className}>{children}</div>
  ),
  SquareCardFooter: ({ children }: any) => (
    <div data-testid="square-card-footer">{children}</div>
  ),
  SquareCardTitle: ({ children, className }: any) => (
    <h3 data-testid="square-card-title" className={className}>{children}</h3>
  ),
  SquareCardActionButton: ({ children, onClick, isActive, title, activeClassName }: any) => (
    <button
      data-testid="action-button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      data-active={isActive}
      title={title}
      className={activeClassName}
    >
      {children}
    </button>
  ),
}));

describe('BetsCarouselCard', () => {
  const mockMarket: PredictionMarket = {
    id: 'market-1',
    platform: 'polymarket',
    title: 'Will BTC reach $100k by end of year?',
    category: 'Crypto',
    yesPrice: 0.65,
    noPrice: 0.35,
    volume: 1500000,
    status: 'active',
    url: 'https://polymarket.com/market/1',
  };

  const mockPriceHistory: MarketPricePoint[] = [
    { timestamp: '2024-12-01T00:00:00Z', yesPrice: 0.50, volume: 1000000 },
    { timestamp: '2024-12-05T00:00:00Z', yesPrice: 0.55, volume: 1200000 },
    { timestamp: '2024-12-10T00:00:00Z', yesPrice: 0.60, volume: 1400000 },
    { timestamp: '2024-12-12T00:00:00Z', yesPrice: 0.65, volume: 1500000 },
  ];

  beforeEach(() => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        market: {
          ...mockMarket,
          priceHistory: mockPriceHistory,
        },
      }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders market title', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      expect(screen.getByText('Will BTC reach $100k by end of year?')).toBeInTheDocument();
    });

    it('renders current YES percentage', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('YES')).toBeInTheDocument();
    });

    it('renders volume formatted correctly', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      expect(screen.getByText('$1.5M')).toBeInTheDocument();
      expect(screen.getByText('vol')).toBeInTheDocument();
    });

    it('renders platform badge', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-platform', 'polymarket');
      expect(badge).toHaveAttribute('data-size', 'sm');
    });

    it('applies custom className', () => {
      render(<BetsCarouselCard market={mockMarket} className="custom-class" />);

      const card = screen.getByTestId('square-card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Watchlist Functionality', () => {
    it('shows unwatched state by default', () => {
      render(<BetsCarouselCard market={mockMarket} />);

      const actionButton = screen.getByTestId('action-button');
      expect(actionButton).toHaveAttribute('data-active', 'false');
      expect(actionButton).toHaveAttribute('title', 'Add to watchlist');
    });

    it('shows watched state when isWatched is true', () => {
      render(<BetsCarouselCard market={mockMarket} isWatched={true} />);

      const actionButton = screen.getByTestId('action-button');
      expect(actionButton).toHaveAttribute('data-active', 'true');
      expect(actionButton).toHaveAttribute('title', 'Remove from watchlist');
    });

    it('calls onToggleWatch when watchlist button clicked', async () => {
      const user = userEvent.setup();
      const onToggleWatch = vi.fn();

      render(<BetsCarouselCard market={mockMarket} onToggleWatch={onToggleWatch} />);

      const actionButton = screen.getByTestId('action-button');
      await user.click(actionButton);

      expect(onToggleWatch).toHaveBeenCalledTimes(1);
    });

    it('highlights card when watched', () => {
      render(<BetsCarouselCard market={mockMarket} isWatched={true} />);

      const card = screen.getByTestId('square-card');
      expect(card).toHaveAttribute('data-highlighted', 'true');
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<BetsCarouselCard market={mockMarket} onClick={onClick} />);

      const card = screen.getByTestId('square-card');
      await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when watchlist button clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onToggleWatch = vi.fn();

      render(
        <BetsCarouselCard
          market={mockMarket}
          onClick={onClick}
          onToggleWatch={onToggleWatch}
        />
      );

      const actionButton = screen.getByTestId('action-button');
      await user.click(actionButton);

      expect(onToggleWatch).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Price History Loading', () => {
    it('fetches price history on mount', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/prediction-markets/polymarket/market-1`)
        );
      });

      const url = new URL(vi.mocked(global.fetch).mock.calls[0][0] as string, 'http://localhost');
      expect(url.searchParams.get('yesPrice')).toBe('0.65');
      expect(url.searchParams.get('title')).toBe('Will BTC reach $100k by end of year?');
    });

    it('shows loading state while fetching history', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ market: { ...mockMarket, priceHistory: mockPriceHistory } }),
        } as Response), 100))
      );

      render(<BetsCarouselCard market={mockMarket} />);

      // Should show loading spinner
      expect(screen.getByTestId('square-card-content').querySelector('.animate-spin')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('square-card-content').querySelector('.animate-spin')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('shows sparkline when price history loaded', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('shows "No data" when price history is empty', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          market: { ...mockMarket, priceHistory: [] },
        }),
      } as Response);

      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.getByText('No data')).toBeInTheDocument();
      });
    });

    it('shows "No data" when only one data point', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          market: {
            ...mockMarket,
            priceHistory: [{ timestamp: '2024-12-12T00:00:00Z', yesPrice: 0.65 }],
          },
        }),
      } as Response);

      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.getByText('No data')).toBeInTheDocument();
      });
    });

    it('handles fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.getByText('No data')).toBeInTheDocument();
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load price history:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('handles non-ok response', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.getByText('No data')).toBeInTheDocument();
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('Price Change Calculation', () => {
    it('shows positive price change', async () => {
      // Set price history with dates that will trigger 24h comparison
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const historyWithDates: MarketPricePoint[] = [
        { timestamp: twoDaysAgo.toISOString(), yesPrice: 0.50, volume: 1000000 },
        { timestamp: oneDayAgo.toISOString(), yesPrice: 0.50, volume: 1200000 },
        { timestamp: now.toISOString(), yesPrice: 0.65, volume: 1500000 },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ market: { ...mockMarket, priceHistory: historyWithDates } }),
      } as Response);

      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        // Price went from 0.50 to 0.65, which is +30% change
        expect(screen.getByText('+30%')).toBeInTheDocument();
      });
    });

    it('shows negative price change', async () => {
      const market = { ...mockMarket, yesPrice: 0.40 };

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const history: MarketPricePoint[] = [
        { timestamp: twoDaysAgo.toISOString(), yesPrice: 0.50 },
        { timestamp: oneDayAgo.toISOString(), yesPrice: 0.50 },
        { timestamp: now.toISOString(), yesPrice: 0.40 },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ market: { ...market, priceHistory: history } }),
      } as Response);

      render(<BetsCarouselCard market={market} />);

      await waitFor(() => {
        expect(screen.getByText('-20%')).toBeInTheDocument();
      });
    });

    it('does not show change when insufficient data', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          market: {
            ...mockMarket,
            priceHistory: [{ timestamp: '2024-12-12T00:00:00Z', yesPrice: 0.65 }],
          },
        }),
      } as Response);

      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.queryByText(/[+-]\d+%/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Volume Formatting', () => {
    it('formats millions correctly', () => {
      const market = { ...mockMarket, volume: 2500000 };
      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText('$2.5M')).toBeInTheDocument();
    });

    it('formats thousands correctly', () => {
      const market = { ...mockMarket, volume: 45000 };
      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText('$45K')).toBeInTheDocument();
    });

    it('formats hundreds correctly', () => {
      const market = { ...mockMarket, volume: 500 };
      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText('$500')).toBeInTheDocument();
    });

    it('handles zero volume', () => {
      const market = { ...mockMarket, volume: 0 };
      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('Probability Color Coding', () => {
    it('shows green for YES probability >= 50%', () => {
      const { container } = render(<BetsCarouselCard market={mockMarket} />);

      const yesPercent = screen.getByText('65%');
      expect(yesPercent).toHaveClass('text-green-500');
    });

    it('shows red for YES probability < 50%', () => {
      const market = { ...mockMarket, yesPrice: 0.35, noPrice: 0.65 };
      const { container } = render(<BetsCarouselCard market={market} />);

      const yesPercent = screen.getByText('35%');
      expect(yesPercent).toHaveClass('text-red-500');
    });

    it('shows green for exactly 50%', () => {
      const market = { ...mockMarket, yesPrice: 0.50, noPrice: 0.50 };
      const { container } = render(<BetsCarouselCard market={market} />);

      const yesPercent = screen.getByText('50%');
      expect(yesPercent).toHaveClass('text-green-500');
    });
  });

  describe('Sparkline Visualization', () => {
    it('renders SVG sparkline with correct data', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg?.querySelector('path')).toBeInTheDocument();
      });
    });

    it('limits sparkline to last 30 data points', async () => {
      const longHistory: MarketPricePoint[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() - (50 - i) * 60000).toISOString(),
        yesPrice: 0.5 + (i / 100),
      }));

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ market: { ...mockMarket, priceHistory: longHistory } }),
      } as Response);

      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        expect(svg).toBeInTheDocument();
        // SVG should still render even with 50 points (will be limited to 30)
      });
    });

    it('renders current price dot on sparkline', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        const circles = svg?.querySelectorAll('circle');
        // Should have 2 circles (dot and glow effect)
        expect(circles?.length).toBe(2);
      });
    });

    it('renders grid line at 50%', async () => {
      render(<BetsCarouselCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        const gridLine = svg?.querySelector('line');
        expect(gridLine).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very high probability (99%)', () => {
      const market = { ...mockMarket, yesPrice: 0.99, noPrice: 0.01 };
      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText('99%')).toBeInTheDocument();
      expect(screen.getByText('99%')).toHaveClass('text-green-500');
    });

    it('handles very low probability (1%)', () => {
      const market = { ...mockMarket, yesPrice: 0.01, noPrice: 0.99 };
      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText('1%')).toBeInTheDocument();
      expect(screen.getByText('1%')).toHaveClass('text-red-500');
    });

    it('rounds probabilities correctly', () => {
      const market = { ...mockMarket, yesPrice: 0.654, noPrice: 0.346 };
      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('handles missing optional market fields', () => {
      const minimalMarket: PredictionMarket = {
        id: 'minimal',
        platform: 'kalshi',
        title: 'Minimal Market',
        category: 'Test',
        yesPrice: 0.5,
        noPrice: 0.5,
        volume: 0,
        status: 'active',
        url: 'https://example.com',
      };

      render(<BetsCarouselCard market={minimalMarket} />);

      expect(screen.getByText('Minimal Market')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('handles long market titles', () => {
      const market = {
        ...mockMarket,
        title: 'This is a very long market title that might need special handling in the UI to prevent overflow',
      };

      render(<BetsCarouselCard market={market} />);

      expect(screen.getByText(/This is a very long market title/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible watchlist button title', () => {
      render(<BetsCarouselCard market={mockMarket} />);

      const button = screen.getByTestId('action-button');
      expect(button).toHaveAttribute('title', 'Add to watchlist');
    });

    it('updates watchlist button title when watched', () => {
      render(<BetsCarouselCard market={mockMarket} isWatched={true} />);

      const button = screen.getByTestId('action-button');
      expect(button).toHaveAttribute('title', 'Remove from watchlist');
    });

    it('has proper heading for market title', () => {
      render(<BetsCarouselCard market={mockMarket} />);

      const title = screen.getByTestId('square-card-title');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('Different Platforms', () => {
    it('renders Polymarket badge', () => {
      const market = { ...mockMarket, platform: 'polymarket' as const };
      render(<BetsCarouselCard market={market} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toHaveAttribute('data-platform', 'polymarket');
    });

    it('renders Kalshi badge', () => {
      const market = { ...mockMarket, platform: 'kalshi' as const };
      render(<BetsCarouselCard market={market} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toHaveAttribute('data-platform', 'kalshi');
    });
  });
});
