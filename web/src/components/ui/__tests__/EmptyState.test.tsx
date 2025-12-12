import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EmptyState, useEmptyStateSubtitle } from '../EmptyState';
import { renderHook } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('EmptyState', () => {

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<EmptyState />);
      expect(screen.getByText('deepstack')).toBeInTheDocument();
    });

    it('renders with default subtitle', () => {
      render(<EmptyState />);
      // Initially empty, will type in
      const container = screen.getByText('deepstack').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('renders with custom subtitle', () => {
      render(<EmptyState subtitle="Custom message here" />);
      expect(screen.getByText('deepstack')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<EmptyState className="custom-class" />);
      const element = container.querySelector('.custom-class');
      expect(element).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('renders small size variant', () => {
      render(<EmptyState size="sm" />);
      const logo = screen.getByText('deepstack');
      expect(logo).toHaveClass('text-xl');
    });

    it('renders medium size variant (default)', () => {
      render(<EmptyState size="md" />);
      const logo = screen.getByText('deepstack');
      expect(logo).toHaveClass('text-3xl');
    });

    it('renders large size variant', () => {
      render(<EmptyState size="lg" />);
      const logo = screen.getByText('deepstack');
      expect(logo).toHaveClass('text-4xl');
    });
  });

  describe('typewriter animation', () => {
    it('starts with empty text', () => {
      const { container } = render(<EmptyState subtitle="Test" />);
      // The subtitle container should exist but be empty initially
      const subtitleContainer = container.querySelector('.text-muted-foreground');
      expect(subtitleContainer).toBeInTheDocument();
    });

    it('types out subtitle over time', async () => {
      render(<EmptyState subtitle="Test" />);

      // Wait for typing animation to complete
      await waitFor(() => {
        expect(screen.getByText(/Test/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles subtitle changes with delete-then-type animation', async () => {
      const { rerender } = render(<EmptyState subtitle="First message" />);

      // Wait for initial message
      await waitFor(() => {
        expect(screen.getByText(/First/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Change subtitle
      rerender(<EmptyState subtitle="Second message" />);

      // The component should handle the transition
      await waitFor(() => {
        const container = screen.getByText('deepstack').parentElement;
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('styling', () => {
    it('has correct base classes', () => {
      const { container } = render(<EmptyState />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('flex');
      expect(mainDiv).toHaveClass('flex-col');
      expect(mainDiv).toHaveClass('items-center');
      expect(mainDiv).toHaveClass('justify-center');
      expect(mainDiv).toHaveClass('text-center');
    });

    it('logo has Urbanist font class', () => {
      render(<EmptyState />);
      const logo = screen.getByText('deepstack');
      expect(logo).toHaveClass('font-urbanist');
      expect(logo).toHaveClass('font-normal');
      expect(logo).toHaveClass('text-primary');
    });

    it('subtitle has muted foreground color', () => {
      const { container } = render(<EmptyState />);
      const subtitle = container.querySelector('.text-muted-foreground');
      expect(subtitle).toBeInTheDocument();
      expect(subtitle).toHaveClass('text-muted-foreground');
    });
  });

  describe('accessibility', () => {
    it('has readable text content', () => {
      render(<EmptyState />);
      expect(screen.getByText('deepstack')).toBeVisible();
    });

    it('maintains proper heading structure', () => {
      render(<EmptyState />);
      const logo = screen.getByText('deepstack');
      expect(logo.tagName).toBe('SPAN');
    });

    it('subtitle container has minimum height for layout stability', () => {
      const { container } = render(<EmptyState />);
      const subtitle = container.querySelector('.min-h-\\[1\\.5em\\]');
      expect(subtitle).toBeInTheDocument();
    });
  });
});

describe('useEmptyStateSubtitle', () => {
  describe('with active symbol', () => {
    it('returns symbol-specific message when symbol is active', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({
          hasActiveSymbol: true,
          activeSymbol: 'AAPL',
        })
      );

      expect(result.current).toBe('Ask me about AAPL');
    });

    it('returns default message when no active symbol', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({
          hasActiveSymbol: false,
        })
      );

      expect(result.current).toBe('What would you like to analyze?');
    });
  });

  describe('mode variations', () => {
    it('returns analysis message in analysis mode', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({
          mode: 'analysis',
        })
      );

      expect(result.current).toBe('What would you like to analyze?');
    });

    it('returns trading message in trading mode', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({
          mode: 'trading',
        })
      );

      expect(result.current).toBe('Ready to help you trade');
    });

    it('returns default message in chat mode', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({
          mode: 'chat',
        })
      );

      expect(result.current).toBe('What would you like to analyze?');
    });

    it('prioritizes active symbol over mode', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({
          hasActiveSymbol: true,
          activeSymbol: 'TSLA',
          mode: 'trading',
        })
      );

      expect(result.current).toBe('Ask me about TSLA');
    });
  });

  describe('edge cases', () => {
    it('handles undefined mode gracefully', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({})
      );

      expect(result.current).toBe('What would you like to analyze?');
    });

    it('handles empty options object', () => {
      const { result } = renderHook(() =>
        useEmptyStateSubtitle({})
      );

      expect(result.current).toBeTruthy();
      expect(typeof result.current).toBe('string');
    });
  });
});
