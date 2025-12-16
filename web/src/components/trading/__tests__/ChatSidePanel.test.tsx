import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatSidePanel } from '../ChatSidePanel';
import { useChatStore } from '@/lib/stores/chat-store';
import { useTradingStore } from '@/lib/stores/trading-store';

// Mock stores
vi.mock('@/lib/stores/chat-store');
vi.mock('@/lib/stores/trading-store');

// Mock child components
vi.mock('@/components/chat/ProviderSelector', () => ({
  ProviderSelector: vi.fn(({ value, onChange }) => (
    <select
      data-testid="provider-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="openai">OpenAI</option>
      <option value="anthropic">Anthropic</option>
    </select>
  )),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }) => <div data-testid="scroll-area">{children}</div>),
}));

vi.mock('@/components/ui/DotScrollIndicator', () => ({
  DotScrollIndicator: vi.fn(() => null),
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: vi.fn(({ subtitle }) => <div data-testid="empty-state">{subtitle}</div>),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
});

describe('ChatSidePanel', () => {
  const mockSetActiveProvider = vi.fn();
  const mockSetIsStreaming = vi.fn();
  const mockToggleChatPanel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useChatStore).mockReturnValue({
      activeProvider: 'openai',
      setActiveProvider: mockSetActiveProvider,
      setIsStreaming: mockSetIsStreaming,
    } as any);

    vi.mocked(useTradingStore).mockReturnValue({
      activeSymbol: 'AAPL',
      toggleChatPanel: mockToggleChatPanel,
    } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('Test response'),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });
  });

  describe('Rendering', () => {
    it('renders header with Assistant title', () => {
      render(<ChatSidePanel />);

      expect(screen.getByText('Assistant')).toBeInTheDocument();
    });

    it('renders MessageSquare icon', () => {
      render(<ChatSidePanel />);

      expect(document.querySelector('.lucide-message-square')).toBeInTheDocument();
    });

    it('renders ProviderSelector', () => {
      render(<ChatSidePanel />);

      expect(screen.getByTestId('provider-selector')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<ChatSidePanel />);

      expect(document.querySelector('.lucide-x')).toBeInTheDocument();
    });

    it('renders textarea for input', () => {
      render(<ChatSidePanel />);

      expect(screen.getByPlaceholderText(/ask about aapl/i)).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(<ChatSidePanel />);

      expect(document.querySelector('.lucide-send')).toBeInTheDocument();
    });

    it('renders keyboard shortcut hint', () => {
      render(<ChatSidePanel />);

      expect(screen.getByText(/press enter to send/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no messages', () => {
      render(<ChatSidePanel />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('shows quick prompts', () => {
      render(<ChatSidePanel />);

      expect(screen.getByText('Quick actions:')).toBeInTheDocument();
      expect(screen.getByText(/analyze aapl price action/i)).toBeInTheDocument();
    });

    it('populates input when quick prompt is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      await user.click(screen.getByText(/analyze aapl price action/i));

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      expect(textarea).toHaveValue('Analyze AAPL price action');
    });
  });

  describe('Sending Messages', () => {
    it('sends message on button click', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test message');

      const sendButton = document.querySelector('.lucide-send')?.closest('button');
      await user.click(sendButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.any(Object));
      });
    });

    it('sends message on Enter key', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test message{enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('does not send on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test message{shift>}{enter}{/shift}');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not send empty message', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const sendButton = document.querySelector('.lucide-send')?.closest('button');
      await user.click(sendButton!);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test message{enter}');

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('sends correct payload', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test message{enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test message'),
        });
      });
    });
  });

  describe('Message Display', () => {
    it('shows user message after sending', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Hello!{enter}');

      await waitFor(() => {
        expect(screen.getByText('Hello!')).toBeInTheDocument();
      });
    });

    it('shows assistant response', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Hello!{enter}');

      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when sending', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test{enter}');

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('disables input when loading', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test{enter}');

      await waitFor(() => {
        expect(textarea).toBeDisabled();
      });
    });

    it('sets streaming state', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test{enter}');

      expect(mockSetIsStreaming).toHaveBeenCalledWith(true);
    });

    it('clears streaming state after completion', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test{enter}');

      await waitFor(() => {
        expect(mockSetIsStreaming).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test{enter}');

      await waitFor(() => {
        expect(screen.getByText(/sorry, there was an error/i)).toBeInTheDocument();
      });
    });

    it('shows error message on non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test{enter}');

      await waitFor(() => {
        expect(screen.getByText(/sorry, there was an error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Provider Selection', () => {
    it('calls setActiveProvider on change', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const selector = screen.getByTestId('provider-selector');
      await user.selectOptions(selector, 'anthropic');

      expect(mockSetActiveProvider).toHaveBeenCalledWith('anthropic');
    });
  });

  describe('Close Button', () => {
    it('calls toggleChatPanel on close', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const closeButton = document.querySelector('.lucide-x')?.closest('button');
      await user.click(closeButton!);

      expect(mockToggleChatPanel).toHaveBeenCalled();
    });
  });

  describe('Context Symbol', () => {
    it('shows active symbol in placeholder', () => {
      render(<ChatSidePanel />);

      expect(screen.getByPlaceholderText('Ask about AAPL...')).toBeInTheDocument();
    });

    it('shows active symbol in empty state', () => {
      render(<ChatSidePanel />);

      expect(screen.getByText(/ask about aapl/i)).toBeInTheDocument();
    });

    it('includes symbol in request context', async () => {
      const user = userEvent.setup();
      render(<ChatSidePanel />);

      const textarea = screen.getByPlaceholderText(/ask about aapl/i);
      await user.type(textarea, 'Test{enter}');

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.context.activeSymbol).toBe('AAPL');
      });
    });
  });
});
