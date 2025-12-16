import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useUIStore } from '@/lib/stores/ui-store';

// Mock dependencies
vi.mock('@/lib/stores/trading-store');
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/lib/stores/ui-store');
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock UI components
vi.mock('@/components/ui/Logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

vi.mock('@/components/ui/command', () => ({
  CommandDialog: ({ children, open, onOpenChange, title }: any) => (
    open ? <div data-testid="command-dialog" role="dialog" aria-label={title}>{children}</div> : null
  ),
  CommandInput: ({ placeholder, value, onValueChange }: any) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
  CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
  CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children, heading }: any) => (
    <div data-testid="command-group" data-heading={heading}>{children}</div>
  ),
  CommandItem: ({ children, onSelect, value }: any) => (
    <button data-testid="command-item" data-value={value} onClick={() => onSelect?.(value)}>
      {children}
    </button>
  ),
}));

describe('Header', () => {
  const mockSetActiveSymbol = vi.fn();
  const mockToggleChatPanel = vi.fn();
  const mockToggleRightSidebar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useTradingStore as any).mockReturnValue({
      activeSymbol: 'AAPL',
      setActiveSymbol: mockSetActiveSymbol,
      showChatPanel: false,
      toggleChatPanel: mockToggleChatPanel,
    });

    (useMarketDataStore as any).mockReturnValue({
      wsConnected: true,
      quotes: {
        AAPL: { last: 150.25, changePercent: 1.5 },
      },
    });

    (useUIStore as any).mockReturnValue({
      rightSidebarOpen: false,
      toggleRightSidebar: mockToggleRightSidebar,
    });

    global.fetch = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the header', () => {
      render(<Header />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<Header />);

      expect(screen.getByRole('button', { name: /search symbols/i })).toBeInTheDocument();
    });

    it('should render connection status when connected', () => {
      render(<Header />);

      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should render connection status when disconnected', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
        quotes: {},
      });

      render(<Header />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('Active Symbol Display', () => {
    it('should display active symbol', () => {
      render(<Header />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('should display active symbol price', () => {
      render(<Header />);

      expect(screen.getByText('$150.25')).toBeInTheDocument();
    });

    it('should display positive change with correct styling', () => {
      render(<Header />);

      expect(screen.getByText('+1.50%')).toBeInTheDocument();
    });

    it('should display negative change with correct styling', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: true,
        quotes: {
          AAPL: { last: 150.25, changePercent: -1.5 },
        },
      });

      render(<Header />);

      expect(screen.getByText('-1.50%')).toBeInTheDocument();
    });

    it('should not display price when quote is unavailable', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: true,
        quotes: {},
      });

      render(<Header />);

      expect(screen.queryByText('$150.25')).not.toBeInTheDocument();
    });
  });

  describe('Symbol Search', () => {
    it('should open search dialog when search button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const searchButton = screen.getByRole('button', { name: /search symbols/i });
      await user.click(searchButton);

      expect(screen.getByTestId('command-dialog')).toBeInTheDocument();
    });

    it('should display popular symbols when no search query', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const searchButton = screen.getByRole('button', { name: /search symbols/i });
      await user.click(searchButton);

      expect(screen.getByTestId('command-group')).toHaveAttribute('data-heading', 'Popular Symbols');
    });

    it('should select symbol and close dialog', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const searchButton = screen.getByRole('button', { name: /search symbols/i });
      await user.click(searchButton);

      const symbolItem = screen.getAllByTestId('command-item')[0];
      await user.click(symbolItem);

      expect(mockSetActiveSymbol).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('should render market data toggle button', () => {
      render(<Header />);

      const marketDataButton = screen.getByRole('button', { name: 'Toggle Market Data' });
      expect(marketDataButton).toBeInTheDocument();
    });

    it('should toggle right sidebar when market data button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const marketDataButton = screen.getByRole('button', { name: 'Toggle Market Data' });
      await user.click(marketDataButton);

      expect(mockToggleRightSidebar).toHaveBeenCalled();
    });

    it('should render chat toggle button', () => {
      render(<Header />);

      const chatButton = screen.getByRole('button', { name: 'Toggle AI Chat' });
      expect(chatButton).toBeInTheDocument();
    });

    it('should toggle chat panel when chat button is clicked', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const chatButton = screen.getByRole('button', { name: 'Toggle AI Chat' });
      await user.click(chatButton);

      expect(mockToggleChatPanel).toHaveBeenCalled();
    });

    it('should render settings button', () => {
      render(<Header />);

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      expect(settingsButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should open search with Cmd+K', async () => {
      render(<Header />);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByTestId('command-dialog')).toBeInTheDocument();
      });
    });

    it('should toggle chat with Cmd+J', async () => {
      render(<Header />);

      const event = new KeyboardEvent('keydown', {
        key: 'j',
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);

      await waitFor(() => {
        expect(mockToggleChatPanel).toHaveBeenCalled();
      });
    });

    it('should toggle market panel with Cmd+M', async () => {
      render(<Header />);

      const event = new KeyboardEvent('keydown', {
        key: 'm',
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);

      await waitFor(() => {
        expect(mockToggleRightSidebar).toHaveBeenCalled();
      });
    });
  });

  describe('Button States', () => {
    it('should show active state when chat panel is open', () => {
      (useTradingStore as any).mockReturnValue({
        activeSymbol: 'AAPL',
        setActiveSymbol: mockSetActiveSymbol,
        showChatPanel: true,
        toggleChatPanel: mockToggleChatPanel,
      });

      render(<Header />);

      const chatButton = screen.getByRole('button', { name: 'Toggle AI Chat' });
      expect(chatButton).toHaveClass('bg-secondary');
    });

    it('should show active state when right sidebar is open', () => {
      (useUIStore as any).mockReturnValue({
        rightSidebarOpen: true,
        toggleRightSidebar: mockToggleRightSidebar,
      });

      render(<Header />);

      const marketDataButton = screen.getByRole('button', { name: 'Toggle Market Data' });
      expect(marketDataButton).toHaveClass('bg-secondary');
    });
  });
});
