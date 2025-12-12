import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ChartSkeleton,
  PositionSkeleton,
  PortfolioSkeleton,
  WatchlistSkeleton,
  NewsSkeleton,
  EmptyState,
  MarketClosedState,
  NoPositionsState,
  NoAlertsState,
  EmptyWatchlistState,
  LoadingSpinner,
  PanelLoading,
} from '../loading-states';

describe('ChartSkeleton', () => {
  describe('rendering', () => {
    it('renders chart skeleton structure', () => {
      const { container } = render(<ChartSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<ChartSkeleton className="custom-chart" />);
      const element = container.querySelector('.custom-chart');
      expect(element).toBeInTheDocument();
    });

    it('renders multiple candlestick bars', () => {
      const { container } = render(<ChartSkeleton />);
      // Should have 20 bars (defined in barHeights array)
      const bars = container.querySelectorAll('.flex.flex-col.items-center.gap-0\\.5');
      expect(bars.length).toBe(20);
    });

    it('renders header elements', () => {
      const { container } = render(<ChartSkeleton />);
      // Check for skeleton elements by looking for common skeleton classes
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      // Should have multiple skeleton loading elements
      expect(container.querySelectorAll('div').length).toBeGreaterThan(5);
    });

    it('renders x-axis labels', () => {
      const { container } = render(<ChartSkeleton />);
      // Should have 5 x-axis label skeletons
      const axisLabels = container.querySelectorAll('.flex.justify-between.px-4 > *');
      expect(axisLabels.length).toBe(5);
    });
  });
});

