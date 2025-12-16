import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '../context-menu';

describe('ContextMenu', () => {
  const renderContextMenu = () => {
    return render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div style={{ width: 200, height: 100 }}>Right click here</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Actions</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem>
            Edit
            <ContextMenuShortcut>⌘E</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>Copy</ContextMenuItem>
          <ContextMenuItem disabled>Disabled</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  describe('Rendering', () => {
    it('should render trigger', () => {
      renderContextMenu();
      expect(screen.getByText('Right click here')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderContextMenu();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  describe('Opening Menu', () => {
    it('should open on right click', async () => {
      const user = userEvent.setup();
      renderContextMenu();

      const trigger = screen.getByText('Right click here');
      await user.pointer([{ target: trigger }, { keys: '[MouseRight]', target: trigger }]);

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
    });

    it('should show label when open', async () => {
      const user = userEvent.setup();
      renderContextMenu();

      const trigger = screen.getByText('Right click here');
      await user.pointer([{ target: trigger }, { keys: '[MouseRight]', target: trigger }]);

      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should show shortcut when open', async () => {
      const user = userEvent.setup();
      renderContextMenu();

      const trigger = screen.getByText('Right click here');
      await user.pointer([{ target: trigger }, { keys: '[MouseRight]', target: trigger }]);

      await waitFor(() => {
        expect(screen.getByText('⌘E')).toBeInTheDocument();
      });
    });
  });

  describe('Item Variants', () => {
    it('should support destructive variant', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu>
          <ContextMenuTrigger>
            <div>Trigger</div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      const trigger = screen.getByText('Trigger');
      await user.pointer([{ target: trigger }, { keys: '[MouseRight]', target: trigger }]);

      await waitFor(() => {
        const item = document.querySelector('[data-slot="context-menu-item"]');
        expect(item).toHaveAttribute('data-variant', 'destructive');
      });
    });
  });

  describe('Checkbox Items', () => {
    it('should render checkbox items', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(
        <ContextMenu>
          <ContextMenuTrigger>
            <div>Trigger</div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
              Show Status Bar
            </ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>
      );

      const trigger = screen.getByText('Trigger');
      await user.pointer([{ target: trigger }, { keys: '[MouseRight]', target: trigger }]);

      await waitFor(() => {
        expect(screen.getByText('Show Status Bar')).toBeInTheDocument();
      });
    });
  });

  describe('Radio Items', () => {
    it('should render radio group', async () => {
      const user = userEvent.setup();
      render(
        <ContextMenu>
          <ContextMenuTrigger>
            <div>Trigger</div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuRadioGroup value="option1">
              <ContextMenuRadioItem value="option1">Option 1</ContextMenuRadioItem>
              <ContextMenuRadioItem value="option2">Option 2</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      );

      const trigger = screen.getByText('Trigger');
      await user.pointer([{ target: trigger }, { keys: '[MouseRight]', target: trigger }]);

      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
        expect(screen.getByText('Option 2')).toBeInTheDocument();
      });
    });
  });
});
