import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../resizable';

describe('Resizable', () => {
  const renderResizable = () => {
    return render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={50}>
          <div>Panel 1</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <div>Panel 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  };

  describe('ResizablePanelGroup', () => {
    it('should render with data-slot', () => {
      const { container } = renderResizable();
      expect(container.querySelector('[data-slot="resizable-panel-group"]')).toBeInTheDocument();
    });

    it('should render panels', () => {
      const { container } = renderResizable();
      expect(container.querySelector('[data-slot="resizable-panel"]')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ResizablePanelGroup direction="horizontal" className="custom-group">
          <ResizablePanel>Panel</ResizablePanel>
        </ResizablePanelGroup>
      );
      expect(container.querySelector('[data-slot="resizable-panel-group"]')).toHaveClass('custom-group');
    });

    it('should support vertical direction', () => {
      const { container } = render(
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel>Panel 1</ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>Panel 2</ResizablePanel>
        </ResizablePanelGroup>
      );
      expect(container.querySelector('[data-slot="resizable-panel-group"]')).toHaveAttribute(
        'data-panel-group-direction',
        'vertical'
      );
    });
  });

  describe('ResizablePanel', () => {
    it('should render with data-slot', () => {
      const { container } = renderResizable();
      const panels = container.querySelectorAll('[data-slot="resizable-panel"]');
      expect(panels).toHaveLength(2);
    });

    it('should render children', () => {
      const { container } = renderResizable();
      expect(container.textContent).toContain('Panel 1');
      expect(container.textContent).toContain('Panel 2');
    });
  });

  describe('ResizableHandle', () => {
    it('should render with data-slot', () => {
      const { container } = renderResizable();
      expect(container.querySelector('[data-slot="resizable-handle"]')).toBeInTheDocument();
    });

    it('should render handle grip when withHandle is true', () => {
      const { container } = render(
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel>Panel 1</ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>Panel 2</ResizablePanel>
        </ResizablePanelGroup>
      );
      // The grip icon is rendered inside a div
      const handle = container.querySelector('[data-slot="resizable-handle"]');
      expect(handle?.querySelector('svg')).toBeInTheDocument();
    });

    it('should not render handle grip by default', () => {
      const { container } = renderResizable();
      const handle = container.querySelector('[data-slot="resizable-handle"]');
      expect(handle?.querySelector('svg')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel>Panel 1</ResizablePanel>
          <ResizableHandle className="custom-handle" />
          <ResizablePanel>Panel 2</ResizablePanel>
        </ResizablePanelGroup>
      );
      expect(container.querySelector('[data-slot="resizable-handle"]')).toHaveClass('custom-handle');
    });
  });
});
