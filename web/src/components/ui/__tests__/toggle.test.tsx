import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from '../toggle';

describe('Toggle', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(<Toggle>Toggle</Toggle>);
      expect(container.querySelector('[data-slot="toggle"]')).toBeInTheDocument();
    });

    it('should render button', () => {
      render(<Toggle>Toggle</Toggle>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<Toggle>Click me</Toggle>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Toggle className="custom-class">Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('States', () => {
    it('should be off by default', () => {
      render(<Toggle>Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveAttribute('data-state', 'off');
    });

    it('should be on when pressed', () => {
      render(<Toggle pressed>Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveAttribute('data-state', 'on');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Toggle disabled>Toggle</Toggle>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Interaction', () => {
    it('should toggle state on click', async () => {
      const user = userEvent.setup();
      const onPressedChange = vi.fn();
      render(<Toggle onPressedChange={onPressedChange}>Toggle</Toggle>);

      await user.click(screen.getByRole('button'));
      expect(onPressedChange).toHaveBeenCalledWith(true);
    });

    it('should toggle off when already on', async () => {
      const user = userEvent.setup();
      const onPressedChange = vi.fn();
      render(<Toggle pressed onPressedChange={onPressedChange}>Toggle</Toggle>);

      await user.click(screen.getByRole('button'));
      expect(onPressedChange).toHaveBeenCalledWith(false);
    });

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onPressedChange = vi.fn();
      render(<Toggle disabled onPressedChange={onPressedChange}>Toggle</Toggle>);

      await user.click(screen.getByRole('button'));
      expect(onPressedChange).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should apply default variant by default', () => {
      render(<Toggle>Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent');
    });

    it('should apply outline variant', () => {
      render(<Toggle variant="outline">Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('border');
    });
  });

  describe('Sizes', () => {
    it('should apply default size by default', () => {
      render(<Toggle>Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('h-9');
    });

    it('should apply sm size', () => {
      render(<Toggle size="sm">Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('h-8');
    });

    it('should apply lg size', () => {
      render(<Toggle size="lg">Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveClass('h-10');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-pressed attribute', () => {
      render(<Toggle pressed>Toggle</Toggle>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Toggle>Toggle</Toggle>);

      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });
  });
});
