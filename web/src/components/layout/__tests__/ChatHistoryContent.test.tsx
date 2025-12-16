import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatHistoryContent } from '../ChatHistoryContent';
import { useChatStore } from '@/lib/stores/chat-store';

// Mock the chat store
vi.mock('@/lib/stores/chat-store', () => ({
  useChatStore: vi.fn(),
}));

// Mock the format-time utility
vi.mock('@/lib/utils/format-time', () => ({
  formatTimeAgo: (date: string) => 'just now',
}));

describe('ChatHistoryContent', () => {
  const mockConversations = [
    {
      id: '1',
      title: 'Test Conversation 1',
      created_at: new Date().toISOString(),
      messages: [],
    },
    {
      id: '2',
      title: 'Test Conversation 2',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      messages: [],
    },
    {
      id: '3',
      title: 'Test Conversation 3',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      messages: [],
    },
  ];

  const mockSetCurrentConversation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useChatStore as any).mockReturnValue({
      conversations: mockConversations,
      currentConversationId: null,
      setCurrentConversation: mockSetCurrentConversation,
    });
  });

  describe('Rendering', () => {
    it('should render the search bar', () => {
      render(<ChatHistoryContent />);

      const searchInput = screen.getByPlaceholderText('Search threads...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render all conversations grouped by date', () => {
      render(<ChatHistoryContent />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('Older')).toBeInTheDocument();
    });

    it('should render conversation titles', () => {
      render(<ChatHistoryContent />);

      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();
      expect(screen.getByText('Test Conversation 3')).toBeInTheDocument();
    });

    it('should render empty state when no conversations exist', () => {
      (useChatStore as any).mockReturnValue({
        conversations: [],
        currentConversationId: null,
        setCurrentConversation: mockSetCurrentConversation,
      });

      render(<ChatHistoryContent />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Tap + to start a new chat')).toBeInTheDocument();
    });

    it('should highlight active conversation', () => {
      (useChatStore as any).mockReturnValue({
        conversations: mockConversations,
        currentConversationId: '1',
        setCurrentConversation: mockSetCurrentConversation,
      });

      render(<ChatHistoryContent />);

      const activeConversation = screen.getByText('Test Conversation 1').closest('button');
      expect(activeConversation).toHaveClass('bg-primary/10');
    });
  });

  describe('Search Functionality', () => {
    it('should filter conversations based on search query', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const searchInput = screen.getByPlaceholderText('Search threads...');
      await user.type(searchInput, 'Conversation 1');

      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Conversation 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Conversation 3')).not.toBeInTheDocument();
    });

    it('should show clear button when search has text', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const searchInput = screen.getByPlaceholderText('Search threads...');
      await user.type(searchInput, 'test');

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const searchInput = screen.getByPlaceholderText('Search threads...') as HTMLInputElement;
      await user.type(searchInput, 'test');

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect(searchInput.value).toBe('');
    });

    it('should show empty search state when no matches found', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const searchInput = screen.getByPlaceholderText('Search threads...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No matches found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term')).toBeInTheDocument();
    });

    it('should perform case-insensitive search', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const searchInput = screen.getByPlaceholderText('Search threads...');
      await user.type(searchInput, 'CONVERSATION 1');

      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call setCurrentConversation when conversation is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const conversation = screen.getByText('Test Conversation 1');
      await user.click(conversation);

      expect(mockSetCurrentConversation).toHaveBeenCalledWith('1');
    });

    it('should call onSelectConversation callback when provided', async () => {
      const onSelectConversation = vi.fn();
      const user = userEvent.setup();

      render(<ChatHistoryContent onSelectConversation={onSelectConversation} />);

      const conversation = screen.getByText('Test Conversation 1');
      await user.click(conversation);

      expect(onSelectConversation).toHaveBeenCalledWith('1');
    });

    it('should not call onSelectConversation when not provided', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const conversation = screen.getByText('Test Conversation 1');
      await user.click(conversation);

      // Should not throw error
      expect(mockSetCurrentConversation).toHaveBeenCalledWith('1');
    });
  });

  describe('Date Grouping', () => {
    it('should group conversations into Today category', () => {
      render(<ChatHistoryContent />);

      const todaySection = screen.getByText('Today').parentElement;
      expect(todaySection).toBeInTheDocument();
      expect(todaySection?.textContent).toContain('Test Conversation 1');
    });

    it('should group conversations into This Week category', () => {
      render(<ChatHistoryContent />);

      const thisWeekSection = screen.getByText('This Week').parentElement;
      expect(thisWeekSection).toBeInTheDocument();
      expect(thisWeekSection?.textContent).toContain('Test Conversation 2');
    });

    it('should group conversations into Older category', () => {
      render(<ChatHistoryContent />);

      const olderSection = screen.getByText('Older').parentElement;
      expect(olderSection).toBeInTheDocument();
      expect(olderSection?.textContent).toContain('Test Conversation 3');
    });

    it('should not render empty groups', () => {
      (useChatStore as any).mockReturnValue({
        conversations: [mockConversations[0]], // Only today's conversation
        currentConversationId: null,
        setCurrentConversation: mockSetCurrentConversation,
      });

      render(<ChatHistoryContent />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.queryByText('Yesterday')).not.toBeInTheDocument();
      expect(screen.queryByText('This Week')).not.toBeInTheDocument();
      expect(screen.queryByText('Older')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<ChatHistoryContent className="custom-class" />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for search input', () => {
      render(<ChatHistoryContent />);

      const searchInput = screen.getByLabelText('Search conversations');
      expect(searchInput).toBeInTheDocument();
    });

    it('should have proper aria-label for clear button', async () => {
      const user = userEvent.setup();
      render(<ChatHistoryContent />);

      const searchInput = screen.getByPlaceholderText('Search threads...');
      await user.type(searchInput, 'test');

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Untitled Conversations', () => {
    it('should display "Untitled Chat" for conversations without title', () => {
      (useChatStore as any).mockReturnValue({
        conversations: [
          {
            id: '1',
            title: null,
            created_at: new Date().toISOString(),
            messages: [],
          },
        ],
        currentConversationId: null,
        setCurrentConversation: mockSetCurrentConversation,
      });

      render(<ChatHistoryContent />);

      expect(screen.getByText('Untitled Chat')).toBeInTheDocument();
    });
  });
});
