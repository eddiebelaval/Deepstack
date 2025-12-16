import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '../popover';

describe('Popover', () => {
  const renderPopover = (props = {}) => {
    return render(
      <Popover {...props}>
        <PopoverTrigger>Open Popover</PopoverTrigger>
        <PopoverContent>
          <p>Popover content</p>
        </PopoverContent>
      </Popover>
    );
  };

  describe('Rendering', () => {
    it('should render trigger', () => {
      renderPopover();
      expect(screen.getByText('Open Popover')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderPopover();
      expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should open on trigger click', async () => {
      const user = userEvent.setup();
      renderPopover();

      await user.click(screen.getByText('Open Popover'));

      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });
    });

    it('should close on second click', async () => {
      const user = userEvent.setup();
      renderPopover();

      await user.click(screen.getByText('Open Popover'));
      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Open Popover'));

      await waitFor(() => {
        expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
      });
    });

    it('should close on outside click', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Popover>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Content</PopoverContent>
          </Popover>
          <button>Outside</button>
        </div>
      );

      await user.click(screen.getByText('Open'));
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Outside'));

      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
      });
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      renderPopover();

      await user.click(screen.getByText('Open Popover'));
      await waitFor(() => {
        expect(screen.getByText('Popover content')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Controlled State', () => {
    it('should support controlled open state', () => {
      render(
        <Popover open>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should not show when controlled closed', () => {
      render(
        <Popover open={false}>
          <PopoverTrigger>Trigger</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className to content', async () => {
      const user = userEvent.setup();
      render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent className="custom-popover">Content</PopoverContent>
        </Popover>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(document.querySelector('[data-slot="popover-content"]')).toHaveClass('custom-popover');
      });
    });
  });

  describe('Anchor', () => {
    it('should render anchor element', () => {
      const { container } = render(
        <Popover>
          <PopoverAnchor>
            <span>Anchor Element</span>
          </PopoverAnchor>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );

      expect(container.querySelector('[data-slot="popover-anchor"]')).toBeInTheDocument();
    });
  });
});
