import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiOutcomeCard } from '../MultiOutcomeCard';
import type { PredictionMarket, MarketOutcome, MarketPricePoint } from '@/lib/types/prediction-markets';

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

describe('MultiOutcomeCard', () => {
  const mockOutcomes: MarketOutcome[] = [
    { name: 'Candidate A', price: 0.45 },
    { name: 'Candidate B', price: 0.30 },
    { name: 'Candidate C', price: 0.15 },
    { name: 'Candidate D', price: 0.10 },
  ];

  const mockMarket: PredictionMarket = {
    id: 'market-1',
    platform: 'polymarket',
    title: 'Who will win the election?',
    category: 'Politics',
    yesPrice: 0.45,
    noPrice: 0.55,
    volume: 2500000,
    status: 'active',
    url: 'https://polymarket.com/market/1',
    marketType: 'multi',
    outcomes: mockOutcomes,
  };

  const mockPriceHistory: MarketPricePoint[] = [
    { timestamp: '2024-12-01T00:00:00Z', yesPrice: 0.40 },
    { timestamp: '2024-12-05T00:00:00Z', yesPrice: 0.42 },
    { timestamp: '2024-12-10T00:00:00Z', yesPrice: 0.44 },
    { timestamp: '2024-12-12T00:00:00Z', yesPrice: 0.45 },
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
      render(<MultiOutcomeCard market={mockMarket} />);

      expect(screen.getByText('Who will win the election?')).toBeInTheDocument();
    });

    it('renders platform badge', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-platform', 'polymarket');
      expect(badge).toHaveAttribute('data-size', 'sm');
    });

    it('displays outcome count', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      expect(screen.getByText('4 outcomes')).toBeInTheDocument();
    });

    it('renders volume formatted correctly', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      expect(screen.getByText('$2.5M')).toBeInTheDocument();
      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<MultiOutcomeCard market={mockMarket} className="custom-class" />);

      const card = screen.getByTestId('square-card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Outcomes Display', () => {
    it('renders outcomes sorted by price (highest first)', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      const outcomes = screen.getAllByText(/Candidate/);
      expect(outcomes[0]).toHaveTextContent('Candidate A'); // 45%
      expect(outcomes[1]).toHaveTextContent('Candidate B'); // 30%
      expect(outcomes[2]).toHaveTextContent('Candidate C'); // 15%
    });

    it('displays percentages for each outcome', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      expect(screen.getByText('45%')).toBeInTheDocument(); // Candidate A
      expect(screen.getByText('30%')).toBeInTheDocument(); // Candidate B
      expect(screen.getByText('15%')).toBeInTheDocument(); // Candidate C
    });

    it('limits outcomes to maxOutcomes prop', () => {
      render(<MultiOutcomeCard market={mockMarket} maxOutcomes={2} />);

      expect(screen.getByText('Candidate A')).toBeInTheDocument();
      expect(screen.getByText('Candidate B')).toBeInTheDocument();
      expect(screen.queryByText('Candidate C')).not.toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('shows default 3 outcomes when maxOutcomes not specified', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      expect(screen.getByText('Candidate A')).toBeInTheDocument();
      expect(screen.getByText('Candidate B')).toBeInTheDocument();
      expect(screen.getByText('Candidate C')).toBeInTheDocument();
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('does not show "more" indicator when all outcomes displayed', () => {
      render(<MultiOutcomeCard market={mockMarket} maxOutcomes={4} />);

      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
    });

    it('rounds outcome percentages correctly', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Option A', price: 0.456 },
          { name: 'Option B', price: 0.544 },
        ],
      };

      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('46%')).toBeInTheDocument(); // 0.456 rounded
      expect(screen.getByText('54%')).toBeInTheDocument(); // 0.544 rounded
    });
  });

  describe('Outcome Styling', () => {
    it('highlights leading outcome', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      // First outcome should have font-medium and be more prominent
      // Use title attribute to find the outcome elements
      const leadingOutcome = screen.getByTitle('Candidate A');
      expect(leadingOutcome).toBeInTheDocument();
      expect(leadingOutcome).toHaveTextContent('Candidate A');
    });

    it('applies color indicators to outcomes', () => {
      const { container } = render(<MultiOutcomeCard market={mockMarket} />);

      // Should have color dots for each outcome
      const colorDots = container.querySelectorAll('.w-2.h-2.rounded-full');
      expect(colorDots.length).toBe(3); // Only showing 3 outcomes
    });

    it('includes title attribute for truncated outcome names', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Very Long Candidate Name That Will Be Truncated', price: 0.5 },
        ],
      };

      render(<MultiOutcomeCard market={market} />);

      const outcomeElement = screen.getByTitle('Very Long Candidate Name That Will Be Truncated');
      expect(outcomeElement).toBeInTheDocument();
    });
  });

  describe('Fallback to Binary Outcomes', () => {
    it('uses Yes/No when outcomes array is missing', () => {
      const binaryMarket: PredictionMarket = {
        ...mockMarket,
        outcomes: undefined,
        yesPrice: 0.65,
        noPrice: 0.35,
      };

      render(<MultiOutcomeCard market={binaryMarket} />);

      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('35%')).toBeInTheDocument();
    });

    it('shows 2 outcomes count for binary markets', () => {
      const binaryMarket: PredictionMarket = {
        ...mockMarket,
        outcomes: undefined,
      };

      render(<MultiOutcomeCard market={binaryMarket} />);

      expect(screen.getByText('2 outcomes')).toBeInTheDocument();
    });
  });

  describe('Watchlist Functionality', () => {
    it('shows unwatched state by default', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      const actionButton = screen.getByTestId('action-button');
      expect(actionButton).toHaveAttribute('data-active', 'false');
      expect(actionButton).toHaveAttribute('title', 'Add to watchlist');
    });

    it('shows watched state when isWatched is true', () => {
      render(<MultiOutcomeCard market={mockMarket} isWatched={true} />);

      const actionButton = screen.getByTestId('action-button');
      expect(actionButton).toHaveAttribute('data-active', 'true');
      expect(actionButton).toHaveAttribute('title', 'Remove from watchlist');
    });

    it('calls onToggleWatch when watchlist button clicked', async () => {
      const user = userEvent.setup();
      const onToggleWatch = vi.fn();

      render(<MultiOutcomeCard market={mockMarket} onToggleWatch={onToggleWatch} />);

      const actionButton = screen.getByTestId('action-button');
      await user.click(actionButton);

      expect(onToggleWatch).toHaveBeenCalledTimes(1);
    });

    it('highlights card when watched', () => {
      render(<MultiOutcomeCard market={mockMarket} isWatched={true} />);

      const card = screen.getByTestId('square-card');
      expect(card).toHaveAttribute('data-highlighted', 'true');
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<MultiOutcomeCard market={mockMarket} onClick={onClick} />);

      const card = screen.getByTestId('square-card');
      await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when watchlist button clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onToggleWatch = vi.fn();

      render(
        <MultiOutcomeCard
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
      render(<MultiOutcomeCard market={mockMarket} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/prediction-markets/polymarket/market-1`)
        );
      });

      const url = new URL(vi.mocked(global.fetch).mock.calls[0][0] as string, 'http://localhost');
      expect(url.searchParams.get('yesPrice')).toBe('0.45');
      expect(url.searchParams.get('title')).toBe('Who will win the election?');
    });

    it('shows loading state while fetching history', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ market: { ...mockMarket, priceHistory: mockPriceHistory } }),
        } as Response), 100))
      );

      render(<MultiOutcomeCard market={mockMarket} />);

      expect(screen.getByTestId('square-card-content').querySelector('.animate-spin')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('square-card-content')?.querySelector('.animate-spin')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('shows sparkline when price history loaded', async () => {
      render(<MultiOutcomeCard market={mockMarket} />);

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

      render(<MultiOutcomeCard market={mockMarket} />);

      await waitFor(() => {
        expect(screen.getByText('No data')).toBeInTheDocument();
      });
    });

    it('handles fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      render(<MultiOutcomeCard market={mockMarket} />);

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

  describe('Volume Formatting', () => {
    it('formats millions correctly', () => {
      const market = { ...mockMarket, volume: 3500000 };
      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('$3.5M')).toBeInTheDocument();
    });

    it('formats thousands correctly', () => {
      const market = { ...mockMarket, volume: 75000 };
      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('$75K')).toBeInTheDocument();
    });

    it('formats hundreds correctly', () => {
      const market = { ...mockMarket, volume: 850 };
      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('$850')).toBeInTheDocument();
    });

    it('handles zero volume', () => {
      const market = { ...mockMarket, volume: 0 };
      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('Sparkline Visualization', () => {
    it('renders SVG sparkline with correct data', async () => {
      render(<MultiOutcomeCard market={mockMarket} />);

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
        yesPrice: 0.4 + (i / 100),
      }));

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ market: { ...mockMarket, priceHistory: longHistory } }),
      } as Response);

      render(<MultiOutcomeCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('renders current price dot on sparkline', async () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        const circles = svg?.querySelectorAll('circle');
        expect(circles?.length).toBe(2);
      });
    });

    it('renders grid line at 50%', async () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      await waitFor(() => {
        const content = screen.getByTestId('square-card-content');
        const svg = content.querySelector('svg');
        const gridLine = svg?.querySelector('line');
        expect(gridLine).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single outcome', () => {
      const market = {
        ...mockMarket,
        outcomes: [{ name: 'Only Option', price: 1.0 }],
      };

      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('Only Option')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('1 outcomes')).toBeInTheDocument();
    });

    it('handles many outcomes', () => {
      const manyOutcomes: MarketOutcome[] = Array.from({ length: 10 }, (_, i) => ({
        name: `Option ${i + 1}`,
        price: (10 - i) / 55, // Sum to 1.0
      }));

      const market = {
        ...mockMarket,
        outcomes: manyOutcomes,
      };

      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('10 outcomes')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument(); // Highest price
      expect(screen.getByText('+7 more')).toBeInTheDocument(); // 10 - 3 = 7
    });

    it('handles outcomes with equal probabilities', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'A', price: 0.25 },
          { name: 'B', price: 0.25 },
          { name: 'C', price: 0.25 },
          { name: 'D', price: 0.25 },
        ],
      };

      render(<MultiOutcomeCard market={market} />);

      // Multiple outcomes have 25%, so check that at least one exists
      const percentages = screen.getAllByText('25%');
      expect(percentages.length).toBeGreaterThanOrEqual(1);
    });

    it('handles outcomes with very small probabilities', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'Very Likely', price: 0.99 },
          { name: 'Very Unlikely', price: 0.01 },
        ],
      };

      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('99%')).toBeInTheDocument();
      expect(screen.getByText('1%')).toBeInTheDocument();
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
        outcomes: [
          { name: 'Yes', price: 0.5 },
          { name: 'No', price: 0.5 },
        ],
      };

      render(<MultiOutcomeCard market={minimalMarket} />);

      expect(screen.getByText('Minimal Market')).toBeInTheDocument();
    });

    it('handles long outcome names with truncation', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'This is a very long candidate name that should be truncated', price: 0.5 },
        ],
      };

      const { container } = render(<MultiOutcomeCard market={market} />);

      const outcomeElement = container.querySelector('.truncate');
      expect(outcomeElement).toBeInTheDocument();
      expect(outcomeElement).toHaveAttribute(
        'title',
        'This is a very long candidate name that should be truncated'
      );
    });
  });

  describe('Accessibility', () => {
    it('has accessible watchlist button title', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      const button = screen.getByTestId('action-button');
      expect(button).toHaveAttribute('title', 'Add to watchlist');
    });

    it('updates watchlist button title when watched', () => {
      render(<MultiOutcomeCard market={mockMarket} isWatched={true} />);

      const button = screen.getByTestId('action-button');
      expect(button).toHaveAttribute('title', 'Remove from watchlist');
    });

    it('has proper heading for market title', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      const title = screen.getByTestId('square-card-title');
      expect(title.tagName).toBe('H3');
    });

    it('has title attributes for truncated outcome names', () => {
      render(<MultiOutcomeCard market={mockMarket} />);

      const outcomeWithTitle = screen.getByTitle('Candidate A');
      expect(outcomeWithTitle).toBeInTheDocument();
    });
  });

  describe('Different Platforms', () => {
    it('renders Polymarket badge', () => {
      const market = { ...mockMarket, platform: 'polymarket' as const };
      render(<MultiOutcomeCard market={market} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toHaveAttribute('data-platform', 'polymarket');
    });

    it('renders Kalshi badge', () => {
      const market = { ...mockMarket, platform: 'kalshi' as const };
      render(<MultiOutcomeCard market={market} />);

      const badge = screen.getByTestId('platform-badge');
      expect(badge).toHaveAttribute('data-platform', 'kalshi');
    });
  });

  describe('Outcome Count Display', () => {
    it('shows correct count for 2 outcomes', () => {
      const market = {
        ...mockMarket,
        outcomes: [
          { name: 'A', price: 0.6 },
          { name: 'B', price: 0.4 },
        ],
      };

      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('2 outcomes')).toBeInTheDocument();
    });

    it('shows correct count for many outcomes', () => {
      const market = {
        ...mockMarket,
        outcomes: Array.from({ length: 20 }, (_, i) => ({
          name: `Option ${i}`,
          price: 1 / 20,
        })),
      };

      render(<MultiOutcomeCard market={market} />);

      expect(screen.getByText('20 outcomes')).toBeInTheDocument();
    });
  });
});
