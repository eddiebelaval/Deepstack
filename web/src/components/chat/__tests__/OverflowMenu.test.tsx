import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverflowMenu } from '../OverflowMenu';

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

describe('OverflowMenu', () => {
  const mockOnOpenCommandPalette = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders trigger button', () => {
      render(<OverflowMenu />);

      expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
    });

    it('renders Plus icon', () => {
      render(<OverflowMenu />);

      expect(document.querySelector('.lucide-plus')).toBeInTheDocument();
    });

    it('renders popover content', () => {
      render(<OverflowMenu />);

      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    it('has More options title', () => {
      render(<OverflowMenu />);

      const buttons = screen.getAllByRole('button');
      const triggerButton = buttons.find(b => b.getAttribute('title') === 'More options');
      expect(triggerButton).toBeInTheDocument();
    });
  });

  describe('Menu Items', () => {
    it('renders Voice Input option', () => {
      render(<OverflowMenu />);

      expect(screen.getByText('Voice Input')).toBeInTheDocument();
    });

    it('renders Attachments option', () => {
      render(<OverflowMenu />);

      expect(screen.getByText('Attachments')).toBeInTheDocument();
    });

    it('renders Commands option', () => {
      render(<OverflowMenu />);

      expect(screen.getByText('Commands')).toBeInTheDocument();
    });

    it('renders History option', () => {
      render(<OverflowMenu />);

      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('renders descriptions for items', () => {
      render(<OverflowMenu />);

      expect(screen.getByText('Speak your message')).toBeInTheDocument();
      expect(screen.getByText('Upload files or images')).toBeInTheDocument();
      expect(screen.getByText('Open command palette (Shift+Tab)')).toBeInTheDocument();
      expect(screen.getByText('View past conversations')).toBeInTheDocument();
    });
  });

  describe('Coming Soon Badges', () => {
    it('shows Soon badge for Voice Input', () => {
      render(<OverflowMenu />);

      const soonBadges = screen.getAllByText('Soon');
      expect(soonBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Commands Action', () => {
    it('calls onOpenCommandPalette when Commands clicked', async () => {
      const user = userEvent.setup();
      render(<OverflowMenu onOpenCommandPalette={mockOnOpenCommandPalette} />);

      await user.click(screen.getByText('Commands'));

      expect(mockOnOpenCommandPalette).toHaveBeenCalled();
    });

    it('does not error when no onOpenCommandPalette provided', async () => {
      const user = userEvent.setup();
      render(<OverflowMenu />);

      // Should not throw
      await user.click(screen.getByText('Commands'));
    });
  });

  describe('Disabled State', () => {
    it('disables trigger button when disabled', () => {
      render(<OverflowMenu disabled />);

      const buttons = screen.getAllByRole('button');
      const triggerButton = buttons.find(b => b.getAttribute('title') === 'More options');
      expect(triggerButton).toBeDisabled();
    });
  });

  describe('Icons', () => {
    it('renders Mic icon', () => {
      render(<OverflowMenu />);

      expect(document.querySelector('.lucide-mic')).toBeInTheDocument();
    });

    it('renders Paperclip icon', () => {
      render(<OverflowMenu />);

      expect(document.querySelector('.lucide-paperclip')).toBeInTheDocument();
    });

    it('renders Command icon', () => {
      render(<OverflowMenu />);

      expect(document.querySelector('.lucide-command')).toBeInTheDocument();
    });

    it('renders History icon', () => {
      render(<OverflowMenu />);

      expect(document.querySelector('.lucide-history')).toBeInTheDocument();
    });
  });
});
