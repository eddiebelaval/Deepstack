'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { DEFAULT_MARKET_SYMBOLS } from '@/hooks/useMobileMarketWatcher';
import { useHaptics } from '@/hooks/useHaptics';

interface MarketWatcherTickerProps {
  /** Handler when user taps/pulls to expand */
  onExpand: () => void;
  /** Custom className */
  className?: string;
}

interface TickerItemData {
  symbol: string;
  price: number;
  changePercent: number;
}

/**
 * MarketWatcherTicker - Collapsed state showing scrolling ticker tape
 *
 * Features:
 * - Horizontal scrolling ticker with symbol, price, and change %
 * - Pull-down handle indicator
 * - Tap anywhere to expand to mini mode
 * - Safe area padding for notch
 *
 * @example
 * ```tsx
 * <MarketWatcherTicker onExpand={() => setState('mini')} />
 * ```
 */
export function MarketWatcherTicker({
  onExpand,
  className,
}: MarketWatcherTickerProps) {
  const quotes = useMarketDataStore((state) => state.quotes);
  const { light } = useHaptics();
  const [tickerData, setTickerData] = useState<TickerItemData[]>([]);

  // Build ticker data from quotes
  useEffect(() => {
    const data = DEFAULT_MARKET_SYMBOLS.map((symbol) => {
      const quote = quotes[symbol];
      return {
        symbol,
        price: quote?.last ?? 0,
        changePercent: quote?.changePercent ?? 0,
      };
    }).filter((item) => item.price > 0);

    setTickerData(data);
  }, [quotes]);

  const handleTap = () => {
    light();
    onExpand();
  };

  return (
    <motion.button
      onClick={handleTap}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2',
        'led-ticker-container',
        'safe-area-top tap-target',
        className
      )}
      whileTap={{ backgroundColor: 'oklch(0.12 0.008 55)' }}
    >
      {/* Pull-down indicator */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
      </div>

      {/* Scrolling ticker content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-8 led-fade-left z-10 pointer-events-none" />

        <div className="flex items-center gap-4 animate-scroll-x">
          {tickerData.length > 0 ? (
            <>
              {/* Duplicate for seamless loop */}
              {[...tickerData, ...tickerData].map((item, index) => (
                <TickerItem
                  key={`${item.symbol}-${index}`}
                  symbol={item.symbol}
                  price={item.price}
                  changePercent={item.changePercent}
                />
              ))}
            </>
          ) : (
            <span className="text-xs led-text/50">
              Loading market data...
            </span>
          )}
        </div>

        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-8 led-fade-right z-10 pointer-events-none" />
      </div>

      {/* Right indicator */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
      </div>
    </motion.button>
  );
}

/**
 * Individual ticker item
 */
function TickerItem({
  symbol,
  price,
  changePercent,
}: TickerItemData) {
  const isPositive = changePercent >= 0;

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="text-xs font-semibold led-text">
        {symbol}
      </span>
      <span className="text-xs font-mono led-text/80">
        ${price.toFixed(2)}
      </span>
      <span
        className={cn(
          'flex items-center gap-0.5 text-[10px] font-medium',
          isPositive ? 'led-profit' : 'led-loss'
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-2.5 w-2.5" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5" />
        )}
        {isPositive ? '+' : ''}
        {changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

export default MarketWatcherTicker;
