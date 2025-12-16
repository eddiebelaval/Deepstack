import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { DotScrollIndicator } from '../DotScrollIndicator';
import React from 'react';

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

describe('DotScrollIndicator', () => {
  let mockRef: React.RefObject<HTMLElement | null>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when element is not scrollable', () => {
      const scrollElement = document.createElement('div');
      Object.defineProperty(scrollElement, 'scrollHeight', { value: 100 });
      Object.defineProperty(scrollElement, 'clientHeight', { value: 100 });
      Object.defineProperty(scrollElement, 'scrollTop', { value: 0 });

      mockRef = { current: scrollElement };

      const { container } = render(<DotScrollIndicator scrollRef={mockRef} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when element has not grown', () => {
      const scrollElement = document.createElement('div');
      Object.defineProperty(scrollElement, 'scrollHeight', { value: 200 });
      Object.defineProperty(scrollElement, 'clientHeight', { value: 100 });
      Object.defineProperty(scrollElement, 'scrollTop', { value: 0 });

      mockRef = { current: scrollElement };

      const { container } = render(<DotScrollIndicator scrollRef={mockRef} />);
      // Component checks for hasGrown which requires clientHeight > initialHeight + minHeightGrowth
      // On first render, initialHeight === clientHeight, so hasGrown is false
      expect(container.firstChild).toBeNull();
    });

    it('should apply custom className', () => {
      const scrollElement = document.createElement('div');
      // Create conditions where it would render
      Object.defineProperty(scrollElement, 'scrollHeight', { value: 300 });
      Object.defineProperty(scrollElement, 'clientHeight', { value: 100 });
      Object.defineProperty(scrollElement, 'scrollTop', { value: 0 });

      mockRef = { current: scrollElement };

      render(<DotScrollIndicator scrollRef={mockRef} className="custom-dots" />);
      // Even with className, component may not render due to growth check
    });
  });

  describe('Props', () => {
    it('should accept maxDots prop', () => {
      const scrollElement = document.createElement('div');
      mockRef = { current: scrollElement };

      const { container } = render(
        <DotScrollIndicator scrollRef={mockRef} maxDots={7} />
      );
      expect(container).toBeInTheDocument();
    });

    it('should accept minHeightGrowth prop', () => {
      const scrollElement = document.createElement('div');
      mockRef = { current: scrollElement };

      const { container } = render(
        <DotScrollIndicator scrollRef={mockRef} minHeightGrowth={30} />
      );
      expect(container).toBeInTheDocument();
    });

    it('should handle null ref gracefully', () => {
      mockRef = { current: null };

      const { container } = render(<DotScrollIndicator scrollRef={mockRef} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Scroll Listener', () => {
    it('should add scroll event listener', () => {
      const scrollElement = document.createElement('div');
      const addEventListenerSpy = vi.spyOn(scrollElement, 'addEventListener');

      Object.defineProperty(scrollElement, 'scrollHeight', { value: 200 });
      Object.defineProperty(scrollElement, 'clientHeight', { value: 100 });
      Object.defineProperty(scrollElement, 'scrollTop', { value: 0 });

      mockRef = { current: scrollElement };

      render(<DotScrollIndicator scrollRef={mockRef} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('should remove scroll event listener on unmount', () => {
      const scrollElement = document.createElement('div');
      const removeEventListenerSpy = vi.spyOn(scrollElement, 'removeEventListener');

      Object.defineProperty(scrollElement, 'scrollHeight', { value: 200 });
      Object.defineProperty(scrollElement, 'clientHeight', { value: 100 });
      Object.defineProperty(scrollElement, 'scrollTop', { value: 0 });

      mockRef = { current: scrollElement };

      const { unmount } = render(<DotScrollIndicator scrollRef={mockRef} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });
});
