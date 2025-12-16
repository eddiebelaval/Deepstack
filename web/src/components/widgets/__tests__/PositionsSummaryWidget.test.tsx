import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PositionsSummaryWidget } from '../PositionsSummaryWidget';
import { usePositionsStore } from '@/lib/stores/positions-store';

// Mock positions store
vi.mock('@/lib/stores/positions-store');

describe('PositionsSummaryWidget', () => {
  // Use different P&L percentages to avoid duplicate text matches
  const mockPositions = [
    { symbol: 'AAPL', shares: 100, avgCost: 150, currentPrice: 175, side: 'long' as const }, // +16.7%
    { symbol: 'GOOGL', shares: 50, avgCost: 140, currentPrice: 130, side: 'long' as const }, // -7.1%
    { symbol: 'MSFT', shares: 75, avgCost: 300, currentPrice: 330, side: 'long' as const }, // +10.0%
    { symbol: 'TSLA', shares: 25, avgCost: 200, currentPrice: 180, side: 'long' as const }, // -10.0%
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (usePositionsStore as any).mockImplementation((selector: any) => {
      const state = { positions: mockPositions };
      return selector(state);
    });
  });

  describe('Rendering', () => {
    it('should render the widget header', () => {
      render(<PositionsSummaryWidget />);
      expect(screen.getByText('Open Positions')).toBeInTheDocument();
    });

    it('should render position symbols', () => {
      render(<PositionsSummaryWidget />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });

    it('should render share counts', () => {
      render(<PositionsSummaryWidget />);

      expect(screen.getByText('100 sh')).toBeInTheDocument();
      expect(screen.getByText('50 sh')).toBeInTheDocument();
      expect(screen.getByText('75 sh')).toBeInTheDocument();
      expect(screen.getByText('25 sh')).toBeInTheDocument();
    });

    it('should render total positions count', () => {
      render(<PositionsSummaryWidget />);
      expect(screen.getByText('4 total')).toBeInTheDocument();
    });
  });

  describe('P&L Calculation', () => {
    it('should display positive P&L for profitable positions', () => {
      render(<PositionsSummaryWidget />);

      // AAPL: 100 * (175 - 150) = +$2500
      expect(screen.getByText('+$2500.00')).toBeInTheDocument();
    });

    it('should display negative P&L for losing positions', () => {
      const { container } = render(<PositionsSummaryWidget />);

      // GOOGL: 50 * (130 - 140) = -$500 (displayed as $500.00 with loss styling)
      // Component uses Math.abs() so no minus sign, just loss class styling
      const lossElements = container.querySelectorAll('.text-loss');
      expect(lossElements.length).toBeGreaterThan(0);
    });

    it('should display P&L percentages', () => {
      const { container } = render(<PositionsSummaryWidget />);

      // Check that percentage elements exist with profit/loss styling
      const pnlElements = container.querySelectorAll('.text-profit, .text-loss');
      expect(pnlElements.length).toBeGreaterThan(0);

      // Verify specific percentage values are displayed
      expect(screen.getByText('+16.7%')).toBeInTheDocument(); // AAPL
      expect(screen.getByText('+10.0%')).toBeInTheDocument(); // MSFT
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no positions', () => {
      (usePositionsStore as any).mockImplementation((selector: any) => {
        const state = { positions: [] };
        return selector(state);
      });

      render(<PositionsSummaryWidget />);
      expect(screen.getByText('No open positions')).toBeInTheDocument();
    });
  });

  describe('Position Limit', () => {
    it('should only show top 4 positions', () => {
      const manyPositions = [
        { symbol: 'AAPL', shares: 100, avgCost: 150, currentPrice: 175, side: 'long' as const },
        { symbol: 'GOOGL', shares: 50, avgCost: 140, currentPrice: 130, side: 'long' as const },
        { symbol: 'MSFT', shares: 75, avgCost: 300, currentPrice: 330, side: 'long' as const },
        { symbol: 'TSLA', shares: 25, avgCost: 200, currentPrice: 180, side: 'long' as const },
        { symbol: 'NVDA', shares: 30, avgCost: 400, currentPrice: 450, side: 'long' as const },
      ];

      (usePositionsStore as any).mockImplementation((selector: any) => {
        const state = { positions: manyPositions };
        return selector(state);
      });

      render(<PositionsSummaryWidget />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.queryByText('NVDA')).not.toBeInTheDocument();
      expect(screen.getByText('5 total')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PositionsSummaryWidget className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use profit color for positive P&L', () => {
      const { container } = render(<PositionsSummaryWidget />);
      const profitElements = container.querySelectorAll('.text-profit');
      expect(profitElements.length).toBeGreaterThan(0);
    });

    it('should use loss color for negative P&L', () => {
      const { container } = render(<PositionsSummaryWidget />);
      const lossElements = container.querySelectorAll('.text-loss');
      expect(lossElements.length).toBeGreaterThan(0);
    });
  });
});
