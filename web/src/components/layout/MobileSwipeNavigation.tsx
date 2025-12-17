'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export type MobilePageId = 'tools' | 'chat' | 'news' | 'predictions';

interface MobileSwipeNavigationProps {
  children: React.ReactNode[];
  pageIds?: MobilePageId[];
  initialPage?: number;
  onPageChange?: (pageIndex: number, pageId: MobilePageId) => void;
  className?: string;
}

// Default page IDs - can be overridden via props
const DEFAULT_PAGE_IDS: MobilePageId[] = ['tools', 'chat', 'news', 'predictions'];

// Swipe physics config - tuned for smooth, responsive swiping
const SWIPE_THRESHOLD = 40; // Min distance to trigger page change (lowered for responsiveness)
const SWIPE_VELOCITY_THRESHOLD = 300; // Min velocity to trigger page change (lowered for easier triggering)
const DRAG_ELASTIC = 0.2; // Elasticity during drag (higher = more responsive feel)
const SPRING_STIFFNESS = 260; // Animation stiffness (lower = smoother)
const SPRING_DAMPING = 26; // Animation damping (lower = more bounce)
const BOUNCE_STIFFNESS = 260; // Bounce back stiffness
const BOUNCE_DAMPING = 26; // Bounce back damping

/**
 * Mobile Swipe Navigation Container
 *
 * Provides horizontal swipe navigation between pages:
 * [Tools] ← [Chat (Home)] → [News] → [PM]
 *    0           1            2        3
 *
 * - Start on Chat (Home) - the Deepstack front page with AI chat & market watcher
 * - Swipe RIGHT → Tools page (chat history, tools)
 * - Swipe LEFT → News page, then PM (prediction markets)
 */
