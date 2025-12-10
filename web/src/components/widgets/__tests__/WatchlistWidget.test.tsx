import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WatchlistWidget } from '../WatchlistWidget';

// Mock the stores
vi.mock('@/lib/stores/market-data-store', () => ({
  useMarketDataStore: vi.fn(),
}));

vi.mock('@/lib/stores/watchlist-store', () => ({
  useWatchlistStore: vi.fn(),
}));

import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';

describe('WatchlistWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering with Data', () => {
    it('renders watchlist symbols', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [
            { symbol: 'SPY' },
            { symbol: 'AAPL' },
            { symbol: 'TSLA' },
          ],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      render(<WatchlistWidget />);

      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });

    it('displays quote data when available', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.51,
            changePercent: 0.25,
          },
        },
      });

      render(<WatchlistWidget />);

      expect(screen.getByText('$596.51')).toBeInTheDocument();
      expect(screen.getByText('+0.25%')).toBeInTheDocument();
    });

    it('shows positive change in profit color', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.51,
            changePercent: 1.25,
          },
        },
      });

      const { container } = render(<WatchlistWidget />);

      const changeElement = container.querySelector('.text-profit');
      expect(changeElement).toBeInTheDocument();
      expect(changeElement?.textContent).toContain('+1.25%');
    });

    it('shows negative change in loss color', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'AAPL' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          AAPL: {
            last: 195.25,
            changePercent: -1.5,
          },
        },
      });

      const { container } = render(<WatchlistWidget />);

      const changeElement = container.querySelector('.text-loss');
      expect(changeElement).toBeInTheDocument();
      expect(changeElement?.textContent).toContain('-1.50%');
    });

    it('displays trending up icon for positive change', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.51,
            changePercent: 0.5,
          },
        },
      });

      const { container } = render(<WatchlistWidget />);

      // Check for TrendingUp icon by looking for profit color
      const trendingIcon = container.querySelector('.text-profit .h-3.w-3');
      expect(trendingIcon).toBeInTheDocument();
    });

    it('displays trending down icon for negative change', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.51,
            changePercent: -0.5,
          },
        },
      });

      const { container } = render(<WatchlistWidget />);

      // Check for TrendingDown icon by looking for loss color
      const trendingIcon = container.querySelector('.text-loss .h-3.w-3');
      expect(trendingIcon).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no watchlist items', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      render(<WatchlistWidget />);

      expect(screen.getByText('No symbols in watchlist')).toBeInTheDocument();
    });

    it('shows empty state icon when no items', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      const { container } = render(<WatchlistWidget />);

      const emptyIcon = container.querySelector('.h-8.w-8');
      expect(emptyIcon).toBeInTheDocument();
    });
  });

  describe('Missing Quote Data', () => {
    it('shows placeholder when quote data is missing', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {}, // No quote for SPY
      });

      render(<WatchlistWidget />);

      expect(screen.getByText('$—')).toBeInTheDocument();
    });

    it('does not show change percent when quote is missing', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      const { container } = render(<WatchlistWidget />);

      // Should not have change percent elements
      expect(container.querySelector('.text-profit')).not.toBeInTheDocument();
      expect(container.querySelector('.text-loss')).not.toBeInTheDocument();
    });
  });

  describe('Item Limit', () => {
    it('limits display to 8 symbols', () => {
      const manySymbols = Array.from({ length: 12 }, (_, i) => ({
        symbol: `SYM${i + 1}`,
      }));

      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: manySymbols,
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      render(<WatchlistWidget />);

      // Should show first 8
      expect(screen.getByText('SYM1')).toBeInTheDocument();
      expect(screen.getByText('SYM8')).toBeInTheDocument();

      // Should not show 9th and beyond
      expect(screen.queryByText('SYM9')).not.toBeInTheDocument();
      expect(screen.queryByText('SYM12')).not.toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover styles to symbol rows', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      const { container } = render(<WatchlistWidget />);

      const hoverElement = container.querySelector('.hover\\:bg-muted\\/50');
      expect(hoverElement).toBeInTheDocument();
    });

    it('applies cursor pointer to clickable rows', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      const { container } = render(<WatchlistWidget />);

      const clickableElement = container.querySelector('.cursor-pointer');
      expect(clickableElement).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('formats price to 2 decimal places', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.5123,
            changePercent: 0,
          },
        },
      });

      render(<WatchlistWidget />);

      expect(screen.getByText('$596.51')).toBeInTheDocument();
    });

    it('formats change percent to 2 decimal places', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.51,
            changePercent: 1.234,
          },
        },
      });

      render(<WatchlistWidget />);

      expect(screen.getByText('+1.23%')).toBeInTheDocument();
    });

    it('adds plus sign for positive changes', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.51,
            changePercent: 0.5,
          },
        },
      });

      render(<WatchlistWidget />);

      const changeText = screen.getByText(/\+0\.50%/);
      expect(changeText).toBeInTheDocument();
    });

    it('does not add plus sign for negative changes', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          SPY: {
            last: 596.51,
            changePercent: -0.5,
          },
        },
      });

      render(<WatchlistWidget />);

      const changeText = screen.getByText(/-0\.50%/);
      expect(changeText).toBeInTheDocument();
      expect(changeText.textContent).not.toContain('+-');
    });
  });

  describe('Fallback Data', () => {
    it('shows fallback symbols when no watchlist is active', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => null,
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      render(<WatchlistWidget />);

      // Should show default symbols
      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('QQQ')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('shows fallback when watchlist items is undefined', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: undefined,
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      render(<WatchlistWidget />);

      // Should show default symbols
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });
  });

  describe('Layout and Spacing', () => {
    it('uses proper spacing between items', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          items: [{ symbol: 'SPY' }, { symbol: 'AAPL' }],
        }),
      });

      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
      });

      const { container } = render(<WatchlistWidget />);

      const spacingContainer = container.querySelector('.space-y-1');
      expect(spacingContainer).toBeInTheDocument();
    });
  });
});
