import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwipeableToolbar } from '../SwipeableToolbar';
import { useHaptics } from '@/hooks/useHaptics';

// Mock dependencies
vi.mock('@/hooks/useHaptics');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => 0,
}));

describe('SwipeableToolbar', () => {
  const mockOnToolSelect = vi.fn();
  const mockOnNewChat = vi.fn();
  const mockLight = vi.fn();
  const mockSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useHaptics as any).mockReturnValue({
      light: mockLight,
      selection: mockSelection,
    });
  });

  describe('Collapsed State', () => {
    it('should render collapsed toolbar by default', () => {
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Should have tool buttons in collapsed view
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render expand button', () => {
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      expect(expandButton).toBeInTheDocument();
    });

    it('should render new chat button', () => {
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const newChatButton = screen.getByRole('button', { name: 'Start new chat' });
      expect(newChatButton).toBeInTheDocument();
    });

    it('should highlight active tool', () => {
      const { container } = render(
        <SwipeableToolbar
          activeToolId="chart"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const activeButton = container.querySelector('.bg-primary\\/20');
      expect(activeButton).toBeInTheDocument();
    });
  });

  describe('Expanded State', () => {
    it('should expand when expand button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      expect(screen.getByText('All Tools')).toBeInTheDocument();
    });

    it('should show all tools in expanded state', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('News')).toBeInTheDocument();
    });

    it('should show close button in expanded state', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      const closeButton = screen.getByRole('button', { name: 'Close tools grid' });
      expect(closeButton).toBeInTheDocument();
    });

    it('should collapse when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Expand
      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      // Close
      const closeButton = screen.getByRole('button', { name: 'Close tools grid' });
      await user.click(closeButton);

      expect(screen.queryByText('All Tools')).not.toBeInTheDocument();
    });
  });

  describe('Tool Selection', () => {
    it('should call onToolSelect when tool is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Expand to see tool labels
      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      const chartButton = screen.getByText('Chart');
      await user.click(chartButton);

      expect(mockOnToolSelect).toHaveBeenCalledWith('chart');
    });

    it('should trigger haptic feedback on tool selection', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Expand to see tool labels
      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      const chartButton = screen.getByText('Chart');
      await user.click(chartButton);

      expect(mockSelection).toHaveBeenCalled();
    });

    it('should collapse after selecting a tool in expanded view', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Expand
      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      // Select tool
      const chartButton = screen.getByText('Chart');
      await user.click(chartButton);

      expect(screen.queryByText('All Tools')).not.toBeInTheDocument();
    });
  });

  describe('New Chat', () => {
    it('should call onNewChat when new chat button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const newChatButton = screen.getByRole('button', { name: 'Start new chat' });
      await user.click(newChatButton);

      expect(mockOnNewChat).toHaveBeenCalled();
    });

    it('should trigger haptic feedback on new chat', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const newChatButton = screen.getByRole('button', { name: 'Start new chat' });
      await user.click(newChatButton);

      expect(mockSelection).toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger light haptic on expand', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      expect(mockLight).toHaveBeenCalled();
    });

    it('should trigger light haptic on collapse', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Expand
      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);
      mockLight.mockClear();

      // Close
      const closeButton = screen.getByRole('button', { name: 'Close tools grid' });
      await user.click(closeButton);

      expect(mockLight).toHaveBeenCalled();
    });
  });

  describe('Backdrop', () => {
    it('should show backdrop when expanded', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      const backdrop = container.querySelector('.bg-black\\/40');
      expect(backdrop).toBeInTheDocument();
    });

    it('should collapse when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Expand
      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      // Click backdrop
      const backdrop = container.querySelector('.bg-black\\/40');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(screen.queryByText('All Tools')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
          className="custom-class"
        />
      );

      // The className should be applied to the toolbar container
      const { container } = render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels on buttons', () => {
      render(
        <SwipeableToolbar
          activeToolId="history"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      expect(screen.getByRole('button', { name: 'Expand all tools' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start new chat' })).toBeInTheDocument();
    });

    it('should have aria-pressed on active tools', async () => {
      const user = userEvent.setup();
      render(
        <SwipeableToolbar
          activeToolId="chart"
          onToolSelect={mockOnToolSelect}
          onNewChat={mockOnNewChat}
        />
      );

      // Expand to see labeled buttons
      const expandButton = screen.getByRole('button', { name: 'Expand all tools' });
      await user.click(expandButton);

      const chartButton = screen.getByRole('button', { name: 'Select Chart tool' });
      expect(chartButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
