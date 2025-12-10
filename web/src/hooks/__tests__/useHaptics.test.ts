import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHaptics, triggerHaptic } from '../useHaptics';

describe('useHaptics', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock navigator.vibrate
    vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      configurable: true,
      value: vibrateMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isSupported', () => {
    it('returns true when vibration API is supported', () => {
      const { result } = renderHook(() => useHaptics());

      expect(result.current.isSupported).toBe(true);
    });

    it('returns false when vibration API is not supported', () => {
      // Save the original vibrate function
      const originalVibrate = navigator.vibrate;

      // Remove vibrate from navigator before rendering hook
      // @ts-expect-error - deleting navigator property for test
      delete navigator.vibrate;

      const { result } = renderHook(() => useHaptics());

      expect(result.current.isSupported).toBe(false);

      // Restore original vibrate function
      if (originalVibrate) {
        Object.defineProperty(navigator, 'vibrate', {
          writable: true,
          configurable: true,
          value: originalVibrate,
        });
      }
    });
  });

  describe('haptic patterns', () => {
    it('triggers light haptic feedback', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.light();

      expect(vibrateMock).toHaveBeenCalledWith(10);
    });

    it('triggers medium haptic feedback', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.medium();

      expect(vibrateMock).toHaveBeenCalledWith(25);
    });

    it('triggers heavy haptic feedback', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.heavy();

      expect(vibrateMock).toHaveBeenCalledWith(50);
    });

    it('triggers success haptic pattern', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.success();

      expect(vibrateMock).toHaveBeenCalledWith([15, 50, 30]);
    });

    it('triggers warning haptic pattern', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.warning();

      expect(vibrateMock).toHaveBeenCalledWith([20, 30, 20, 30, 20]);
    });

    it('triggers error haptic pattern', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.error();

      expect(vibrateMock).toHaveBeenCalledWith([30, 50, 30, 50, 30, 50, 30]);
    });

    it('triggers selection haptic feedback', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.selection();

      expect(vibrateMock).toHaveBeenCalledWith(5);
    });
  });

  describe('custom trigger', () => {
    it('triggers custom pattern by name', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.trigger('medium');

      expect(vibrateMock).toHaveBeenCalledWith(25);
    });

    it('triggers custom pattern with single number', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.trigger(100);

      expect(vibrateMock).toHaveBeenCalledWith(100);
    });

    it('triggers custom pattern with array', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.trigger([50, 100, 50]);

      expect(vibrateMock).toHaveBeenCalledWith([50, 100, 50]);
    });
  });

  describe('graceful degradation', () => {
    it('does not throw when vibration API is not supported', () => {
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useHaptics());

      expect(() => {
        result.current.light();
        result.current.medium();
        result.current.heavy();
        result.current.success();
      }).not.toThrow();
    });

    it('does not throw when vibrate throws an error', () => {
      vibrateMock.mockImplementation(() => {
        throw new Error('Vibration failed');
      });

      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const { result } = renderHook(() => useHaptics());

      expect(() => {
        result.current.light();
      }).not.toThrow();

      expect(consoleDebugSpy).toHaveBeenCalledWith('Haptic feedback not available:', expect.any(Error));

      consoleDebugSpy.mockRestore();
    });

    it('silently fails when trigger is called without support', () => {
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useHaptics());

      expect(() => {
        result.current.trigger('light');
      }).not.toThrow();
    });
  });

  describe('callback stability', () => {
    it('maintains stable callback references', () => {
      const { result, rerender } = renderHook(() => useHaptics());

      const firstLight = result.current.light;
      const firstMedium = result.current.medium;
      const firstTrigger = result.current.trigger;

      rerender();

      expect(result.current.light).toBe(firstLight);
      expect(result.current.medium).toBe(firstMedium);
      expect(result.current.trigger).toBe(firstTrigger);
    });
  });

  describe('usage patterns', () => {
    it('can be used for button interactions', () => {
      const { result } = renderHook(() => useHaptics());

      const handleButtonClick = () => {
        result.current.light();
        // Button logic here
      };

      handleButtonClick();

      expect(vibrateMock).toHaveBeenCalledWith(10);
    });

    it('can be used for success feedback', () => {
      const { result } = renderHook(() => useHaptics());

      const handleSuccessAction = () => {
        result.current.success();
        // Success logic here
      };

      handleSuccessAction();

      expect(vibrateMock).toHaveBeenCalledWith([15, 50, 30]);
    });

    it('can be used for error feedback', () => {
      const { result } = renderHook(() => useHaptics());

      const handleErrorAction = () => {
        result.current.error();
        // Error handling here
      };

      handleErrorAction();

      expect(vibrateMock).toHaveBeenCalledWith([30, 50, 30, 50, 30, 50, 30]);
    });

    it('can be used for selection feedback in lists', () => {
      const { result } = renderHook(() => useHaptics());

      const handleItemSelect = () => {
        result.current.selection();
        // Selection logic here
      };

      handleItemSelect();

      expect(vibrateMock).toHaveBeenCalledWith(5);
    });
  });

  describe('multiple triggers', () => {
    it('handles multiple sequential triggers', () => {
      const { result } = renderHook(() => useHaptics());

      result.current.light();
      result.current.medium();
      result.current.heavy();

      expect(vibrateMock).toHaveBeenCalledTimes(3);
      expect(vibrateMock).toHaveBeenNthCalledWith(1, 10);
      expect(vibrateMock).toHaveBeenNthCalledWith(2, 25);
      expect(vibrateMock).toHaveBeenNthCalledWith(3, 50);
    });
  });
});

describe('triggerHaptic utility function', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      configurable: true,
      value: vibrateMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers default light pattern when no argument provided', () => {
    triggerHaptic();

    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it('triggers specific pattern when provided', () => {
    triggerHaptic('success');

    expect(vibrateMock).toHaveBeenCalledWith([15, 50, 30]);
  });

  it('triggers medium pattern', () => {
    triggerHaptic('medium');

    expect(vibrateMock).toHaveBeenCalledWith(25);
  });

  it('triggers heavy pattern', () => {
    triggerHaptic('heavy');

    expect(vibrateMock).toHaveBeenCalledWith(50);
  });

  it('triggers warning pattern', () => {
    triggerHaptic('warning');

    expect(vibrateMock).toHaveBeenCalledWith([20, 30, 20, 30, 20]);
  });

  it('triggers error pattern', () => {
    triggerHaptic('error');

    expect(vibrateMock).toHaveBeenCalledWith([30, 50, 30, 50, 30, 50, 30]);
  });

  it('triggers selection pattern', () => {
    triggerHaptic('selection');

    expect(vibrateMock).toHaveBeenCalledWith(5);
  });

  it('does not throw when vibration API is not supported', () => {
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: undefined,
    });

    expect(() => {
      triggerHaptic('light');
      triggerHaptic('success');
    }).not.toThrow();
  });

  it('silently fails when vibrate throws', () => {
    vibrateMock.mockImplementation(() => {
      throw new Error('Vibration not allowed');
    });

    expect(() => {
      triggerHaptic('medium');
    }).not.toThrow();
  });

  it('can be used as one-off haptic without hook', () => {
    // This is useful for functions outside of React components
    const handleNonReactAction = () => {
      triggerHaptic('light');
    };

    handleNonReactAction();

    expect(vibrateMock).toHaveBeenCalledWith(10);
  });
});
