import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from '../separator';

describe('Separator', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(<Separator />);
      expect(container.querySelector('[data-slot="separator"]')).toBeInTheDocument();
    });

    it('should apply bg-border class', () => {
      const { container } = render(<Separator />);
      expect(container.firstChild).toHaveClass('bg-border');
    });

    it('should apply custom className', () => {
      const { container } = render(<Separator className="my-custom-class" />);
      expect(container.firstChild).toHaveClass('my-custom-class');
    });
  });

  describe('Orientation', () => {
    it('should default to horizontal orientation', () => {
      const { container } = render(<Separator />);
      expect(container.firstChild).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('should render as vertical separator', () => {
      const { container } = render(<Separator orientation="vertical" />);
      expect(container.firstChild).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  describe('Decorative', () => {
    it('should be decorative by default', () => {
      const { container } = render(<Separator />);
      // Decorative separators use data-orientation attribute
      expect(container.firstChild).toHaveAttribute('data-orientation');
    });

    it('should support non-decorative mode', () => {
      const { container } = render(<Separator decorative={false} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
