'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useBarData } from '@/hooks/useBarData';
import { DEFAULT_MARKET_SYMBOLS } from '@/hooks/useMobileMarketWatcher';
import { useHaptics } from '@/hooks/useHaptics';

interface MarketWatcherFullProps {
  /** Handler when user taps back to return to mini mode */
  onBack: () => void;
  /** Initially selected symbol */
  initialSymbol?: string;
  /** Custom className */
  className?: string;
}

type TabId = 'indices' | 'watchlist' | 'crypto' | 'sectors';

const TABS: { id: TabId; label: string }[] = [
  { id: 'indices', label: 'Indices' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'sectors', label: 'Sectors' },
];

// Symbol categories
const SYMBOL_CATEGORIES: Record<TabId, readonly string[]> = {
  indices: ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX'],
  watchlist: DEFAULT_MARKET_SYMBOLS,
  crypto: ['BTC-USD', 'ETH-USD'],
  sectors: ['XLF', 'XLK', 'XLE', 'XLV', 'XLI'],
};

/**
 * MarketWatcherFull - Full page detailed market view
 *
 * Features:
 * - Portal rendering to escape swipe navigation containment
 * - Tab navigation for different categories
 * - Larger charts with OHLCV data
 * - Scrollable list of symbols
 * - Back button to return to mini mode
 *
 * @example
 * ```tsx
 * <MarketWatcherFull
 *   onBack={() => setState('mini')}
 *   initialSymbol="SPY"
 * />
 * ```
 */
