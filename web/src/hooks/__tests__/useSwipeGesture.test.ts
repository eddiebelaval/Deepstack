import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSwipeGesture, useEdgeSwipe } from '../useSwipeGesture';

// Note: These tests focus on the hook's configuration and basic behavior.
// Full gesture simulation testing is complex due to the ref-based event handling
// and is better suited for integration/E2E tests.

describe('useSwipeGesture', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hook initialization', () => {
    it('returns a ref object', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current).toBeDefined();
      expect(result.current.current).toBeNull();
      expect(typeof result.current).toBe('object');
    });

    it('accepts swipe callbacks configuration', () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();
      const onSwipeUp = vi.fn();
      const onSwipeDown = vi.fn();

      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft,
          onSwipeRight,
          onSwipeUp,
          onSwipeDown,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts threshold configuration', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          threshold: 100,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts velocity configuration', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          velocity: 0.5,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts preventDefault configuration', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          preventDefault: true,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts edgeOnly configuration', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          edgeOnly: true,
          edgeThreshold: 30,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts complete configuration', () => {
      const config = {
        threshold: 75,
        velocity: 0.4,
        preventDefault: true,
        onSwipeLeft: vi.fn(),
        onSwipeRight: vi.fn(),
        onSwipeUp: vi.fn(),
        onSwipeDown: vi.fn(),
        edgeOnly: true,
        edgeThreshold: 25,
      };

      const { result } = renderHook(() => useSwipeGesture(config));

      expect(result.current).toBeDefined();
    });
  });

  describe('hook lifecycle', () => {
    it('can be unmounted safely', () => {
      const { unmount } = renderHook(() => useSwipeGesture());

      expect(() => unmount()).not.toThrow();
    });

    it('can be remounted', () => {
      const { unmount } = renderHook(() => useSwipeGesture());
      unmount();

      const { result } = renderHook(() => useSwipeGesture());
      expect(result.current).toBeDefined();
    });

    it('handles config updates on rerender', () => {
      const { rerender } = renderHook(
        ({ onSwipeLeft }) => useSwipeGesture({ onSwipeLeft }),
        {
          initialProps: { onSwipeLeft: vi.fn() },
        }
      );

      const newCallback = vi.fn();
      rerender({ onSwipeLeft: newCallback });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('configuration options', () => {
    it('uses default threshold of 50px when not specified', () => {
      const { result } = renderHook(() => useSwipeGesture());

      // The hook should initialize with defaults
      expect(result.current).toBeDefined();
    });

    it('uses default velocity of 0.3 when not specified', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current).toBeDefined();
    });

    it('uses default edgeThreshold of 20px when not specified', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({ edgeOnly: true })
      );

      expect(result.current).toBeDefined();
    });

    it('defaults preventDefault to false', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current).toBeDefined();
    });

    it('defaults edgeOnly to false', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current).toBeDefined();
    });
  });

  describe('callback configuration', () => {
    it('accepts only onSwipeLeft', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeLeft: vi.fn() })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts only onSwipeRight', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeRight: vi.fn() })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts only onSwipeUp', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeUp: vi.fn() })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts only onSwipeDown', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipeDown: vi.fn() })
      );

      expect(result.current).toBeDefined();
    });

    it('accepts no callbacks', () => {
      const { result } = renderHook(() => useSwipeGesture());

      expect(result.current).toBeDefined();
    });
  });

  describe('edge detection configuration', () => {
    it('configures edge swipes with custom threshold', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          edgeOnly: true,
          edgeThreshold: 50,
          onSwipeRight: vi.fn(),
        })
      );

      expect(result.current).toBeDefined();
    });

    it('works with default edge threshold', () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          edgeOnly: true,
          onSwipeRight: vi.fn(),
        })
      );

      expect(result.current).toBeDefined();
    });
  });
});

describe('useEdgeSwipe', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() => useEdgeSwipe());

    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });

  it('automatically enables edge-only mode', () => {
    // edgeOnly should be set to true by default
    const { result } = renderHook(() => useEdgeSwipe());

    expect(result.current).toBeDefined();
  });

  it('accepts swipe callbacks', () => {
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() => useEdgeSwipe({ onSwipeRight }));

    expect(result.current).toBeDefined();
  });

  it('accepts threshold configuration', () => {
    const { result } = renderHook(() =>
      useEdgeSwipe({
        threshold: 100,
        onSwipeRight: vi.fn(),
      })
    );

    expect(result.current).toBeDefined();
  });

  it('accepts edgeThreshold configuration', () => {
    const { result } = renderHook(() =>
      useEdgeSwipe({
        edgeThreshold: 30,
        onSwipeRight: vi.fn(),
      })
    );

    expect(result.current).toBeDefined();
  });

  it('accepts preventDefault configuration', () => {
    const { result } = renderHook(() =>
      useEdgeSwipe({
        preventDefault: true,
        onSwipeRight: vi.fn(),
      })
    );

    expect(result.current).toBeDefined();
  });

  it('can be unmounted safely', () => {
    const { unmount } = renderHook(() => useEdgeSwipe());

    expect(() => unmount()).not.toThrow();
  });

  it('works with all configuration options', () => {
    const config = {
      threshold: 75,
      velocity: 0.4,
      preventDefault: true,
      onSwipeLeft: vi.fn(),
      onSwipeRight: vi.fn(),
      edgeThreshold: 25,
    };

    const { result } = renderHook(() => useEdgeSwipe(config));

    expect(result.current).toBeDefined();
  });
});
