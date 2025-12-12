import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders input element', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.tagName).toBe('INPUT');
    });

    it('renders with data-slot attribute', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('data-slot', 'input');
    });

    it('can set type attribute', () => {
      render(<Input type="email" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });
  });

  describe('input types', () => {
    it('renders as email input', () => {
      render(<Input type="email" data-testid="email-input" />);
      expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
    });

    it('renders as password input', () => {
      render(<Input type="password" data-testid="password-input" />);
      expect(screen.getByTestId('password-input')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('renders as number input', () => {
      render(<Input type="number" data-testid="number-input" />);
      expect(screen.getByTestId('number-input')).toHaveAttribute(
        'type',
        'number'
      );
    });

    it('renders as file input', () => {
      render(<Input type="file" data-testid="file-input" />);
      expect(screen.getByTestId('file-input')).toHaveAttribute('type', 'file');
    });

    it('renders as search input', () => {
      render(<Input type="search" data-testid="search-input" />);
      expect(screen.getByTestId('search-input')).toHaveAttribute(
        'type',
        'search'
      );
    });

    it('renders as tel input', () => {
      render(<Input type="tel" data-testid="tel-input" />);
      expect(screen.getByTestId('tel-input')).toHaveAttribute('type', 'tel');
    });

    it('renders as url input', () => {
      render(<Input type="url" data-testid="url-input" />);
      expect(screen.getByTestId('url-input')).toHaveAttribute('type', 'url');
    });
  });

  describe('interactions', () => {
    it('handles onChange events', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'Hello');

      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('Hello');
    });

    it('handles onFocus events', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();

      render(<Input onFocus={handleFocus} data-testid="input" />);

      await user.click(screen.getByTestId('input'));

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('handles onBlur events', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();

      render(<Input onBlur={handleBlur} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.click(input);
      await user.tab();

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard input', async () => {
      const user = userEvent.setup();

      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'Test input');

      expect(input).toHaveValue('Test input');
    });

    it('can clear input value', async () => {
      const user = userEvent.setup();

      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input') as HTMLInputElement;
      await user.type(input, 'Clear me');
      expect(input).toHaveValue('Clear me');

      await user.clear(input);
      expect(input).toHaveValue('');
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<Input disabled data-testid="input" />);
      expect(screen.getByTestId('input')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Input disabled data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('disabled:pointer-events-none');
      expect(input).toHaveClass('disabled:cursor-not-allowed');
      expect(input).toHaveClass('disabled:opacity-50');
    });

    it('does not accept input when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input disabled onChange={handleChange} data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'Should not type');

      expect(handleChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
    });
  });

  describe('readonly state', () => {
    it('makes input readonly when readOnly prop is true', () => {
      render(<Input readOnly data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('readonly');
    });

    it('does not accept input when readonly', async () => {
      const user = userEvent.setup();

      render(<Input readOnly defaultValue="Read only" data-testid="input" />);

      const input = screen.getByTestId('input');
      await user.type(input, 'Extra text');

      expect(input).toHaveValue('Read only');
    });
  });

  describe('value control', () => {
    it('works as controlled input', async () => {
      const user = userEvent.setup();
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="input"
          />
        );
      };

      const { default: React } = await import('react');
      render(<TestComponent />);

      const input = screen.getByTestId('input');
      await user.type(input, 'Controlled');

      expect(input).toHaveValue('Controlled');
    });

    it('works as uncontrolled input with defaultValue', () => {
      render(<Input defaultValue="Uncontrolled" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveValue('Uncontrolled');
    });
  });

  describe('styles', () => {
    it('has base input styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('h-9');
      expect(input).toHaveClass('w-full');
      expect(input).toHaveClass('rounded-md');
      expect(input).toHaveClass('border');
      expect(input).toHaveClass('bg-transparent');
      expect(input).toHaveClass('px-3');
      expect(input).toHaveClass('py-1');
    });

    it('has focus-visible styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('focus-visible:border-ring');
      expect(input).toHaveClass('focus-visible:ring-ring/50');
      expect(input).toHaveClass('focus-visible:ring-[3px]');
    });

    it('has placeholder styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('placeholder:text-muted-foreground');
    });

    it('has shadow-xs', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveClass('shadow-xs');
    });

    it('has outline-none', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveClass('outline-none');
    });

    it('has transition styles', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveClass(
        'transition-[color,box-shadow]'
      );
    });
  });

  describe('custom className', () => {
    it('merges custom className with defaults', () => {
      render(<Input className="custom-input" data-testid="input" />);
      const input = screen.getByTestId('input');

      expect(input).toHaveClass('custom-input');
      expect(input).toHaveClass('h-9');
      expect(input).toHaveClass('rounded-md');
    });
  });

  describe('accessibility', () => {
    it('supports aria-label', () => {
      render(<Input aria-label="Email address" />);
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(<Input aria-describedby="help-text" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute(
        'aria-describedby',
        'help-text'
      );
    });

    it('supports aria-invalid with ring styles', () => {
      render(<Input aria-invalid="true" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveClass('aria-invalid:ring-destructive/20');
      expect(input).toHaveClass('aria-invalid:border-destructive');
    });

    it('supports required attribute', () => {
      render(<Input required data-testid="input" />);
      expect(screen.getByTestId('input')).toBeRequired();
    });
  });

  describe('HTML attributes', () => {
    it('passes through HTML attributes', () => {
      render(
        <Input
          data-testid="input"
          id="email-input"
          name="email"
          autoComplete="email"
        />
      );

      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('id', 'email-input');
      expect(input).toHaveAttribute('name', 'email');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });

    it('supports maxLength attribute', () => {
      render(<Input maxLength={10} data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('maxlength', '10');
    });

    it('supports pattern attribute', () => {
      render(<Input pattern="[0-9]*" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('pattern', '[0-9]*');
    });

    it('supports min and max for number input', () => {
      render(<Input type="number" min={0} max={100} data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });

    it('supports step for number input', () => {
      render(<Input type="number" step={0.1} data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('step', '0.1');
    });
  });
});
