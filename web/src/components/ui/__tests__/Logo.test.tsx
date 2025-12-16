import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo, BrandName } from '../Logo';

describe('Logo', () => {
  describe('Rendering', () => {
    it('should render brand name text', () => {
      render(<Logo />);
      expect(screen.getByText('deepstack')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Logo className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use font-urbanist class', () => {
      const { container } = render(<Logo />);
      expect(container.firstChild).toHaveClass('font-urbanist');
    });

    it('should use font-normal class', () => {
      const { container } = render(<Logo />);
      expect(container.firstChild).toHaveClass('font-normal');
    });
  });

  describe('Size Variants', () => {
    it('should use text-lg for medium size (default)', () => {
      const { container } = render(<Logo />);
      expect(container.firstChild).toHaveClass('text-lg');
    });

    it('should use text-sm for small size', () => {
      const { container } = render(<Logo size="sm" />);
      expect(container.firstChild).toHaveClass('text-sm');
    });

    it('should use text-xl for large size', () => {
      const { container } = render(<Logo size="lg" />);
      expect(container.firstChild).toHaveClass('text-xl');
    });

    it('should use text-2xl for xl size', () => {
      const { container } = render(<Logo size="xl" />);
      expect(container.firstChild).toHaveClass('text-2xl');
    });
  });
});

describe('BrandName', () => {
  describe('Rendering', () => {
    it('should render brand name text', () => {
      render(<BrandName />);
      expect(screen.getByText('deepstack')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<BrandName className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use font-urbanist class', () => {
      const { container } = render(<BrandName />);
      expect(container.firstChild).toHaveClass('font-urbanist');
    });
  });
});