export function MarketWatcherFull({
  onBack,
  initialSymbol = 'SPY',
  className,
}: MarketWatcherFullProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('indices');
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const { light, selection } = useHaptics();

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
    // Prevent body scroll when full view is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBack = () => {
    light();
    onBack();
  };

  const handleTabChange = (tabId: TabId) => {
    selection();
    setActiveTab(tabId);
    // Select first symbol in new tab
    const symbols = SYMBOL_CATEGORIES[tabId];
    if (symbols.length > 0) {
      setSelectedSymbol(symbols[0]);
    }
  };

  const handleSelectSymbol = (symbol: string) => {
    light();
    setSelectedSymbol(symbol);
  };

  const symbols = SYMBOL_CATEGORIES[activeTab];

  if (!mounted) return null;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed inset-0 z-50 flex flex-col',
        'bg-background',
        'safe-area-top safe-area-bottom',
        className
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50 glass-surface">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors tap-target"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Market Watch</h1>
        <button
          onClick={() => light()}
          className="p-2 -mr-2 rounded-full hover:bg-muted/50 transition-colors tap-target"
          aria-label="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-1 px-4 py-2 border-b border-border/50 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap tap-target',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'soft-card hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Selected Symbol Detail */}
      <div className="p-4 border-b border-border/50 glass-surface-elevated">
        <SymbolDetail symbol={selectedSymbol} />
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="divide-y divide-border/50">
          {symbols.map((symbol) => (
            <SymbolRow
              key={symbol}
              symbol={symbol}
              isActive={selectedSymbol === symbol}
              onClick={() => handleSelectSymbol(symbol)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );

  return createPortal(content, document.body);
}

/**
 * Detailed view for selected symbol with larger chart
 */
function SymbolDetail({ symbol }: { symbol: string }) {
  const quotes = useMarketDataStore((state) => state.quotes);
  const quote = quotes[symbol];
  const { data: barResponse, isLoading } = useBarData(symbol, '1d', true);
  const barData = barResponse?.bars;

  // Get last 40 bars for larger chart
  const pricePoints = useMemo(() => {
    if (!barData || barData.length === 0) return [];
    return barData.slice(-40).map((bar) => bar.value);
  }, [barData]);

  // Calculate chart dimensions
  const { min, max, svgPath, areaPath } = useMemo(() => {
    if (pricePoints.length < 2) {
      return { min: 0, max: 0, svgPath: '', areaPath: '' };
    }

    const minVal = Math.min(...pricePoints);
    const maxVal = Math.max(...pricePoints);
    const width = 100;
    const height = 50;
    const padding = 4;
    const range = maxVal - minVal || 1;

    const points = pricePoints.map((price, i) => {
      const x = (i / (pricePoints.length - 1)) * width;
      const y = height - ((price - minVal) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    const path = `M ${points.join(' L ')}`;
    const area = `${path} L 100,50 L 0,50 Z`;

    return { min: minVal, max: maxVal, svgPath: path, areaPath: area };
  }, [pricePoints]);

  const currentPrice = quote?.last ?? 0;
  const changePercent = quote?.changePercent ?? 0;
  const change = quote?.change ?? 0;
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;

  // Use Deepstack trading colors
  const strokeColor = isPositive
    ? 'oklch(0.65 0.16 145)' // --ds-profit
    : isNegative
    ? 'oklch(0.60 0.18 25)' // --ds-loss
    : 'oklch(0.55 0.008 60)'; // --ds-neutral

  const fillColor = isPositive
    ? 'oklch(0.65 0.16 145 / 0.15)'
    : isNegative
    ? 'oklch(0.60 0.18 25 / 0.15)'
    : 'oklch(0.55 0.008 60 / 0.08)';

  // OHLCV data from quote
  const hasOHLCV = quote?.open && quote?.high && quote?.low && quote?.volume;

  return (
    <div className="space-y-3">
      {/* Symbol header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{symbol}</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-semibold">
              ${currentPrice.toFixed(2)}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                isPositive && 'text-profit',
                isNegative && 'text-loss',
                !isPositive && !isNegative && 'text-neutral'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : isNegative ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              {isPositive ? '+' : ''}
              {change.toFixed(2)} ({isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Larger Chart */}
      <div className="h-32 w-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-2 bg-muted/50 rounded animate-pulse" />
          </div>
        ) : svgPath ? (
          <svg
            viewBox="0 0 100 50"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path d={areaPath} fill={fillColor} />
            <path
              d={svgPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-3/4 h-px bg-muted-foreground/20" />
          </div>
        )}
      </div>

      {/* OHLCV Data */}
      {hasOHLCV && quote && (
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="glass-surface rounded-xl p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Open</div>
            <div className="text-xs font-mono font-medium mt-0.5">
              ${quote.open?.toFixed(2) ?? '—'}
            </div>
          </div>
          <div className="glass-surface rounded-xl p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">High</div>
            <div className="text-xs font-mono font-medium text-profit mt-0.5">
              ${quote.high?.toFixed(2) ?? '—'}
            </div>
          </div>
          <div className="glass-surface rounded-xl p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Low</div>
            <div className="text-xs font-mono font-medium text-loss mt-0.5">
              ${quote.low?.toFixed(2) ?? '—'}
            </div>
          </div>
          <div className="glass-surface rounded-xl p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Close</div>
            <div className="text-xs font-mono font-medium mt-0.5">
              ${quote.close?.toFixed(2) ?? currentPrice.toFixed(2)}
            </div>
          </div>
          <div className="glass-surface rounded-xl p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Vol</div>
            <div className="text-xs font-mono font-medium mt-0.5">
              {quote.volume ? formatVolume(quote.volume) : '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Row item for symbol list
 */
function SymbolRow({
  symbol,
  isActive,
  onClick,
}: {
  symbol: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const quotes = useMarketDataStore((state) => state.quotes);
  const quote = quotes[symbol];

  const currentPrice = quote?.last ?? 0;
  const changePercent = quote?.changePercent ?? 0;
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3 transition-colors tap-target',
        'hover:bg-muted/30 active:bg-muted/50',
        isActive && 'bg-primary/5 border-l-2 border-primary'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            isActive ? 'bg-primary shadow-[0_0_8px_currentColor]' : 'bg-transparent'
          )}
        />
        <span className="font-semibold">{symbol}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-sm">
          {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : '—'}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-sm font-medium min-w-[80px] justify-end',
            isPositive && 'text-profit',
            isNegative && 'text-loss',
            !isPositive && !isNegative && 'text-neutral'
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : isNegative ? (
            <TrendingDown className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
          {isPositive ? '+' : ''}
          {changePercent.toFixed(2)}%
        </span>
      </div>
    </button>
  );
}

/**
 * Format volume for display
 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(1)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toString();
}

export default MarketWatcherFull;
