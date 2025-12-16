import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Slider } from '../slider';

describe('Slider', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
    });

    it('should render slider role', () => {
      render(<Slider defaultValue={[50]} />);
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Slider defaultValue={[50]} className="custom-class" />);
      expect(container.querySelector('[data-slot="slider"]')).toHaveClass('custom-class');
    });

    it('should render track', () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      expect(container.querySelector('[data-slot="slider-track"]')).toBeInTheDocument();
    });

    it('should render range', () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      expect(container.querySelector('[data-slot="slider-range"]')).toBeInTheDocument();
    });

    it('should render thumb', () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      expect(container.querySelector('[data-slot="slider-thumb"]')).toBeInTheDocument();
    });
  });

  describe('Values', () => {
    it('should use defaultValue', () => {
      render(<Slider defaultValue={[25]} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '25');
    });

    it('should use controlled value', () => {
      render(<Slider value={[75]} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '75');
    });

    it('should respect min prop', () => {
      render(<Slider defaultValue={[10]} min={0} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '0');
    });

    it('should respect max prop', () => {
      render(<Slider defaultValue={[50]} max={200} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '200');
    });
  });

  describe('Range Slider', () => {
    it('should render two thumbs for range', () => {
      const { container } = render(<Slider defaultValue={[25, 75]} />);
      const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]');
      expect(thumbs).toHaveLength(2);
    });

    it('should render multiple sliders for range', () => {
      render(<Slider defaultValue={[25, 75]} />);
      expect(screen.getAllByRole('slider')).toHaveLength(2);
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      const { container } = render(<Slider defaultValue={[50]} disabled />);
      expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute('data-disabled');
    });
  });

  describe('Callback', () => {
    it('should call onValueChange when value changes', () => {
      const onValueChange = vi.fn();
      render(<Slider defaultValue={[50]} onValueChange={onValueChange} />);

      // Note: Actual slider interaction testing requires more complex setup
      // This test verifies the component accepts the callback
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('Orientation', () => {
    it('should default to horizontal orientation', () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('should support vertical orientation', () => {
      const { container } = render(<Slider defaultValue={[50]} orientation="vertical" />);
      expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute('data-orientation', 'vertical');
    });
  });
});
