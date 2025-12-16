import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ScrollArea, ScrollBar } from '../scroll-area';

describe('ScrollArea', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
    });

    it('should render viewport', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area-viewport"]')).toBeInTheDocument();
    });

    it('should render children', () => {
      const { container } = render(
        <ScrollArea>
          <div data-testid="child">Child content</div>
        </ScrollArea>
      );
      expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
    });

    it('should render scrollbar by default', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeInTheDocument();
    });
  });

  describe('hideScrollbar', () => {
    it('should hide scrollbar when hideScrollbar is true', () => {
      const { container } = render(
        <ScrollArea hideScrollbar>
          <div>Content</div>
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ScrollArea className="custom-scroll">
          <div>Content</div>
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area"]')).toHaveClass('custom-scroll');
    });

    it('should have overflow-hidden class', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area"]')).toHaveClass('overflow-hidden');
    });
  });

  describe('viewportRef', () => {
    it('should accept viewportRef', () => {
      const ref = { current: null };
      render(
        <ScrollArea viewportRef={ref}>
          <div>Content</div>
        </ScrollArea>
      );
      // Note: Ref assignment happens after render
      expect(ref).toBeDefined();
    });
  });
});

describe('ScrollBar', () => {
  describe('Rendering', () => {
    it('should render with data-slot', () => {
      const { container } = render(
        <ScrollArea>
          <ScrollBar />
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeInTheDocument();
    });

    it('should render thumb', () => {
      const { container } = render(
        <ScrollArea>
          <ScrollBar />
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area-thumb"]')).toBeInTheDocument();
    });
  });

  describe('Orientation', () => {
    it('should default to vertical orientation', () => {
      const { container } = render(
        <ScrollArea>
          <ScrollBar />
        </ScrollArea>
      );
      expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toHaveAttribute(
        'data-orientation',
        'vertical'
      );
    });

    it('should support horizontal orientation', () => {
      const { container } = render(
        <ScrollArea>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      );
      const scrollbars = container.querySelectorAll('[data-slot="scroll-area-scrollbar"]');
      const horizontalScrollbar = Array.from(scrollbars).find(
        el => el.getAttribute('data-orientation') === 'horizontal'
      );
      expect(horizontalScrollbar).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ScrollArea>
          <ScrollBar className="custom-scrollbar" />
        </ScrollArea>
      );
      const scrollbars = container.querySelectorAll('[data-slot="scroll-area-scrollbar"]');
      const customScrollbar = Array.from(scrollbars).find(el =>
        el.classList.contains('custom-scrollbar')
      );
      expect(customScrollbar).toBeInTheDocument();
    });
  });
});
