import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderSelector } from '../ProviderSelector';

// Mock provider config
vi.mock('@/lib/llm/providers', () => ({
  providerConfig: {
    claude: { name: 'Claude', icon: 'Brain', description: 'Anthropic Claude' },
    grok: { name: 'Grok', icon: 'Zap', description: 'X AI Grok' },
    perplexity: { name: 'Perplexity', icon: 'Search', description: 'Perplexity AI' },
  },
}));

// Mock DropdownMenu components
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: vi.fn(({ children }) => <div data-testid="dropdown-menu">{children}</div>),
  DropdownMenuContent: vi.fn(({ children }) => <div data-testid="dropdown-content">{children}</div>),
  DropdownMenuItem: vi.fn(({ children, onClick }) => (
    <button onClick={onClick} data-testid="dropdown-item">{children}</button>
  )),
  DropdownMenuTrigger: vi.fn(({ children }) => <div data-testid="dropdown-trigger">{children}</div>),
}));

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, disabled, ...props }) => (
    <button disabled={disabled} {...props}>{children}</button>
  )),
}));

describe('ProviderSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dropdown trigger', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    });

    it('renders current provider name', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      // Claude appears in trigger and dropdown
      expect(screen.getAllByText('Claude').length).toBeGreaterThan(0);
    });

    it('renders dropdown content', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    });

    it('renders ChevronDown icon', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      expect(document.querySelector('.lucide-chevron-down')).toBeInTheDocument();
    });
  });

  describe('Provider Options', () => {
    it('renders all provider options', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      const items = screen.getAllByTestId('dropdown-item');
      expect(items.length).toBe(3); // claude, grok, perplexity
    });

    it('renders provider descriptions', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
      expect(screen.getByText('X AI Grok')).toBeInTheDocument();
      expect(screen.getByText('Perplexity AI')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onChange with selected provider', async () => {
      const user = userEvent.setup();
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      const items = screen.getAllByTestId('dropdown-item');
      await user.click(items[1]); // Click grok

      expect(mockOnChange).toHaveBeenCalledWith('grok');
    });

    it('calls onChange for perplexity', async () => {
      const user = userEvent.setup();
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      const items = screen.getAllByTestId('dropdown-item');
      await user.click(items[2]); // Click perplexity

      expect(mockOnChange).toHaveBeenCalledWith('perplexity');
    });
  });

  describe('Active Indicator', () => {
    it('shows check mark for active provider', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} />);

      expect(document.querySelector('.lucide-check')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      render(<ProviderSelector value="claude" onChange={mockOnChange} disabled />);

      const buttons = screen.getAllByRole('button');
      // First button is the trigger
      expect(buttons[0]).toBeDisabled();
    });
  });

  describe('Different Values', () => {
    it('shows Grok when value is grok', () => {
      render(<ProviderSelector value="grok" onChange={mockOnChange} />);

      // Grok appears in both trigger and dropdown
      const grokTexts = screen.getAllByText('Grok');
      expect(grokTexts.length).toBeGreaterThan(0);
    });

    it('shows Perplexity when value is perplexity', () => {
      render(<ProviderSelector value="perplexity" onChange={mockOnChange} />);

      const perplexityTexts = screen.getAllByText('Perplexity');
      expect(perplexityTexts.length).toBeGreaterThan(0);
    });
  });
});
