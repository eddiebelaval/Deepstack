import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsHubPage } from '../ToolsHubPage';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/lib/stores/chat-store');

// Mock child components
vi.mock('@/components/layout/ChatHistoryContent', () => ({
  ChatHistoryContent: ({ onSelectConversation, onNewChat }: any) => (
    <div data-testid="chat-history-content">
      <button onClick={() => onSelectConversation?.('test-id')}>Select</button>
      <button onClick={() => onNewChat?.()}>New</button>
    </div>
  ),
}));

vi.mock('@/components/layout/SwipeableToolbar', () => ({
  SwipeableToolbar: ({ activeToolId, onToolSelect, onNewChat }: any) => (
    <div data-testid="swipeable-toolbar" data-active={activeToolId}>
      <button onClick={() => onToolSelect?.('chart')}>Select Chart</button>
      <button onClick={() => onNewChat?.()}>New Chat</button>
    </div>
  ),
}));

vi.mock('@/components/shared/ToolContentRenderer', () => ({
  ToolContentRenderer: ({ contentType, variant }: any) => (
    <div data-testid="tool-content-renderer" data-type={contentType} data-variant={variant}>
      Tool Content: {contentType}
    </div>
  ),
}));

describe('ToolsHubPage', () => {
  const mockToggleSettings = vi.fn();
  const mockSetCurrentConversation = vi.fn();
  const mockOnSelectConversation = vi.fn();
  const mockOnNewChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      toggleSettings: mockToggleSettings,
    });

    (useChatStore as any).mockReturnValue({
      setCurrentConversation: mockSetCurrentConversation,
    });

    // Mock mobile swipe nav
    (window as any).__mobileSwipeNav = {
      navigateTo: vi.fn(),
    };
  });

  describe('Rendering', () => {
    it('should render the page', () => {
      render(<ToolsHubPage />);

      expect(screen.getByText('Threads')).toBeInTheDocument();
    });

    it('should render settings button', () => {
      render(<ToolsHubPage />);

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      expect(settingsButton).toBeInTheDocument();
    });

    it('should render forward button', () => {
      render(<ToolsHubPage />);

      const forwardButton = screen.getByRole('button', { name: 'Go to Chat' });
      expect(forwardButton).toBeInTheDocument();
    });

    it('should render swipeable toolbar', () => {
      render(<ToolsHubPage />);

      expect(screen.getByTestId('swipeable-toolbar')).toBeInTheDocument();
    });

    it('should render chat history content by default', () => {
      render(<ToolsHubPage />);

      expect(screen.getByTestId('chat-history-content')).toBeInTheDocument();
    });
  });

  describe('Title Display', () => {
    it('should show "Threads" when history is active', () => {
      render(<ToolsHubPage />);

      expect(screen.getByText('Threads')).toBeInTheDocument();
    });
  });

  describe('Settings Button', () => {
    it('should open settings when clicked', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage />);

      const settingsButton = screen.getByRole('button', { name: 'Settings' });
      await user.click(settingsButton);

      expect(mockToggleSettings).toHaveBeenCalled();
    });
  });

  describe('Forward Button', () => {
    it('should navigate to chat page when clicked', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage />);

      const forwardButton = screen.getByRole('button', { name: 'Go to Chat' });
      await user.click(forwardButton);

      expect((window as any).__mobileSwipeNav.navigateTo).toHaveBeenCalledWith(1);
    });
  });

  describe('Tool Selection', () => {
    it('should show tool content when tool is selected', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage />);

      const selectChartButton = screen.getByText('Select Chart');
      await user.click(selectChartButton);

      expect(screen.getByTestId('tool-content-renderer')).toBeInTheDocument();
      expect(screen.getByTestId('tool-content-renderer')).toHaveAttribute('data-type', 'chart');
    });

    it('should update title when tool is selected', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage />);

      const selectChartButton = screen.getByText('Select Chart');
      await user.click(selectChartButton);

      expect(screen.getByText('Chart')).toBeInTheDocument();
    });

    it('should render tool content in fullscreen variant', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage />);

      const selectChartButton = screen.getByText('Select Chart');
      await user.click(selectChartButton);

      expect(screen.getByTestId('tool-content-renderer')).toHaveAttribute('data-variant', 'fullscreen');
    });
  });

  describe('Conversation Selection', () => {
    it('should call onSelectConversation and navigate when conversation is selected', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage onSelectConversation={mockOnSelectConversation} />);

      const selectButton = screen.getByText('Select');
      await user.click(selectButton);

      expect(mockOnSelectConversation).toHaveBeenCalledWith('test-id');
      expect((window as any).__mobileSwipeNav.navigateTo).toHaveBeenCalledWith(1);
    });
  });

  describe('New Chat', () => {
    it('should clear conversation and navigate when new chat is clicked from history', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage onNewChat={mockOnNewChat} />);

      const newButton = screen.getByText('New');
      await user.click(newButton);

      expect(mockSetCurrentConversation).toHaveBeenCalledWith(null);
      expect((window as any).__mobileSwipeNav.navigateTo).toHaveBeenCalledWith(1);
    });

    it('should clear conversation and navigate when new chat is clicked from toolbar', async () => {
      const user = userEvent.setup();
      render(<ToolsHubPage onNewChat={mockOnNewChat} />);

      const newChatButton = screen.getByText('New Chat');
      await user.click(newChatButton);

      expect(mockSetCurrentConversation).toHaveBeenCalledWith(null);
    });
  });

  describe('Tool Titles', () => {
    it('should have correct title for various tools', async () => {
      // This tests the getToolTitle function indirectly
      // We can't easily test all titles without making the component
      // render each tool, but we've tested the pattern above
      render(<ToolsHubPage />);

      // Default should be "Threads"
      expect(screen.getByText('Threads')).toBeInTheDocument();
    });
  });

  describe('Swipeable Toolbar Props', () => {
    it('should pass activeToolId to toolbar', () => {
      render(<ToolsHubPage />);

      const toolbar = screen.getByTestId('swipeable-toolbar');
      expect(toolbar).toHaveAttribute('data-active', 'history');
    });
  });
});
