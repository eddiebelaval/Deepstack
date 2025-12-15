'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SparklineCard } from './SparklineCard';
import { DEFAULT_MARKET_SYMBOLS } from '@/hooks/useMobileMarketWatcher';
import { useHaptics } from '@/hooks/useHaptics';

interface MarketWatcherMiniProps {
  /** Handler when user swipes up to collapse */
  onCollapse: () => void;
  /** Handler when user taps "Full Details" to expand */
  onExpand: () => void;
  /** Currently selected symbol (if any) */
  selectedSymbol?: string;
  /** Handler when user selects a symbol */
  onSelectSymbol?: (symbol: string) => void;
  /** Custom className */
  className?: string;
}

/**
 * MarketWatcherMini - Mini mode showing 2x3 grid of sparkline cards
 *
 * Features:
 * - 2x3 grid layout of essential market indicators
 * - Larger cards = more readable sparklines with 50 data points
 * - Each card shows symbol, price, sparkline, change %
 * - Pull-up handle to collapse back to ticker
 * - "View Full Details" button to expand
 * - Tap card to select/highlight
 *
 * @example
 * ```tsx
 * <MarketWatcherMini
 *   onCollapse={() => setState('collapsed')}
 *   onExpand={() => setState('full')}
 *   selectedSymbol={selected}
 *   onSelectSymbol={setSelected}
 * />
 * ```
 */
export function MarketWatcherMini({
  onCollapse,
  onExpand,
  selectedSymbol,
  onSelectSymbol,
  className,
}: MarketWatcherMiniProps) {
  const { light, selection } = useHaptics();

  const handleCollapse = useCallback(() => {
    light();
    onCollapse();
  }, [light, onCollapse]);

  const handleExpand = useCallback(() => {
    selection();
    onExpand();
  }, [selection, onExpand]);

  const handleSelectSymbol = useCallback(
    (symbol: string) => {
      light();
      onSelectSymbol?.(symbol);
    },
    [light, onSelectSymbol]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex flex-col',
        'glass-surface',
        'border-b border-border/50',
        'safe-area-top',
        className
      )}
    >
      {/* Pull-up handle to collapse */}
      <button
        onClick={handleCollapse}
        className="flex items-center justify-center py-1.5 tap-target touch-manipulation"
        aria-label="Collapse market watcher"
      >
        <div className="flex items-center gap-1 text-muted-foreground/70">
          <ChevronUp className="h-4 w-4" />
          <span className="text-[10px] font-medium uppercase tracking-wider">
            Markets
          </span>
          <ChevronUp className="h-4 w-4" />
        </div>
      </button>

      {/* 2x3 Grid of Sparkline Cards - larger cards for better readability */}
      <div className="px-3 pb-2">
        <div className="grid grid-cols-3 gap-2.5">
          {DEFAULT_MARKET_SYMBOLS.map((symbol) => (
            <SparklineCard
              key={symbol}
              symbol={symbol}
              size="sm"
              isActive={selectedSymbol === symbol}
              onClick={() => handleSelectSymbol(symbol)}
            />
          ))}
        </div>
      </div>

      {/* View Full Details button */}
      <motion.button
        onClick={handleExpand}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center justify-center gap-2 py-2.5 mx-3 mb-3',
          'rounded-xl bg-primary/10 border border-primary/20',
          'text-primary text-sm font-medium',
          'transition-colors hover:bg-primary/15',
          'tap-target'
        )}
      >
        <Maximize2 className="h-4 w-4" />
        View Full Details
        <ChevronDown className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}

export default MarketWatcherMini;
