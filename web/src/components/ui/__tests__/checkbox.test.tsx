import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('should render checkbox with data-slot', () => {
      const { container } = render(<Checkbox />);
      expect(container.querySelector('[data-slot="checkbox"]')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Checkbox className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Interaction', () => {
    it('should toggle checked state on click', async () => {
      const user = userEvent.setup();
      render(<Checkbox aria-label="test checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should call onCheckedChange when toggled', async () => {
      const user = userEvent.setup();
      let checked = false;
      const handleChange = (value: boolean) => { checked = value; };

      render(<Checkbox aria-label="test checkbox" onCheckedChange={handleChange} />);

      await user.click(screen.getByRole('checkbox'));
      expect(checked).toBe(true);
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Checkbox disabled aria-label="test checkbox" />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('should render with checked state', () => {
      render(<Checkbox checked aria-label="test checkbox" />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });
});
