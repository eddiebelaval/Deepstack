import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PayoffDiagram } from '../PayoffDiagram';
import { type StrategyCalculation } from '@/lib/types/options';

// Mock lightweight-charts
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({
      setData: vi.fn(),
    })),
    applyOptions: vi.fn(),
    remove: vi.fn(),
    timeScale: vi.fn(() => ({
      fitContent: vi.fn(),
    })),
  })),
  ColorType: { Solid: 'Solid' },
  LineSeries: 'LineSeries',
  AreaSeries: 'AreaSeries',
}));

const mockCalculation: StrategyCalculation = {
  strategy_name: 'Long Call',
  net_debit_credit: -250,
  max_profit: Infinity,
  max_loss: 250,
  breakeven_points: [452.50],
  risk_reward_ratio: Infinity,
  pnl_at_expiration: [
    { price: 440, pnl: -250 },
    { price: 450, pnl: -250 },
    { price: 460, pnl: 750 },
    { price: 470, pnl: 1750 },
  ],
  pnl_current: [
    { price: 440, pnl: -200 },
    { price: 450, pnl: -150 },
    { price: 460, pnl: 600 },
    { price: 470, pnl: 1600 },
  ],
  greeks: {
    delta: 0.55,
    gamma: 0.05,
    theta: -0.03,
    vega: 0.12,
  },
  greeks_over_price: [
    { price: 440, delta: 0.52, gamma: 0.05, theta: -0.03, vega: 0.12 },
    { price: 450, delta: 0.55, gamma: 0.05, theta: -0.03, vega: 0.12 },
    { price: 460, delta: 0.58, gamma: 0.05, theta: -0.03, vega: 0.12 },
    { price: 470, delta: 0.61, gamma: 0.05, theta: -0.03, vega: 0.12 },
  ],
  mock: false,
};

