import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../label';

describe('Label', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(<Label>Test Label</Label>);
      expect(container.querySelector('[data-slot="label"]')).toBeInTheDocument();
    });

    it('should render label text', () => {
      render(<Label>Test Label</Label>);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Label className="custom-class">Test</Label>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Styling', () => {
    it('should apply text-sm class', () => {
      const { container } = render(<Label>Test</Label>);
      expect(container.firstChild).toHaveClass('text-sm');
    });

    it('should apply font-medium class', () => {
      const { container } = render(<Label>Test</Label>);
      expect(container.firstChild).toHaveClass('font-medium');
    });

    it('should apply select-none class', () => {
      const { container } = render(<Label>Test</Label>);
      expect(container.firstChild).toHaveClass('select-none');
    });
  });

  describe('Association', () => {
    it('should associate with form control via htmlFor', () => {
      const { container } = render(
        <>
          <Label htmlFor="test-input">Username</Label>
          <input id="test-input" />
        </>
      );

      const label = container.querySelector('[data-slot="label"]');
      expect(label).toHaveAttribute('for', 'test-input');
    });
  });
});
