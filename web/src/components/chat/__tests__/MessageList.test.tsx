import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from '../MessageList';

// Mock MessageBubble component
vi.mock('../MessageBubble', () => ({
  MessageBubble: vi.fn(({ message }) => (
    <div data-testid={`message-${message.id}`}>
      <span>{message.role}</span>
      <span>{message.content}</span>
    </div>
  )),
}));

// Mock EmptyState component
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: vi.fn(({ subtitle }) => (
    <div data-testid="empty-state">
      <span>{subtitle}</span>
    </div>
  )),
}));

// Mock scrollIntoView
const mockScrollIntoView = vi.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('renders EmptyState when no messages', () => {
      render(<MessageList messages={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('displays prompt subtitle in empty state', () => {
      render(<MessageList messages={[]} />);

      expect(screen.getByText('What would you like to analyze?')).toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    it('renders messages', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
      ];

      render(<MessageList messages={messages} />);

      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
    });

    it('renders all messages in order', () => {
      const messages = [
        { id: '1', role: 'user', content: 'First' },
        { id: '2', role: 'assistant', content: 'Second' },
        { id: '3', role: 'user', content: 'Third' },
      ];

      render(<MessageList messages={messages} />);

      const messageElements = screen.getAllByTestId(/^message-/);
      expect(messageElements).toHaveLength(3);
    });

    it('displays message content', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Test message content' },
      ];

      render(<MessageList messages={messages} />);

      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });
  });

  describe('Streaming State', () => {
    it('shows streaming indicator when streaming', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
      ];

      render(<MessageList messages={messages} isStreaming={true} />);

      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('does not show streaming indicator when not streaming', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
      ];

      render(<MessageList messages={messages} isStreaming={false} />);

      expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
    });

    it('shows "Executing tools..." when tool invocations are active', () => {
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: 'Processing...',
          toolInvocations: [{ state: 'call', name: 'search' }],
        },
      ];

      render(<MessageList messages={messages} isStreaming={true} />);

      expect(screen.getByText('Executing tools...')).toBeInTheDocument();
    });

    it('shows "Thinking..." when no active tool invocations', () => {
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: 'Done',
          toolInvocations: [{ state: 'result', name: 'search' }],
        },
      ];

      render(<MessageList messages={messages} isStreaming={true} />);

      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('renders Loader2 spinner when streaming', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
      ];

      render(<MessageList messages={messages} isStreaming={true} />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Auto Scroll', () => {
    it('scrolls to bottom on message change', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
      ];

      render(<MessageList messages={messages} />);

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('scrolls when new message is added', () => {
      const { rerender } = render(
        <MessageList messages={[{ id: '1', role: 'user', content: 'Hello' }]} />
      );

      mockScrollIntoView.mockClear();

      rerender(
        <MessageList
          messages={[
            { id: '1', role: 'user', content: 'Hello' },
            { id: '2', role: 'assistant', content: 'Hi!' },
          ]}
        />
      );

      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  describe('Tool Invocation States', () => {
    it('handles partial-call state', () => {
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: '',
          toolInvocations: [{ state: 'partial-call', name: 'search' }],
        },
      ];

      render(<MessageList messages={messages} isStreaming={true} />);

      expect(screen.getByText('Executing tools...')).toBeInTheDocument();
    });

    it('handles mixed tool states', () => {
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: '',
          toolInvocations: [
            { state: 'result', name: 'first' },
            { state: 'call', name: 'second' },
          ],
        },
      ];

      render(<MessageList messages={messages} isStreaming={true} />);

      expect(screen.getByText('Executing tools...')).toBeInTheDocument();
    });
  });

  describe('Container Styling', () => {
    it('applies max-w-3xl to message container', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
      ];

      const { container } = render(<MessageList messages={messages} />);

      expect(container.querySelector('.max-w-3xl')).toBeInTheDocument();
    });

    it('applies mx-auto for centering', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
      ];

      const { container } = render(<MessageList messages={messages} />);

      expect(container.querySelector('.mx-auto')).toBeInTheDocument();
    });
  });
});
