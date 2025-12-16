import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketWatchPanel } from '../MarketWatchPanel';
import { useUIStore } from '@/lib/stores/ui-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useIsMobile } from '@/hooks/useIsMobile';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/hooks/useIsMobile');

// Mock HomeWidgets component
vi.mock('@/components/chat/HomeWidgets', () => ({
  HomeWidgets: () => <div data-testid="home-widgets">HomeWidgets</div>,
}));

// Mock AnimatedChartIcon
vi.mock('@/components/ui/AnimatedChartIcon', () => ({
  AnimatedChartIcon: ({ size, className }: any) => (
    <div data-testid="animated-chart-icon" className={className}>
      Chart Icon {size}
    </div>
  ),
}));

describe('MarketWatchPanel', () => {
  const mockToggleMarketWatchPanel = vi.fn();
  const mockSetActiveContent = vi.fn();
  const mockCollapseMarketWatchPanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      marketWatchPanel: {
        isOpen: true,
        isExpanded: true,
      },
      toggleMarketWatchPanel: mockToggleMarketWatchPanel,
      setActiveContent: mockSetActiveContent,
      collapseMarketWatchPanel: mockCollapseMarketWatchPanel,
      leftSidebarOpen: true,
      rightSidebarOpen: true,
    });

    (useMarketDataStore as any).mockReturnValue({
      wsConnected: true,
      wsReconnecting: false,
      lastError: null,
    });

    (useIsMobile as any).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });

    // Mock timers for time-based tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T15:00:00Z')); // Monday 3 PM EST (market open)
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render when panel is open', () => {
      render(<MarketWatchPanel />);

      expect(screen.getByText('Market Watch')).toBeInTheDocument();
    });

    it('should not render when panel is closed', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        marketWatchPanel: {
          isOpen: false,
          isExpanded: false,
        },
      });

      const { container } = render(<MarketWatchPanel />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render on mobile', () => {
      (useIsMobile as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      const { container } = render(<MarketWatchPanel />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render on tablet', () => {
      (useIsMobile as any).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
      });

      const { container } = render(<MarketWatchPanel />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Header', () => {
    it('should show market watch title', () => {
      render(<MarketWatchPanel />);

      expect(screen.getByText('Market Watch')).toBeInTheDocument();
    });

    it('should show connection status', () => {
      render(<MarketWatchPanel />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show disconnected status when not connected', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
        wsReconnecting: false,
        lastError: null,
      });

      render(<MarketWatchPanel />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show reconnecting status', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
        wsReconnecting: true,
        lastError: null,
      });

      render(<MarketWatchPanel />);

      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });

    it('should show error message when present', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
        wsReconnecting: false,
        lastError: 'Connection failed',
      });

      render(<MarketWatchPanel />);

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should show market open status during market hours', () => {
      render(<MarketWatchPanel />);

      expect(screen.getByText('Market Open')).toBeInTheDocument();
    });

    it('should show market status indicator', () => {
      // Market status is calculated in useEffect, hard to test with fake timers
      // Just verify the component renders properly
      render(<MarketWatchPanel />);

      // Should show either "Market Open" or "Market Closed" based on current time
      const marketStatus = screen.queryByText('Market Open') || screen.queryByText('Market Closed');
      expect(marketStatus).toBeInTheDocument();
    });

    it('should show full chart button', () => {
      render(<MarketWatchPanel />);

      expect(screen.getByText('Full Chart')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should toggle panel when chevron is clicked', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const user = userEvent.setup();
      render(<MarketWatchPanel />);

      const toggleButton = screen.getByRole('button', { expanded: true });
      await user.click(toggleButton);

      expect(mockToggleMarketWatchPanel).toHaveBeenCalled();
    });

    it('should show chevron pointing down when expanded', () => {
      const { container } = render(<MarketWatchPanel />);

      const chevron = container.querySelector('.rotate-180');
      expect(chevron).toBeInTheDocument();
    });

    it('should show chevron pointing up when collapsed', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        marketWatchPanel: {
          isOpen: true,
          isExpanded: false,
        },
      });

      const { container } = render(<MarketWatchPanel />);

      const chevron = container.querySelector('.rotate-180');
      expect(chevron).not.toBeInTheDocument();
    });
  });

  describe('Content Area', () => {
    it('should render HomeWidgets when expanded', () => {
      render(<MarketWatchPanel />);

      expect(screen.getByTestId('home-widgets')).toBeInTheDocument();
    });

    it('should hide content when collapsed', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        marketWatchPanel: {
          isOpen: true,
          isExpanded: false,
        },
      });

      const { container } = render(<MarketWatchPanel />);

      const content = container.querySelector('[aria-hidden="true"]');
      expect(content).toBeInTheDocument();
    });

    it('should have proper height when expanded', () => {
      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="fixed"]');
      expect(panel).toHaveStyle({ height: '680px' });
    });

    it('should have collapsed height when not expanded', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        marketWatchPanel: {
          isOpen: true,
          isExpanded: false,
        },
      });

      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="fixed"]');
      expect(panel).toHaveStyle({ height: '44px' });
    });
  });

  describe('Full Chart Action', () => {
    it('should open chart and collapse panel when Full Chart is clicked', async () => {
      vi.useRealTimers(); // Use real timers for this test
      const user = userEvent.setup();
      render(<MarketWatchPanel />);

      const fullChartButton = screen.getByText('Full Chart');
      await user.click(fullChartButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('chart');
      expect(mockCollapseMarketWatchPanel).toHaveBeenCalled();
    });
  });

  describe('Positioning', () => {
    it('should position below ticker', () => {
      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="fixed"]');
      expect(panel).toHaveStyle({ top: '36px' }); // TICKER_HEIGHT
    });

    it('should adjust left margin based on sidebar state', () => {
      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="fixed"]') as HTMLElement;
      expect(panel?.style.left).toBe('256px'); // LEFT_SIDEBAR_EXPANDED
    });

    it('should adjust left margin when sidebar is collapsed', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        leftSidebarOpen: false,
      });

      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="fixed"]') as HTMLElement;
      expect(panel?.style.left).toBe('56px'); // LEFT_SIDEBAR_COLLAPSED
    });

    it('should adjust right margin based on sidebar state', () => {
      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="fixed"]') as HTMLElement;
      expect(panel?.style.right).toBe('336px'); // RIGHT_SIDEBAR_EXPANDED
    });

    it('should adjust right margin when sidebar is collapsed', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        rightSidebarOpen: false,
      });

      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="fixed"]') as HTMLElement;
      expect(panel?.style.right).toBe('48px'); // RIGHT_SIDEBAR_COLLAPSED
    });
  });

  describe('Status Indicators', () => {
    it('should show profit color when connected', () => {
      const { container } = render(<MarketWatchPanel />);

      // Find the status indicator by looking for bg-profit near Connected text
      const profitIndicator = container.querySelector('.bg-profit');
      expect(profitIndicator).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show loss color when disconnected', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
        wsReconnecting: false,
        lastError: null,
      });

      const { container } = render(<MarketWatchPanel />);

      // Find the status indicator by looking for bg-loss near Disconnected text
      const lossIndicator = container.querySelector('.bg-loss');
      expect(lossIndicator).toBeInTheDocument();
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should show yellow color when reconnecting', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
        wsReconnecting: true,
        lastError: null,
      });

      const { container } = render(<MarketWatchPanel />);

      // Find the status indicator by looking for bg-yellow near Reconnecting text
      const yellowIndicator = container.querySelector('.bg-yellow-500');
      expect(yellowIndicator).toBeInTheDocument();
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-expanded attribute', () => {
      render(<MarketWatchPanel />);

      const toggleButton = screen.getByRole('button', { expanded: true });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper aria-controls attribute', () => {
      render(<MarketWatchPanel />);

      const toggleButton = screen.getByRole('button', { expanded: true });
      expect(toggleButton).toHaveAttribute('aria-controls', 'market-watch-content');
    });

    it('should hide content with aria-hidden when collapsed', () => {
      (useUIStore as any).mockReturnValue({
        ...useUIStore(),
        marketWatchPanel: {
          isOpen: true,
          isExpanded: false,
        },
      });

      const { container } = render(<MarketWatchPanel />);

      const content = container.querySelector('#market-watch-content');
      expect(content).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Animations', () => {
    it('should have transition classes', () => {
      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="transition-all"]');
      expect(panel).toHaveClass('duration-300');
      expect(panel).toHaveClass('ease-out');
    });

    it('should support reduced motion', () => {
      const { container } = render(<MarketWatchPanel />);

      const panel = container.querySelector('[class*="motion-reduce"]');
      expect(panel).toHaveClass('motion-reduce:transition-none');
    });
  });
});
