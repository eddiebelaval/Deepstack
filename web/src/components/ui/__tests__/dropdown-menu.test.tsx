import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '../dropdown-menu';

describe('DropdownMenu', () => {
  const renderDropdownMenu = () => {
    return render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Edit
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
          <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  describe('Rendering', () => {
    it('should render trigger', () => {
      renderDropdownMenu();
      expect(screen.getByText('Open Menu')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderDropdownMenu();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  describe('Opening Menu', () => {
    it('should open on trigger click', async () => {
      const user = userEvent.setup();
      renderDropdownMenu();

      await user.click(screen.getByText('Open Menu'));

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
    });

    it('should show label when open', async () => {
      const user = userEvent.setup();
      renderDropdownMenu();

      await user.click(screen.getByText('Open Menu'));

      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should show shortcut when open', async () => {
      const user = userEvent.setup();
      renderDropdownMenu();

      await user.click(screen.getByText('Open Menu'));

      await waitFor(() => {
        expect(screen.getByText('⌘E')).toBeInTheDocument();
      });
    });
  });

  describe('Item Selection', () => {
    it('should call onClick when item is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onClick}>Click Me</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByText('Open'));
      await waitFor(() => {
        expect(screen.getByText('Click Me')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Click Me'));
      expect(onClick).toHaveBeenCalled();
    });

    it('should not call onClick for disabled items', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled onClick={onClick}>Disabled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByText('Open'));
      await waitFor(() => {
        expect(screen.getByText('Disabled')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Disabled'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Checkbox Items', () => {
    it('should toggle checkbox state', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
              Checkbox Item
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByText('Open'));
      await waitFor(() => {
        expect(screen.getByText('Checkbox Item')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Checkbox Item'));
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Radio Items', () => {
    it('should handle radio selection', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="a" onValueChange={onValueChange}>
              <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="b">Option B</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByText('Open'));
      await waitFor(() => {
        expect(screen.getByText('Option B')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Option B'));
      expect(onValueChange).toHaveBeenCalledWith('b');
    });
  });

  describe('Variants', () => {
    it('should apply destructive variant', async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const item = document.querySelector('[data-slot="dropdown-menu-item"]');
        expect(item).toHaveAttribute('data-variant', 'destructive');
      });
    });

    it('should apply inset to item', async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const item = document.querySelector('[data-slot="dropdown-menu-item"]');
        expect(item).toHaveAttribute('data-inset', 'true');
      });
    });
  });

  describe('Closing Menu', () => {
    it('should close on Escape', async () => {
      const user = userEvent.setup();
      renderDropdownMenu();

      await user.click(screen.getByText('Open Menu'));
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      });
    });
  });
});
