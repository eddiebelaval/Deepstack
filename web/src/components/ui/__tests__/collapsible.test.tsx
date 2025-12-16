import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../collapsible';

describe('Collapsible', () => {
  const renderCollapsible = (defaultOpen = false) => {
    return render(
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger>Toggle Content</CollapsibleTrigger>
        <CollapsibleContent>
          <p>Hidden content here</p>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = renderCollapsible();
      expect(container.querySelector('[data-slot="collapsible"]')).toBeInTheDocument();
    });

    it('should render trigger', () => {
      renderCollapsible();
      expect(screen.getByText('Toggle Content')).toBeInTheDocument();
    });

    it('should hide content by default', () => {
      renderCollapsible();
      expect(screen.queryByText('Hidden content here')).not.toBeVisible();
    });

    it('should show content when defaultOpen is true', () => {
      renderCollapsible(true);
      expect(screen.getByText('Hidden content here')).toBeVisible();
    });
  });

  describe('Interaction', () => {
    it('should toggle content on trigger click', async () => {
      const user = userEvent.setup();
      renderCollapsible();

      expect(screen.queryByText('Hidden content here')).not.toBeVisible();

      await user.click(screen.getByText('Toggle Content'));

      await waitFor(() => {
        expect(screen.getByText('Hidden content here')).toBeVisible();
      });
    });

    it('should collapse content on second click', async () => {
      const user = userEvent.setup();
      renderCollapsible(true);

      expect(screen.getByText('Hidden content here')).toBeVisible();

      await user.click(screen.getByText('Toggle Content'));

      await waitFor(() => {
        expect(screen.queryByText('Hidden content here')).not.toBeVisible();
      });
    });
  });

  describe('Controlled State', () => {
    it('should support controlled open state', () => {
      render(
        <Collapsible open={true}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      expect(screen.getByText('Content')).toBeVisible();
    });

    it('should call onOpenChange when toggled', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Collapsible onOpenChange={onOpenChange}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      await user.click(screen.getByText('Toggle'));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Disabled State', () => {
    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <Collapsible disabled onOpenChange={onOpenChange}>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      );

      await user.click(screen.getByText('Toggle'));
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-expanded attribute on trigger', () => {
      renderCollapsible();
      expect(screen.getByText('Toggle Content')).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when open', () => {
      renderCollapsible(true);
      expect(screen.getByText('Toggle Content')).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
