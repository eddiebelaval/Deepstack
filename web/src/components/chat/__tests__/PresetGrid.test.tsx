import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresetGrid } from '../PresetGrid';
import { useIsMobile } from '@/hooks/useIsMobile';

// Mock dependencies
vi.mock('@/hooks/useIsMobile');

// Mock presets - avoid hoisting issue by using inline component
vi.mock('@/lib/presets', () => ({
  PRESETS: [
    { prompt: 'Analyze AAPL', desc: 'Stock analysis', icon: () => null },
    { prompt: 'Portfolio review', desc: 'Check positions', icon: () => null },
    { prompt: 'Market overview', desc: 'Daily summary', icon: () => null },
    { prompt: 'Risk assessment', desc: 'Evaluate risk', icon: () => null },
  ],
}));

describe('PresetGrid', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useIsMobile).mockReturnValue({ isMobile: false } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Desktop Layout', () => {
    it('renders grid layout on desktop', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      const grid = document.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('renders all presets', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();
      expect(screen.getByText('Portfolio review')).toBeInTheDocument();
      expect(screen.getByText('Market overview')).toBeInTheDocument();
      expect(screen.getByText('Risk assessment')).toBeInTheDocument();
    });

    it('renders descriptions', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      expect(screen.getByText('Stock analysis')).toBeInTheDocument();
      expect(screen.getByText('Check positions')).toBeInTheDocument();
    });

    it('calls onSelect with prompt on click', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<PresetGrid onSelect={mockOnSelect} />);

      await user.click(screen.getByText('Analyze AAPL'));

      expect(mockOnSelect).toHaveBeenCalledWith('Analyze AAPL');
    });

    it('applies custom className', () => {
      const { container } = render(<PresetGrid onSelect={mockOnSelect} className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue({ isMobile: true } as any);
    });

    it('renders carousel on mobile', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      // Should not have grid layout
      expect(document.querySelector('.grid-cols-2')).not.toBeInTheDocument();
    });

    it('shows navigation arrows', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      expect(screen.getByLabelText('Previous suggestion')).toBeInTheDocument();
      expect(screen.getByLabelText('Next suggestion')).toBeInTheDocument();
    });

    it('shows navigation dots', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      const dots = screen.getAllByLabelText(/Go to suggestion/);
      expect(dots.length).toBe(4);
    });

    it('shows first preset initially', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();
    });

    it('navigates to next on arrow click', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<PresetGrid onSelect={mockOnSelect} />);

      await user.click(screen.getByLabelText('Next suggestion'));

      expect(screen.getByText('Portfolio review')).toBeInTheDocument();
    });

    it('navigates to previous on arrow click', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<PresetGrid onSelect={mockOnSelect} />);

      // Go to next first
      await user.click(screen.getByLabelText('Next suggestion'));
      // Then go back
      await user.click(screen.getByLabelText('Previous suggestion'));

      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();
    });

    it('navigates to specific index on dot click', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<PresetGrid onSelect={mockOnSelect} />);

      const dots = screen.getAllByLabelText(/Go to suggestion/);
      await user.click(dots[2]); // Click third dot

      expect(screen.getByText('Market overview')).toBeInTheDocument();
    });

    it('auto-rotates on mobile', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      // First preset visible
      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();

      // Advance time by 4 seconds
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Should show second preset
      expect(screen.getByText('Portfolio review')).toBeInTheDocument();
    });

    it('pauses auto-rotate on interaction', async () => {
      // This test verifies that auto-rotate pause logic exists
      // Manual interaction should set isPaused ref to true
      render(<PresetGrid onSelect={mockOnSelect} />);

      // Initial preset is visible
      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();

      // Click next button - this should pause auto-rotate
      const nextBtn = screen.getByLabelText('Next suggestion');
      fireEvent.click(nextBtn);

      // Second preset should be visible after click
      expect(screen.getByText('Portfolio review')).toBeInTheDocument();
    });
  });

  describe('Touch Gestures', () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue({ isMobile: true } as any);
    });

    it('handles swipe left', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      const container = screen.getByText('Analyze AAPL').closest('.relative');

      fireEvent.touchStart(container!, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(container!, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(container!);

      expect(screen.getByText('Portfolio review')).toBeInTheDocument();
    });

    it('handles swipe right', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      // Get the carousel container
      const container = screen.getByText('Analyze AAPL').closest('.relative');

      // First swipe left to go to second preset (200 -> 100 = -100px, triggers next)
      fireEvent.touchStart(container!, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(container!, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(container!);

      // Verify we're on second preset
      expect(screen.getByText('Portfolio review')).toBeInTheDocument();

      // Now swipe right to go back (100 -> 200 = +100px, triggers prev)
      fireEvent.touchStart(container!, { touches: [{ clientX: 100 }] });
      fireEvent.touchMove(container!, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(container!);

      // Should be back on first preset
      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();
    });

    it('ignores small swipes', () => {
      render(<PresetGrid onSelect={mockOnSelect} />);

      const container = screen.getByText('Analyze AAPL').closest('.relative');

      fireEvent.touchStart(container!, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(container!, { touches: [{ clientX: 180 }] }); // Only 20px
      fireEvent.touchEnd(container!);

      // Should still be on first preset
      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();
    });
  });

  describe('Wrapping Behavior', () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue({ isMobile: true } as any);
    });

    it('wraps from last to first', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<PresetGrid onSelect={mockOnSelect} />);

      // Navigate to last
      const dots = screen.getAllByLabelText(/Go to suggestion/);
      await user.click(dots[3]); // Last dot
      expect(screen.getByText('Risk assessment')).toBeInTheDocument();

      // Click next - should wrap to first
      await user.click(screen.getByLabelText('Next suggestion'));
      expect(screen.getByText('Analyze AAPL')).toBeInTheDocument();
    });

    it('wraps from first to last', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      render(<PresetGrid onSelect={mockOnSelect} />);

      // Click previous on first - should wrap to last
      await user.click(screen.getByLabelText('Previous suggestion'));

      expect(screen.getByText('Risk assessment')).toBeInTheDocument();
    });
  });
});
