import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';

describe('Tooltip', () => {
  const renderTooltip = (props = {}) => {
    return render(
      <Tooltip {...props}>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip content</TooltipContent>
      </Tooltip>
    );
  };

  describe('Rendering', () => {
    it('should render trigger', () => {
      renderTooltip();
      expect(screen.getByText('Hover me')).toBeInTheDocument();
    });

    it('should not show content initially', () => {
      renderTooltip();
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should show content on hover', async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(screen.getByText('Hover me'));

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('should hide content on unhover', async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(screen.getByText('Hover me'));
      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });

      await user.unhover(screen.getByText('Hover me'));
      await waitFor(() => {
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
      });
    });

    it('should show content on focus', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Focus me</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );

      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });
    });
  });

  describe('Controlled State', () => {
    it('should support controlled open state', async () => {
      render(
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should not show when controlled closed', () => {
      render(
        <Tooltip open={false}>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Content</TooltipContent>
        </Tooltip>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  describe('TooltipProvider', () => {
    it('should render with custom delay', () => {
      const { container } = render(
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('TooltipContent', () => {
    it('should apply custom className', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent className="custom-tooltip">Content</TooltipContent>
        </Tooltip>
      );

      await user.hover(screen.getByText('Hover'));

      await waitFor(() => {
        expect(screen.getByText('Content').closest('[data-slot="tooltip-content"]')).toHaveClass('custom-tooltip');
      });
    });
  });
});
