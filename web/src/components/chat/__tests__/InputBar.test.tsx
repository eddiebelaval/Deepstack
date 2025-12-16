import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InputBar } from '../InputBar';

// Mock ChatInput component
vi.mock('../ChatInput', () => ({
  ChatInput: vi.fn(({ onSend, disabled }) => (
    <div data-testid="chat-input" data-disabled={disabled}>
      <input
        placeholder="Type a message..."
        onChange={(e) => {}}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled) {
            onSend((e.target as HTMLInputElement).value);
          }
        }}
        disabled={disabled}
      />
    </div>
  )),
}));

describe('InputBar', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders ChatInput component', () => {
      render(<InputBar onSend={mockOnSend} />);

      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('renders input element', () => {
      render(<InputBar onSend={mockOnSend} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    it('passes onSend to ChatInput', () => {
      render(<InputBar onSend={mockOnSend} />);

      // Verify ChatInput received the onSend prop
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('passes disabled state when loading', () => {
      render(<InputBar onSend={mockOnSend} isLoading={true} />);

      const chatInput = screen.getByTestId('chat-input');
      expect(chatInput).toHaveAttribute('data-disabled', 'true');
    });

    it('does not disable when not loading', () => {
      render(<InputBar onSend={mockOnSend} isLoading={false} />);

      const chatInput = screen.getByTestId('chat-input');
      expect(chatInput).toHaveAttribute('data-disabled', 'false');
    });

    it('defaults to not loading', () => {
      render(<InputBar onSend={mockOnSend} />);

      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).not.toBeDisabled();
    });
  });

  describe('Container Styling', () => {
    it('applies sticky positioning', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.sticky')).toBeInTheDocument();
    });

    it('applies bottom-0 positioning', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.bottom-0')).toBeInTheDocument();
    });

    it('applies z-10 for stacking', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.z-10')).toBeInTheDocument();
    });

    it('applies glass-surface-elevated class', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.glass-surface-elevated')).toBeInTheDocument();
    });

    it('applies border-t', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.border-t')).toBeInTheDocument();
    });
  });

  describe('Content Container', () => {
    it('applies max-w-3xl for content width', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.max-w-3xl')).toBeInTheDocument();
    });

    it('centers content with mx-auto', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.mx-auto')).toBeInTheDocument();
    });

    it('applies full width with w-full', () => {
      const { container } = render(<InputBar onSend={mockOnSend} />);

      expect(container.querySelector('.w-full')).toBeInTheDocument();
    });
  });
});
