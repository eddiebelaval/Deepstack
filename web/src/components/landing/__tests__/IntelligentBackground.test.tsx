import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { IntelligentBackground } from '../IntelligentBackground';

describe('IntelligentBackground', () => {
  let rafSpy: any;
  let cancelRafSpy: any;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: any;

  beforeEach(() => {
    // Mock canvas context
    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      scale: vi.fn(),
    };

    // Mock canvas element
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn().mockReturnValue(mockContext),
      getBoundingClientRect: vi.fn().mockReturnValue({
        width: 800,
        height: 600,
      }),
    } as any;

    // Spy on createElement to return our mock canvas
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return originalCreateElement(tagName);
    });

    // Mock requestAnimationFrame
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(Date.now()), 0);
      return 1;
    });

    cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders a canvas element', () => {
      const { container } = render(<IntelligentBackground />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('applies correct canvas classes', () => {
      const { container } = render(<IntelligentBackground />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('absolute', 'inset-0', 'w-full', 'h-full');
    });

    it('initializes canvas with device pixel ratio', () => {
      render(<IntelligentBackground />);
      expect(mockContext.scale).toHaveBeenCalled();
    });
  });

  describe('animation lifecycle', () => {
    it('starts animation on mount', () => {
      render(<IntelligentBackground />);
      expect(rafSpy).toHaveBeenCalled();
    });

    it('stops animation on unmount', () => {
      const { unmount } = render(<IntelligentBackground />);
      unmount();
      expect(cancelRafSpy).toHaveBeenCalled();
    });

    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<IntelligentBackground />);
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });

  describe('resize handling', () => {
    it('attaches resize event listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      render(<IntelligentBackground />);
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('updates canvas dimensions on resize', () => {
      const { container } = render(<IntelligentBackground />);

      // Trigger resize
      window.dispatchEvent(new Event('resize'));

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('scroll handling', () => {
    it('attaches scroll event listener with passive option', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      render(<IntelligentBackground />);
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      );
    });
  });

  describe('canvas drawing', () => {
    it('clears canvas background', async () => {
      render(<IntelligentBackground />);

      // Wait for animation frame
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('draws grid lines', async () => {
      render(<IntelligentBackground />);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('draws radar ping origin', async () => {
      render(<IntelligentBackground />);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles missing canvas context gracefully', () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      expect(() => {
        render(<IntelligentBackground />);
      }).not.toThrow();
    });

    it('handles window undefined in SSR', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => {
        render(<IntelligentBackground />);
      }).not.toThrow();

      global.window = originalWindow;
    });
  });
});
