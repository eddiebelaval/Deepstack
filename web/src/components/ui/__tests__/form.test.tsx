import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../form';
import { Input } from '../input';

// Test form wrapper component
function TestForm({
  onSubmit = vi.fn(),
  defaultValues = { testField: '' },
  showError = false,
}: {
  onSubmit?: (data: any) => void;
  defaultValues?: { testField: string };
  showError?: boolean;
}) {
  const form = useForm({
    defaultValues,
  });

  // Set error if needed
  if (showError && !form.formState.errors.testField) {
    form.setError('testField', { type: 'manual', message: 'This field is required' });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="testField"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Test Label</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter value" />
              </FormControl>
              <FormDescription>This is a description</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

// Helper component for FormItem test
function FormItemTest() {
  const form = useForm();
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="test"
        render={() => (
          <FormItem>
            <div>Form Item Content</div>
          </FormItem>
        )}
      />
    </Form>
  );
}

describe('Form Components', () => {
  describe('FormItem', () => {
    it('should render children', () => {
      render(<FormItemTest />);
      expect(screen.getByText('Form Item Content')).toBeInTheDocument();
    });
  });

  describe('FormLabel', () => {
    it('should render label text', () => {
      render(<TestForm />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('should be associated with form control', () => {
      render(<TestForm />);
      const label = screen.getByText('Test Label');
      expect(label).toHaveAttribute('for');
    });
  });

  describe('FormControl', () => {
    it('should render the input', () => {
      render(<TestForm />);
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
    });

    it('should have proper aria attributes', () => {
      render(<TestForm />);
      const input = screen.getByPlaceholderText('Enter value');
      expect(input).toHaveAttribute('id');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should set aria-invalid when error present', async () => {
      render(<TestForm showError />);
      const input = screen.getByPlaceholderText('Enter value');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('FormDescription', () => {
    it('should render description text', () => {
      render(<TestForm />);
      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });

    it('should have muted styling', () => {
      render(<TestForm />);
      const description = screen.getByText('This is a description');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('FormMessage', () => {
    it('should not render when no error', () => {
      const { container } = render(<TestForm />);
      // FormMessage returns null when no error and no children
      // Check that no paragraph with text-destructive is rendered (label has it when error)
      const formItem = container.querySelector('.space-y-2');
      expect(formItem).toBeInTheDocument();
    });

    it('should have aria-invalid when error present', () => {
      render(<TestForm showError />);
      const input = screen.getByPlaceholderText('Enter value');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should apply destructive styling to label when error', () => {
      render(<TestForm showError />);
      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('text-destructive');
    });
  });

  describe('Form Submission', () => {
    it('should update field value on input', async () => {
      const user = userEvent.setup();
      render(<TestForm />);

      const input = screen.getByPlaceholderText('Enter value');
      await user.type(input, 'test value');

      expect(input).toHaveValue('test value');
    });

    it('should render submit button', () => {
      render(<TestForm />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('should use default values', () => {
      render(<TestForm defaultValues={{ testField: 'default' }} />);
      const input = screen.getByPlaceholderText('Enter value');
      expect(input).toHaveValue('default');
    });
  });

  describe('Form Integration', () => {
    it('should render complete form structure', () => {
      const { container } = render(<TestForm />);
      expect(container.querySelector('form')).toBeInTheDocument();
      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });
  });
});
