import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolSearchDialog } from '../SymbolSearchDialog';
import { useWatchlistSync } from '@/hooks/useWatchlistSync';
import { useMarketDataStore } from '@/lib/stores/market-data-store';

// Mock dependencies
vi.mock('@/hooks/useWatchlistSync');
vi.mock('@/lib/stores/market-data-store');

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SymbolSearchDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockAddSymbol = vi.fn();
  const mockSubscribe = vi.fn();
  const mockGetActiveWatchlist = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    mockAddSymbol.mockResolvedValue(undefined);

    vi.mocked(useWatchlistSync).mockReturnValue({
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
        MSFT: { last: 420.00, changePercent: 2.1 },
      },
      subscribe: mockSubscribe,
    } as any);
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<SymbolSearchDialog open={false} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays title', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Add Symbol to Watchlist')).toBeInTheDocument();
    });

    it('displays description', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Search for a symbol or select from popular stocks')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByPlaceholderText(/search symbols/i)).toBeInTheDocument();
    });
  });

  describe('Popular Symbols', () => {
    it('renders Popular Symbols section', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Popular Symbols')).toBeInTheDocument();
    });

    it('shows popular symbols not already in watchlist', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      // SPY should be visible (not in watchlist)
      expect(screen.getByText('SPY')).toBeInTheDocument();
      // AAPL should not be visible in popular (already in watchlist)
    });

    it('displays symbol names', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('S&P 500 ETF')).toBeInTheDocument();
      expect(screen.getByText('Nasdaq-100 ETF')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters popular symbols based on search', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'tesla');

      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.queryByText('SPY')).not.toBeInTheDocument();
    });

    it('shows direct match option for unknown symbol', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'XYZ');

      expect(screen.getByText('XYZ')).toBeInTheDocument();
      expect(screen.getByText('Add this symbol to watchlist')).toBeInTheDocument();
    });

    it('allows adding any symbol via search', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'XYZ');

      // Should show direct add option
      expect(screen.getByText('Add this symbol to watchlist')).toBeInTheDocument();
    });
  });

  describe('Adding Symbols', () => {
    it('calls addSymbol when clicking a symbol row', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('SPY'));

      await waitFor(() => {
        expect(mockAddSymbol).toHaveBeenCalledWith('watchlist-1', 'SPY');
      });
    });

    it('subscribes to market data after adding', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('SPY'));

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith('SPY');
      });
    });

    it('adds symbol on Enter key press', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'NVDA{enter}');

      await waitFor(() => {
        expect(mockAddSymbol).toHaveBeenCalledWith('watchlist-1', 'NVDA');
      });
    });

    it('converts symbol to uppercase', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'goog{enter}');

      await waitFor(() => {
        expect(mockAddSymbol).toHaveBeenCalledWith('watchlist-1', 'GOOG');
      });
    });

    it('clears search after adding', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'XYZ{enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Recent Symbols', () => {
    it('loads recent symbols from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['TSLA', 'GOOGL']));

      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('Recently Added')).toBeInTheDocument();
    });

    it('does not show recent section when empty', () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.queryByText('Recently Added')).not.toBeInTheDocument();
    });

    it('filters recent symbols by search', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(['TSLA', 'GOOGL']));
      const user = userEvent.setup();

      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'TSLA');

      // TSLA should be visible (may appear multiple times)
      expect(screen.getAllByText('TSLA').length).toBeGreaterThan(0);
      expect(screen.queryByText('GOOGL')).not.toBeInTheDocument();
    });

    it('saves new symbol to recent', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      await user.click(screen.getByText('SPY'));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'deepstack-recent-symbols',
          expect.stringContaining('SPY')
        );
      });
    });
  });

  describe('Quote Display', () => {
    it('shows price for symbols with quotes', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('$500.50')).toBeInTheDocument();
    });

    it('shows positive change with TrendingUp icon', () => {
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByText('+1.50%')).toBeInTheDocument();
      expect(document.querySelector('.lucide-trending-up')).toBeInTheDocument();
    });
  });

  describe('No Active Watchlist', () => {
    it('does not add symbol when no active watchlist', async () => {
      vi.mocked(useWatchlistSync).mockReturnValue({
        addSymbol: mockAddSymbol,
        activeWatchlistId: null,
        getActiveWatchlist: () => null,
      } as any);

      const user = userEvent.setup();
      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      const input = screen.getByPlaceholderText(/search symbols/i);
      await user.type(input, 'SPY{enter}');

      expect(mockAddSymbol).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage parse error gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SymbolSearchDialog open={true} onOpenChange={mockOnOpenChange} />);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
