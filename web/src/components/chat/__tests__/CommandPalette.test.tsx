import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';

// Mock Command components
vi.mock('@/components/ui/command', () => ({
  CommandDialog: vi.fn(({ open, children, onOpenChange }) => (
    open ? (
      <div role="dialog" data-testid="command-dialog">
        <button onClick={() => onOpenChange(false)} data-testid="close-dialog">Close</button>
        {children}
      </div>
    ) : null
  )),
  CommandEmpty: vi.fn(({ children }) => <div data-testid="command-empty">{children}</div>),
  CommandGroup: vi.fn(({ heading, children }) => (
    <div data-testid={`command-group-${heading?.replace(/\s+/g, '-').toLowerCase()}`}>
      <span>{heading}</span>
      {children}
    </div>
  )),
  CommandInput: vi.fn(({ placeholder }) => (
    <input placeholder={placeholder} data-testid="command-input" />
  )),
  CommandItem: vi.fn(({ children, onSelect }) => (
    <button onClick={onSelect} data-testid="command-item">
      {children}
    </button>
  )),
  CommandList: vi.fn(({ children }) => <div data-testid="command-list">{children}</div>),
  CommandSeparator: vi.fn(() => <hr data-testid="command-separator" />),
  CommandShortcut: vi.fn(({ children }) => <span data-testid="command-shortcut">{children}</span>),
}));

describe('CommandPalette', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnCommand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <CommandPalette
          open={false}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders search input', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByTestId('command-input')).toBeInTheDocument();
    });

    it('renders Trading Tools group', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('Trading Tools')).toBeInTheDocument();
    });

    it('renders System group', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('renders separator between groups', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByTestId('command-separator')).toBeInTheDocument();
    });
  });

  describe('Trading Commands', () => {
    it('renders Analyze Ticker command', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('Analyze Ticker')).toBeInTheDocument();
    });

    it('renders Stock Screener command', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('Stock Screener')).toBeInTheDocument();
    });

    it('renders Place Order command', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('Place Order')).toBeInTheDocument();
    });
  });

  describe('System Commands', () => {
    it('renders Portfolio Summary command', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    it('renders Risk Report command', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('Risk Report')).toBeInTheDocument();
    });
  });

  describe('Command Execution', () => {
    it('calls onCommand with /analyze when clicking Analyze Ticker', async () => {
      const user = userEvent.setup();
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      const commandItems = screen.getAllByTestId('command-item');
      await user.click(commandItems[0]); // First item is Analyze Ticker

      expect(mockOnCommand).toHaveBeenCalledWith('/analyze');
    });

    it('closes dialog after command execution', async () => {
      const user = userEvent.setup();
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      const commandItems = screen.getAllByTestId('command-item');
      await user.click(commandItems[0]);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('toggles dialog on Shift+Tab', () => {
      render(
        <CommandPalette
          open={false}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

      expect(mockOnOpenChange).toHaveBeenCalledWith(true);
    });

    it('renders keyboard shortcuts', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      const shortcuts = screen.getAllByTestId('command-shortcut');
      expect(shortcuts.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('renders empty state message', () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={mockOnOpenChange}
          onCommand={mockOnCommand}
        />
      );

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });
});
