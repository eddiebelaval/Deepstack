'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Mobile Market Watcher Panel States
 */
export type MarketWatcherState = 'collapsed' | 'mini' | 'full';

/**
 * Default symbols to display in the market watcher
 * Curated to show essential market indicators without overwhelming the UI
 * - 3 major indices (S&P, Nasdaq, Volatility)
 * - 2 macro indicators (Gold, Bonds)
 * - 1 crypto (Bitcoin)
 */
export const DEFAULT_MARKET_SYMBOLS = [
  'SPY',     // S&P 500 - primary market benchmark
  'QQQ',     // Nasdaq 100 - tech sector proxy
  'VIX',     // Volatility Index - fear gauge
  'GLD',     // Gold - safe haven / inflation hedge
  'TLT',     // Treasury Bonds - rate sensitivity
  'BTC-USD', // Bitcoin - crypto sentiment
] as const;

interface UseMobileMarketWatcherReturn {
  /** Current panel state */
  state: MarketWatcherState;
  /** Expand from collapsed to mini mode */
  expand: () => void;
  /** Collapse to ticker tape */
  collapse: () => void;
  /** Go to full page mode */
  goFull: () => void;
  /** Go back to mini mode from full */
  goMini: () => void;
  /** Toggle between collapsed and mini */
  toggle: () => void;
  /** Set state directly */
  setState: (state: MarketWatcherState) => void;
  /** Is panel expanded (mini or full) */
  isExpanded: boolean;
  /** Is panel in full page mode */
  isFull: boolean;
}

const STORAGE_KEY = 'deepstack:mobile-market-watcher-state';

/**
 * useMobileMarketWatcher - Hook for managing mobile market watcher panel state
 *
 * State Machine:
 * ```
 * COLLAPSED ←→ MINI ←→ FULL
 *     ↓ pull/tap     ↓ pull/tap
 *    MINI           FULL
 *     ↑ swipe up     ↑ swipe up / back
 *   COLLAPSED       MINI
 * ```
 *
 * @example
 * ```tsx
 * const { state, expand, collapse, goFull, goMini } = useMobileMarketWatcher();
 *
 * // Render based on state
 * switch (state) {
 *   case 'collapsed': return <MarketWatcherTicker onExpand={expand} />;
 *   case 'mini': return <MarketWatcherMini onCollapse={collapse} onExpand={goFull} />;
 *   case 'full': return <MarketWatcherFull onBack={goMini} />;
 * }
 * ```
 */
export function useMobileMarketWatcher(
  initialState: MarketWatcherState = 'collapsed'
): UseMobileMarketWatcherReturn {
  const [state, setStateInternal] = useState<MarketWatcherState>(initialState);

  // Load persisted state on mount (only persist collapsed/mini, not full)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'collapsed' || saved === 'mini') {
        setStateInternal(saved);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Persist state changes (only collapsed/mini)
  const setState = useCallback((newState: MarketWatcherState) => {
    setStateInternal(newState);

    if (typeof window !== 'undefined' && newState !== 'full') {
      try {
        localStorage.setItem(STORAGE_KEY, newState);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  const expand = useCallback(() => {
    setState('mini');
  }, [setState]);

  const collapse = useCallback(() => {
    setState('collapsed');
  }, [setState]);

  const goFull = useCallback(() => {
    setState('full');
  }, [setState]);

  const goMini = useCallback(() => {
    setState('mini');
  }, [setState]);

  const toggle = useCallback(() => {
    setState(state === 'collapsed' ? 'mini' : 'collapsed');
  }, [state, setState]);

  return {
    state,
    expand,
    collapse,
    goFull,
    goMini,
    toggle,
    setState,
    isExpanded: state !== 'collapsed',
    isFull: state === 'full',
  };
}

export default useMobileMarketWatcher;
