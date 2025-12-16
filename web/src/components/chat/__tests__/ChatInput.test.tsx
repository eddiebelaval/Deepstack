import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuth } from '@/components/providers/AuthProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useFirewallGlow } from '@/components/emotional-firewall';

// Mock dependencies
vi.mock('@/lib/stores/chat-store');
vi.mock('@/components/providers/AuthProvider');
vi.mock('@/hooks/useIsMobile');
vi.mock('@/components/emotional-firewall');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock child components
vi.mock('../PersonaSelector', () => ({
  PersonaSelector: ({ disabled }: any) => (
    <div data-testid="persona-selector" aria-disabled={disabled}>
      Persona Selector
    </div>
  ),
}));

vi.mock('../ModelSelector', () => ({
  ModelSelector: ({ disabled }: any) => (
    <div data-testid="model-selector" aria-disabled={disabled}>
      Model Selector
    </div>
  ),
}));

vi.mock('../OverflowMenu', () => ({
  OverflowMenu: ({ onOpenCommandPalette, disabled }: any) => (
    <button
      data-testid="overflow-menu"
      onClick={() => onOpenCommandPalette()}
      disabled={disabled}
    >
      Overflow Menu
    </button>
  ),
}));

vi.mock('../CommandPalette', () => ({
  CommandPalette: ({ open, onOpenChange, onCommand }: any) => (
    <div data-testid="command-palette" data-open={open}>
      Command Palette
    </div>
  ),
}));

