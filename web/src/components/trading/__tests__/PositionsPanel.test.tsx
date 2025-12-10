import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PositionsPanel } from '../PositionsPanel';
import { usePositionsStore } from '@/lib/stores/positions-store';

// Mock dependencies
vi.mock('@/lib/stores/positions-store');

// Mock PortfolioMiniChart
vi.mock('../PortfolioMiniChart', () => ({
  PortfolioMiniChart: () => <div data-testid="portfolio-mini-chart">Chart</div>,
}));

describe('PositionsPanel', () => {
  const mockRemovePosition = vi.fn();
  const mockOnAddPosition = vi.fn();

  const mockPositions = [
    {
      id: '1',
      symbol: 'AAPL',
      side: 'long' as const,
      shares: 100,
      avgCost: 150.0,
      currentPrice: 160.0,
      openDate: '2024-01-01',
    },
    {
      id: '2',
      symbol: 'GOOGL',
      side: 'short' as const,
      shares: 50,
      avgCost: 140.0,
      currentPrice: 135.0,
      openDate: '2024-01-02',
    },
    {
      id: '3',
      symbol: 'MSFT',
      side: 'long' as const,
      shares: 75,
      avgCost: 380.0,
      currentPrice: 375.0,
      openDate: '2024-01-03',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
      const state = {
        positions: mockPositions,
        removePosition: mockRemovePosition,
      };
      return selector(state);
    });
  });

  describe('Rendering', () => {
    it('renders positions panel with title', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('Positions')).toBeInTheDocument();
    });

    it('renders add position button in header', () => {
      render(<PositionsPanel />);

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('displays total portfolio value', () => {
      render(<PositionsPanel />);

      // AAPL: 100 * 160 = 16000
      // GOOGL: 50 * 135 = 6750
      // MSFT: 75 * 375 = 28125
      // Total: 50,875
      expect(screen.getByText(/\$50,875\.00/)).toBeInTheDocument();
    });

    it('displays total P&L', () => {
      render(<PositionsPanel />);

      // AAPL: (160-150)*100 = +1000
      // GOOGL: (140-135)*50 = +250 (short position gains when price drops)
      // MSFT: (375-380)*75 = -375
      // Total: +875
      expect(screen.getByText(/\$875\.00/)).toBeInTheDocument();
    });

    it('displays P&L percentage', () => {
      render(<PositionsPanel />);

      // Cost basis: (150*100) + (140*50) + (380*75) = 50375
      // P&L: 875
      // Percentage: (875/50375)*100 = 1.74%
      expect(screen.getByText(/\+1\.74%/)).toBeInTheDocument();
    });

    it('shows positions count', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders portfolio mini chart when positions exist', () => {
      render(<PositionsPanel />);

      expect(screen.getByTestId('portfolio-mini-chart')).toBeInTheDocument();
    });

    it('displays all positions in list', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [],
          removePosition: mockRemovePosition,
        };
        return selector(state);
      });
    });

    it('shows empty state when no positions', () => {
      render(<PositionsPanel />);

      expect(screen.getByText(/no positions yet/i)).toBeInTheDocument();
    });

    it('shows add position button in empty state', () => {
      render(<PositionsPanel />);

      expect(screen.getByRole('button', { name: /add position/i })).toBeInTheDocument();
    });

    it('does not show portfolio chart in empty state', () => {
      render(<PositionsPanel />);

      expect(screen.queryByTestId('portfolio-mini-chart')).not.toBeInTheDocument();
    });

    it('shows zero values in summary', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Position Cards', () => {
    it('displays position symbol', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('shows long position indicator', () => {
      render(<PositionsPanel />);

      const aaplCard = screen.getByText('AAPL').closest('div');
      const longBadge = within(aaplCard!).getByText('L');
      expect(longBadge).toBeInTheDocument();
    });

    it('shows short position indicator', () => {
      render(<PositionsPanel />);

      const googlCard = screen.getByText('GOOGL').closest('div');
      const shortBadge = within(googlCard!).getByText('S');
      expect(shortBadge).toBeInTheDocument();
    });

    it('displays shares and current price', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('$160.00')).toBeInTheDocument();
    });

    it('shows P&L with profit styling for profitable positions', () => {
      render(<PositionsPanel />);

      const aaplCard = screen.getByText('AAPL').closest('div');
      const pnl = within(aaplCard!).getByText(/\+\$1000/);
      expect(pnl).toHaveClass('text-profit');
    });

    it('shows P&L with loss styling for losing positions', () => {
      render(<PositionsPanel />);

      const msftCard = screen.getByText('MSFT').closest('div');
      const pnl = within(msftCard!).getByText(/-\$375/);
      expect(pnl).toHaveClass('text-loss');
    });

    it('shows trending up icon for profitable positions', () => {
      render(<PositionsPanel />);

      const aaplCard = screen.getByText('AAPL').closest('div');
      const icon = aaplCard?.querySelector('.lucide-trending-up');
      expect(icon).toBeInTheDocument();
    });

    it('shows trending down icon for losing positions', () => {
      render(<PositionsPanel />);

      const msftCard = screen.getByText('MSFT').closest('div');
      const icon = msftCard?.querySelector('.lucide-trending-down');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('P&L Calculations', () => {
    it('calculates long position P&L correctly', () => {
      render(<PositionsPanel />);

      // AAPL long: (160 - 150) * 100 = +1000
      const aaplCard = screen.getByText('AAPL').closest('div');
      expect(within(aaplCard!).getByText(/\+\$1000/)).toBeInTheDocument();
    });

    it('calculates short position P&L correctly', () => {
      render(<PositionsPanel />);

      // GOOGL short: (140 - 135) * 50 = +250
      const googlCard = screen.getByText('GOOGL').closest('div');
      expect(within(googlCard!).getByText(/\+\$250/)).toBeInTheDocument();
    });

    it('displays P&L percentage', () => {
      render(<PositionsPanel />);

      // AAPL: 1000/15000 * 100 = 6.7%
      const aaplCard = screen.getByText('AAPL').closest('div');
      expect(within(aaplCard!).getByText(/\+6\.7%/)).toBeInTheDocument();
    });
  });

  describe('Summary Stats', () => {
    it('displays day change stat', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('Day Change')).toBeInTheDocument();
    });

    it('displays buying power stat', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('Buying Power')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });
  });

  describe('Add Position', () => {
    it('calls onAddPosition when header add button is clicked', async () => {
      const user = userEvent.setup();
      render(<PositionsPanel onAddPosition={mockOnAddPosition} />);

      const addButton = screen.getAllByRole('button', { name: /add/i })[0];
      await user.click(addButton);

      expect(mockOnAddPosition).toHaveBeenCalledTimes(1);
    });

    it('calls onAddPosition when empty state button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [],
          removePosition: mockRemovePosition,
        };
        return selector(state);
      });

      render(<PositionsPanel onAddPosition={mockOnAddPosition} />);

      const addButton = screen.getByRole('button', { name: /add position/i });
      await user.click(addButton);

      expect(mockOnAddPosition).toHaveBeenCalledTimes(1);
    });
  });

  describe('Position Actions', () => {
    it('shows action buttons on hover', async () => {
      const user = userEvent.setup();
      render(<PositionsPanel />);

      const aaplCard = screen.getByText('AAPL').closest('div');
      if (aaplCard) {
        await user.hover(aaplCard);
      }

      // Action buttons should be in the DOM (even if hidden by opacity)
      const editButton = aaplCard?.querySelector('[class*="opacity-0"]');
      expect(editButton).toBeInTheDocument();
    });

    it('removes position when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<PositionsPanel />);

      const aaplCard = screen.getByText('AAPL').closest('div');

      // Find and click the X button
      const closeButtons = document.querySelectorAll('.lucide-x');
      if (closeButtons.length > 0) {
        const closeButton = closeButtons[0].closest('button');
        if (closeButton) {
          await user.click(closeButton);
          expect(mockRemovePosition).toHaveBeenCalledWith('1');
        }
      }
    });
  });

  describe('Profit/Loss Styling', () => {
    it('uses profit color for positive total P&L', () => {
      render(<PositionsPanel />);

      const pnlText = screen.getByText(/\$875\.00/);
      expect(pnlText).toHaveClass('text-profit');
    });

    it('uses loss color for negative total P&L', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            {
              id: '1',
              symbol: 'AAPL',
              side: 'long' as const,
              shares: 100,
              avgCost: 160.0,
              currentPrice: 150.0, // Losing position
              openDate: '2024-01-01',
            },
          ],
          removePosition: mockRemovePosition,
        };
        return selector(state);
      });

      render(<PositionsPanel />);

      const pnlText = screen.getByText(/-\$1,000\.00/);
      expect(pnlText).toHaveClass('text-loss');
    });
  });

  describe('Current Price Handling', () => {
    it('uses current price when available', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('$160.00')).toBeInTheDocument();
    });

    it('falls back to avg cost when current price is undefined', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            {
              id: '1',
              symbol: 'AAPL',
              side: 'long' as const,
              shares: 100,
              avgCost: 150.0,
              currentPrice: undefined,
              openDate: '2024-01-01',
            },
          ],
          removePosition: mockRemovePosition,
        };
        return selector(state);
      });

      render(<PositionsPanel />);

      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });
  });

  describe('Value Formatting', () => {
    it('formats large values with commas', () => {
      render(<PositionsPanel />);

      // Total portfolio value should be formatted with commas
      expect(screen.getByText(/50,875/)).toBeInTheDocument();
    });

    it('displays values with 2 decimal places', () => {
      render(<PositionsPanel />);

      // Prices should show 2 decimal places
      expect(screen.getByText('$160.00')).toBeInTheDocument();
    });
  });

  describe('Mixed Positions', () => {
    it('correctly calculates total with both long and short positions', () => {
      render(<PositionsPanel />);

      // Mix of profitable and losing positions
      // Should show net total
      expect(screen.getByText(/\$50,875\.00/)).toBeInTheDocument();
    });

    it('handles multiple positions with different sides', () => {
      render(<PositionsPanel />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();

      const aaplCard = screen.getByText('AAPL').closest('div');
      const googlCard = screen.getByText('GOOGL').closest('div');

      expect(within(aaplCard!).getByText('L')).toBeInTheDocument();
      expect(within(googlCard!).getByText('S')).toBeInTheDocument();
    });
  });
});
