import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StreamingTicker } from '../StreamingTicker';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import { useUIStore } from '@/lib/stores/ui-store';

// Mock stores
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/lib/stores/watchlist-store');
vi.mock('@/lib/stores/ui-store');

// Mock ConnectionDot component
vi.mock('@/components/ui/ConnectionStatusIndicator', () => ({
  ConnectionDot: () => <div data-testid="connection-dot">ConnectionDot</div>,
}));

describe('StreamingTicker', () => {
  const mockQuotes = {
    SPY: { last: 450.5, changePercent: 0.5 },
    QQQ: { last: 380.25, changePercent: -0.25 },
    VIX: { last: 15.5, changePercent: 2.5 },
    NVDA: { last: 850.75, changePercent: 3.2 },
    TSLA: { last: 250.0, changePercent: -1.5 },
    'BTC/USD': { last: 65000, changePercent: 5.0 },
    'ETH/USD': { last: 3500.5, changePercent: -2.0 },
    'SOL/USD': { last: 150.25, changePercent: 8.5 },
  };

  const mockWatchlist = {
    id: '1',
    name: 'My Watchlist',
    items: [{ symbol: 'AAPL', added_at: new Date().toISOString() }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    (useMarketDataStore as any).mockReturnValue({
      quotes: mockQuotes,
      wsConnected: true,
    });

    (useWatchlistStore as any).mockReturnValue({
      getActiveWatchlist: () => mockWatchlist,
    });

    (useUIStore as any).mockReturnValue({
      leftSidebarOpen: true,
      rightSidebarOpen: true,
    });

    // Mock fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ quotes: mockQuotes }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render the ticker container', () => {
      const { container } = render(<StreamingTicker />);

      expect(container.querySelector('.led-ticker-container')).toBeInTheDocument();
    });

    it('should render connection status indicator', () => {
      render(<StreamingTicker />);

      expect(screen.getByTestId('connection-dot')).toBeInTheDocument();
    });

    it('should render ticker items from store', () => {
      render(<StreamingTicker />);

      // Symbols are rendered synchronously from store quotes
      expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
    });
  });

  describe('Symbol Display', () => {
    it('should display stock symbols correctly', () => {
      render(<StreamingTicker />);

      // Ticker items are duplicated 3x for infinite scroll
      expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
      expect(screen.getAllByText('QQQ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('VIX').length).toBeGreaterThan(0);
    });

    it('should display crypto symbols without slash', () => {
      render(<StreamingTicker />);

      // BTC/USD becomes BTC
      expect(screen.getAllByText('BTC').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ETH').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SOL').length).toBeGreaterThan(0);
    });

    it('should apply special styling to crypto symbols', () => {
      render(<StreamingTicker />);

      const btcSymbols = screen.getAllByText('BTC');
      expect(btcSymbols[0]).toHaveClass('text-amber-400');
    });
  });

  describe('Price Display', () => {
    it('should display prices with 2 decimals for stocks', () => {
      render(<StreamingTicker />);

      expect(screen.getAllByText('450.50').length).toBeGreaterThan(0);
      expect(screen.getAllByText('380.25').length).toBeGreaterThan(0);
    });

    it('should display crypto prices with appropriate decimals', () => {
      render(<StreamingTicker />);

      // BTC price is over 100, so shows 0 decimals
      expect(screen.getAllByText('65000').length).toBeGreaterThan(0);
      // ETH price is also over 100, so shows 0 decimals (3500.5 -> 3501)
      expect(screen.getAllByText('3501').length).toBeGreaterThan(0);
    });

    it('should show placeholder when price is unavailable', async () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
        wsConnected: true,
      });

      render(<StreamingTicker />);

      await waitFor(() => {
        const placeholders = screen.getAllByText('—');
        expect(placeholders.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Change Percentage Display', () => {
    it('should display positive changes with up arrow', async () => {
      render(<StreamingTicker />);

      await waitFor(() => {
        const positiveChanges = screen.getAllByText(/0\.50%/);
        expect(positiveChanges.length).toBeGreaterThan(0);
      });
    });

    it('should display negative changes with down arrow', async () => {
      render(<StreamingTicker />);

      await waitFor(() => {
        const negativeChanges = screen.getAllByText(/0\.25%/);
        expect(negativeChanges.length).toBeGreaterThan(0);
      });
    });

    it('should apply profit color to positive changes', async () => {
      const { container } = render(<StreamingTicker />);

      await waitFor(() => {
        const profitElements = container.querySelectorAll('.led-profit');
        expect(profitElements.length).toBeGreaterThan(0);
      });
    });

    it('should apply loss color to negative changes', async () => {
      const { container } = render(<StreamingTicker />);

      await waitFor(() => {
        const lossElements = container.querySelectorAll('.led-loss');
        expect(lossElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Margins', () => {
    it('should calculate left margin based on sidebar state', () => {
      const { container } = render(<StreamingTicker />);

      const ticker = container.querySelector('.led-ticker-container') as HTMLElement;
      expect(ticker?.style.left).toBe('256px'); // LEFT_SIDEBAR_EXPANDED
    });

    it('should calculate left margin when sidebar is collapsed', () => {
      (useUIStore as any).mockReturnValue({
        leftSidebarOpen: false,
        rightSidebarOpen: true,
      });

      const { container } = render(<StreamingTicker />);

      const ticker = container.querySelector('.led-ticker-container') as HTMLElement;
      expect(ticker?.style.left).toBe('56px'); // LEFT_SIDEBAR_COLLAPSED
    });

    it('should calculate right margin based on sidebar state', () => {
      const { container } = render(<StreamingTicker />);

      const ticker = container.querySelector('.led-ticker-container') as HTMLElement;
      expect(ticker?.style.right).toBe('384px'); // RIGHT_TOOLBAR_WIDTH + RIGHT_SIDEBAR_EXPANDED
    });

    it('should calculate right margin when sidebar is closed', () => {
      (useUIStore as any).mockReturnValue({
        leftSidebarOpen: true,
        rightSidebarOpen: false,
      });

      const { container } = render(<StreamingTicker />);

      const ticker = container.querySelector('.led-ticker-container') as HTMLElement;
      expect(ticker?.style.right).toBe('48px'); // RIGHT_TOOLBAR_WIDTH only
    });
  });

  describe('Watchlist Integration', () => {
    it('should include watchlist symbols in ticker', async () => {
      render(<StreamingTicker />);

      await waitFor(() => {
        // Should show AAPL from watchlist
        expect(fetchMock).toHaveBeenCalled();
        const callArgs = fetchMock.mock.calls[0][0];
        expect(callArgs).toContain('AAPL');
      });
    });

    it('should deduplicate symbols from watchlist', async () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => ({
          ...mockWatchlist,
          items: [{ symbol: 'SPY', added_at: new Date().toISOString() }],
        }),
      });

      render(<StreamingTicker />);

      await waitFor(() => {
        const callArgs = fetchMock.mock.calls[0][0];
        const symbolsMatch = callArgs.match(/SPY/g);
        // SPY should appear only once in the query string
        expect(symbolsMatch?.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch quotes on mount', async () => {
      render(<StreamingTicker />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    it('should include all symbols in fetch request', async () => {
      render(<StreamingTicker />);

      await waitFor(() => {
        const callArgs = fetchMock.mock.calls[0][0];
        expect(callArgs).toContain('/api/market/quotes?symbols=');
        expect(callArgs).toContain('SPY');
        expect(callArgs).toContain('QQQ');
        expect(callArgs).toContain('BTC/USD');
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      render(<StreamingTicker />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error fetching ticker quotes:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Animation', () => {
    it('should have animation class', () => {
      const { container } = render(<StreamingTicker />);

      const tickerContent = container.querySelector('.animate-ticker-led');
      expect(tickerContent).toBeInTheDocument();
    });

    it('should triplicate items for infinite scroll', async () => {
      render(<StreamingTicker />);

      await waitFor(() => {
        // Each symbol should appear 3 times due to triplication
        const spyElements = screen.getAllByText('SPY');
        expect(spyElements.length).toBe(3);
      });
    });
  });

  describe('Edge Gradients', () => {
    it('should have left fade gradient', () => {
      const { container } = render(<StreamingTicker />);

      const leftGradient = container.querySelector('.led-fade-left');
      expect(leftGradient).toBeInTheDocument();
    });

    it('should have right fade gradient', () => {
      const { container } = render(<StreamingTicker />);

      const rightGradient = container.querySelector('.led-fade-right');
      expect(rightGradient).toBeInTheDocument();
    });
  });

  describe('Visibility', () => {
    it('should be visible by default', () => {
      const { container } = render(<StreamingTicker />);

      expect(container.querySelector('.led-ticker-container')).toBeInTheDocument();
    });

    it('should have fixed positioning', () => {
      const { container } = render(<StreamingTicker />);

      const ticker = container.querySelector('.led-ticker-container');
      expect(ticker).toHaveClass('fixed');
      expect(ticker).toHaveClass('top-0');
    });

    it('should have correct z-index', () => {
      const { container } = render(<StreamingTicker />);

      const ticker = container.querySelector('.led-ticker-container');
      expect(ticker).toHaveClass('z-40');
    });
  });

  describe('Default Symbols', () => {
    it('should include default indices', () => {
      render(<StreamingTicker />);

      expect(screen.getAllByText('SPY').length).toBeGreaterThan(0);
      expect(screen.getAllByText('QQQ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('VIX').length).toBeGreaterThan(0);
    });

    it('should include top movers', () => {
      render(<StreamingTicker />);

      expect(screen.getAllByText('NVDA').length).toBeGreaterThan(0);
      expect(screen.getAllByText('TSLA').length).toBeGreaterThan(0);
    });

    it('should include crypto symbols', () => {
      render(<StreamingTicker />);

      expect(screen.getAllByText('BTC').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ETH').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SOL').length).toBeGreaterThan(0);
    });
  });
});
