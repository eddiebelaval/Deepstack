import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '../select';

describe('Select', () => {
  const renderSelect = (props = {}) => {
    return render(
      <Select {...props}>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="orange">Orange</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="grape" disabled>Grape (sold out)</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  describe('Rendering', () => {
    it('should render trigger button', () => {
      renderSelect();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should show placeholder', () => {
      renderSelect();
      expect(screen.getByText('Select a fruit')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderSelect();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Opening Select', () => {
    it('should open on trigger click', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should show all options when open', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Orange' })).toBeInTheDocument();
      });
    });

    it('should show group label', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Fruits')).toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    it('should select option on click', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'Apple' }));

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveTextContent('Apple');
      });
    });

    it('should call onValueChange when selection changes', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderSelect({ onValueChange });

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'Banana' }));

      expect(onValueChange).toHaveBeenCalledWith('banana');
    });

    it('should close after selection', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('option', { name: 'Apple' }));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('should show disabled option with reduced opacity', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const disabledOption = screen.getByRole('option', { name: 'Grape (sold out)' });
        expect(disabledOption).toHaveAttribute('data-disabled');
      });
    });
  });

  describe('Controlled Value', () => {
    it('should display controlled value', () => {
      render(
        <Select value="apple">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toHaveTextContent('Apple');
    });
  });

  describe('Styling', () => {
    it('should apply custom className to trigger', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toHaveClass('custom-trigger');
    });

    it('should support size prop', () => {
      render(
        <Select>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toHaveAttribute('data-size', 'sm');
    });
  });
});
