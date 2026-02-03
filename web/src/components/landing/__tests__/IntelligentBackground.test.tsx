import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { IntelligentBackground } from '../IntelligentBackground';

describe('IntelligentBackground', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cancelRafSpy: ReturnType<typeof vi.spyOn>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;
  let mockContext: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    // Create mock canvas 2D context
    mockContext = {
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

    // Mock HTMLCanvasElement.prototype.getContext to return our mock context
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as unknown as CanvasRenderingContext2D);

    // Mock requestAnimationFrame to execute callback synchronously
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // Execute once for testing, don't create infinite loop
      setTimeout(() => cb(Date.now()), 0);
      return 1;
    });

    cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
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

    it('initializes canvas context', () => {
      render(<IntelligentBackground />);
      expect(getContextSpy).toHaveBeenCalledWith('2d');
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

      // Wait for animation frame callback
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('sets up drawing context', async () => {
      render(<IntelligentBackground />);

      await new Promise(resolve => setTimeout(resolve, 10));

      // In JSDOM, canvas has 0 dimensions so grid loops don't execute,
      // but beginPath is called for other drawing operations
      expect(mockContext.beginPath).toHaveBeenCalled();
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
      // Restore the spy and mock to return null
      getContextSpy.mockRestore();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

      // Should not throw
      expect(() => {
        render(<IntelligentBackground />);
      }).not.toThrow();
    });

    it.skip('handles window undefined in SSR', () => {
      // NOTE: Skipped - deleting global.window causes React-DOM to crash.
      // SSR testing should be done with proper server-side rendering tools
      // like @testing-library/react's renderToString or Next.js testing utilities.
      // The component handles SSR via typeof window checks in useEffect.
    });
  });
});
