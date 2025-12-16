import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../switch';

describe('Switch', () => {
  describe('Rendering', () => {
    it('should render a switch', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Switch className="custom-class" />);
      expect(screen.getByRole('switch')).toHaveClass('custom-class');
    });
  });

  describe('States', () => {
    it('should be unchecked by default', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
    });

    it('should be checked when checked prop is true', () => {
      render(<Switch checked />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Switch disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });
  });

  describe('Interaction', () => {
    it('should toggle on click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Switch onCheckedChange={onChange} />);

      await user.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Switch disabled onCheckedChange={onChange} />);

      await user.click(screen.getByRole('switch'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria attributes', () => {
      render(<Switch aria-label="Toggle setting" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Toggle setting');
    });

    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Switch />);

      await user.tab();
      expect(screen.getByRole('switch')).toHaveFocus();
    });
  });
});
