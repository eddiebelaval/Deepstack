import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingPanels } from '../FloatingPanels';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';

// Mock stores
vi.mock('@/lib/stores/ui-store');
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/lib/stores/watchlist-store');

// Mock Sheet component
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: any) => <h2 data-testid="sheet-title">{children}</h2>,
}));

// Mock DotScrollIndicator
vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: ({ className }: any) => (
    <div data-testid="dot-scroll-indicator" className={className}>Scroll Indicator</div>
  ),
}));

// Mock ScrollArea
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}));

describe('FloatingPanels', () => {
  const mockSetRightSidebarOpen = vi.fn();

  const mockWatchlist = {
    id: '1',
    name: 'My Watchlist',
    items: [
      { symbol: 'AAPL', added_at: new Date().toISOString() },
      { symbol: 'GOOGL', added_at: new Date().toISOString() },
      { symbol: 'MSFT', added_at: new Date().toISOString() },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      rightSidebarOpen: true,
      setRightSidebarOpen: mockSetRightSidebarOpen,
    });

    (useMarketDataStore as any).mockReturnValue({
      quotes: {
        AAPL: { last: 150.5, changePercent: 1.25 },
        GOOGL: { last: 2800.75, changePercent: -0.5 },
        MSFT: { last: 350.25, changePercent: 0.75 },
      },
      wsConnected: true,
    });

    (useWatchlistStore as any).mockReturnValue({
      getActiveWatchlist: () => mockWatchlist,
    });
  });

  describe('Rendering', () => {
    it('should render when rightSidebarOpen is true', () => {
      render(<FloatingPanels />);

      expect(screen.getByTestId('sheet')).toBeInTheDocument();
      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Market Data');
    });

    it('should not render when rightSidebarOpen is false', () => {
      (useUIStore as any).mockReturnValue({
        rightSidebarOpen: false,
        setRightSidebarOpen: mockSetRightSidebarOpen,
      });

      render(<FloatingPanels />);

      expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
    });

    it('should render watchlist widget with items', () => {
      render(<FloatingPanels />);

      expect(screen.getByText('My Watchlist')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('should render quick stats widget', () => {
      render(<FloatingPanels />);

      expect(screen.getByText('Quick Stats')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Day P&L')).toBeInTheDocument();
      expect(screen.getByText('Open Positions')).toBeInTheDocument();
      expect(screen.getByText('Buying Power')).toBeInTheDocument();
    });

    it('should render market status widget', () => {
      render(<FloatingPanels />);

      expect(screen.getByText('Market Status')).toBeInTheDocument();
    });
  });

  describe('Watchlist Widget', () => {
    it('should display prices from market data store', () => {
      render(<FloatingPanels />);

      expect(screen.getByText('$150.50')).toBeInTheDocument();
      expect(screen.getByText('$2800.75')).toBeInTheDocument();
      expect(screen.getByText('$350.25')).toBeInTheDocument();
    });

    it('should display price changes with correct styling', () => {
      render(<FloatingPanels />);

      const positiveChanges = screen.getAllByText(/\+1\.25%/);
      expect(positiveChanges[0]).toHaveClass('text-profit');

      const negativeChanges = screen.getAllByText(/-0\.50%/);
      expect(negativeChanges[0]).toHaveClass('text-loss');
    });

    it('should display up arrow for positive changes', () => {
      const { container } = render(<FloatingPanels />);

      // Check for TrendingUp icons (positive changes)
      const trendingUpIcons = container.querySelectorAll('[class*="lucide-trending-up"]');
      expect(trendingUpIcons.length).toBeGreaterThan(0);
    });

    it('should display down arrow for negative changes', () => {
      const { container } = render(<FloatingPanels />);

      // Check for TrendingDown icons (negative changes)
      const trendingDownIcons = container.querySelectorAll('[class*="lucide-trending-down"]');
      expect(trendingDownIcons.length).toBeGreaterThan(0);
    });

    it('should show placeholder when price is unavailable', () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: {
          AAPL: {}, // No `last` property
        },
        wsConnected: true,
      });

      render(<FloatingPanels />);

      // The placeholder shows "—" as fallback for undefined prices
      // May have multiple items without prices
      expect(screen.getAllByText(/\u0024—/).length).toBeGreaterThan(0);
    });

    it('should limit watchlist items to 8', () => {
      const largeWatchlist = {
        ...mockWatchlist,
        items: Array.from({ length: 15 }, (_, i) => ({
          symbol: `STOCK${i}`,
          added_at: new Date().toISOString(),
        })),
      };

      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => largeWatchlist,
      });

      const { container } = render(<FloatingPanels />);

      // Should only render first 8 items
      const watchlistItems = container.querySelectorAll('[class*="flex justify-between"]');
      expect(watchlistItems.length).toBeLessThanOrEqual(8 + 4); // 8 watchlist + 4 quick stats items
    });

    it('should not render watchlist widget when no active watchlist', () => {
      (useWatchlistStore as any).mockReturnValue({
        getActiveWatchlist: () => null,
      });

      render(<FloatingPanels />);

      expect(screen.queryByText('My Watchlist')).not.toBeInTheDocument();
    });
  });

  describe('Market Status Widget', () => {
    it('should show connected status when websocket is connected', () => {
      render(<FloatingPanels />);

      expect(screen.getByText('Live Data')).toBeInTheDocument();
    });

    it('should show disconnected status when websocket is not connected', () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
        wsConnected: false,
      });

      render(<FloatingPanels />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show correct indicator color for connected state', () => {
      const { container } = render(<FloatingPanels />);

      const connectedIndicator = screen.getByText('Live Data').previousElementSibling;
      expect(connectedIndicator).toHaveClass('bg-profit');
    });

    it('should show correct indicator color for disconnected state', () => {
      (useMarketDataStore as any).mockReturnValue({
        quotes: {},
        wsConnected: false,
      });

      const { container } = render(<FloatingPanels />);

      const disconnectedIndicator = screen.getByText('Disconnected').previousElementSibling;
      expect(disconnectedIndicator).toHaveClass('bg-loss');
    });
  });

  describe('Quick Stats Widget', () => {
    it('should display all portfolio stats', () => {
      render(<FloatingPanels />);

      expect(screen.getByText('$104,230')).toBeInTheDocument();
      expect(screen.getByText('+$1,240')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('$42,850')).toBeInTheDocument();
    });

    it('should style profit correctly', () => {
      render(<FloatingPanels />);

      const profitElement = screen.getByText('+$1,240');
      expect(profitElement).toHaveClass('text-profit');
    });
  });

  describe('Scroll Indicator', () => {
    it('should render dot scroll indicator', () => {
      render(<FloatingPanels />);

      // DotScrollIndicator should be present in the DOM
      expect(screen.getByTestId('dot-scroll-indicator')).toBeInTheDocument();
    });
  });
});
