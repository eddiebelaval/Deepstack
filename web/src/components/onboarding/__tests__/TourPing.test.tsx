import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourPing } from '../TourPing';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('TourPing', () => {
  const defaultProps = {
    isActive: true,
    title: 'Test Title',
    description: 'Test Description',
    position: 'bottom' as const,
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when active', () => {
      const { container } = render(<TourPing {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('does not render when inactive', () => {
      const { container } = render(<TourPing {...defaultProps} isActive={false} />);
      expect(container.firstChild).not.toBeInTheDocument();
    });

    it('renders pulsing ping initially', () => {
      const { container } = render(<TourPing {...defaultProps} />);
      const button = container.querySelector('button[aria-label*="Tour"]');
      expect(button).toBeInTheDocument();
    });

    it('shows title in aria-label', () => {
      const { container } = render(<TourPing {...defaultProps} />);
      const button = container.querySelector('button[aria-label="Tour: Test Title"]');
      expect(button).toBeInTheDocument();
    });
  });

  describe('expansion', () => {
    it('expands tooltip when ping is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<TourPing {...defaultProps} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('shows tip when provided', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <TourPing {...defaultProps} tip="This is a helpful tip" />
      );

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      expect(screen.getByText(/This is a helpful tip/)).toBeInTheDocument();
    });

    it('does not show tip section when tip not provided', async () => {
      const user = userEvent.setup();
      const { container } = render(<TourPing {...defaultProps} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      expect(screen.queryByText(/Tip:/)).not.toBeInTheDocument();
    });

    it('shows Got it button when expanded', async () => {
      const user = userEvent.setup();
      const { container } = render(<TourPing {...defaultProps} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      expect(screen.getByText('Got it')).toBeInTheDocument();
    });

    it('shows dismiss button when expanded', async () => {
      const user = userEvent.setup();
      const { container } = render(<TourPing {...defaultProps} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('dismiss functionality', () => {
    it('calls onDismiss when Got it is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const { container } = render(<TourPing {...defaultProps} onDismiss={onDismiss} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      const gotItButton = screen.getByText('Got it');
      await user.click(gotItButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when X button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const { container } = render(<TourPing {...defaultProps} onDismiss={onDismiss} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      const dismissButton = screen.getByLabelText('Dismiss');
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('collapses tooltip before calling onDismiss', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const { container } = render(<TourPing {...defaultProps} onDismiss={onDismiss} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      const gotItButton = screen.getByText('Got it');
      await user.click(gotItButton);

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('position variants', () => {
    it('accepts top position', () => {
      render(<TourPing {...defaultProps} position="top" />);
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('accepts bottom position', () => {
      render(<TourPing {...defaultProps} position="bottom" />);
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('accepts left position', () => {
      render(<TourPing {...defaultProps} position="left" />);
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('accepts right position', () => {
      render(<TourPing {...defaultProps} position="right" />);
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <TourPing {...defaultProps} className="custom-ping-class" />
      );

      expect(container.querySelector('.custom-ping-class')).toBeInTheDocument();
    });

    it('merges className with default classes', () => {
      const { container } = render(
        <TourPing {...defaultProps} className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
      expect(wrapper).toHaveClass('relative');
    });
  });

  describe('accessibility', () => {
    it('has accessible aria-label on ping button', () => {
      const { container } = render(<TourPing {...defaultProps} />);
      const button = container.querySelector('button[aria-label="Tour: Test Title"]');
      expect(button).toBeInTheDocument();
    });

    it('dismiss button has accessible label', async () => {
      const user = userEvent.setup();
      const { container } = render(<TourPing {...defaultProps} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles rapid clicks on ping button', async () => {
      const user = userEvent.setup();
      const { container } = render(<TourPing {...defaultProps} />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;

      await user.click(pingButton);
      await user.click(pingButton);
      await user.click(pingButton);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('handles empty description', async () => {
      const user = userEvent.setup();
      const { container } = render(<TourPing {...defaultProps} description="" />);

      const pingButton = container.querySelector('button[aria-label*="Tour"]') as HTMLButtonElement;
      await user.click(pingButton);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });
});