describe('ChatInput', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useChatStore as any).mockReturnValue({
      isStreaming: false,
      useExtendedThinking: false,
      setUseExtendedThinking: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });

    (useIsMobile as any).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1024,
    });

    (useFirewallGlow as any).mockReturnValue({
      glowClass: '',
      status: 'secure',
    });

    // Mock fetch for command execution
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success' }),
    });
  });

  describe('Rendering', () => {
    it('renders textarea input', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByPlaceholderText('Message DeepStack...')).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });

    it('renders persona selector', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByTestId('persona-selector')).toBeInTheDocument();
    });

    it('renders model selector', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
    });

    it('renders overflow menu', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByTestId('overflow-menu')).toBeInTheDocument();
    });

    it('shows desktop placeholder on desktop', () => {
      (useIsMobile as any).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
      });

      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByPlaceholderText('Message DeepStack...')).toBeInTheDocument();
    });

    it('shows mobile placeholder on mobile', () => {
      (useIsMobile as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
      });

      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument();
    });
  });

  describe('Extended thinking toggle', () => {
    it('renders extended thinking button on desktop', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const button = screen.getByTitle('Extended thinking disabled');
      expect(button).toBeInTheDocument();
    });

    it('does not render extended thinking button on mobile', () => {
      (useIsMobile as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
      });

      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.queryByTitle(/Extended thinking/)).not.toBeInTheDocument();
    });

    it('toggles extended thinking on click', async () => {
      const user = userEvent.setup();
      const setUseExtendedThinking = vi.fn();

      (useChatStore as any).mockReturnValue({
        isStreaming: false,
        useExtendedThinking: false,
        setUseExtendedThinking,
      });

      render(<ChatInput onSend={mockOnSend} />);

      const button = screen.getByTitle('Extended thinking disabled');
      await user.click(button);

      expect(setUseExtendedThinking).toHaveBeenCalledWith(true);
    });

    it('shows active state when extended thinking is enabled', () => {
      (useChatStore as any).mockReturnValue({
        isStreaming: false,
        useExtendedThinking: true,
        setUseExtendedThinking: vi.fn(),
      });

      render(<ChatInput onSend={mockOnSend} />);

      const button = screen.getByTitle('Extended thinking enabled');
      expect(button).toHaveClass('bg-purple-500/10');
      expect(button).toHaveClass('text-purple-500');
    });
  });

  describe('Input behavior', () => {
    it('updates input value on typing', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, 'Hello world');

      expect(textarea).toHaveValue('Hello world');
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, 'Test message');
      await user.click(screen.getByRole('button', { name: '' }));

      expect(textarea).toHaveValue('');
    });

    it('trims whitespace when sending', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, '  Test message  ');
      await user.click(screen.getByRole('button', { name: '' }));

      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('does not send empty message', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, '   ');
      await user.click(screen.getByRole('button', { name: '' }));

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('sends message on Enter key', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, 'Test message{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('does not send on Shift+Enter', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(mockOnSend).not.toHaveBeenCalled();
      expect(textarea).toHaveValue('Line 1\nLine 2');
    });

    it('opens command palette on Shift+Tab', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      textarea.focus();
      await user.keyboard('{Shift>}{Tab}{/Shift}');

      const commandPalette = screen.getByTestId('command-palette');
      expect(commandPalette).toHaveAttribute('data-open', 'true');
    });
  });

  describe('Disabled states', () => {
    it('disables input when disabled prop is true', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      expect(textarea).toBeDisabled();
    });

    it('disables input when streaming', () => {
      (useChatStore as any).mockReturnValue({
        isStreaming: true,
        useExtendedThinking: false,
        setUseExtendedThinking: vi.fn(),
      });

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      expect(textarea).toBeDisabled();
    });

    it('disables send button when input is empty', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeDisabled();
    });

    it('disables send button when streaming', () => {
      (useChatStore as any).mockReturnValue({
        isStreaming: true,
        useExtendedThinking: false,
        setUseExtendedThinking: vi.fn(),
      });

      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeDisabled();
    });

    it('shows loading spinner when streaming', () => {
      (useChatStore as any).mockReturnValue({
        isStreaming: true,
        useExtendedThinking: false,
        setUseExtendedThinking: vi.fn(),
      });

      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables overflow menu when streaming', () => {
      (useChatStore as any).mockReturnValue({
        isStreaming: true,
        useExtendedThinking: false,
        setUseExtendedThinking: vi.fn(),
      });

      render(<ChatInput onSend={mockOnSend} />);

      const overflowMenu = screen.getByTestId('overflow-menu');
      expect(overflowMenu).toBeDisabled();
    });

    it('disables extended thinking when streaming', () => {
      (useChatStore as any).mockReturnValue({
        isStreaming: true,
        useExtendedThinking: false,
        setUseExtendedThinking: vi.fn(),
      });

      render(<ChatInput onSend={mockOnSend} />);

      const thinkingButton = screen.getByTitle('Extended thinking disabled');
      expect(thinkingButton).toBeDisabled();
    });
  });

  describe('Guest gate overlay', () => {
    it('shows sign in overlay when user is not authenticated', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
      });

      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByText('Sign in to Chat')).toBeInTheDocument();
    });

    it('does not show overlay when user is authenticated', () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        loading: false,
      });

      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.queryByText('Sign in to Chat')).not.toBeInTheDocument();
    });

    it('does not show overlay when loading', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: true,
      });

      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.queryByText('Sign in to Chat')).not.toBeInTheDocument();
    });

    it('sign in button has LogIn icon', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
      });

      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const button = screen.getByText('Sign in to Chat');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Firewall glow effect', () => {
    it('applies firewall glow class', () => {
      (useFirewallGlow as any).mockReturnValue({
        glowClass: 'ring-2 ring-green-500',
        status: 'secure',
      });

      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const inputContainer = container.querySelector('.ring-2.ring-green-500');
      expect(inputContainer).toBeInTheDocument();
    });

    it('applies pulse animation for caution status', () => {
      (useFirewallGlow as any).mockReturnValue({
        glowClass: 'ring-2 ring-yellow-500',
        status: 'caution',
      });

      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const inputContainer = container.querySelector('.animate-firewall-pulse');
      expect(inputContainer).toBeInTheDocument();
    });

    it('applies pulse animation for compromised status', () => {
      (useFirewallGlow as any).mockReturnValue({
        glowClass: 'ring-2 ring-red-500',
        status: 'compromised',
      });

      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const inputContainer = container.querySelector('.animate-firewall-pulse');
      expect(inputContainer).toBeInTheDocument();
    });
  });

  describe('Mobile optimizations', () => {
    beforeEach(() => {
      (useIsMobile as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
      });
    });

    it('applies mobile padding', () => {
      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const wrapper = container.querySelector('.p-3');
      expect(wrapper).toBeInTheDocument();
    });

    it('sets mobile-friendly inputMode', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Ask anything...');
      expect(textarea).toHaveAttribute('inputMode', 'text');
    });

    it('sets mobile-friendly enterKeyHint', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Ask anything...');
      expect(textarea).toHaveAttribute('enterKeyHint', 'send');
    });

    it('does not show desktop hint on mobile', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.queryByText(/Enter to send/)).not.toBeInTheDocument();
    });

    it('applies mobile textarea sizing', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Ask anything...');
      expect(textarea).toHaveClass('min-h-[36px]');
      expect(textarea).toHaveClass('max-h-[120px]');
      expect(textarea).toHaveClass('text-base');
    });
  });

  describe('Desktop features', () => {
    it('shows keyboard hint on desktop', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByText(/Enter to send • Shift\+Enter for new line/)).toBeInTheDocument();
    });

    it('applies desktop padding', () => {
      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const wrapper = container.querySelector('.p-4');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies desktop textarea sizing', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      expect(textarea).toHaveClass('min-h-[44px]');
      expect(textarea).toHaveClass('max-h-[200px]');
      expect(textarea).toHaveClass('text-sm');
    });
  });

  describe('Styling', () => {
    it('has glass morphism effect', () => {
      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const inputContainer = container.querySelector('.bg-background\\/80');
      expect(inputContainer).toBeInTheDocument();
      expect(inputContainer).toHaveClass('backdrop-blur-sm');
    });

    it('has rounded pill shape', () => {
      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const inputContainer = container.querySelector('.rounded-2xl');
      expect(inputContainer).toBeInTheDocument();
    });

    it('has border', () => {
      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const inputContainer = container.querySelector('.border');
      expect(inputContainer).toBeInTheDocument();
      expect(inputContainer).toHaveClass('border-border/50');
    });
  });

  describe('Command palette integration', () => {
    it('opens command palette from overflow menu', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const overflowButton = screen.getByTestId('overflow-menu');
      await user.click(overflowButton);

      const commandPalette = screen.getByTestId('command-palette');
      expect(commandPalette).toHaveAttribute('data-open', 'true');
    });

    it('renders command palette component', () => {
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles very long input', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const longText = 'A '.repeat(1000);
      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, longText);

      expect(textarea).toHaveValue(longText);
    });

    it('handles special characters', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const specialChars = '< > & " \' @ # $ % ^';
      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, specialChars);

      expect(textarea).toHaveValue(specialChars);
    });

    it('handles rapid typing', async () => {
      const user = userEvent.setup();

      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText('Message DeepStack...');
      await user.type(textarea, 'Quick message', { delay: 1 });

      expect(textarea).toHaveValue('Quick message');
    });
  });
});