export function MobileSwipeNavigation({
  children,
  pageIds = DEFAULT_PAGE_IDS,
  initialPage = 1, // Start on Chat (Home)
  onPageChange,
  className,
}: MobileSwipeNavigationProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const { selection, light } = useHaptics();

  const pageCount = children.length;
  // Use provided pageIds or generate defaults based on child count
  const effectivePageIds = pageIds.length === pageCount ? pageIds : DEFAULT_PAGE_IDS.slice(0, pageCount);

  // Track container width for accurate drag constraints
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement
    setContainerWidth(container.offsetWidth);

    // Use ResizeObserver to track size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Navigate to a specific page
  // Calculate percentage offset - each page is (100/pageCount)% of the container
  const getPageOffset = useCallback((pageIndex: number) => {
    return -pageIndex * (100 / pageCount) + '%';
  }, [pageCount]);

  const navigateToPage = useCallback((pageIndex: number, animated = true) => {
    const clampedIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));

    if (clampedIndex !== currentPage) {
      selection(); // Haptic feedback on page change
      setCurrentPage(clampedIndex);
      onPageChange?.(clampedIndex, effectivePageIds[clampedIndex]);
    }

    if (animated) {
      controls.start({
        x: getPageOffset(clampedIndex),
        transition: {
          type: 'spring',
          stiffness: SPRING_STIFFNESS,
          damping: SPRING_DAMPING,
          mass: 0.8, // Lighter mass for snappier feel
        },
      });
    } else {
      controls.set({ x: getPageOffset(clampedIndex) });
    }
  }, [currentPage, pageCount, controls, selection, onPageChange, effectivePageIds, getPageOffset]);

  // Handle drag/swipe gestures
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    light(); // Light haptic on drag start
  }, [light]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);

      const { offset, velocity } = info;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;

      // Calculate which page to land on
      let targetPage = currentPage;

      // Check if swipe was strong enough (velocity or distance)
      const swipeDistance = Math.abs(offset.x);
      const swipeVelocity = Math.abs(velocity.x);

      if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > SWIPE_VELOCITY_THRESHOLD) {
        if (offset.x > 0 && currentPage > 0) {
          // Swiped right, go to previous page
          targetPage = currentPage - 1;
        } else if (offset.x < 0 && currentPage < pageCount - 1) {
          // Swiped left, go to next page
          targetPage = currentPage + 1;
        }
      }

      // Also check if dragged more than half the screen
      const dragRatio = offset.x / containerWidth;
      if (Math.abs(dragRatio) > 0.3) {
        if (dragRatio > 0 && currentPage > 0) {
          targetPage = currentPage - 1;
        } else if (dragRatio < 0 && currentPage < pageCount - 1) {
          targetPage = currentPage + 1;
        }
      }

      navigateToPage(targetPage);
    },
    [currentPage, pageCount, navigateToPage]
  );

  // Initialize position on mount and sync when currentPage changes externally
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      controls.set({ x: getPageOffset(currentPage) });
    });
  }, [controls, currentPage, getPageOffset]);

  // Expose navigation method via ref or context
  useEffect(() => {
    // Store navigation function globally for external access
    (window as any).__mobileSwipeNav = {
      navigateTo: navigateToPage,
      getCurrentPage: () => currentPage,
      getPageId: () => effectivePageIds[currentPage],
      getPageIds: () => effectivePageIds,
    };
    return () => {
      delete (window as any).__mobileSwipeNav;
    };
  }, [navigateToPage, currentPage, effectivePageIds]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none",
        className
      )}
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      {/* Page Indicator Dots - dynamically based on actual page count */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
        {Array.from({ length: pageCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => navigateToPage(index)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              index === currentPage
                ? "w-4 bg-primary"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to ${effectivePageIds[index] || `page ${index}`}`}
          />
        ))}
      </div>

      {/* Swipeable Pages Container */}
      <motion.div
        className="flex h-full"
        style={{
          width: `${pageCount * 100}%`,
          touchAction: 'pan-y', // Allow vertical scroll inside, but let horizontal swipe through
        }}
        initial={{ x: `-${initialPage * (100 / pageCount)}%` }}
        animate={controls}
        drag="x"
        dragConstraints={{
          // Use pixel values calculated from tracked container width
          left: -(pageCount - 1) * (containerWidth || window.innerWidth),
          right: 0,
        }}
        dragElastic={DRAG_ELASTIC}
        dragMomentum={true} // Enable momentum for fluid swipes
        dragTransition={{
          bounceStiffness: BOUNCE_STIFFNESS,
          bounceDamping: BOUNCE_DAMPING,
          power: 0.3, // Controls momentum distance
          timeConstant: 200, // How long momentum lasts
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {React.Children.map(children, (child, index) => (
          <div
            className={cn(
              "h-full flex-shrink-0 relative",
              // Subtle edge peek effect
              isDragging && "will-change-transform"
            )}
            style={{ width: `${100 / pageCount}%` }}
          >
            {/* Edge peek shadows */}
            {index > 0 && (
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-3 pointer-events-none z-10",
                  "bg-gradient-to-r from-black/10 to-transparent",
                  "opacity-0 transition-opacity",
                  currentPage === index && "opacity-100"
                )}
              />
            )}
            {index < pageCount - 1 && (
              <div
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-3 pointer-events-none z-10",
                  "bg-gradient-to-l from-black/10 to-transparent",
                  "opacity-0 transition-opacity",
                  currentPage === index && "opacity-100"
                )}
              />
            )}

            {/* Page Content - touch-action allows vertical scroll but lets horizontal swipe bubble up */}
            <div
              className="h-full w-full overflow-hidden"
              style={{ touchAction: 'pan-y' }}
            >
              {child}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Edge Hints - subtle indicators that more content exists */}
      <AnimatePresence>
        {currentPage > 0 && !isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-r-full bg-muted-foreground/20 z-20"
          />
        )}
        {currentPage < pageCount - 1 && !isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-l-full bg-muted-foreground/20 z-20"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook to access mobile swipe navigation from anywhere
 */
export function useMobileSwipeNav() {
  const navigateTo = useCallback((pageIndex: number) => {
    (window as any).__mobileSwipeNav?.navigateTo(pageIndex);
  }, []);

  const navigateToPage = useCallback((pageId: MobilePageId) => {
    const pageIds = (window as any).__mobileSwipeNav?.getPageIds() ?? DEFAULT_PAGE_IDS;
    const index = pageIds.indexOf(pageId);
    if (index !== -1) {
      navigateTo(index);
    }
  }, [navigateTo]);

  const getCurrentPage = useCallback((): number => {
    return (window as any).__mobileSwipeNav?.getCurrentPage() ?? 1;
  }, []);

  const getPageId = useCallback((): MobilePageId => {
    return (window as any).__mobileSwipeNav?.getPageId() ?? 'chat';
  }, []);

  const getPageIds = useCallback((): MobilePageId[] => {
    return (window as any).__mobileSwipeNav?.getPageIds() ?? DEFAULT_PAGE_IDS;
  }, []);

  return {
    navigateTo,
    navigateToPage,
    getCurrentPage,
    getPageId,
    getPageIds,
    PAGE_IDS: DEFAULT_PAGE_IDS, // For backwards compatibility
  };
}
