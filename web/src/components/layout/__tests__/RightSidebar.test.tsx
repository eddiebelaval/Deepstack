import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RightSidebar } from '../RightSidebar';
import { useUIStore } from '@/lib/stores/ui-store';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');

// Mock UI components
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: () => <div data-testid="dot-scroll-indicator">Dots</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className} data-testid="card-title">{children}</h3>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
}));

describe('RightSidebar', () => {
  const mockToggleRightSidebar = vi.fn();

  const mockWidgets = [
    { id: '1', type: 'watchlist', title: 'Watchlist', isOpen: true },
    { id: '2', type: 'quick-stats', title: 'Quick Stats', isOpen: true },
    { id: '3', type: 'market-status', title: 'Market Status', isOpen: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      rightSidebarOpen: true,
      toggleRightSidebar: mockToggleRightSidebar,
      widgets: mockWidgets,
    });
  });

  describe('Rendering', () => {
    it('should render sidebar when open', () => {
      render(<RightSidebar />);

      expect(screen.getByText('Widgets')).toBeInTheDocument();
    });

    it('should render toggle button when closed', () => {
      (useUIStore as any).mockReturnValue({
        rightSidebarOpen: false,
        toggleRightSidebar: mockToggleRightSidebar,
        widgets: mockWidgets,
      });

      render(<RightSidebar />);

      expect(screen.queryByText('Widgets')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render widgets when sidebar is open', () => {
      render(<RightSidebar />);

      const cardTitles = screen.getAllByTestId('card-title');
      expect(cardTitles.length).toBe(3);
    });
  });

  describe('Widget Display', () => {
    it('should display watchlist widget with stocks', () => {
      render(<RightSidebar />);

      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('QQQ')).toBeInTheDocument();
      expect(screen.getByText('IWM')).toBeInTheDocument();
    });

    it('should display quick stats widget', () => {
      render(<RightSidebar />);

      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('$104,230')).toBeInTheDocument();
      expect(screen.getByText('Day P&L')).toBeInTheDocument();
    });

    it('should display market status widget', () => {
      render(<RightSidebar />);

      expect(screen.getByText('Market Open')).toBeInTheDocument();
    });

    it('should only render open widgets', () => {
      (useUIStore as any).mockReturnValue({
        rightSidebarOpen: true,
        toggleRightSidebar: mockToggleRightSidebar,
        widgets: [
          { id: '1', type: 'watchlist', title: 'Watchlist', isOpen: true },
          { id: '2', type: 'quick-stats', title: 'Quick Stats', isOpen: false },
        ],
      });

      render(<RightSidebar />);

      expect(screen.getByText('Watchlist')).toBeInTheDocument();
      expect(screen.queryByText('Quick Stats')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should close sidebar when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<RightSidebar />);

      const closeButton = screen.getAllByRole('button')[0];
      await user.click(closeButton);

      expect(mockToggleRightSidebar).toHaveBeenCalled();
    });

    it('should open sidebar when toggle button is clicked (closed state)', async () => {
      const user = userEvent.setup();
      (useUIStore as any).mockReturnValue({
        rightSidebarOpen: false,
        toggleRightSidebar: mockToggleRightSidebar,
        widgets: mockWidgets,
      });

      render(<RightSidebar />);

      const toggleButton = screen.getByRole('button');
      await user.click(toggleButton);

      expect(mockToggleRightSidebar).toHaveBeenCalled();
    });
  });

  describe('Scroll Indicator', () => {
    it('should render scroll indicator', () => {
      render(<RightSidebar />);

      expect(screen.getByTestId('dot-scroll-indicator')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have correct width', () => {
      const { container } = render(<RightSidebar />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('w-80');
    });

    it('should have correct positioning', () => {
      const { container } = render(<RightSidebar />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('fixed', 'right-0', 'top-0');
    });
  });
});
