'use client';

import { useRef, useCallback, useEffect } from 'react';

export interface SwipeConfig {
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  threshold?: number;
  /** Minimum velocity to trigger a swipe (default: 0.3 px/ms) */
  velocity?: number;
  /** Whether to prevent default touch behavior */
  preventDefault?: boolean;
  /** Callback when swiping left */
  onSwipeLeft?: () => void;
  /** Callback when swiping right */
  onSwipeRight?: () => void;
  /** Callback when swiping up */
  onSwipeUp?: () => void;
  /** Callback when swiping down */
  onSwipeDown?: () => void;
  /** Edge detection - only trigger from edge of screen */
  edgeOnly?: boolean;
  /** Edge threshold in pixels (default: 20) */
  edgeThreshold?: number;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  isFromEdge: boolean;
}

export function useSwipeGesture<T extends HTMLElement = HTMLElement>(
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    velocity = 0.3,
    preventDefault = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    edgeOnly = false,
    edgeThreshold = 20,
  } = config;

  const elementRef = useRef<T>(null);
  const touchDataRef = useRef<TouchData | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      const isFromLeftEdge = touch.clientX < edgeThreshold;
      const isFromRightEdge = touch.clientX > screenWidth - edgeThreshold;
      const isFromEdge = isFromLeftEdge || isFromRightEdge;

      // If edgeOnly is set, only track touches from edges
      if (edgeOnly && !isFromEdge) {
        touchDataRef.current = null;
        return;
      }

      touchDataRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isFromEdge,
      };

      if (preventDefault) {
        e.preventDefault();
      }
    },
    [edgeOnly, edgeThreshold, preventDefault]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchDataRef.current) return;

      // Optionally prevent default to avoid scroll interference
      if (preventDefault) {
        e.preventDefault();
      }
    },
    [preventDefault]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchDataRef.current) return;

      const touch = e.changedTouches[0];
      const { startX, startY, startTime } = touchDataRef.current;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const deltaTime = Date.now() - startTime;

      // Calculate velocity (pixels per millisecond)
      const velocityX = Math.abs(deltaX) / deltaTime;
      const velocityY = Math.abs(deltaY) / deltaTime;

      // Determine if it's a horizontal or vertical swipe
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      // Check if swipe meets criteria
      const meetsThreshold = isHorizontal
        ? Math.abs(deltaX) > threshold
        : Math.abs(deltaY) > threshold;

      const meetsVelocity = isHorizontal
        ? velocityX > velocity
        : velocityY > velocity;

      if (meetsThreshold && meetsVelocity) {
        if (isHorizontal) {
          if (deltaX > 0) {
            // Swipe right - but for edge swipes from left, this is the "open" gesture
            onSwipeRight?.();
          } else {
            // Swipe left - for edge swipes from right, this is the "open" gesture
            onSwipeLeft?.();
          }
        } else {
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      touchDataRef.current = null;
    },
    [threshold, velocity, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);

  return elementRef;
}

/**
 * Hook specifically for edge swipe gestures (like iOS back gesture)
 */
export function useEdgeSwipe(config: Omit<SwipeConfig, 'edgeOnly'> = {}) {
  return useSwipeGesture({
    ...config,
    edgeOnly: true,
  });
}
