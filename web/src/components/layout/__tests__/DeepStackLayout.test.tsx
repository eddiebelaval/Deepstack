import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeepStackLayout } from '../DeepStackLayout';
import { useUIStore } from '@/lib/stores/ui-store';
import { useIsMobile } from '@/hooks/useIsMobile';

// Mock all dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/hooks/useIsMobile');
vi.mock('@/hooks/useRealtimePositions', () => ({
  useRealtimePositions: vi.fn(),
}));
vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

// Mock all child components
vi.mock('../LeftSidebar', () => ({
  LeftSidebar: () => <div data-testid="left-sidebar">LeftSidebar</div>,
}));
vi.mock('../RightToolbar', () => ({
  RightToolbar: () => <div data-testid="right-toolbar">RightToolbar</div>,
}));
vi.mock('../WidgetPanel', () => ({
  WidgetPanel: () => <div data-testid="widget-panel">WidgetPanel</div>,
}));
vi.mock('../StreamingTicker', () => ({
  StreamingTicker: () => <div data-testid="streaming-ticker">StreamingTicker</div>,
}));
vi.mock('../ProfilePanel', () => ({
  ProfilePanel: () => <div data-testid="profile-panel">ProfilePanel</div>,
}));
vi.mock('../SettingsPanel', () => ({
  SettingsPanel: () => <div data-testid="settings-panel">SettingsPanel</div>,
}));
vi.mock('../MarketWatchPanel', () => ({
  MarketWatchPanel: () => <div data-testid="market-watch-panel">MarketWatchPanel</div>,
}));
vi.mock('../MobileSwipeNavigation', () => ({
  MobileSwipeNavigation: ({ children }: any) => (
    <div data-testid="mobile-swipe-navigation">{children}</div>
  ),
}));
vi.mock('../MobilePages', () => ({
  ChatHistoryPage: ({ children }: any) => (
    <div data-testid="chat-history-page">{children}</div>
  ),
  ChatPage: ({ children }: any) => <div data-testid="chat-page">{children}</div>,
  DiscoverPage: () => <div data-testid="discover-page">DiscoverPage</div>,
  PredictionMarketsPage: () => <div data-testid="prediction-markets-page">PredictionMarketsPage</div>,
}));
vi.mock('../ToolsHubPage', () => ({
  ToolsHubPage: () => <div data-testid="tools-hub-page">ToolsHubPage</div>,
}));
vi.mock('@/components/search/SymbolSearchDialog', () => ({
  SymbolSearchDialog: () => <div data-testid="symbol-search-dialog">SymbolSearchDialog</div>,
}));
vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

describe('DeepStackLayout', () => {
  const mockUIStore = {
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    marketWatchPanel: {
      isOpen: true,
      isExpanded: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useUIStore as any).mockReturnValue(mockUIStore);
    (useIsMobile as any).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });
  });

  describe('Desktop Layout', () => {
    it('should render all desktop components', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.getByTestId('symbol-search-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('market-watch-panel')).toBeInTheDocument();
      expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('profile-panel')).toBeInTheDocument();
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
      expect(screen.getByTestId('right-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('widget-panel')).toBeInTheDocument();
      expect(screen.getByTestId('streaming-ticker')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply correct margin classes when sidebars are open', () => {
      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('ml-64'); // leftSidebarOpen
      expect(mainElement).toHaveClass('mr-[21rem]'); // rightSidebarOpen
    });

    it('should apply correct margin classes when sidebars are closed', () => {
      (useUIStore as any).mockReturnValue({
        ...mockUIStore,
        leftSidebarOpen: false,
        rightSidebarOpen: false,
      });

      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('ml-14'); // leftSidebarOpen = false
      expect(mainElement).toHaveClass('mr-12'); // rightSidebarOpen = false
    });

    it('should calculate correct top padding with market watch expanded', () => {
      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main') as HTMLElement;
      expect(mainElement?.style.paddingTop).toBe('616px'); // TICKER_HEIGHT + MARKET_WATCH_FIXED_HEIGHT
    });

    it('should calculate correct top padding with market watch collapsed', () => {
      (useUIStore as any).mockReturnValue({
        ...mockUIStore,
        marketWatchPanel: {
          isOpen: true,
          isExpanded: false,
        },
      });

      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main') as HTMLElement;
      expect(mainElement?.style.paddingTop).toBe('80px'); // TICKER_HEIGHT + MARKET_WATCH_TAB_HEIGHT
    });

    it('should calculate correct top padding with market watch closed', () => {
      (useUIStore as any).mockReturnValue({
        ...mockUIStore,
        marketWatchPanel: {
          isOpen: false,
          isExpanded: false,
        },
      });

      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main') as HTMLElement;
      expect(mainElement?.style.paddingTop).toBe('36px'); // TICKER_HEIGHT only
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      (useIsMobile as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });
    });

    it('should not render desktop-only components on mobile', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-toolbar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('widget-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('streaming-ticker')).not.toBeInTheDocument();
      expect(screen.queryByTestId('market-watch-panel')).not.toBeInTheDocument();
    });

    it('should render mobile swipe navigation', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.getByTestId('mobile-swipe-navigation')).toBeInTheDocument();
    });

    it('should render all mobile pages', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.getByTestId('tools-hub-page')).toBeInTheDocument();
      expect(screen.getByTestId('chat-page')).toBeInTheDocument();
      expect(screen.getByTestId('discover-page')).toBeInTheDocument();
      expect(screen.getByTestId('prediction-markets-page')).toBeInTheDocument();
    });

    it('should still render slide-out panels on mobile', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.getByTestId('profile-panel')).toBeInTheDocument();
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    });

    it('should not apply padding-top on mobile', () => {
      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main') as HTMLElement;
      expect(mainElement?.style.paddingTop).toBeFalsy();
    });
  });

  describe('Tablet Layout', () => {
    beforeEach(() => {
      (useIsMobile as any).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
      });
    });

    it('should render mobile layout on tablet', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.getByTestId('mobile-swipe-navigation')).toBeInTheDocument();
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('should wrap components in error boundaries', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const errorBoundaries = screen.getAllByTestId('error-boundary');
      expect(errorBoundaries.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Transitions', () => {
    it('should have transition classes on main element', () => {
      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('transition-all');
      expect(mainElement).toHaveClass('duration-300');
      expect(mainElement).toHaveClass('ease-out');
    });

    it('should have reduced motion support', () => {
      const { container } = render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('motion-reduce:transition-none');
    });
  });

  describe('Symbol Search Dialog', () => {
    it('should always render symbol search dialog', () => {
      render(
        <DeepStackLayout>
          <div>Test Content</div>
        </DeepStackLayout>
      );

      expect(screen.getByTestId('symbol-search-dialog')).toBeInTheDocument();
    });
  });
});
