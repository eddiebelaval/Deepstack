import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '../skeleton';

describe('Skeleton', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(<Skeleton />);
      expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    });

    it('should apply animate-pulse class', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass('animate-pulse');
    });

    it('should apply bg-accent class', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass('bg-accent');
    });

    it('should apply rounded-md class', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveClass('rounded-md');
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="w-full h-4" />);
      expect(container.firstChild).toHaveClass('w-full');
      expect(container.firstChild).toHaveClass('h-4');
    });
  });

  describe('Props', () => {
    it('should pass through HTML div props', () => {
      const { container } = render(
        <Skeleton data-testid="test-skeleton" style={{ width: '100px' }} />
      );
      expect(container.querySelector('[data-testid="test-skeleton"]')).toBeInTheDocument();
    });
  });
});
