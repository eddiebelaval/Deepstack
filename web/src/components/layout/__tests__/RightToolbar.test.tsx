import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RightToolbar } from '../RightToolbar';
import { useUIStore } from '@/lib/stores/ui-store';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');

// Mock UI components
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

vi.mock('@/components/trading/WatchlistManagementDialog', () => ({
  WatchlistManagementDialog: ({ open }: any) => (
    open ? <div data-testid="watchlist-dialog">Watchlist Dialog</div> : null
  ),
}));

describe('RightToolbar', () => {
  const mockSetActiveContent = vi.fn();
  const mockToggleRightSidebar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      activeContent: 'none',
      setActiveContent: mockSetActiveContent,
      rightSidebarOpen: false,
      toggleRightSidebar: mockToggleRightSidebar,
    });
  });

  describe('Rendering', () => {
    it('should render the toolbar', () => {
      const { container } = render(<RightToolbar />);

      expect(container.querySelector('aside')).toBeInTheDocument();
    });

    it('should render all trading tools', () => {
      render(<RightToolbar />);

      // 2 trading items: Chart, Positions
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render separators between categories', () => {
      const { container } = render(<RightToolbar />);

      const separators = container.querySelectorAll('[data-orientation]');
      expect(separators.length).toBeGreaterThanOrEqual(2);
    });

    it('should have fixed positioning', () => {
      const { container } = render(<RightToolbar />);

      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('fixed', 'right-0', 'top-0');
    });
  });

  describe('Tool Selection', () => {
    it('should activate chart tool when clicked', async () => {
      const user = userEvent.setup();
      render(<RightToolbar />);

      const buttons = screen.getAllByRole('button');
      // First button is Chart
      await user.click(buttons[0]);

      expect(mockSetActiveContent).toHaveBeenCalledWith('chart');
    });

    it('should toggle chart off when already active', async () => {
      const user = userEvent.setup();
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
        rightSidebarOpen: false,
        toggleRightSidebar: mockToggleRightSidebar,
      });

      render(<RightToolbar />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);

      expect(mockSetActiveContent).toHaveBeenCalledWith('none');
    });

    it('should activate positions when positions button is clicked', async () => {
      const user = userEvent.setup();
      render(<RightToolbar />);

      const buttons = screen.getAllByRole('button');
      // Second button is Positions
      await user.click(buttons[1]);

      expect(mockSetActiveContent).toHaveBeenCalledWith('positions');
    });

    it('should toggle right sidebar when widgets button is clicked', async () => {
      const user = userEvent.setup();
      render(<RightToolbar />);

      const buttons = screen.getAllByRole('button');
      // Last button is Widgets Panel
      await user.click(buttons[buttons.length - 1]);

      expect(mockToggleRightSidebar).toHaveBeenCalled();
    });
  });

  describe('Active States', () => {
    it('should highlight active tool', () => {
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
        rightSidebarOpen: false,
        toggleRightSidebar: mockToggleRightSidebar,
      });

      const { container } = render(<RightToolbar />);

      const activeButton = container.querySelector('.bg-primary\\/20');
      expect(activeButton).toBeInTheDocument();
    });

    it('should highlight widgets button when sidebar is open', () => {
      (useUIStore as any).mockReturnValue({
        activeContent: 'none',
        setActiveContent: mockSetActiveContent,
        rightSidebarOpen: true,
        toggleRightSidebar: mockToggleRightSidebar,
      });

      const { container } = render(<RightToolbar />);

      const activeButtons = container.querySelectorAll('.bg-primary\\/20');
      expect(activeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Watchlist Dialog', () => {
    it('should not show watchlist dialog initially', () => {
      render(<RightToolbar />);

      expect(screen.queryByTestId('watchlist-dialog')).not.toBeInTheDocument();
    });

    it('should open watchlist dialog when watchlist button is clicked', async () => {
      const user = userEvent.setup();
      render(<RightToolbar />);

      const buttons = screen.getAllByRole('button');
      // Watchlist button is in Research category (index 2)
      await user.click(buttons[2]);

      expect(screen.getByTestId('watchlist-dialog')).toBeInTheDocument();
    });
  });

  describe('Tool Categories', () => {
    it('should render trading category tools', () => {
      render(<RightToolbar />);

      // Chart and Positions are in Trading category
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render research category tools', () => {
      render(<RightToolbar />);

      // Watchlist, Screener, News, Calendar are in Research category
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(6);
    });

    it('should render analytics category tools', () => {
      render(<RightToolbar />);

      // Alerts, Predictions, Deep Value, Hedged, Options, Builder are in Analytics category
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('Accessibility', () => {
    it('should have proper button elements', () => {
      render(<RightToolbar />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON');
      });
    });
  });
});
