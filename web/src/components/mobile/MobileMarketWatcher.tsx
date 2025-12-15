'use client';

import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMobileMarketWatcher, MarketWatcherState } from '@/hooks/useMobileMarketWatcher';
import { MarketWatcherTicker } from './MarketWatcherTicker';
import { MarketWatcherMini } from './MarketWatcherMini';
import { MarketWatcherFull } from './MarketWatcherFull';

interface MobileMarketWatcherProps {
  /** Initial state (defaults to 'collapsed') */
  initialState?: MarketWatcherState;
  /** Custom className for container */
  className?: string;
}

/**
 * MobileMarketWatcher - Orchestrator for the three-state market watcher panel
 *
 * State Machine:
 * ```
 * COLLAPSED ←→ MINI ←→ FULL
 *     ↓ tap/pull    ↓ tap "Full Details"
 *    MINI          FULL
 *     ↑ tap         ↑ back button
 *   COLLAPSED      MINI
 * ```
 *
 * Features:
 * - Collapsed: Scrolling ticker tape at top
 * - Mini: 2x4 grid with sparkline cards
 * - Full: Portal-rendered full-page detailed view
 *
 * @example
 * ```tsx
 * // In ChatPage component:
 * <div className="relative h-full flex flex-col">
 *   <MobileMarketWatcher />
 *   <div className="flex-1 overflow-auto">
 *     {/* Chat content *\/}
 *   </div>
 * </div>
 * ```
 */
export function MobileMarketWatcher({
  initialState = 'collapsed',
  className,
}: MobileMarketWatcherProps) {
  const {
    state,
    expand,
    collapse,
    goFull,
    goMini,
  } = useMobileMarketWatcher(initialState);

  // Track selected symbol for highlighting
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>();

  // Handle symbol selection in mini mode
  const handleSelectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
  }, []);

  return (
    <div className={cn('relative z-20', className)}>
      <AnimatePresence mode="wait">
        {state === 'collapsed' && (
          <MarketWatcherTicker
            key="ticker"
            onExpand={expand}
          />
        )}

        {state === 'mini' && (
          <MarketWatcherMini
            key="mini"
            onCollapse={collapse}
            onExpand={goFull}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={handleSelectSymbol}
          />
        )}
      </AnimatePresence>

      {/* Full page renders via portal, so outside AnimatePresence */}
      <AnimatePresence>
        {state === 'full' && (
          <MarketWatcherFull
            key="full"
            onBack={goMini}
            initialSymbol={selectedSymbol}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default MobileMarketWatcher;
