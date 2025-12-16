import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightsLatestWidget } from '../InsightsLatestWidget';

describe('InsightsLatestWidget', () => {
  describe('Rendering', () => {
    it('should render insight text', () => {
      render(<InsightsLatestWidget />);

      expect(screen.getByText(/NVDA forming bullish flag pattern/)).toBeInTheDocument();
      expect(screen.getByText(/High correlation detected/)).toBeInTheDocument();
      expect(screen.getByText(/Your win rate on energy plays/)).toBeInTheDocument();
    });

    it('should render insight categories', () => {
      render(<InsightsLatestWidget />);

      expect(screen.getByText('opportunity')).toBeInTheDocument();
      expect(screen.getByText('risk')).toBeInTheDocument();
      expect(screen.getByText('analysis')).toBeInTheDocument();
    });
  });

  describe('Confidence Display', () => {
    it('should render confidence percentages', () => {
      render(<InsightsLatestWidget />);

      expect(screen.getByText('82%')).toBeInTheDocument();
      expect(screen.getByText('91%')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    it('should render confidence progress bars', () => {
      const { container } = render(<InsightsLatestWidget />);

      // Look for confidence bars (divs with percentage-based width)
      const progressBars = container.querySelectorAll('.h-1.bg-muted');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Category Icons', () => {
    it('should render different icons for different categories', () => {
      const { container } = render(<InsightsLatestWidget />);

      // Each insight has a category icon
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Time Display', () => {
    it('should render time ago for insights', () => {
      const { container } = render(<InsightsLatestWidget />);

      // Times should be displayed (format depends on current time)
      const timeElements = container.querySelectorAll('.text-muted-foreground');
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Interaction', () => {
    it('should have hover effect on insight cards', () => {
      const { container } = render(<InsightsLatestWidget />);

      const cards = container.querySelectorAll('.hover\\:bg-muted\\/30');
      expect(cards.length).toBe(3);
    });

    it('should have cursor pointer on insight cards', () => {
      const { container } = render(<InsightsLatestWidget />);

      const cards = container.querySelectorAll('.cursor-pointer');
      expect(cards.length).toBe(3);
    });
  });
});
