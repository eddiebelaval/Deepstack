import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ChartSkeleton,
  WatchlistSkeleton,
  OrderPanelSkeleton,
  PositionsSkeleton,
} from '../ChartSkeleton';

describe('ChartSkeleton', () => {
  describe('Default Rendering', () => {
    it('renders chart skeleton with toolbar', () => {
      const { container } = render(<ChartSkeleton />);

      const toolbar = container.querySelector('.border-b.border-border');
      expect(toolbar).toBeInTheDocument();
    });

    it('renders chart skeleton with volume bars', () => {
      const { container } = render(<ChartSkeleton showVolume />);

      // Check for volume section
      const volumeSection = container.querySelector('.border-t.border-border');
      expect(volumeSection).toBeInTheDocument();
    });

    it('renders chart area with candlesticks', () => {
      const { container } = render(<ChartSkeleton />);

      // Should have multiple skeleton bars for candlesticks
      const skeletons = container.querySelectorAll('.w-1');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Toolbar Display', () => {
    it('shows toolbar when showToolbar is true', () => {
      const { container } = render(<ChartSkeleton showToolbar={true} />);

      const toolbar = container.querySelector('.border-b.border-border');
      expect(toolbar).toBeInTheDocument();
    });

    it('hides toolbar when showToolbar is false', () => {
      const { container } = render(<ChartSkeleton showToolbar={false} />);

      const toolbar = container.querySelector('.border-b.border-border');
      expect(toolbar).not.toBeInTheDocument();
    });
  });

  describe('Volume Display', () => {
    it('shows volume bars when showVolume is true', () => {
      const { container } = render(<ChartSkeleton showVolume={true} />);

      const volumeSection = container.querySelector('.border-t.border-border');
      expect(volumeSection).toBeInTheDocument();
    });

    it('hides volume bars when showVolume is false', () => {
      const { container } = render(<ChartSkeleton showVolume={false} />);

      // Volume section has specific height of h-[60px]
      const volumeSection = container.querySelector('.h-\\[60px\\]');
      expect(volumeSection).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to chart skeleton', () => {
      const { container } = render(<ChartSkeleton className="custom-chart-class" />);

      expect(container.querySelector('.custom-chart-class')).toBeInTheDocument();
    });
  });

  describe('Chart Elements', () => {
    it('renders price axis skeleton', () => {
      const { container } = render(<ChartSkeleton />);

      // Check for right-side price axis
      const priceAxis = container.querySelector('.absolute.right-4');
      expect(priceAxis).toBeInTheDocument();
    });

    it('renders time axis skeleton', () => {
      const { container } = render(<ChartSkeleton />);

      // Check for bottom time axis
      const timeAxis = container.querySelector('.justify-between.mt-2');
      expect(timeAxis).toBeInTheDocument();
    });

    it('renders multiple candlestick bars', () => {
      const { container } = render(<ChartSkeleton />);

      const candlesticks = container.querySelectorAll('.w-1');
      expect(candlesticks.length).toBe(40); // Default is 40 bars
    });

    it('renders multiple volume bars when enabled', () => {
      const { container } = render(<ChartSkeleton showVolume={true} />);

      // Volume bars have specific flex-1 class
      const volumeContainer = container.querySelector('.h-\\[60px\\]');
      expect(volumeContainer).toBeInTheDocument();
    });
  });
});

describe('WatchlistSkeleton', () => {
  describe('Default Rendering', () => {
    it('renders default count of 5 items', () => {
      const { container } = render(<WatchlistSkeleton />);

      const items = container.querySelectorAll('.flex.items-center.justify-between.p-2');
      expect(items).toHaveLength(5);
    });

    it('renders custom count of items', () => {
      const { container } = render(<WatchlistSkeleton count={10} />);

      const items = container.querySelectorAll('.flex.items-center.justify-between.p-2');
      expect(items).toHaveLength(10);
    });
  });

  describe('Item Structure', () => {
    it('renders skeleton elements for each watchlist item', () => {
      const { container } = render(<WatchlistSkeleton count={3} />);

      // Each item should have skeleton for symbol and price
      const skeletons = container.querySelectorAll('.h-4, .h-3');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero count', () => {
      const { container } = render(<WatchlistSkeleton count={0} />);

      const items = container.querySelectorAll('.flex.items-center.justify-between.p-2');
      expect(items).toHaveLength(0);
    });

    it('handles large count', () => {
      const { container } = render(<WatchlistSkeleton count={50} />);

      const items = container.querySelectorAll('.flex.items-center.justify-between.p-2');
      expect(items).toHaveLength(50);
    });
  });
});

describe('OrderPanelSkeleton', () => {
  describe('Rendering', () => {
    it('renders order panel skeleton structure', () => {
      const { container } = render(<OrderPanelSkeleton />);

      // Check for main container
      const panel = container.querySelector('.p-4.space-y-4');
      expect(panel).toBeInTheDocument();
    });

    it('renders input field skeletons', () => {
      const { container } = render(<OrderPanelSkeleton />);

      // Should have multiple h-10 skeletons for input fields
      const inputSkeletons = container.querySelectorAll('.h-10.w-full');
      expect(inputSkeletons.length).toBeGreaterThan(0);
    });

    it('renders submit button skeleton', () => {
      const { container } = render(<OrderPanelSkeleton />);

      // Last h-10 should be the submit button
      const skeletons = container.querySelectorAll('.h-10.w-full');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders order summary section', () => {
      const { container } = render(<OrderPanelSkeleton />);

      // Order summary has justify-between items
      const summaryItems = container.querySelectorAll('.flex.justify-between');
      expect(summaryItems.length).toBeGreaterThan(0);
    });
  });
});

describe('PositionsSkeleton', () => {
  describe('Default Rendering', () => {
    it('renders default count of 3 positions', () => {
      const { container } = render(<PositionsSkeleton />);

      const positions = container.querySelectorAll('.p-3.rounded-lg.border');
      expect(positions).toHaveLength(3);
    });

    it('renders custom count of positions', () => {
      const { container } = render(<PositionsSkeleton count={5} />);

      const positions = container.querySelectorAll('.p-3.rounded-lg.border');
      expect(positions).toHaveLength(5);
    });
  });

  describe('Position Structure', () => {
    it('renders header skeleton', () => {
      const { container } = render(<PositionsSkeleton />);

      const header = container.querySelector('.border-b.border-border');
      expect(header).toBeInTheDocument();
    });

    it('renders position cards with borders', () => {
      const { container } = render(<PositionsSkeleton count={2} />);

      const borderedCards = container.querySelectorAll('.border.border-border');
      expect(borderedCards.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero count', () => {
      const { container } = render(<PositionsSkeleton count={0} />);

      const positions = container.querySelectorAll('.p-3.rounded-lg.border');
      expect(positions).toHaveLength(0);
    });

    it('handles single position', () => {
      const { container } = render(<PositionsSkeleton count={1} />);

      const positions = container.querySelectorAll('.p-3.rounded-lg.border');
      expect(positions).toHaveLength(1);
    });
  });

  describe('Layout and Spacing', () => {
    it('uses proper spacing between positions', () => {
      const { container } = render(<PositionsSkeleton />);

      const spacingContainer = container.querySelector('.space-y-3');
      expect(spacingContainer).toBeInTheDocument();
    });
  });
});

describe('Skeleton Consistency', () => {
  it('all skeletons use consistent sizing classes', () => {
    const { container: chart } = render(<ChartSkeleton />);
    const { container: watchlist } = render(<WatchlistSkeleton />);
    const { container: order } = render(<OrderPanelSkeleton />);
    const { container: positions } = render(<PositionsSkeleton />);

    // All should have Skeleton components (they all use similar patterns)
    [chart, watchlist, order, positions].forEach(container => {
      const skeletons = container.querySelectorAll('[class*="h-"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
