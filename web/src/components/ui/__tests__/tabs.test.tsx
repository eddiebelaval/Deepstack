import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs', () => {
  const renderTabs = () => {
    return render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3" disabled>Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    );
  };

  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = renderTabs();
      expect(container.querySelector('[data-slot="tabs"]')).toBeInTheDocument();
    });

    it('should render tabs list', () => {
      const { container } = renderTabs();
      expect(container.querySelector('[data-slot="tabs-list"]')).toBeInTheDocument();
    });

    it('should render all tab triggers', () => {
      renderTabs();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('should render default tab content', () => {
      renderTabs();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should update active state on tab switch', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      expect(tab1).toHaveAttribute('data-state', 'active');
      expect(tab2).toHaveAttribute('data-state', 'inactive');

      await user.click(tab2);

      expect(tab1).toHaveAttribute('data-state', 'inactive');
      expect(tab2).toHaveAttribute('data-state', 'active');
    });

    it('should not switch to disabled tab', async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.click(screen.getByRole('tab', { name: 'Tab 3' }));
      // Content should still be Tab 1 content
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have tablist role', () => {
      renderTabs();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have tab role for triggers', () => {
      renderTabs();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('should have tabpanel role for content', () => {
      renderTabs();
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      await user.click(tab1);
      expect(tab1).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
    });
  });

  describe('Styling', () => {
    it('should apply custom className to Tabs', () => {
      const { container } = render(
        <Tabs defaultValue="tab1" className="custom-tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      expect(container.querySelector('[data-slot="tabs"]')).toHaveClass('custom-tabs');
    });

    it('should apply custom className to TabsList', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      expect(container.querySelector('[data-slot="tabs-list"]')).toHaveClass('custom-list');
    });
  });
});