describe('PayoffDiagram', () => {
  beforeEach(() => {
    // Mock container dimensions
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders strategy name', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Long Call')).toBeInTheDocument();
    });

    it('renders chart container', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(container.querySelector('[ref]')).toBeInTheDocument();
    });

    it('shows empty state when no calculation', () => {
      render(<PayoffDiagram calculation={null} underlyingPrice={450} />);
      expect(screen.getByText('Add legs to see payoff diagram')).toBeInTheDocument();
    });
  });

  describe('metrics display', () => {
    it('renders max profit', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Max Profit')).toBeInTheDocument();
      expect(screen.getByText('Unlimited')).toBeInTheDocument();
    });

    it('renders max loss', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Max Loss')).toBeInTheDocument();
      expect(screen.getByText('$250')).toBeInTheDocument();
    });

    it('renders breakeven points', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Breakeven')).toBeInTheDocument();
      expect(screen.getByText('$452.50')).toBeInTheDocument();
    });

    it('renders risk/reward ratio', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Risk/Reward')).toBeInTheDocument();
      expect(screen.getByText('Unlimited')).toBeInTheDocument();
    });

    it('displays finite max profit correctly', () => {
      const finiteCalc = {
        ...mockCalculation,
        max_profit: 500,
      };
      render(<PayoffDiagram calculation={finiteCalc} underlyingPrice={450} />);
      expect(screen.getByText('$500')).toBeInTheDocument();
    });

    it('displays finite risk/reward ratio', () => {
      const finiteCalc = {
        ...mockCalculation,
        max_profit: 500,
        max_loss: 250,
        risk_reward_ratio: 2.0,
      };
      render(<PayoffDiagram calculation={finiteCalc} underlyingPrice={450} />);
      expect(screen.getByText('2.00:1')).toBeInTheDocument();
    });

    it('handles multiple breakeven points', () => {
      const multiBreakeven = {
        ...mockCalculation,
        breakeven_points: [445.50, 455.50],
      };
      render(<PayoffDiagram calculation={multiBreakeven} underlyingPrice={450} />);
      expect(screen.getByText('$445.50, $455.50')).toBeInTheDocument();
    });

    it('handles no breakeven points', () => {
      const noBreakeven = {
        ...mockCalculation,
        breakeven_points: [],
      };
      render(<PayoffDiagram calculation={noBreakeven} underlyingPrice={450} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('net debit/credit display', () => {
    it('displays net debit', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Net Debit: $250')).toBeInTheDocument();
    });

    it('displays net credit', () => {
      const creditCalc = {
        ...mockCalculation,
        net_debit_credit: 150,
      };
      render(<PayoffDiagram calculation={creditCalc} underlyingPrice={450} />);
      expect(screen.getByText('Net Credit: $150')).toBeInTheDocument();
    });

    it('applies correct styling for debit', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      const badge = screen.getByText('Net Debit: $250');
      expect(badge.className).toContain('destructive');
    });

    it('applies correct styling for credit', () => {
      const creditCalc = {
        ...mockCalculation,
        net_debit_credit: 150,
      };
      render(<PayoffDiagram calculation={creditCalc} underlyingPrice={450} />);
      const badge = screen.getByText('Net Credit: $150');
      expect(badge.className).toContain('bg-green-600');
    });
  });

  describe('Greeks display', () => {
    it('does not show Greeks by default', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.queryByText('Delta')).not.toBeInTheDocument();
    });

    it('shows Greeks when showGreeks is true', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} showGreeks={true} />);
      expect(screen.getByText('Delta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
      expect(screen.getByText('Theta')).toBeInTheDocument();
      expect(screen.getByText('Vega')).toBeInTheDocument();
    });

    it('displays Greek values correctly', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} showGreeks={true} />);
      expect(screen.getByText('0.55')).toBeInTheDocument(); // Delta
      expect(screen.getByText('0.050')).toBeInTheDocument(); // Gamma
      expect(screen.getByText('-0.03')).toBeInTheDocument(); // Theta
      expect(screen.getByText('0.12')).toBeInTheDocument(); // Vega
    });
  });

  describe('simulation badge', () => {
    it('shows Simulated badge when mock is true', () => {
      const mockCalc = {
        ...mockCalculation,
        mock: true,
      };
      render(<PayoffDiagram calculation={mockCalc} underlyingPrice={450} />);
      expect(screen.getByText('Simulated')).toBeInTheDocument();
    });

    it('does not show Simulated badge when mock is false', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.queryByText('Simulated')).not.toBeInTheDocument();
    });
  });

  describe('legend', () => {
    it('renders chart legend', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('At Expiry')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('shows correct legend styling', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      const atExpiryLine = container.querySelector('.bg-green-500');
      const currentLine = container.querySelector('.bg-blue-400');
      expect(atExpiryLine).toBeInTheDocument();
      expect(currentLine).toBeInTheDocument();
    });
  });

  describe('chart data conversion', () => {
    it('converts P&L data to chart format', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      // Chart should be rendered
      expect(container.querySelector('[ref]')).toBeInTheDocument();
    });

    it('handles empty P&L arrays', () => {
      const emptyCalc = {
        ...mockCalculation,
        pnl_at_expiration: [],
        pnl_current: [],
      };
      render(<PayoffDiagram calculation={emptyCalc} underlyingPrice={450} />);
      // Should render without crashing
      expect(screen.getByText('Long Call')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PayoffDiagram calculation={mockCalculation} underlyingPrice={450} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies profit color to max profit', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      const maxProfit = screen.getByText('Unlimited').closest('.p-2');
      expect(maxProfit?.className).toContain('text-green-500');
    });

    it('applies loss color to max loss', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      const maxLoss = screen.getByText('$250').closest('.p-2');
      expect(maxLoss?.className).toContain('text-red-500');
    });
  });

  describe('responsive layout', () => {
    it('renders metrics in grid layout', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      const grid = container.querySelector('.grid.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('renders Greeks in grid layout when shown', () => {
      const { container } = render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} showGreeks={true} />);
      const greeksGrid = container.querySelector('.grid.grid-cols-4');
      expect(greeksGrid).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no calculation', () => {
      render(<PayoffDiagram calculation={null} underlyingPrice={450} />);
      expect(screen.getByText('Add legs to see payoff diagram')).toBeInTheDocument();
    });

    it('does not render metrics in empty state', () => {
      render(<PayoffDiagram calculation={null} underlyingPrice={450} />);
      expect(screen.queryByText('Max Profit')).not.toBeInTheDocument();
      expect(screen.queryByText('Max Loss')).not.toBeInTheDocument();
    });

    it('does not render chart in empty state', () => {
      const { container } = render(<PayoffDiagram calculation={null} underlyingPrice={450} />);
      expect(container.querySelector('[ref]')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles zero max loss', () => {
      const zeroLossCalc = {
        ...mockCalculation,
        max_loss: 0,
      };
      render(<PayoffDiagram calculation={zeroLossCalc} underlyingPrice={450} />);
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('handles zero net debit/credit', () => {
      const zeroNetCalc = {
        ...mockCalculation,
        net_debit_credit: 0,
      };
      render(<PayoffDiagram calculation={zeroNetCalc} underlyingPrice={450} />);
      expect(screen.getByText('Net Credit: $0')).toBeInTheDocument();
    });

    it('handles very large profit values', () => {
      const largeCalc = {
        ...mockCalculation,
        max_profit: 1000000,
      };
      render(<PayoffDiagram calculation={largeCalc} underlyingPrice={450} />);
      expect(screen.getByText('$1000000')).toBeInTheDocument();
    });

    it('handles negative Greeks', () => {
      const negativeGreeks = {
        ...mockCalculation,
        greeks: {
          delta: -0.45,
          gamma: 0.03,
          theta: -0.05,
          vega: 0.10,
        },
      };
      render(<PayoffDiagram calculation={negativeGreeks} underlyingPrice={450} showGreeks={true} />);
      expect(screen.getByText('-0.45')).toBeInTheDocument();
      expect(screen.getByText('-0.05')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Long Call')).toBeInTheDocument();
    });

    it('labels metrics clearly', () => {
      render(<PayoffDiagram calculation={mockCalculation} underlyingPrice={450} />);
      expect(screen.getByText('Max Profit')).toBeInTheDocument();
      expect(screen.getByText('Max Loss')).toBeInTheDocument();
      expect(screen.getByText('Breakeven')).toBeInTheDocument();
      expect(screen.getByText('Risk/Reward')).toBeInTheDocument();
    });
  });
});
