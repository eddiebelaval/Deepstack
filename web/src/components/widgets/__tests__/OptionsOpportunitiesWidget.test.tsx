import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OptionsOpportunitiesWidget } from '../OptionsOpportunitiesWidget';

describe('OptionsOpportunitiesWidget', () => {
  describe('Rendering', () => {
    it('should render option symbols', () => {
      render(<OptionsOpportunitiesWidget />);

      expect(screen.getByText('NVDA')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('AMD')).toBeInTheDocument();
    });

    it('should render option types', () => {
      render(<OptionsOpportunitiesWidget />);

      // NVDA, SPY, AMD are calls, TSLA is put
      const callLabels = screen.getAllByText('call');
      const putLabels = screen.getAllByText('put');

      expect(callLabels.length).toBe(3);
      expect(putLabels.length).toBe(1);
    });

    it('should render strike prices', () => {
      render(<OptionsOpportunitiesWidget />);

      expect(screen.getByText('$500')).toBeInTheDocument();
      expect(screen.getByText('$180')).toBeInTheDocument();
      expect(screen.getByText('$580')).toBeInTheDocument();
      expect(screen.getByText('$140')).toBeInTheDocument();
    });

    it('should render expiry dates', () => {
      render(<OptionsOpportunitiesWidget />);

      expect(screen.getByText('2/16')).toBeInTheDocument();
      expect(screen.getByText('2/23')).toBeInTheDocument();
      expect(screen.getByText('3/15')).toBeInTheDocument();
      expect(screen.getByText('2/9')).toBeInTheDocument();
    });

    it('should render volume in K format', () => {
      render(<OptionsOpportunitiesWidget />);

      // Volumes: 12450/1000=12.4, 8920/1000=8.9, 15670/1000=15.7, 6340/1000=6.3
      expect(screen.getByText('12.4K')).toBeInTheDocument();
      expect(screen.getByText('8.9K')).toBeInTheDocument();
      expect(screen.getByText('15.7K')).toBeInTheDocument();
      expect(screen.getByText('6.3K')).toBeInTheDocument();
    });

    it('should render premium prices', () => {
      render(<OptionsOpportunitiesWidget />);

      expect(screen.getByText('$8.50')).toBeInTheDocument();
      expect(screen.getByText('$5.20')).toBeInTheDocument();
      expect(screen.getByText('$12.30')).toBeInTheDocument();
      expect(screen.getByText('$3.75')).toBeInTheDocument();
    });
  });

  describe('Sentiment Indicators', () => {
    it('should render bullish indicators for bullish sentiment', () => {
      const { container } = render(<OptionsOpportunitiesWidget />);

      // Bullish sentiment should show up arrow (ArrowUp icon)
      const profitIcons = container.querySelectorAll('.text-profit');
      expect(profitIcons.length).toBeGreaterThan(0);
    });

    it('should render bearish indicators for bearish sentiment', () => {
      const { container } = render(<OptionsOpportunitiesWidget />);

      // Bearish sentiment should show down arrow (ArrowDown icon)
      const lossIcons = container.querySelectorAll('.text-loss');
      expect(lossIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Option Type Styling', () => {
    it('should style call options in green', () => {
      const { container } = render(<OptionsOpportunitiesWidget />);

      const callElements = container.querySelectorAll('.text-profit');
      expect(callElements.length).toBeGreaterThan(0);
    });

    it('should style put options in red', () => {
      const { container } = render(<OptionsOpportunitiesWidget />);

      const putElements = container.querySelectorAll('.text-loss');
      expect(putElements.length).toBeGreaterThan(0);
    });
  });

  describe('Interaction', () => {
    it('should have hover effect on items', () => {
      const { container } = render(<OptionsOpportunitiesWidget />);

      const items = container.querySelectorAll('.hover\\:bg-muted\\/50');
      expect(items.length).toBe(4);
    });

    it('should have cursor pointer on items', () => {
      const { container } = render(<OptionsOpportunitiesWidget />);

      const items = container.querySelectorAll('.cursor-pointer');
      expect(items.length).toBe(4);
    });
  });
});