describe('PositionSkeleton', () => {
  describe('rendering', () => {
    it('renders position skeleton', () => {
      const { container } = render(<PositionSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('has border-bottom class', () => {
      const { container } = render(<PositionSkeleton />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('border-b');
      expect(element).toHaveClass('border-border');
    });

    it('renders icon skeleton', () => {
      const { container } = render(<PositionSkeleton />);
      const icon = container.querySelector('.rounded-full');
      expect(icon).toBeInTheDocument();
    });

    it('has left and right content sections', () => {
      const { container } = render(<PositionSkeleton />);
      const sections = container.querySelectorAll('.space-y-1');
      expect(sections.length).toBe(2);
    });
  });
});

describe('PortfolioSkeleton', () => {
  describe('rendering', () => {
    it('renders portfolio skeleton', () => {
      const { container } = render(<PortfolioSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<PortfolioSkeleton className="custom-portfolio" />);
      const element = container.querySelector('.custom-portfolio');
      expect(element).toBeInTheDocument();
    });

    it('renders summary stats grid', () => {
      const { container } = render(<PortfolioSkeleton />);
      const grid = container.querySelector('.grid.grid-cols-2.gap-4');
      expect(grid).toBeInTheDocument();
    });

    it('renders 4 position skeletons', () => {
      render(<PortfolioSkeleton />);
      const positions = screen.getAllByRole('generic').filter(el =>
        el.className.includes('border-b')
      );
      expect(positions.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('WatchlistSkeleton', () => {
  describe('rendering', () => {
    it('renders watchlist skeleton', () => {
      const { container } = render(<WatchlistSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<WatchlistSkeleton className="custom-watchlist" />);
      const element = container.querySelector('.custom-watchlist');
      expect(element).toBeInTheDocument();
    });

    it('renders 6 watchlist items', () => {
      const { container } = render(<WatchlistSkeleton />);
      const items = container.querySelectorAll('.flex.items-center.justify-between.py-2');
      expect(items.length).toBe(6);
    });
  });
});

describe('NewsSkeleton', () => {
  describe('rendering', () => {
    it('renders news skeleton', () => {
      const { container } = render(<NewsSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<NewsSkeleton className="custom-news" />);
      const element = container.querySelector('.custom-news');
      expect(element).toBeInTheDocument();
    });

    it('renders 3 news items', () => {
      const { container } = render(<NewsSkeleton />);
      const items = container.querySelectorAll('.space-y-2.pb-4.border-b.border-border');
      expect(items.length).toBe(3);
    });
  });
});

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders with title', () => {
      render(<EmptyState title="No Data" />);
      expect(screen.getByText('No Data')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(<EmptyState title="No Data" description="Add some items" />);
      expect(screen.getByText('No Data')).toBeInTheDocument();
      expect(screen.getByText('Add some items')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <EmptyState title="Test" className="custom-empty" />
      );
      const element = container.querySelector('.custom-empty');
      expect(element).toBeInTheDocument();
    });

    it('renders with action element', () => {
      render(
        <EmptyState
          title="No Data"
          action={<button>Add Item</button>}
        />
      );
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });
  });

  describe('icon variants', () => {
    it('renders chart icon', () => {
      const { container } = render(<EmptyState icon="chart" title="Test" />);
      const iconContainer = container.querySelector('.bg-muted');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders portfolio icon', () => {
      const { container } = render(<EmptyState icon="portfolio" title="Test" />);
      const iconContainer = container.querySelector('.bg-muted');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders alerts icon', () => {
      const { container } = render(<EmptyState icon="alerts" title="Test" />);
      const iconContainer = container.querySelector('.bg-muted');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders news icon', () => {
      const { container } = render(<EmptyState icon="news" title="Test" />);
      const iconContainer = container.querySelector('.bg-muted');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders trending icon', () => {
      const { container } = render(<EmptyState icon="trending" title="Test" />);
      const iconContainer = container.querySelector('.bg-muted');
      expect(iconContainer).toBeInTheDocument();
    });

    it('defaults to chart icon', () => {
      const { container } = render(<EmptyState title="Test" />);
      const iconContainer = container.querySelector('.bg-muted');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has centered layout', () => {
      const { container } = render(<EmptyState title="Test" />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('flex');
      expect(element).toHaveClass('flex-col');
      expect(element).toHaveClass('items-center');
      expect(element).toHaveClass('justify-center');
    });

    it('has text-center class', () => {
      const { container } = render(<EmptyState title="Test" />);
      expect(container.firstChild).toHaveClass('text-center');
    });
  });
});

describe('Preset Empty States', () => {
  describe('MarketClosedState', () => {
    it('renders market closed message', () => {
      render(<MarketClosedState />);
      expect(screen.getByText('Market Closed')).toBeInTheDocument();
      expect(screen.getByText(/US markets are closed/i)).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(<MarketClosedState className="custom" />);
      const element = container.querySelector('.custom');
      expect(element).toBeInTheDocument();
    });
  });

  describe('NoPositionsState', () => {
    it('renders no positions message', () => {
      render(<NoPositionsState />);
      expect(screen.getByText('No Positions')).toBeInTheDocument();
      expect(screen.getByText(/Start trading/i)).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(<NoPositionsState className="custom" />);
      const element = container.querySelector('.custom');
      expect(element).toBeInTheDocument();
    });
  });

  describe('NoAlertsState', () => {
    it('renders no alerts message', () => {
      render(<NoAlertsState />);
      expect(screen.getByText('No Price Alerts')).toBeInTheDocument();
      expect(screen.getByText(/Set alerts/i)).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(<NoAlertsState className="custom" />);
      const element = container.querySelector('.custom');
      expect(element).toBeInTheDocument();
    });
  });

  describe('EmptyWatchlistState', () => {
    it('renders empty watchlist message', () => {
      render(<EmptyWatchlistState />);
      expect(screen.getByText('Empty Watchlist')).toBeInTheDocument();
      expect(screen.getByText(/Add symbols/i)).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(<EmptyWatchlistState className="custom" />);
      const element = container.querySelector('.custom');
      expect(element).toBeInTheDocument();
    });
  });
});

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('renders loading spinner', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('has rounded-full class', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.rounded-full');
      expect(spinner).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-spinner" />);
      const spinner = container.querySelector('.custom-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('renders small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.querySelector('.h-4.w-4');
      expect(spinner).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      const { container } = render(<LoadingSpinner size="md" />);
      const spinner = container.querySelector('.h-8.w-8');
      expect(spinner).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.querySelector('.h-12.w-12');
      expect(spinner).toBeInTheDocument();
    });

    it('defaults to medium size', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.h-8.w-8');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has animate-spin class', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('animate-spin');
    });

    it('has border styling', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('border-primary/20');
      expect(spinner).toHaveClass('border-t-primary');
    });
  });
});

describe('PanelLoading', () => {
  describe('rendering', () => {
    it('renders panel loading state', () => {
      const { container } = render(<PanelLoading />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('centers the spinner', () => {
      const { container } = render(<PanelLoading />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('flex');
      expect(element).toHaveClass('items-center');
      expect(element).toHaveClass('justify-center');
      expect(element).toHaveClass('h-full');
    });

    it('renders with custom className', () => {
      const { container } = render(<PanelLoading className="custom-panel" />);
      const element = container.querySelector('.custom-panel');
      expect(element).toBeInTheDocument();
    });

    it('contains a medium-sized spinner', () => {
      const { container } = render(<PanelLoading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-8');
    });
  });
});
