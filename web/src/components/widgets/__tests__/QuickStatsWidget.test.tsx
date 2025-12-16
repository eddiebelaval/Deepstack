import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStatsWidget } from '../QuickStatsWidget';

describe('QuickStatsWidget', () => {
  describe('Rendering', () => {
    it('should render portfolio value', () => {
      render(<QuickStatsWidget />);

      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('$104,230')).toBeInTheDocument();
    });

    it('should render day P&L', () => {
      render(<QuickStatsWidget />);

      expect(screen.getByText('Day P&L')).toBeInTheDocument();
      expect(screen.getByText('+$1,240')).toBeInTheDocument();
    });

    it('should render day P&L percentage', () => {
      render(<QuickStatsWidget />);

      expect(screen.getByText('(+1.20%)')).toBeInTheDocument();
    });

    it('should render open positions count', () => {
      render(<QuickStatsWidget />);

      expect(screen.getByText('Open Positions')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render buying power', () => {
      render(<QuickStatsWidget />);

      expect(screen.getByText('Buying Power')).toBeInTheDocument();
      expect(screen.getByText('$42,850')).toBeInTheDocument();
    });
  });

  describe('P&L Styling', () => {
    it('should use profit color for positive P&L', () => {
      const { container } = render(<QuickStatsWidget />);

      const profitElements = container.querySelectorAll('.text-profit');
      expect(profitElements.length).toBeGreaterThan(0);
    });
  });

  describe('Layout', () => {
    it('should have proper spacing between stats', () => {
      const { container } = render(<QuickStatsWidget />);

      expect(container.firstChild).toHaveClass('space-y-2.5');
    });

    it('should use monospace font for numbers', () => {
      const { container } = render(<QuickStatsWidget />);

      const monoElements = container.querySelectorAll('.font-mono');
      expect(monoElements.length).toBeGreaterThan(0);
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency without decimals', () => {
      render(<QuickStatsWidget />);

      // Should be $104,230 not $104,230.00
      expect(screen.getByText('$104,230')).toBeInTheDocument();
      expect(screen.queryByText('$104,230.00')).not.toBeInTheDocument();
    });
  });
});
