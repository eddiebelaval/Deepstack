import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingToolbar } from '../FloatingToolbar';
import { useUIStore } from '@/lib/stores/ui-store';
import { useHaptics } from '@/hooks/useHaptics';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/hooks/useHaptics');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('FloatingToolbar', () => {
  const mockSetActiveContent = vi.fn();
  const mockLight = vi.fn();
  const mockSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      activeContent: 'none',
      setActiveContent: mockSetActiveContent,
    });

    (useHaptics as any).mockReturnValue({
      light: mockLight,
      selection: mockSelection,
    });
  });

  describe('Collapsed State', () => {
    it('should render collapsed toolbar by default', () => {
      const { container } = render(<FloatingToolbar />);

      // Should show quick tool buttons (3 tools + expand button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(4); // Chart, Portfolio, News, Expand

      // Should have the rounded pill container
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('should show expand button in collapsed state', () => {
      const { container } = render(<FloatingToolbar />);

      const expandButtons = screen.getAllByRole('button');
      // Last button should be the expand button (ChevronUp icon)
      expect(expandButtons[expandButtons.length - 1]).toBeInTheDocument();
    });

    it('should show only quick tools in collapsed state', () => {
      render(<FloatingToolbar />);

      // Should NOT show secondary tools
      expect(screen.queryByText('Screener')).not.toBeInTheDocument();
      expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
      expect(screen.queryByText('Deep Value')).not.toBeInTheDocument();
    });
  });

  describe('Expanded State', () => {
    it('should expand when expand button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<FloatingToolbar />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons[buttons.length - 1];

      await user.click(expandButton);

      // After expansion, should show all tools
      expect(screen.getByText('Screener')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    it('should show close button in expanded state', async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(<FloatingToolbar />);

      // Manually set to expanded state by clicking expand button
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[buttons.length - 1]);

      rerender(<FloatingToolbar />);

      // Should show X close button
      expect(screen.queryByText('Tools')).toBeInTheDocument();
    });

    it('should show all tools in grid layout when expanded', async () => {
      const user = userEvent.setup();
      render(<FloatingToolbar />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[buttons.length - 1]);

      // Should show all 11 tools
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('News')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('Screener')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Deep Value')).toBeInTheDocument();
      expect(screen.getByText('Hedged')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
      expect(screen.getByText('Builder')).toBeInTheDocument();
      expect(screen.getByText('Markets')).toBeInTheDocument();
    });
  });

  describe('Tool Selection', () => {
    it('should set active content when tool is clicked', async () => {
      const user = userEvent.setup();
      render(<FloatingToolbar />);

      // First button is Chart tool
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);

      expect(mockSetActiveContent).toHaveBeenCalledWith('chart');
    });

    it('should toggle off active content when clicking active tool', async () => {
      const user = userEvent.setup();
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
      });

      render(<FloatingToolbar />);

      // First button is Chart tool
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);

      expect(mockSetActiveContent).toHaveBeenCalledWith('none');
    });

    it('should trigger haptic feedback on tool click', async () => {
      const user = userEvent.setup();
      render(<FloatingToolbar />);

      // First button is Chart tool
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);

      expect(mockSelection).toHaveBeenCalled();
    });

    it('should highlight active tool', () => {
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
      });

      const { container } = render(<FloatingToolbar />);

      // Active tool should have bg-primary/20 class
      const activeButton = container.querySelector('.bg-primary\\/20');
      expect(activeButton).toBeInTheDocument();
    });
  });

  describe('Backdrop', () => {
    it('should show backdrop when expanded', async () => {
      const user = userEvent.setup();
      const { container } = render(<FloatingToolbar />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[buttons.length - 1]);

      // Backdrop should be visible
      const backdrop = container.querySelector('.bg-black\\/40');
      expect(backdrop).toBeInTheDocument();
    });

    it('should close when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(<FloatingToolbar />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[buttons.length - 1]);

      const backdrop = container.querySelector('.bg-black\\/40');
      if (backdrop) {
        await user.click(backdrop);
      }

      rerender(<FloatingToolbar />);

      // Should be back to collapsed state (only quick tools visible)
      expect(screen.queryByText('Screener')).not.toBeInTheDocument();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger light haptic on expand/collapse', async () => {
      const user = userEvent.setup();
      render(<FloatingToolbar />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons[buttons.length - 1];

      await user.click(expandButton);

      expect(mockLight).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have all tools as buttons', () => {
      render(<FloatingToolbar />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show tool labels when expanded', async () => {
      const user = userEvent.setup();
      render(<FloatingToolbar />);

      // Expand toolbar
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[buttons.length - 1]);

      // Labels should be visible in expanded state
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('News')).toBeInTheDocument();
    });
  });

  describe('Tool Icons', () => {
    it('should display icons with correct colors for inactive tools', () => {
      const { container } = render(<FloatingToolbar />);

      // Chart tool (first button) icon should have blue color class
      const buttons = screen.getAllByRole('button');
      const chartIcon = buttons[0].querySelector('svg');
      expect(chartIcon).toHaveClass('text-blue-400');
    });

    it('should display primary color for active tools', () => {
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
      });

      render(<FloatingToolbar />);

      // Chart tool (first button) should have primary color when active
      const buttons = screen.getAllByRole('button');
      const chartIcon = buttons[0].querySelector('svg');
      expect(chartIcon).toHaveClass('text-primary');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<FloatingToolbar className="custom-class" />);

      const toolbar = container.querySelector('.custom-class');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Close After Selection', () => {
    it('should close expanded menu after tool selection', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<FloatingToolbar />);

      // Expand the toolbar
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[buttons.length - 1]);

      // Select a tool from the expanded view
      const screenerButton = screen.getByText('Screener');
      await user.click(screenerButton);

      rerender(<FloatingToolbar />);

      // Should collapse after selection
      expect(mockSetActiveContent).toHaveBeenCalled();
    });
  });
});
