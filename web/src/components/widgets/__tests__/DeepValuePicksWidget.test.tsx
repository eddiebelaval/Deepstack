import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeepValuePicksWidget } from '../DeepValuePicksWidget';

describe('DeepValuePicksWidget', () => {
  describe('Rendering', () => {
    it('should render value picks with symbols', () => {
      render(<DeepValuePicksWidget />);

      expect(screen.getByText('INTC')).toBeInTheDocument();
      expect(screen.getByText('BAC')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
      expect(screen.getByText('GOLD')).toBeInTheDocument();
    });

    it('should render company names', () => {
      render(<DeepValuePicksWidget />);

      expect(screen.getByText('Intel Corp')).toBeInTheDocument();
      expect(screen.getByText('Bank of America')).toBeInTheDocument();
      expect(screen.getByText('Ford Motor')).toBeInTheDocument();
      expect(screen.getByText('Barrick Gold')).toBeInTheDocument();
    });

    it('should render value scores', () => {
      render(<DeepValuePicksWidget />);

      expect(screen.getByText('92')).toBeInTheDocument();
      expect(screen.getByText('88')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('81')).toBeInTheDocument();
    });

    it('should render prices', () => {
      render(<DeepValuePicksWidget />);

      expect(screen.getByText('$24.50')).toBeInTheDocument();
      expect(screen.getByText('$32.15')).toBeInTheDocument();
      expect(screen.getByText('$11.20')).toBeInTheDocument();
      expect(screen.getByText('$17.85')).toBeInTheDocument();
    });

    it('should render upside percentages', () => {
      render(<DeepValuePicksWidget />);

      expect(screen.getByText('+38%')).toBeInTheDocument();
      expect(screen.getByText('+28%')).toBeInTheDocument();
      expect(screen.getByText('+42%')).toBeInTheDocument();
      expect(screen.getByText('+25%')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply hover styles to pick items', () => {
      const { container } = render(<DeepValuePicksWidget />);

      const items = container.querySelectorAll('.hover\\:bg-muted\\/50');
      expect(items.length).toBe(4);
    });

    it('should have cursor pointer on items', () => {
      const { container } = render(<DeepValuePicksWidget />);

      const items = container.querySelectorAll('.cursor-pointer');
      expect(items.length).toBe(4);
    });
  });
});
