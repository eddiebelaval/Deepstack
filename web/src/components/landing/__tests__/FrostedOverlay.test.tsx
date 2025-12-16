import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FrostedOverlay } from '../FrostedOverlay';

describe('FrostedOverlay', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<FrostedOverlay />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default medium intensity', () => {
      const { container } = render(<FrostedOverlay />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('backdrop-blur-[8px]');
    });

    it('applies custom className', () => {
      const { container } = render(<FrostedOverlay className="custom-class" />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('custom-class');
    });
  });

  describe('intensity prop', () => {
    it('applies light blur intensity', () => {
      const { container } = render(<FrostedOverlay intensity="light" />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('backdrop-blur-[4px]');
      expect(overlay).not.toHaveClass('backdrop-blur-[8px]');
      expect(overlay).not.toHaveClass('backdrop-blur-[16px]');
    });

    it('applies medium blur intensity', () => {
      const { container } = render(<FrostedOverlay intensity="medium" />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('backdrop-blur-[8px]');
      expect(overlay).not.toHaveClass('backdrop-blur-[4px]');
      expect(overlay).not.toHaveClass('backdrop-blur-[16px]');
    });

    it('applies heavy blur intensity', () => {
      const { container } = render(<FrostedOverlay intensity="heavy" />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('backdrop-blur-[16px]');
      expect(overlay).not.toHaveClass('backdrop-blur-[4px]');
      expect(overlay).not.toHaveClass('backdrop-blur-[8px]');
    });
  });

  describe('styling', () => {
    it('has absolute positioning', () => {
      const { container } = render(<FrostedOverlay />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('absolute');
      expect(overlay).toHaveClass('inset-0');
    });

    it('has pointer-events-none to allow click-through', () => {
      const { container } = render(<FrostedOverlay />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('pointer-events-none');
    });

    it('has proper z-index', () => {
      const { container } = render(<FrostedOverlay />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('z-10');
    });

    it('has background tint', () => {
      const { container } = render(<FrostedOverlay />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('bg-background/3');
    });

    it('has border at bottom', () => {
      const { container } = render(<FrostedOverlay />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('border-b');
      expect(overlay).toHaveClass('border-border/10');
    });
  });

  describe('edge cases', () => {
    it('merges multiple classNames correctly', () => {
      const { container } = render(
        <FrostedOverlay className="test-class-1 test-class-2" intensity="light" />
      );
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('test-class-1');
      expect(overlay).toHaveClass('test-class-2');
      expect(overlay).toHaveClass('backdrop-blur-[4px]');
    });

    it('handles undefined className prop', () => {
      const { container } = render(<FrostedOverlay className={undefined} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
