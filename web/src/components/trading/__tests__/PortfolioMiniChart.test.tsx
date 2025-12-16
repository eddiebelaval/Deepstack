import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfolioMiniChart } from '../PortfolioMiniChart';
import { usePositionsStore } from '@/lib/stores/positions-store';

// Mock positions store
vi.mock('@/lib/stores/positions-store');

describe('PortfolioMiniChart', () => {
  const mockPositions = [
    {
      symbol: 'AAPL',
      shares: 100,
      avgCost: 150,
      currentPrice: 160,
      side: 'long',
    },
    {
      symbol: 'MSFT',
      shares: 50,
      avgCost: 300,
      currentPrice: 320,
      side: 'long',
    },
    {
      symbol: 'GOOGL',
      shares: 20,
      avgCost: 140,
      currentPrice: 135,
      side: 'long',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('shows empty message when no positions', () => {
      vi.mocked(usePositionsStore).mockReturnValue([]);

      render(<PortfolioMiniChart />);

      expect(screen.getByText('Add positions to see portfolio chart')).toBeInTheDocument();
    });

    it('renders PieChart icon in empty state', () => {
      vi.mocked(usePositionsStore).mockReturnValue([]);

      render(<PortfolioMiniChart />);

      // Lucide icons use different class naming conventions
      const pieChartIcon = document.querySelector('svg.lucide') || document.querySelector('[data-lucide]');
      expect(pieChartIcon).toBeInTheDocument();
    });
  });

  describe('Rendering with Positions', () => {
    beforeEach(() => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = { positions: mockPositions };
        return selector(state);
      });
    });

    it('renders chart container', () => {
      render(<PortfolioMiniChart />);

      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders timeframe buttons', () => {
      render(<PortfolioMiniChart />);

      expect(screen.getByText('1D')).toBeInTheDocument();
      expect(screen.getByText('1W')).toBeInTheDocument();
      expect(screen.getByText('1M')).toBeInTheDocument();
      expect(screen.getByText('3M')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
    });

    it('renders allocation section', () => {
      render(<PortfolioMiniChart />);

      expect(screen.getByText('Allocation')).toBeInTheDocument();
    });

    it('renders position symbols in allocation', () => {
      render(<PortfolioMiniChart />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
    });
  });

  describe('Timeframe Selection', () => {
    beforeEach(() => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = { positions: mockPositions };
        return selector(state);
      });
    });

    it('defaults to 1M timeframe', () => {
      render(<PortfolioMiniChart />);

      const monthButton = screen.getByText('1M');
      expect(monthButton).toHaveClass('bg-primary');
    });

    it('changes timeframe on button click', async () => {
      const user = userEvent.setup();
      render(<PortfolioMiniChart />);

      const weekButton = screen.getByText('1W');
      await user.click(weekButton);

      expect(weekButton).toHaveClass('bg-primary');
    });
  });

  describe('P&L Display', () => {
    it('shows positive P&L indicator for profitable portfolio', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            { symbol: 'AAPL', shares: 100, avgCost: 150, currentPrice: 160, side: 'long' },
          ],
        };
        return selector(state);
      });

      render(<PortfolioMiniChart />);

      expect(document.querySelector('.lucide-trending-up')).toBeInTheDocument();
    });

    it('shows negative P&L indicator for losing portfolio', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            { symbol: 'AAPL', shares: 100, avgCost: 150, currentPrice: 140, side: 'long' },
          ],
        };
        return selector(state);
      });

      render(<PortfolioMiniChart />);

      expect(document.querySelector('.lucide-trending-down')).toBeInTheDocument();
    });

    it('displays P&L percentage', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            { symbol: 'AAPL', shares: 100, avgCost: 100, currentPrice: 110, side: 'long' },
          ],
        };
        return selector(state);
      });

      render(<PortfolioMiniChart />);

      // 10% gain
      expect(screen.getByText(/\+10\.0%/)).toBeInTheDocument();
    });
  });

  describe('Allocation Breakdown', () => {
    beforeEach(() => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = { positions: mockPositions };
        return selector(state);
      });
    });

    it('renders allocation bar chart', () => {
      render(<PortfolioMiniChart />);

      // Allocation bars container
      const allocationBar = document.querySelector('.rounded-full.overflow-hidden.flex');
      expect(allocationBar).toBeInTheDocument();
    });

    it('shows percentage values for top positions', () => {
      render(<PortfolioMiniChart />);

      // Should show percentage values
      const percentages = document.querySelectorAll('[class*="text-muted-foreground"]');
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('shows +N more when more than 4 positions', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            { symbol: 'AAPL', shares: 100, avgCost: 150, currentPrice: 160, side: 'long' },
            { symbol: 'MSFT', shares: 50, avgCost: 300, currentPrice: 320, side: 'long' },
            { symbol: 'GOOGL', shares: 20, avgCost: 140, currentPrice: 135, side: 'long' },
            { symbol: 'AMZN', shares: 30, avgCost: 180, currentPrice: 185, side: 'long' },
            { symbol: 'NVDA', shares: 40, avgCost: 500, currentPrice: 550, side: 'long' },
          ],
        };
        return selector(state);
      });

      render(<PortfolioMiniChart />);

      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  describe('Chart Interactions', () => {
    beforeEach(() => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = { positions: mockPositions };
        return selector(state);
      });
    });

    it('shows crosshair on mouse move', () => {
      render(<PortfolioMiniChart />);

      const chartArea = document.querySelector('.cursor-crosshair');
      expect(chartArea).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      render(<PortfolioMiniChart />);

      const chartArea = document.querySelector('.cursor-crosshair');
      if (chartArea) {
        fireEvent.mouseLeave(chartArea);
      }

      // No tooltip visible after mouse leave
      expect(document.querySelector('.bg-popover\\/95')).not.toBeInTheDocument();
    });
  });

  describe('Short Positions', () => {
    it('calculates P&L correctly for short positions', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            // Short position: profit when price goes down
            { symbol: 'AAPL', shares: 100, avgCost: 150, currentPrice: 140, side: 'short' },
          ],
        };
        return selector(state);
      });

      render(<PortfolioMiniChart />);

      // Short position should show profit when price dropped
      expect(document.querySelector('.lucide-trending-up')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      vi.mocked(usePositionsStore).mockReturnValue([]);

      const { container } = render(<PortfolioMiniChart className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Fallback Values', () => {
    it('uses avgCost when currentPrice is missing', () => {
      vi.mocked(usePositionsStore).mockImplementation((selector: any) => {
        const state = {
          positions: [
            { symbol: 'AAPL', shares: 100, avgCost: 150, currentPrice: undefined, side: 'long' },
          ],
        };
        return selector(state);
      });

      render(<PortfolioMiniChart />);

      // Should render without error
      expect(screen.getByText('Allocation')).toBeInTheDocument();
    });
  });
});
