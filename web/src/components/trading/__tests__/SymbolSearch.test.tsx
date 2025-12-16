import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolSearch } from '../SymbolSearch';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useWatchlistStore } from '@/lib/stores/watchlist-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';

// Mock stores
vi.mock('@/lib/stores/trading-store');
vi.mock('@/lib/stores/watchlist-store');
vi.mock('@/lib/stores/market-data-store');

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SymbolSearch', () => {
  const mockSetActiveSymbol = vi.fn();
  const mockAddSymbol = vi.fn();
  const mockGetActiveWatchlist = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    vi.mocked(useTradingStore).mockReturnValue({
      setActiveSymbol: mockSetActiveSymbol,
    } as any);

    vi.mocked(useWatchlistStore).mockReturnValue({
      addSymbol: mockAddSymbol,
      activeWatchlistId: 'watchlist-1',
      getActiveWatchlist: mockGetActiveWatchlist,
    } as any);

    mockGetActiveWatchlist.mockReturnValue({
      id: 'watchlist-1',
      name: 'My Watchlist',
      items: [{ symbol: 'AAPL', addedAt: '2024-01-01' }],
    });

    vi.mocked(useMarketDataStore).mockReturnValue({
      quotes: {
        SPY: { last: 500.50, changePercent: 1.5 },
        AAPL: { last: 185.00, changePercent: -0.5 },
      },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Controlled Mode', () => {
    it('renders dialog when open is true', () => {
      const mockOnOpenChange = vi.fn();
      render(<SymbolSearch open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      const mockOnOpenChange = vi.fn();
      render(<SymbolSearch open={false} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('starts closed by default', () => {
      render(<SymbolSearch />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('opens on Cmd+K', async () => {
      render(<SymbolSearch />);

      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('opens on Ctrl+K', async () => {
      render(<SymbolSearch />);

      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('toggles on repeated Cmd+K', async () => {
      render(<SymbolSearch />);

      // Open
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Content', () => {
    it('renders search input', () => {
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByPlaceholderText(/search symbols/i)).toBeInTheDocument();
    });

    it('renders Popular section', () => {
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('Popular')).toBeInTheDocument();
    });

    it('renders All Symbols section', () => {
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('All Symbols')).toBeInTheDocument();
    });

    it('renders popular symbols', () => {
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('QQQ')).toBeInTheDocument();
      expect(screen.getByText('NVDA')).toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'XYZNONEXISTENT');

      expect(screen.getByText('No symbols found.')).toBeInTheDocument();
    });
  });

  describe('Recent Searches', () => {
    it('loads recent searches from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['TSLA', 'GOOGL']));

      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('Recent')).toBeInTheDocument();
    });

    it('does not show Recent section when no recent searches', () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    });
  });

  describe('Symbol Selection', () => {
    it('calls setActiveSymbol when symbol is selected', async () => {
      const user = userEvent.setup();
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      await user.click(screen.getByText('SPY'));

      expect(mockSetActiveSymbol).toHaveBeenCalledWith('SPY');
    });

    it('saves selected symbol to recent searches', async () => {
      const user = userEvent.setup();
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      await user.click(screen.getByText('SPY'));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'deepstack-recent-searches',
        expect.stringContaining('SPY')
      );
    });

    it('closes dialog after selection', async () => {
      const mockOnOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<SymbolSearch open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('SPY'));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Quote Display', () => {
    it('displays price and change for symbols with quotes', () => {
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText(/\$500\.50/)).toBeInTheDocument();
      expect(screen.getByText(/\+1\.50%/)).toBeInTheDocument();
    });
  });

  describe('Add to Watchlist', () => {
    it('shows star icon for symbols already in watchlist', () => {
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      // AAPL is already in watchlist
      const starIcons = document.querySelectorAll('.lucide-star');
      expect(starIcons.length).toBeGreaterThan(0);
    });

    it('shows plus button for symbols not in watchlist', () => {
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      const plusButtons = document.querySelectorAll('.lucide-plus');
      expect(plusButtons.length).toBeGreaterThan(0);
    });

    it('calls addSymbol when plus button is clicked', async () => {
      const user = userEvent.setup();
      render(<SymbolSearch open={true} onOpenChange={vi.fn()} />);

      // Find a plus button for a symbol not in watchlist
      const plusButton = document.querySelector('.lucide-plus')?.closest('button');
      if (plusButton) {
        await user.click(plusButton);
        expect(mockAddSymbol).toHaveBeenCalled();
      }
    });
  });

  describe('Cleanup', () => {
    it('removes keyboard event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(<SymbolSearch />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});
