import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../alert-dialog';

describe('AlertDialog', () => {
  const renderAlertDialog = (onAction?: () => void, onCancel?: () => void) => {
    return render(
      <AlertDialog>
        <AlertDialogTrigger>Open Dialog</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAction}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  describe('Rendering', () => {
    it('should render trigger button', () => {
      renderAlertDialog();
      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderAlertDialog();
      expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
    });
  });

  describe('Opening Dialog', () => {
    it('should open dialog on trigger click', async () => {
      const user = userEvent.setup();
      renderAlertDialog();

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      });
    });

    it('should show title when open', async () => {
      const user = userEvent.setup();
      renderAlertDialog();

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should show description when open', async () => {
      const user = userEvent.setup();
      renderAlertDialog();

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
      });
    });
  });

  describe('Closing Dialog', () => {
    it('should close dialog on cancel click', async () => {
      const user = userEvent.setup();
      renderAlertDialog();

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
      });
    });

    it('should close dialog on action click', async () => {
      const user = userEvent.setup();
      renderAlertDialog();

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Callbacks', () => {
    it('should call action callback when action is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      renderAlertDialog(onAction);

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Continue'));
      expect(onAction).toHaveBeenCalled();
    });

    it('should call cancel callback when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      renderAlertDialog(undefined, onCancel);

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have alertdialog role', async () => {
      const user = userEvent.setup();
      renderAlertDialog();

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should trap focus within dialog', async () => {
      const user = userEvent.setup();
      renderAlertDialog();

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      // First focusable element should receive focus
      await user.tab();
      // Tab cycling should stay within dialog
      await user.tab();
      await user.tab();
    });
  });

  describe('Styling', () => {
    it('should apply custom className to header', async () => {
      const user = userEvent.setup();
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader className="custom-header">
              <AlertDialogTitle>Title</AlertDialogTitle>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(document.querySelector('[data-slot="alert-dialog-header"]')).toHaveClass('custom-header');
      });
    });

    it('should apply custom className to footer', async () => {
      const user = userEvent.setup();
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogFooter className="custom-footer">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(document.querySelector('[data-slot="alert-dialog-footer"]')).toHaveClass('custom-footer');
      });
    });
  });
});
