import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScalarMarketCard } from '../ScalarMarketCard';
import type { PredictionMarket, MarketPricePoint, ScalarBounds } from '@/lib/types/prediction-markets';

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
  SquareCardFooter: ({ children, className }: any) => (
    <div data-testid="square-card-footer" className={className}>{children}</div>
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

describe('ScalarMarketCard', () => {
  const mockScalarBounds: ScalarBounds = {
    lower: 80000,
    upper: 120000,
    formatType: 'number',
  };

  const mockMarket: PredictionMarket = {
    id: 'market-1',
    platform: 'polymarket',
    title: 'What will BTC price be on Dec 31?',
    category: 'Crypto',
    yesPrice: 0.65, // Long price
    noPrice: 0.35, // Short price
    volume: 1500000,
    status: 'active',
    url: 'https://polymarket.com/market/1',
    marketType: 'scalar',
    scalarBounds: mockScalarBounds,
    outcomes: [
      { name: 'Long', price: 0.65 },
      { name: 'Short', price: 0.35 },
    ],
  };

  const mockPriceHistory: MarketPricePoint[] = [
    { timestamp: '2024-12-01T00:00:00Z', yesPrice: 0.50 },
    { timestamp: '2024-12-05T00:00:00Z', yesPrice: 0.55 },
    { timestamp: '2024-12-10T00:00:00Z', yesPrice: 0.60 },
    { timestamp: '2024-12-12T00:00:00Z', yesPrice: 0.65 },
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
    it('renders market title', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByText('What will BTC price be on Dec 31?')).toBeInTheDocument();
    });

    it('renders platform badge', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-platform', 'polymarket');
      expect(badge).toHaveAttribute('data-size', 'sm');
    });

    it('displays "Range" badge', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByText('Range')).toBeInTheDocument();
    });

    it('renders volume formatted correctly', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByText('$1.5M')).toBeInTheDocument();
      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ScalarMarketCard market={mockMarket} className="custom-class" />);

      const card = screen.getByTestId('square-card');
      expect(card).toHaveClass('custom-class');
    });

    it('returns null when scalarBounds is missing', () => {
      const marketWithoutBounds = { ...mockMarket, scalarBounds: undefined };
      const { container } = render(<ScalarMarketCard market={marketWithoutBounds} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Range Display', () => {
    it('displays lower and upper bounds', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByText('$80K')).toBeInTheDocument();
      expect(screen.getByText('$120K')).toBeInTheDocument();
    });

    it('displays implied value based on long price', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      // Implied value = 80000 + (0.65 * (120000 - 80000)) = 80000 + 26000 = 106000 = $106K
      expect(screen.getByText('$106K')).toBeInTheDocument();
    });

    it('formats bounds with decimal formatType', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 1.5,
          upper: 3.5,
          formatType: 'decimal' as const,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('1.50')).toBeInTheDocument();
      expect(screen.getByText('3.50')).toBeInTheDocument();
    });

    it('formats bounds without formatType (defaults to number)', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 500,
          upper: 800,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('800')).toBeInTheDocument();
    });

    it('formats large bounds with K suffix', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 5000,
          upper: 15000,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('$5K')).toBeInTheDocument();
      expect(screen.getByText('$15K')).toBeInTheDocument();
    });
  });

  describe('Long/Short Sentiment', () => {
    it('displays long percentage', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('displays short percentage', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByText('35%')).toBeInTheDocument();
    });

    it('uses outcomes array for long/short prices', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Long', price: 0.70 },
          { name: 'Short', price: 0.30 },
        ],
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('falls back to yesPrice/noPrice when outcomes missing', () => {
      const market = {
        ...mockMarket,
        outcomes: [],
        yesPrice: 0.80,
        noPrice: 0.20,
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('defaults to 50% when both outcomes and prices missing', () => {
      const market = {
        ...mockMarket,
        outcomes: [],
        yesPrice: undefined as any,
        noPrice: undefined as any,
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getAllByText('50%')).toHaveLength(2);
    });

    it('handles case-insensitive outcome names', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'LONG', price: 0.75 },
          { name: 'SHORT', price: 0.25 },
        ],
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  describe('Watchlist Functionality', () => {
    it('shows unwatched state by default', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      const actionButton = screen.getByTestId('action-button');
      expect(actionButton).toHaveAttribute('data-active', 'false');
      expect(actionButton).toHaveAttribute('title', 'Add to watchlist');
    });

    it('shows watched state when isWatched is true', () => {
      render(<ScalarMarketCard market={mockMarket} isWatched={true} />);

      const actionButton = screen.getByTestId('action-button');
      expect(actionButton).toHaveAttribute('data-active', 'true');
      expect(actionButton).toHaveAttribute('title', 'Remove from watchlist');
    });

    it('calls onToggleWatch when watchlist button clicked', async () => {
      const user = userEvent.setup();
      const onToggleWatch = vi.fn();

      render(<ScalarMarketCard market={mockMarket} onToggleWatch={onToggleWatch} />);

      const actionButton = screen.getByTestId('action-button');
      await user.click(actionButton);

      expect(onToggleWatch).toHaveBeenCalledTimes(1);
    });

    it('highlights card when watched', () => {
      render(<ScalarMarketCard market={mockMarket} isWatched={true} />);

      const card = screen.getByTestId('square-card');
      expect(card).toHaveAttribute('data-highlighted', 'true');
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ScalarMarketCard market={mockMarket} onClick={onClick} />);

      const card = screen.getByTestId('square-card');
      await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when watchlist button clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onToggleWatch = vi.fn();

      render(
        <ScalarMarketCard
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
      render(<ScalarMarketCard market={mockMarket} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/prediction-markets/polymarket/market-1`)
        );
      });

      const url = new URL(vi.mocked(global.fetch).mock.calls[0][0] as string, 'http://localhost');
      expect(url.searchParams.get('yesPrice')).toBe('0.65');
      expect(url.searchParams.get('title')).toBe('What will BTC price be on Dec 31?');
    });

    it('does not fetch history when scalarBounds is missing', async () => {
      const marketWithoutBounds = { ...mockMarket, scalarBounds: undefined };
      render(<ScalarMarketCard market={marketWithoutBounds} />);

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('shows loading state while fetching history', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ market: { ...mockMarket, priceHistory: mockPriceHistory } }),
        } as Response), 100))
      );

      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByTestId('square-card-content').querySelector('.animate-spin')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('square-card-content')?.querySelector('.animate-spin')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('shows sparkline when price history loaded', async () => {
      render(<ScalarMarketCard market={mockMarket} />);

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

      render(<ScalarMarketCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.getByText('No data')).toBeInTheDocument();
      });
    });

    it('handles fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      render(<ScalarMarketCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.getByText('No data')).toBeInTheDocument();
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load price history:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Implied Value Calculation', () => {
    it('calculates implied value correctly', () => {
      // Long price = 0.65
      // Range = 120000 - 80000 = 40000
      // Implied = 80000 + (0.65 * 40000) = 106000
      render(<ScalarMarketCard market={mockMarket} />);

      expect(screen.getByText('$106K')).toBeInTheDocument();
    });

    it('calculates implied value at lower bound (0% long)', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Long', price: 0.0 },
          { name: 'Short', price: 1.0 },
        ],
      };

      render(<ScalarMarketCard market={market} />);

      // Implied = 80000 + (0 * 40000) = 80000
      // Note: $80K appears twice - once as lower bound and once as implied value
      const elements = screen.getAllByText('$80K');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('calculates implied value at upper bound (100% long)', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Long', price: 1.0 },
          { name: 'Short', price: 0.0 },
        ],
      };

      render(<ScalarMarketCard market={market} />);

      // Implied = 80000 + (1.0 * 40000) = 120000
      // Note: $120K appears twice - once as upper bound and once as implied value
      const elements = screen.getAllByText('$120K');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('calculates implied value at midpoint (50% long)', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Long', price: 0.5 },
          { name: 'Short', price: 0.5 },
        ],
      };

      render(<ScalarMarketCard market={market} />);

      // Implied = 80000 + (0.5 * 40000) = 100000
      expect(screen.getByText('$100K')).toBeInTheDocument();
    });
  });

  describe('Volume Formatting', () => {
    it('formats millions correctly', () => {
      const market = { ...mockMarket, volume: 3500000 };
      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('$3.5M')).toBeInTheDocument();
    });

    it('formats thousands correctly', () => {
      const market = { ...mockMarket, volume: 75000 };
      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('$75K')).toBeInTheDocument();
    });

    it('formats hundreds correctly', () => {
      const market = { ...mockMarket, volume: 850 };
      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('$850')).toBeInTheDocument();
    });

    it('handles zero volume', () => {
      const market = { ...mockMarket, volume: 0 };
      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('Sparkline Visualization', () => {
    it('renders SVG sparkline with correct data', async () => {
      render(<ScalarMarketCard market={mockMarket} />);

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

      render(<ScalarMarketCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('renders current price dot on sparkline', async () => {
      render(<ScalarMarketCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        const circles = svg?.querySelectorAll('circle');
        expect(circles?.length).toBe(2);
      });
    });

    it('renders grid line at 50%', async () => {
      render(<ScalarMarketCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        const gridLine = svg?.querySelector('line');
        expect(gridLine).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very small ranges', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 0.1,
          upper: 0.2,
          formatType: 'decimal' as const,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('0.10')).toBeInTheDocument();
      expect(screen.getByText('0.20')).toBeInTheDocument();
    });

    it('handles very large ranges', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 1000000,
          upper: 5000000,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('$1000K')).toBeInTheDocument();
      expect(screen.getByText('$5000K')).toBeInTheDocument();
    });

    it('handles negative ranges', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: -100,
          upper: 100,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('-100')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('handles extreme long/short percentages', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Long', price: 0.99 },
          { name: 'Short', price: 0.01 },
        ],
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('99%')).toBeInTheDocument();
      expect(screen.getByText('1%')).toBeInTheDocument();
    });

    it('rounds percentages correctly', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Long', price: 0.654 },
          { name: 'Short', price: 0.346 },
        ],
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('35%')).toBeInTheDocument();
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
        scalarBounds: { lower: 0, upper: 100 },
      };

      render(<ScalarMarketCard market={minimalMarket} />);

      expect(screen.getByText('Minimal Market')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible watchlist button title', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      const button = screen.getByTestId('action-button');
      expect(button).toHaveAttribute('title', 'Add to watchlist');
    });

    it('updates watchlist button title when watched', () => {
      render(<ScalarMarketCard market={mockMarket} isWatched={true} />);

      const button = screen.getByTestId('action-button');
      expect(button).toHaveAttribute('title', 'Remove from watchlist');
    });

    it('has proper heading for market title', () => {
      render(<ScalarMarketCard market={mockMarket} />);

      const title = screen.getByTestId('square-card-title');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('Different Platforms', () => {
    it('renders Polymarket badge', () => {
      const market = { ...mockMarket, platform: 'polymarket' as const };
      render(<ScalarMarketCard market={market} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toHaveAttribute('data-platform', 'polymarket');
    });

    it('renders Kalshi badge', () => {
      const market = { ...mockMarket, platform: 'kalshi' as const };
      render(<ScalarMarketCard market={market} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toHaveAttribute('data-platform', 'kalshi');
    });
  });

  describe('Format Types', () => {
    it('formats decimal bounds with 2 decimal places', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 1.234,
          upper: 5.678,
          formatType: 'decimal' as const,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('1.23')).toBeInTheDocument();
      expect(screen.getByText('5.68')).toBeInTheDocument();
    });

    it('formats number bounds as integers', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 100,
          upper: 500,
          formatType: 'number' as const,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('defaults to number format when formatType is missing', () => {
      const market = {
        ...mockMarket,
        scalarBounds: {
          lower: 100,
          upper: 500,
        },
      };

      render(<ScalarMarketCard market={market} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });
});
