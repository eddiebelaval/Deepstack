'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHaptics';

interface PullToRefreshProps {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** The content to wrap */
  children: React.ReactNode;
  /** Pull distance threshold to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance (default: 120) */
  maxPull?: number;
  /** Whether refresh is currently disabled */
  disabled?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Custom refresh indicator */
  indicator?: React.ReactNode;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing';

/**
 * Pull-to-refresh component for mobile-like refresh experience
 *
 * ★ Insight ─────────────────────────────────────
 * Uses Framer Motion's useMotionValue for smooth 60fps animations
 * that bypass React's render cycle. The pull gesture uses a
 * damped spring physics for that native iOS feel.
 * ─────────────────────────────────────────────────
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => { await fetchData(); }}>
 *   <div>Your scrollable content</div>
 * </PullToRefresh>
 * ```
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPull = 120,
  disabled = false,
  className,
  indicator,
}: PullToRefreshProps) {
  const [state, setState] = useState<RefreshState>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isAtTopRef = useRef<boolean>(true);

  // Motion values for smooth animations
  const pullDistance = useMotionValue(0);
  const indicatorOpacity = useTransform(pullDistance, [0, threshold * 0.5, threshold], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, threshold], [0.5, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, threshold, maxPull], [0, 180, 360]);

  // Check if we're scrolled to top
  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    // Find the first scrollable child or use the container itself
    const scrollableElement = container.querySelector('[data-pull-scroll]') || container;
    isAtTopRef.current = (scrollableElement as HTMLElement).scrollTop <= 0;
    return isAtTopRef.current;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state === 'refreshing') return;

    checkScrollPosition();
    if (!isAtTopRef.current) return;

    startYRef.current = e.touches[0].clientY;
    currentYRef.current = 0;
  }, [disabled, state, checkScrollPosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || state === 'refreshing') return;
    if (!isAtTopRef.current) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    // Only handle downward pull when at top
    if (diff <= 0) {
      pullDistance.set(0);
      if (state !== 'idle') setState('idle');
      return;
    }

    // Apply resistance (diminishing returns)
    const resistance = 0.5;
    const dampedPull = Math.min(diff * resistance, maxPull);
    currentYRef.current = dampedPull;
    pullDistance.set(dampedPull);

    // Update state based on pull distance
    if (dampedPull >= threshold) {
      if (state !== 'ready') {
        setState('ready');
        triggerHaptic('medium');
      }
    } else if (dampedPull > 0) {
      if (state !== 'pulling') setState('pulling');
    }

    // Prevent scroll when pulling
    if (dampedPull > 10) {
      e.preventDefault();
    }
  }, [disabled, state, threshold, maxPull, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled) return;

    const currentPull = currentYRef.current;

    if (currentPull >= threshold && state === 'ready') {
      // Trigger refresh
      setState('refreshing');
      triggerHaptic('success');

      // Animate to refresh position
      animate(pullDistance, 60, {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      });

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        triggerHaptic('error');
      } finally {
        // Animate back to 0
        animate(pullDistance, 0, {
          type: 'spring',
          stiffness: 400,
          damping: 30,
        });
        setState('idle');
      }
    } else {
      // Cancel pull
      animate(pullDistance, 0, {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      });
      setState('idle');
    }

    startYRef.current = 0;
    currentYRef.current = 0;
  }, [disabled, threshold, state, pullDistance, onRefresh]);

  // Attach touch listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Default refresh indicator
  const defaultIndicator = (
    <motion.div
      className="flex items-center justify-center"
      style={{
        opacity: indicatorOpacity,
        scale: indicatorScale,
      }}
    >
      {state === 'refreshing' ? (
        <RefreshCw className="h-6 w-6 text-primary animate-spin" />
      ) : (
        <motion.div style={{ rotate: indicatorRotation }}>
          <ArrowDown className={cn(
            "h-6 w-6 transition-colors",
            state === 'ready' ? "text-primary" : "text-muted-foreground"
          )} />
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden touch-pan-y", className)}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          height: pullDistance,
          top: 0,
        }}
      >
        <div className="py-2">
          {indicator || defaultIndicator}
          {state === 'pulling' && (
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Pull to refresh
            </p>
          )}
          {state === 'ready' && (
            <p className="text-xs text-primary mt-1 text-center">
              Release to refresh
            </p>
          )}
          {state === 'refreshing' && (
            <p className="text-xs text-primary mt-1 text-center">
              Refreshing...
            </p>
          )}
        </div>
      </motion.div>

      {/* Content with transform */}
      <motion.div
        style={{
          y: pullDistance,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Wrapper to make a scrollable area pull-to-refresh aware
 */
export function PullToRefreshScrollArea({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-pull-scroll
      className={cn("overflow-y-auto", className)}
    >
      {children}
    </div>
  );
}
