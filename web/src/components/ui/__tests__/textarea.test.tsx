import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(<Textarea />);
      expect(container.querySelector('[data-slot="textarea"]')).toBeInTheDocument();
    });

    it('should render a textbox', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Textarea className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });
  });

  describe('Props', () => {
    it('should render with placeholder', () => {
      render(<Textarea placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('should render with rows', () => {
      render(<Textarea rows={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Textarea disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should be read-only when readOnly prop is true', () => {
      render(<Textarea readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });

  describe('Interaction', () => {
    it('should allow typing', async () => {
      const user = userEvent.setup();
      render(<Textarea />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello world');
      expect(textarea).toHaveValue('Hello world');
    });

    it('should call onChange when value changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Textarea onChange={onChange} />);

      await user.type(screen.getByRole('textbox'), 'a');
      expect(onChange).toHaveBeenCalled();
    });

    it('should not allow typing when disabled', async () => {
      const user = userEvent.setup();
      render(<Textarea disabled defaultValue="initial" />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'new text');
      expect(textarea).toHaveValue('initial');
    });
  });

  describe('Styling', () => {
    it('should have rounded-md class', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toHaveClass('rounded-md');
    });

    it('should have w-full class', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toHaveClass('w-full');
    });
  });
});
