'use client';

import { useCallback, useMemo } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Vibration patterns in milliseconds
// Single number = single vibration, array = pattern [vibrate, pause, vibrate, ...]
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 30],
  warning: [20, 30, 20, 30, 20],
  error: [30, 50, 30, 50, 30, 50, 30],
  selection: 5,
};

/**
 * Check if the Vibration API is supported
 * Note: iOS Safari has very limited support for Vibration API
 */
function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Check if we're running as a PWA (standalone mode)
 * Reserved for future use - may enable different haptic patterns in PWA mode
 */
function _isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export interface HapticFeedback {
  /** Trigger a light haptic feedback (tap) */
  light: () => void;
  /** Trigger a medium haptic feedback (button press) */
  medium: () => void;
  /** Trigger a heavy haptic feedback (impact) */
  heavy: () => void;
  /** Trigger a success pattern */
  success: () => void;
  /** Trigger a warning pattern */
  warning: () => void;
  /** Trigger an error pattern */
  error: () => void;
  /** Trigger a selection feedback */
  selection: () => void;
  /** Whether haptic feedback is available */
  isSupported: boolean;
  /** Trigger a custom pattern */
  trigger: (pattern: HapticPattern | number | number[]) => void;
}

/**
 * Hook for providing haptic feedback on mobile devices
 *
 * Note: iOS Safari has limited Vibration API support.
 * For iOS, haptic feedback works better through native APIs in PWA mode.
 *
 * @example
 * ```tsx
 * const { light, success, error } = useHaptics();
 *
 * <Button onClick={() => { light(); handleClick(); }}>
 *   Tap me
 * </Button>
 * ```
 */
export function useHaptics(): HapticFeedback {
  const isSupported = useMemo(() => isVibrationSupported(), []);

  const trigger = useCallback((pattern: HapticPattern | number | number[]) => {
    if (!isVibrationSupported()) return;

    try {
      const vibrationPattern = typeof pattern === 'string'
        ? HAPTIC_PATTERNS[pattern]
        : pattern;

      navigator.vibrate(vibrationPattern);
    } catch (e) {
      // Silently fail if vibration is not available
      console.debug('Haptic feedback not available:', e);
    }
  }, []);

  const light = useCallback(() => trigger('light'), [trigger]);
  const medium = useCallback(() => trigger('medium'), [trigger]);
  const heavy = useCallback(() => trigger('heavy'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);
  const selection = useCallback(() => trigger('selection'), [trigger]);

  return {
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
    isSupported,
    trigger,
  };
}

/**
 * Utility function for one-off haptic feedback without the hook
 */
export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (!isVibrationSupported()) return;

  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    // Silently fail if vibration is not available
  }
}
