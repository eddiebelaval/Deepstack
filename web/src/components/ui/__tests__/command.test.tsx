import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '../command';

describe('Command', () => {
  const renderCommand = () => {
    return render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              Calendar
              <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
            <CommandItem>Search</CommandItem>
            <CommandItem disabled>Disabled Item</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>Profile</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  };

  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = renderCommand();
      expect(container.querySelector('[data-slot="command"]')).toBeInTheDocument();
    });

    it('should render input', () => {
      renderCommand();
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render command items', () => {
      renderCommand();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should render shortcut', () => {
      renderCommand();
      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });

    it('should render group headings', () => {
      renderCommand();
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter items based on input', async () => {
      const user = userEvent.setup();
      renderCommand();

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'Cal');

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });
    });

    it('should show empty state when no results', async () => {
      const user = userEvent.setup();
      renderCommand();

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'xyz123');

      await waitFor(() => {
        expect(screen.getByText('No results found.')).toBeVisible();
      });
    });
  });

  describe('Selection', () => {
    it('should highlight items on hover/keyboard', async () => {
      const user = userEvent.setup();
      renderCommand();

      const input = screen.getByPlaceholderText('Search...');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      // The first item should be selected
      await waitFor(() => {
        const calendarItem = screen.getByText('Calendar').closest('[data-slot="command-item"]');
        expect(calendarItem).toHaveAttribute('data-selected', 'true');
      });
    });
  });

  describe('Disabled Items', () => {
    it('should mark disabled items', () => {
      renderCommand();
      const disabledItem = screen.getByText('Disabled Item').closest('[data-slot="command-item"]');
      expect(disabledItem).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('Styling', () => {
    it('should apply custom className to Command', () => {
      const { container } = render(
        <Command className="custom-command">
          <CommandInput placeholder="Search" />
        </Command>
      );
      expect(container.querySelector('[data-slot="command"]')).toHaveClass('custom-command');
    });
  });
});

describe('CommandDialog', () => {
  it('should render dialog when open', () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </CommandDialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <CommandDialog open={false}>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </CommandDialog>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
