'use client';

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualizedListOptions<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  getItemKey?: (index: number) => string | number;
}

/**
 * useVirtualizedList - Performance hook for long lists
 *
 * Usage:
 * ```tsx
 * const { parentRef, virtualItems, totalSize } = useVirtualizedList({
 *   items: myItems,
 *   estimateSize: 50, // estimated item height in px
 * });
 *
 * return (
 *   <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
 *     <div style={{ height: totalSize, position: 'relative' }}>
 *       {virtualItems.map(virtualRow => (
 *         <div
 *           key={virtualRow.key}
 *           style={{
 *             position: 'absolute',
 *             top: virtualRow.start,
 *             height: virtualRow.size,
 *             width: '100%',
 *           }}
 *         >
 *           {items[virtualRow.index]}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useVirtualizedList<T>({
  items,
  estimateSize = 50,
  overscan = 5,
  getItemKey,
}: UseVirtualizedListOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey || ((index) => index),
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Measure an item after render
  const measureElement = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        virtualizer.measureElement(element);
      }
    },
    [virtualizer]
  );

  return {
    parentRef,
    virtualItems,
    totalSize,
    measureElement,
    scrollToIndex: virtualizer.scrollToIndex,
  };
}

export default useVirtualizedList;
