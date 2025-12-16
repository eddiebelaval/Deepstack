import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../sheet';

describe('Sheet', () => {
  const renderSheet = (side: 'top' | 'right' | 'bottom' | 'left' = 'right') => {
    return render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent side={side}>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet description text</SheetDescription>
          </SheetHeader>
          <div>Sheet body content</div>
          <SheetFooter>
            <SheetClose>Close</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  };

  describe('Rendering', () => {
    it('should render trigger', () => {
      renderSheet();
      expect(screen.getByText('Open Sheet')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderSheet();
      expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();
    });
  });

  describe('Opening Sheet', () => {
    it('should open on trigger click', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should show title when open', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument();
      });
    });

    it('should show description when open', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet description text')).toBeInTheDocument();
      });
    });

    it('should show body content when open', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        expect(screen.getByText('Sheet body content')).toBeInTheDocument();
      });
    });
  });

  describe('Closing Sheet', () => {
    it('should close on close button click', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open Sheet'));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click the X button (sr-only says "Close")
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open Sheet'));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Side Variants', () => {
    it('should render from right by default', async () => {
      const user = userEvent.setup();
      renderSheet('right');

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        const content = document.querySelector('[data-slot="sheet-content"]');
        expect(content).toHaveClass('right-0');
      });
    });

    it('should render from left', async () => {
      const user = userEvent.setup();
      renderSheet('left');

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        const content = document.querySelector('[data-slot="sheet-content"]');
        expect(content).toHaveClass('left-0');
      });
    });

    it('should render from top', async () => {
      const user = userEvent.setup();
      renderSheet('top');

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        const content = document.querySelector('[data-slot="sheet-content"]');
        expect(content).toHaveClass('top-0');
      });
    });

    it('should render from bottom', async () => {
      const user = userEvent.setup();
      renderSheet('bottom');

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        const content = document.querySelector('[data-slot="sheet-content"]');
        expect(content).toHaveClass('bottom-0');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByText('Open Sheet'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className to header', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetHeader className="custom-header">
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(document.querySelector('[data-slot="sheet-header"]')).toHaveClass('custom-header');
      });
    });

    it('should apply custom className to footer', async () => {
      const user = userEvent.setup();
      render(
        <Sheet>
          <SheetTrigger>Open</SheetTrigger>
          <SheetContent>
            <SheetFooter className="custom-footer">
              <button>Action</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(document.querySelector('[data-slot="sheet-footer"]')).toHaveClass('custom-footer');
      });
    });
  });
});
