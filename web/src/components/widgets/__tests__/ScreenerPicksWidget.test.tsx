import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreenerPicksWidget } from '../ScreenerPicksWidget';

describe('ScreenerPicksWidget', () => {
  describe('Rendering', () => {
    it('should render stock symbols', () => {
      render(<ScreenerPicksWidget />);

      expect(screen.getByText('PLTR')).toBeInTheDocument();
      expect(screen.getByText('SMCI')).toBeInTheDocument();
      expect(screen.getByText('COIN')).toBeInTheDocument();
      expect(screen.getByText('MSTR')).toBeInTheDocument();
    });

    it('should render stock prices', () => {
      render(<ScreenerPicksWidget />);

      expect(screen.getByText('$28.45')).toBeInTheDocument();
      expect(screen.getByText('$42.30')).toBeInTheDocument();
      expect(screen.getByText('$185.60')).toBeInTheDocument();
      expect(screen.getByText('$312.50')).toBeInTheDocument();
    });

    it('should render metric labels and values', () => {
      render(<ScreenerPicksWidget />);

      expect(screen.getByText('Growth:')).toBeInTheDocument();
      expect(screen.getByText('31%')).toBeInTheDocument();
      expect(screen.getByText('P/E:')).toBeInTheDocument();
      expect(screen.getByText('12.4')).toBeInTheDocument();
      expect(screen.getByText('Vol:')).toBeInTheDocument();
      expect(screen.getByText('8.2M')).toBeInTheDocument();
      expect(screen.getByText('RSI:')).toBeInTheDocument();
      expect(screen.getByText('68')).toBeInTheDocument();
    });

    it('should render change percentages', () => {
      render(<ScreenerPicksWidget />);

      expect(screen.getByText('+4.2%')).toBeInTheDocument();
      expect(screen.getByText('-1.8%')).toBeInTheDocument();
      expect(screen.getByText('+6.5%')).toBeInTheDocument();
      expect(screen.getByText('+3.1%')).toBeInTheDocument();
    });
  });

  describe('Star Ratings', () => {
    it('should render star ratings', () => {
      const { container } = render(<ScreenerPicksWidget />);

      // PLTR and MSTR have 5 stars, SMCI and COIN have 4 stars
      // Total: 5 + 4 + 4 + 5 = 18 stars
      const stars = container.querySelectorAll('.fill-yellow-500');
      expect(stars.length).toBe(18);
    });
  });

  describe('Change Styling', () => {
    it('should style positive changes in green', () => {
      const { container } = render(<ScreenerPicksWidget />);

      const profitElements = container.querySelectorAll('.text-profit');
      // 3 positive changes: PLTR, COIN, MSTR
      expect(profitElements.length).toBe(3);
    });

    it('should style negative changes in red', () => {
      const { container } = render(<ScreenerPicksWidget />);

      const lossElements = container.querySelectorAll('.text-loss');
      // 1 negative change: SMCI
      expect(lossElements.length).toBe(1);
    });
  });

  describe('Interaction', () => {
    it('should have hover effect on items', () => {
      const { container } = render(<ScreenerPicksWidget />);

      const items = container.querySelectorAll('.hover\\:bg-muted\\/50');
      expect(items.length).toBe(4);
    });

    it('should have cursor pointer on items', () => {
      const { container } = render(<ScreenerPicksWidget />);

      const items = container.querySelectorAll('.cursor-pointer');
      expect(items.length).toBe(4);
    });
  });
});
