import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationList } from '../ConversationList';
import { useChatStore } from '@/lib/stores/chat-store';

// Mock dependencies
vi.mock('@/lib/stores/chat-store');

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  )),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }) => <div data-testid="scroll-area">{children}</div>),
}));

vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: vi.fn(() => <div data-testid="dot-scroll-indicator" />),
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-123';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => mockUUID,
  },
});

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

describe('ConversationList', () => {
  const mockSetCurrentConversation = vi.fn();
  const mockAddConversation = vi.fn();
  const mockRemoveConversation = vi.fn();

  const mockConversations = [
    {
      id: 'conv-1',
      title: 'Market Analysis',
      provider: 'claude',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
    },
    {
      id: 'conv-2',
      title: 'Portfolio Review',
      provider: 'claude',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T14:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);

    vi.mocked(useChatStore).mockReturnValue({
      conversations: mockConversations,
      currentConversationId: 'conv-1',
      setCurrentConversation: mockSetCurrentConversation,
      addConversation: mockAddConversation,
      removeConversation: mockRemoveConversation,
    } as any);
  });

  describe('Rendering', () => {
    it('renders New Chat button', () => {
      render(<ConversationList />);

      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    it('renders Plus icon in button', () => {
      render(<ConversationList />);

      expect(document.querySelector('.lucide-plus')).toBeInTheDocument();
    });

    it('renders scroll area', () => {
      render(<ConversationList />);

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });

    it('renders dot scroll indicator', () => {
      render(<ConversationList />);

      expect(screen.getByTestId('dot-scroll-indicator')).toBeInTheDocument();
    });
  });

  describe('Conversation Display', () => {
    it('renders conversation titles', () => {
      render(<ConversationList />);

      expect(screen.getByText('Market Analysis')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Review')).toBeInTheDocument();
    });

    it('renders MessageSquare icons', () => {
      render(<ConversationList />);

      expect(document.querySelectorAll('.lucide-message-square').length).toBe(2);
    });

    it('highlights current conversation', () => {
      render(<ConversationList />);

      const conversations = document.querySelectorAll('.bg-muted');
      expect(conversations.length).toBeGreaterThan(0);
    });

    it('renders delete buttons', () => {
      render(<ConversationList />);

      expect(document.querySelectorAll('.lucide-trash-2').length).toBe(2);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no conversations', () => {
      vi.mocked(useChatStore).mockReturnValue({
        conversations: [],
        currentConversationId: null,
        setCurrentConversation: mockSetCurrentConversation,
        addConversation: mockAddConversation,
        removeConversation: mockRemoveConversation,
      } as any);

      render(<ConversationList />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });
  });

  describe('Creating Conversation', () => {
    it('creates new conversation on New Chat click', async () => {
      const user = userEvent.setup();
      render(<ConversationList />);

      await user.click(screen.getByText('New Chat'));

      expect(mockAddConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUUID,
          title: 'New Conversation',
          provider: 'claude',
        })
      );
    });

    it('sets new conversation as current', async () => {
      const user = userEvent.setup();
      render(<ConversationList />);

      await user.click(screen.getByText('New Chat'));

      expect(mockSetCurrentConversation).toHaveBeenCalledWith(mockUUID);
    });
  });

  describe('Selecting Conversation', () => {
    it('sets conversation as current on click', async () => {
      const user = userEvent.setup();
      render(<ConversationList />);

      await user.click(screen.getByText('Portfolio Review'));

      expect(mockSetCurrentConversation).toHaveBeenCalledWith('conv-2');
    });
  });

  describe('Deleting Conversation', () => {
    it('shows confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<ConversationList />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      await user.click(deleteButtons[0].closest('button')!);

      expect(mockConfirm).toHaveBeenCalledWith('Delete this conversation?');
    });

    it('removes conversation on confirm', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      render(<ConversationList />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      await user.click(deleteButtons[0].closest('button')!);

      expect(mockRemoveConversation).toHaveBeenCalledWith('conv-1');
    });

    it('does not remove on cancel', async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);
      render(<ConversationList />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      await user.click(deleteButtons[0].closest('button')!);

      expect(mockRemoveConversation).not.toHaveBeenCalled();
    });

    it('stops event propagation', async () => {
      const user = userEvent.setup();
      render(<ConversationList />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      await user.click(deleteButtons[0].closest('button')!);

      // Should not trigger setCurrentConversation from the parent click handler
      expect(mockSetCurrentConversation).not.toHaveBeenCalled();
    });
  });

  describe('Time Display', () => {
    it('displays relative time for conversations', () => {
      render(<ConversationList />);

      // formatDistanceToNow will display something like "X days ago"
      const timeElements = document.querySelectorAll('.text-xs.text-muted-foreground');
      expect(timeElements.length).toBe(2);
    });
  });
});
