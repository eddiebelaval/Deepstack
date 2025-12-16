import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelSelector } from '../ModelSelector';
import { useChatStore } from '@/lib/stores/chat-store';

// Mock dependencies
vi.mock('@/lib/stores/chat-store');
vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
  },
}));

// Mock provider config
vi.mock('@/lib/llm/providers', () => ({
  providerConfig: {
    claude: { name: 'Claude Sonnet', icon: 'Brain', description: 'Best for most tasks' },
    claude_opus: { name: 'Claude Opus', icon: 'Brain', description: 'Most capable' },
    claude_haiku: { name: 'Claude Haiku', icon: 'Zap', description: 'Fast responses' },
    grok: { name: 'Grok', icon: 'Zap', description: 'X AI model' },
    sonar_reasoning: { name: 'Sonar', icon: 'Search', description: 'Search-enhanced' },
    perplexity: { name: 'Perplexity', icon: 'Search', description: 'Online AI' },
  },
}));

// Mock Popover components
vi.mock('@/components/ui/popover', () => ({
  Popover: vi.fn(({ open, children }) => <div data-testid="popover">{children}</div>),
  PopoverContent: vi.fn(({ children }) => <div data-testid="popover-content">{children}</div>),
  PopoverTrigger: vi.fn(({ children }) => <div data-testid="popover-trigger">{children}</div>),
}));

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, title, disabled, ...props }) => (
    <button title={title} disabled={disabled} {...props}>{children}</button>
  )),
}));

describe('ModelSelector', () => {
  const mockSetActiveProvider = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useChatStore).mockReturnValue({
      activeProvider: 'claude',
      setActiveProvider: mockSetActiveProvider,
    } as any);
  });

  describe('Rendering', () => {
    it('renders trigger button', () => {
      render(<ModelSelector />);

      expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
    });

    it('renders letter badge for current model', () => {
      render(<ModelSelector />);

      // S appears in trigger badge and option list
      expect(screen.getAllByText('S').length).toBeGreaterThan(0);
    });

    it('renders popover content', () => {
      render(<ModelSelector />);

      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    it('renders header', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Select Model')).toBeInTheDocument();
    });

    it('renders Claude group', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Claude')).toBeInTheDocument();
    });

    it('renders Other Models group', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Other Models')).toBeInTheDocument();
    });
  });

  describe('Model Display', () => {
    it('renders Claude Sonnet option', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Claude Sonnet')).toBeInTheDocument();
    });

    it('renders Claude Opus option', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Claude Opus')).toBeInTheDocument();
    });

    it('renders Claude Haiku option', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Claude Haiku')).toBeInTheDocument();
    });

    it('renders Grok option', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Grok')).toBeInTheDocument();
    });

    it('renders model descriptions', () => {
      render(<ModelSelector />);

      expect(screen.getByText('Best for most tasks')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls setActiveProvider on model select', async () => {
      const user = userEvent.setup();
      render(<ModelSelector />);

      await user.click(screen.getByText('Claude Opus'));

      expect(mockSetActiveProvider).toHaveBeenCalledWith('claude_opus');
    });

    it('calls setActiveProvider for Haiku', async () => {
      const user = userEvent.setup();
      render(<ModelSelector />);

      await user.click(screen.getByText('Claude Haiku'));

      expect(mockSetActiveProvider).toHaveBeenCalledWith('claude_haiku');
    });
  });

  describe('Active State', () => {
    it('shows active indicator for current model', () => {
      render(<ModelSelector />);

      // Claude Sonnet should have active styling
      const activeOption = screen.getByText('Claude Sonnet').closest('button');
      // Contains bg-primary/10 for active
      expect(activeOption?.className).toMatch(/bg-primary/);
    });

    it('shows different active model', () => {
      vi.mocked(useChatStore).mockReturnValue({
        activeProvider: 'claude_opus',
        setActiveProvider: mockSetActiveProvider,
      } as any);

      render(<ModelSelector />);

      // O appears in trigger badge and option list
      expect(screen.getAllByText('O').length).toBeGreaterThan(0);
    });
  });

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      render(<ModelSelector disabled />);

      const buttons = screen.getAllByRole('button');
      // Trigger button is the one with title
      const triggerButton = buttons.find(b => b.getAttribute('title'));
      expect(triggerButton).toBeDisabled();
    });
  });

  describe('Title Attribute', () => {
    it('shows model name in title', () => {
      render(<ModelSelector />);

      const buttons = screen.getAllByRole('button');
      const triggerButton = buttons.find(b => b.getAttribute('title'));
      expect(triggerButton).toHaveAttribute('title', 'Model: Claude Sonnet');
    });
  });
});
