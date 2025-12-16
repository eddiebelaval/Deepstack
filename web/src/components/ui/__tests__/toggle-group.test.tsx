import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';

describe('ToggleGroup', () => {
  const renderToggleGroup = (props = {}) => {
    return render(
      <ToggleGroup type="single" {...props}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
        <ToggleGroupItem value="c">C</ToggleGroupItem>
      </ToggleGroup>
    );
  };

  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = renderToggleGroup();
      expect(container.querySelector('[data-slot="toggle-group"]')).toBeInTheDocument();
    });

    it('should render all items', () => {
      renderToggleGroup();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should render items as buttons', () => {
      renderToggleGroup();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });
  });

  describe('Single Selection', () => {
    it('should select item on click', async () => {
      const user = userEvent.setup();
      renderToggleGroup();

      await user.click(screen.getByText('A'));
      expect(screen.getByText('A').closest('button')).toHaveAttribute('data-state', 'on');
    });

    it('should deselect previous item when new item is selected', async () => {
      const user = userEvent.setup();
      renderToggleGroup();

      await user.click(screen.getByText('A'));
      await user.click(screen.getByText('B'));

      expect(screen.getByText('A').closest('button')).toHaveAttribute('data-state', 'off');
      expect(screen.getByText('B').closest('button')).toHaveAttribute('data-state', 'on');
    });

    it('should call onValueChange when selection changes', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderToggleGroup({ onValueChange });

      await user.click(screen.getByText('B'));
      expect(onValueChange).toHaveBeenCalledWith('b');
    });
  });

  describe('Multiple Selection', () => {
    it('should allow multiple selections', async () => {
      const user = userEvent.setup();
      render(
        <ToggleGroup type="multiple">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>
      );

      await user.click(screen.getByText('A'));
      await user.click(screen.getByText('B'));

      expect(screen.getByText('A').closest('button')).toHaveAttribute('data-state', 'on');
      expect(screen.getByText('B').closest('button')).toHaveAttribute('data-state', 'on');
      expect(screen.getByText('C').closest('button')).toHaveAttribute('data-state', 'off');
    });
  });

  describe('Controlled Value', () => {
    it('should display controlled single value', () => {
      render(
        <ToggleGroup type="single" value="b">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>
      );

      expect(screen.getByText('B').closest('button')).toHaveAttribute('data-state', 'on');
    });

    it('should display controlled multiple values', () => {
      render(
        <ToggleGroup type="multiple" value={['a', 'c']}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>
      );

      expect(screen.getByText('A').closest('button')).toHaveAttribute('data-state', 'on');
      expect(screen.getByText('B').closest('button')).toHaveAttribute('data-state', 'off');
      expect(screen.getByText('C').closest('button')).toHaveAttribute('data-state', 'on');
    });
  });

  describe('Disabled State', () => {
    it('should disable individual items', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <ToggleGroup type="single" onValueChange={onValueChange}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b" disabled>B</ToggleGroupItem>
        </ToggleGroup>
      );

      await user.click(screen.getByText('B'));
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('should disable entire group', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <ToggleGroup type="single" disabled onValueChange={onValueChange}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>
      );

      await user.click(screen.getByText('A'));
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should pass variant to items', () => {
      const { container } = render(
        <ToggleGroup type="single" variant="outline">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>
      );

      expect(container.querySelector('[data-slot="toggle-group"]')).toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Sizes', () => {
    it('should pass size to items', () => {
      const { container } = render(
        <ToggleGroup type="single" size="sm">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>
      );

      expect(container.querySelector('[data-slot="toggle-group"]')).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('Accessibility', () => {
    it('should have group role', () => {
      renderToggleGroup();
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderToggleGroup();

      await user.tab();
      // Focus should be on first item
      expect(screen.getByText('A').closest('button')).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('B').closest('button')).toHaveFocus();
    });
  });
});
