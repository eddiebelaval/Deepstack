import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

// Mock child components
vi.mock('../ToolUseCard', () => ({
  ToolUseCard: ({ tool }: any) => <div data-testid="tool-card">{tool.toolName}</div>,
}));

vi.mock('../CodeBlock', () => ({
  CodeBlock: ({ language, value }: any) => (
    <div data-testid="code-block" data-language={language}>
      {value}
    </div>
  ),
}));

vi.mock('../ThinkingBlock', () => ({
  ThinkingBlock: ({ content }: any) => (
    <div data-testid="thinking-block">{content}</div>
  ),
}));

vi.mock('../CalloutBlock', () => ({
  CalloutBlock: ({ children, type }: any) => (
    <div data-testid="callout-block" data-type={type}>
      {children}
    </div>
  ),
  extractAlertType: vi.fn(),
}));

describe('MessageBubble', () => {
  describe('User messages', () => {
    it('renders user message with correct content', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Hello, assistant!',
      };

      render(<MessageBubble message={message} />);

      expect(screen.getByText('Hello, assistant!')).toBeInTheDocument();
    });

    it('applies correct styling for user messages', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
      };

      const { container } = render(<MessageBubble message={message} />);
      const messageElement = container.querySelector('.bg-primary');

      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toHaveClass('text-primary-foreground');
      expect(messageElement).toHaveClass('rounded-2xl');
    });

    it('preserves whitespace in user messages', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Line 1\nLine 2\nLine 3',
      };

      const { container } = render(<MessageBubble message={message} />);
      const textElement = container.querySelector('.whitespace-pre-wrap');

      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveClass('whitespace-pre-wrap');
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('displays message aligned to the right', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test',
      };

      const { container } = render(<MessageBubble message={message} />);
      const wrapper = container.querySelector('.justify-end');

      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Assistant messages', () => {
    it('renders assistant message content', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'This is a test message',
      };

      render(<MessageBubble message={message} />);

      expect(screen.getByText(/This is a test message/)).toBeInTheDocument();
    });

    it('renders assistant message aligned to the left', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Test message',
      };

      const { container } = render(<MessageBubble message={message} />);
      const wrapper = container.querySelector('.justify-start');

      expect(wrapper).toBeInTheDocument();
    });

    it('renders markdown content', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: '# Heading\n\nSome text content',
      };

      render(<MessageBubble message={message} />);

      // With our mock, content is still rendered
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });
  });

  describe('Tool tags stripping', () => {
    it('strips tool tags from content', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: '<get_quote symbol="AAPL">Apple</get_quote> The stock price is $150',
      };

      render(<MessageBubble message={message} />);

      expect(screen.queryByText(/get_quote/)).not.toBeInTheDocument();
      expect(screen.getByText(/The stock price is \$150/)).toBeInTheDocument();
    });

    it('strips multiple different tool tags', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: '<get_quote>Quote</get_quote> and <search_news>News</search_news> done',
      };

      render(<MessageBubble message={message} />);

      expect(screen.queryByText(/get_quote/)).not.toBeInTheDocument();
      expect(screen.queryByText(/search_news/)).not.toBeInTheDocument();
      expect(screen.getByText(/done/)).toBeInTheDocument();
    });

    it('strips incomplete tool tags during streaming', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Let me get that info <get_quote symbol="AAPL">',
      };

      render(<MessageBubble message={message} />);

      expect(screen.queryByText(/get_quote/)).not.toBeInTheDocument();
      expect(screen.getByText(/Let me get that info/)).toBeInTheDocument();
    });
  });

  describe('Thinking block', () => {
    it('renders thinking block when present', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Here is my response',
        thinking: 'Let me think about this...',
      };

      render(<MessageBubble message={message} />);

      expect(screen.getByTestId('thinking-block')).toBeInTheDocument();
      expect(screen.getByText('Let me think about this...')).toBeInTheDocument();
    });

    it('does not render thinking block when not present', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Here is my response',
      };

      render(<MessageBubble message={message} />);

      expect(screen.queryByTestId('thinking-block')).not.toBeInTheDocument();
    });
  });

  describe('Tool invocations', () => {
    it('renders tool invocation cards when present', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'I got the data',
        toolInvocations: [
          {
            toolName: 'get_quote',
            args: { symbol: 'AAPL' },
            state: 'result',
            result: { price: 150 },
          },
        ],
      };

      render(<MessageBubble message={message} />);

      // ToolUseCard should be rendered
      expect(screen.getByTestId('tool-card')).toBeInTheDocument();
      expect(screen.getByText('get_quote')).toBeInTheDocument();
    });

    it('does not render tool section when no invocations', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Just a message',
      };

      render(<MessageBubble message={message} />);

      expect(screen.queryByTestId('tool-card')).not.toBeInTheDocument();
    });

    it('renders multiple tool invocations', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'I got multiple results',
        toolInvocations: [
          {
            toolName: 'get_quote',
            args: { symbol: 'AAPL' },
            state: 'result',
            result: { price: 150 },
          },
          {
            toolName: 'search_news',
            args: { query: 'GOOGL' },
            state: 'result',
            result: { articles: [] },
          },
        ],
      };

      render(<MessageBubble message={message} />);

      const toolCards = screen.getAllByTestId('tool-card');
      expect(toolCards).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('handles empty content', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: '',
      };

      render(<MessageBubble message={message} />);

      // Should render without crashing
      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });

    it('handles null content gracefully', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: null as any,
      };

      render(<MessageBubble message={message} />);

      // Should render without crashing
      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = 'A '.repeat(1000);
      const message = {
        id: '1',
        role: 'user' as const,
        content: longContent,
      };

      render(<MessageBubble message={message} />);

      expect(screen.getByText(longContent.trim())).toBeInTheDocument();
    });

    it('handles special characters in content', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: '< > & " \' / \\ @ # $ % ^ & * ( )',
      };

      render(<MessageBubble message={message} />);

      expect(screen.getByText(/< > & " ' \/ \\ @ # \$ % \^ & \* \( \)/)).toBeInTheDocument();
    });
  });

  describe('Component structure', () => {
    it('has proper styling classes', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Test message',
      };

      const { container } = render(<MessageBubble message={message} />);

      expect(container.querySelector('.justify-start')).toBeInTheDocument();
      expect(container.querySelector('.w-full')).toBeInTheDocument();
    });

    it('renders prose styling for content', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Test content',
      };

      const { container } = render(<MessageBubble message={message} />);

      const proseElement = container.querySelector('.prose');
      expect(proseElement).toBeInTheDocument();
    });
  });
});
