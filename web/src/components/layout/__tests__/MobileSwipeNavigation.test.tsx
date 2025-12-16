import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileSwipeNavigation, useMobileSwipeNav } from '../MobileSwipeNavigation';
import { useHaptics } from '@/hooks/useHaptics';
import { renderHook } from '@testing-library/react';

// Mock dependencies
vi.mock('@/hooks/useHaptics');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, initial, animate, drag, onDragStart, onDragEnd, ...props }: any) => (
      <div className={className} style={style} data-testid="motion-div" {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useAnimation: () => ({
    start: vi.fn(),
    set: vi.fn(),
  }),
}));

describe('MobileSwipeNavigation', () => {
  const mockSelection = vi.fn();
  const mockLight = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useHaptics as any).mockReturnValue({
      selection: mockSelection,
      light: mockLight,
    });

    // Clean up window object
    delete (window as any).__mobileSwipeNav;
  });

  afterEach(() => {
    delete (window as any).__mobileSwipeNav;
  });

  describe('Rendering', () => {
    it('should render all children pages', () => {
      render(
        <MobileSwipeNavigation>
          <div data-testid="page-0">Page 0</div>
          <div data-testid="page-1">Page 1</div>
          <div data-testid="page-2">Page 2</div>
        </MobileSwipeNavigation>
      );

      expect(screen.getByTestId('page-0')).toBeInTheDocument();
      expect(screen.getByTestId('page-1')).toBeInTheDocument();
      expect(screen.getByTestId('page-2')).toBeInTheDocument();
    });

    it('should render page indicator dots', () => {
      render(
        <MobileSwipeNavigation>
          <div>Page 0</div>
          <div>Page 1</div>
          <div>Page 2</div>
        </MobileSwipeNavigation>
      );

      const dots = screen.getAllByRole('button');
      expect(dots.length).toBe(3);
    });

    it('should render with default initial page', () => {
      render(
        <MobileSwipeNavigation>
          <div data-testid="page-0">Page 0</div>
          <div data-testid="page-1">Page 1</div>
        </MobileSwipeNavigation>
      );

      // Default initial page is 1 (Chat)
      expect(screen.getByTestId('page-0')).toBeInTheDocument();
      expect(screen.getByTestId('page-1')).toBeInTheDocument();
    });

    it('should render with custom initial page', () => {
      render(
        <MobileSwipeNavigation initialPage={0}>
          <div data-testid="page-0">Page 0</div>
          <div data-testid="page-1">Page 1</div>
        </MobileSwipeNavigation>
      );

      expect(screen.getByTestId('page-0')).toBeInTheDocument();
    });
  });

  describe('Page Indicator Dots', () => {
    it('should highlight active page dot', () => {
      const { container } = render(
        <MobileSwipeNavigation initialPage={0}>
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      const dots = screen.getAllByRole('button');
      // First dot should be wider (active state)
      expect(dots[0]).toHaveClass('w-4');
    });

    it('should navigate when dot is clicked', async () => {
      const user = userEvent.setup();
      const mockOnPageChange = vi.fn();

      render(
        <MobileSwipeNavigation initialPage={0} onPageChange={mockOnPageChange}>
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      const dots = screen.getAllByRole('button');
      await user.click(dots[1]);

      expect(mockSelection).toHaveBeenCalled();
    });
  });

  describe('Global Navigation API', () => {
    it('should expose navigation methods on window', () => {
      render(
        <MobileSwipeNavigation>
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      expect((window as any).__mobileSwipeNav).toBeDefined();
      expect((window as any).__mobileSwipeNav.navigateTo).toBeDefined();
      expect((window as any).__mobileSwipeNav.getCurrentPage).toBeDefined();
      expect((window as any).__mobileSwipeNav.getPageId).toBeDefined();
    });

    it('should clean up navigation API on unmount', () => {
      const { unmount } = render(
        <MobileSwipeNavigation>
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      expect((window as any).__mobileSwipeNav).toBeDefined();

      unmount();

      expect((window as any).__mobileSwipeNav).toBeUndefined();
    });
  });

  describe('Page Callbacks', () => {
    it('should call onPageChange when navigating', async () => {
      const user = userEvent.setup();
      const mockOnPageChange = vi.fn();

      render(
        <MobileSwipeNavigation initialPage={0} onPageChange={mockOnPageChange}>
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      const dots = screen.getAllByRole('button');
      await user.click(dots[1]);

      expect(mockOnPageChange).toHaveBeenCalledWith(1, expect.any(String));
    });
  });

  describe('Edge Hints', () => {
    it('should render edge hints for adjacent pages', () => {
      const { container } = render(
        <MobileSwipeNavigation initialPage={1}>
          <div>Page 0</div>
          <div>Page 1</div>
          <div>Page 2</div>
        </MobileSwipeNavigation>
      );

      // Should have left and right edge hints
      const edgeHints = container.querySelectorAll('.rounded-l-full, .rounded-r-full');
      expect(edgeHints.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Page IDs', () => {
    it('should use custom page IDs when provided', async () => {
      const user = userEvent.setup();
      const mockOnPageChange = vi.fn();
      const customPageIds = ['custom-1', 'custom-2'] as any;

      render(
        <MobileSwipeNavigation
          initialPage={0}
          pageIds={customPageIds}
          onPageChange={mockOnPageChange}
        >
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      const dots = screen.getAllByRole('button');
      await user.click(dots[1]);

      expect(mockOnPageChange).toHaveBeenCalledWith(1, 'custom-2');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels on dots', () => {
      render(
        <MobileSwipeNavigation pageIds={['tools', 'chat', 'news', 'predictions']}>
          <div>Tools</div>
          <div>Chat</div>
          <div>News</div>
          <div>Predictions</div>
        </MobileSwipeNavigation>
      );

      const dots = screen.getAllByRole('button');
      expect(dots[0]).toHaveAttribute('aria-label', 'Go to tools');
      expect(dots[1]).toHaveAttribute('aria-label', 'Go to chat');
    });
  });

  describe('Container Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MobileSwipeNavigation className="custom-class">
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have overflow hidden', () => {
      const { container } = render(
        <MobileSwipeNavigation>
          <div>Page 0</div>
          <div>Page 1</div>
        </MobileSwipeNavigation>
      );

      expect(container.firstChild).toHaveClass('overflow-hidden');
    });
  });
});

describe('useMobileSwipeNav hook', () => {
  beforeEach(() => {
    // Set up mock navigation
    (window as any).__mobileSwipeNav = {
      navigateTo: vi.fn(),
      getCurrentPage: vi.fn(() => 1),
      getPageId: vi.fn(() => 'chat'),
      getPageIds: vi.fn(() => ['tools', 'chat', 'news', 'predictions']),
    };
  });

  afterEach(() => {
    delete (window as any).__mobileSwipeNav;
  });

  it('should provide navigateTo function', () => {
    const { result } = renderHook(() => useMobileSwipeNav());

    result.current.navigateTo(2);

    expect((window as any).__mobileSwipeNav.navigateTo).toHaveBeenCalledWith(2);
  });

  it('should provide navigateToPage function', () => {
    const { result } = renderHook(() => useMobileSwipeNav());

    result.current.navigateToPage('news');

    expect((window as any).__mobileSwipeNav.navigateTo).toHaveBeenCalledWith(2);
  });

  it('should provide getCurrentPage function', () => {
    const { result } = renderHook(() => useMobileSwipeNav());

    const currentPage = result.current.getCurrentPage();

    expect(currentPage).toBe(1);
  });

  it('should provide getPageId function', () => {
    const { result } = renderHook(() => useMobileSwipeNav());

    const pageId = result.current.getPageId();

    expect(pageId).toBe('chat');
  });

  it('should provide getPageIds function', () => {
    const { result } = renderHook(() => useMobileSwipeNav());

    const pageIds = result.current.getPageIds();

    expect(pageIds).toEqual(['tools', 'chat', 'news', 'predictions']);
  });

  it('should provide default PAGE_IDS', () => {
    const { result } = renderHook(() => useMobileSwipeNav());

    expect(result.current.PAGE_IDS).toEqual(['tools', 'chat', 'news', 'predictions']);
  });
});
