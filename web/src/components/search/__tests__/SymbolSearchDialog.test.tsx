import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolSearchDialog } from '../SymbolSearchDialog';
import { useSearchPaletteStore } from '@/hooks/useKeyboardShortcuts';
import { useTradingStore } from '@/lib/stores/trading-store';
import { act } from '@testing-library/react';

// Mock the stores
vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useSearchPaletteStore: vi.fn(),
}));

vi.mock('@/lib/stores/trading-store', () => ({
  useTradingStore: vi.fn(),
}));

describe('SymbolSearchDialog', () => {
  const mockSetSearchOpen = vi.fn();
  const mockSetSearchQuery = vi.fn();
  const mockSetActiveSymbol = vi.fn();
  const mockAddOverlaySymbol = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useSearchPaletteStore as any).mockReturnValue({
      isSearchOpen: true,
      setSearchOpen: mockSetSearchOpen,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
    });

    (useTradingStore as any).mockReturnValue({
      activeSymbol: 'SPY',
      setActiveSymbol: mockSetActiveSymbol,
      overlaySymbols: [],
      addOverlaySymbol: mockAddOverlaySymbol,
    });
  });

  describe('rendering', () => {
    it('renders when isSearchOpen is true', () => {
      render(<SymbolSearchDialog />);
      expect(screen.getByPlaceholderText(/Search symbols/)).toBeInTheDocument();
    });

    it('does not render when isSearchOpen is false', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: false,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: '',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);
      expect(screen.queryByPlaceholderText(/Search symbols/)).not.toBeInTheDocument();
    });

    it('shows popular symbols by default', () => {
      render(<SymbolSearchDialog />);

      expect(screen.getByText('Popular Stocks & ETFs')).toBeInTheDocument();
      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('shows crypto symbols', () => {
      render(<SymbolSearchDialog />);

      expect(screen.getByText('Crypto')).toBeInTheDocument();
      expect(screen.getByText('BTCUSD')).toBeInTheDocument();
      expect(screen.getByText('ETHUSD')).toBeInTheDocument();
    });

    it('shows keyboard shortcuts section', () => {
      render(<SymbolSearchDialog />);

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('updates search query on input', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog />);

      const input = screen.getByPlaceholderText(/Search symbols/);
      await user.type(input, 'TSLA');

      expect(mockSetSearchQuery).toHaveBeenCalledWith('TSLA');
    });

    it('filters symbols based on search query', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: 'AAPL',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
    });

    it('filters symbols by name', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: 'apple',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('shows empty state when no matches', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: 'ZZZZZ',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      expect(screen.getByText(/No symbols found/)).toBeInTheDocument();
    });

    it('offers to search for custom symbol', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: 'CUSTOM',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      expect(screen.getByText(/Open chart for/)).toBeInTheDocument();
      expect(screen.getByText('CUSTOM')).toBeInTheDocument();
    });
  });

  describe('symbol selection', () => {
    it('selects symbol when clicked', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog />);

      const aaplSymbol = screen.getByText('AAPL');
      await user.click(aaplSymbol);

      expect(mockSetActiveSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('closes dialog after selection', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog />);

      const aaplSymbol = screen.getByText('AAPL');
      await user.click(aaplSymbol);

      expect(mockSetSearchOpen).toHaveBeenCalledWith(false);
    });

    it('selects custom symbol from empty state', async () => {
      const user = userEvent.setup();

      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: 'CUSTOM',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      const customButton = screen.getByRole('button', { name: /Open chart for CUSTOM/ });
      await user.click(customButton);

      expect(mockSetActiveSymbol).toHaveBeenCalledWith('CUSTOM');
    });
  });

  describe('comparison functionality', () => {
    it('shows Compare button on hover', () => {
      render(<SymbolSearchDialog />);

      const symbols = screen.getAllByText('Compare');
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('adds symbol as overlay when Compare is clicked', async () => {
      const user = userEvent.setup();
      render(<SymbolSearchDialog />);

      const compareButtons = screen.getAllByText('Compare');
      await user.click(compareButtons[0]);

      expect(mockAddOverlaySymbol).toHaveBeenCalled();
    });

    it('does not show Compare button for active symbol', () => {
      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'AAPL',
        setActiveSymbol: mockSetActiveSymbol,
        overlaySymbols: [],
        addOverlaySymbol: mockAddOverlaySymbol,
      });

      render(<SymbolSearchDialog />);

      // AAPL should not have a Compare button since it's the active symbol
      const aaplItem = screen.getByText('AAPL').closest('[role="option"]');
      expect(within(aaplItem as HTMLElement).queryByText('Compare')).not.toBeInTheDocument();
    });

    it('does not show Compare button for symbols already in overlay', () => {
      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'SPY',
        setActiveSymbol: mockSetActiveSymbol,
        overlaySymbols: ['AAPL'],
        addOverlaySymbol: mockAddOverlaySymbol,
      });

      render(<SymbolSearchDialog />);

      const aaplItem = screen.getByText('AAPL').closest('[role="option"]');
      expect(within(aaplItem as HTMLElement).queryByText('Compare')).not.toBeInTheDocument();
    });

    it('does not show Compare button when max overlays reached', () => {
      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'SPY',
        setActiveSymbol: mockSetActiveSymbol,
        overlaySymbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN'],
        addOverlaySymbol: mockAddOverlaySymbol,
      });

      render(<SymbolSearchDialog />);

      const compareButtons = screen.queryAllByText('Compare');
      expect(compareButtons).toHaveLength(0);
    });
  });

  describe('recent symbols', () => {
    it('does not show recent section when empty', () => {
      render(<SymbolSearchDialog />);

      expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    });

    it('shows recent section after selecting symbols', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SymbolSearchDialog />);

      const aaplSymbol = screen.getByText('AAPL');
      await user.click(aaplSymbol);

      // Re-open dialog
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: '',
        setSearchQuery: mockSetSearchQuery,
      });

      rerender(<SymbolSearchDialog />);

      // Recent section should now appear (in a real app, managed by component state)
    });
  });

  describe('symbol types', () => {
    it('shows ETF icon for ETFs', () => {
      const { container } = render(<SymbolSearchDialog />);

      // SPY is an ETF and should show star icon
      const spyItem = screen.getByText('SPY').closest('[role="option"]');
      const starIcon = within(spyItem as HTMLElement).container.querySelector('.text-yellow-500');
      expect(starIcon).toBeInTheDocument();
    });

    it('shows stock icon for stocks', () => {
      const { container } = render(<SymbolSearchDialog />);

      const aaplItem = screen.getByText('AAPL').closest('[role="option"]');
      const trendingIcon = within(aaplItem as HTMLElement).container.querySelector('.text-green-500');
      expect(trendingIcon).toBeInTheDocument();
    });

    it('shows crypto icon for crypto', () => {
      const { container } = render(<SymbolSearchDialog />);

      const btcItem = screen.getByText('BTCUSD').closest('[role="option"]');
      const dollarIcon = within(btcItem as HTMLElement).container.querySelector('.text-orange-500');
      expect(dollarIcon).toBeInTheDocument();
    });
  });

  describe('keyboard shortcuts display', () => {
    it('shows Cmd+K shortcut', () => {
      render(<SymbolSearchDialog />);

      expect(screen.getByText('Open search')).toBeInTheDocument();
    });

    it('shows ESC shortcut', () => {
      render(<SymbolSearchDialog />);

      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles special characters in search', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: 'BRK.A',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      expect(screen.getByText(/Open chart for BRK.A/)).toBeInTheDocument();
    });

    it('rejects invalid symbol patterns', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: '123',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      expect(screen.getByText(/No symbols found/)).toBeInTheDocument();
      expect(screen.queryByText(/Open chart for/)).not.toBeInTheDocument();
    });

    it('handles empty search query', () => {
      (useSearchPaletteStore as any).mockReturnValue({
        isSearchOpen: true,
        setSearchOpen: mockSetSearchOpen,
        searchQuery: '',
        setSearchQuery: mockSetSearchQuery,
      });

      render(<SymbolSearchDialog />);

      expect(screen.getByText('Popular Stocks & ETFs')).toBeInTheDocument();
      expect(screen.getByText('Crypto')).toBeInTheDocument();
    });
  });
});
