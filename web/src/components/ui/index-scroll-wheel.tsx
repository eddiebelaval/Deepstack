"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Available market indices with their display names and symbols
export const AVAILABLE_INDICES = [
  { symbol: 'SPY', name: 'S&P 500', description: 'US Large Cap' },
  { symbol: 'QQQ', name: 'NASDAQ 100', description: 'US Tech' },
  { symbol: 'DIA', name: 'Dow Jones', description: 'US Blue Chip' },
  { symbol: 'IWM', name: 'Russell 2000', description: 'US Small Cap' },
  { symbol: 'VIX', name: 'Volatility', description: 'Fear Index' },
  { symbol: 'VTI', name: 'Total Market', description: 'All US Stocks' },
  { symbol: 'EFA', name: 'EAFE', description: 'Intl Developed' },
  { symbol: 'EEM', name: 'Emerging', description: 'Emerging Markets' },
  { symbol: 'GLD', name: 'Gold', description: 'Gold ETF' },
  { symbol: 'TLT', name: 'Treasuries', description: '20+ Year Bonds' },
  { symbol: 'XLF', name: 'Financials', description: 'Financial Sector' },
  { symbol: 'XLE', name: 'Energy', description: 'Energy Sector' },
  { symbol: 'XLK', name: 'Technology', description: 'Tech Sector' },
  { symbol: 'XLV', name: 'Healthcare', description: 'Health Sector' },
];

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface IndexScrollWheelProps {
  /** Mode: 'symbol' scrolls through individual symbols, 'category' scrolls through categories */
  mode?: 'symbol' | 'category';
  /** Categories to display (only used in category mode) */
  categories?: Category[];
  /** Current category index (only used in category mode) */
  categoryIndex?: number;
  /** Called when category changes (only in category mode) */
  onCategoryChange?: (index: number) => void;

  // Symbol mode props
  selectedSymbols: string[];
  onSelect: (symbol: string) => void;
  /** Called when the wheel navigates to a new index (for auto-adding to chart) */
  onNavigate?: (symbol: string) => void;
  /** Map of symbol to its assigned color in the chart */
  symbolColors?: Record<string, string>;
  className?: string;
}

export function IndexScrollWheel({
  mode = 'symbol',
  categories,
  categoryIndex,
  onCategoryChange,
  selectedSymbols,
  onSelect,
  onNavigate,
  symbolColors = {},
  className
}: IndexScrollWheelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Determine which data source to use based on mode
  const items = mode === 'category' ? (categories || []) : AVAILABLE_INDICES;
  const activeIndex = mode === 'category' ? (categoryIndex ?? 0) : currentIndex;

  // Fire onNavigate/onCategoryChange when index changes (after initial render)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (mode === 'symbol' && onNavigate) {
      onNavigate(AVAILABLE_INDICES[currentIndex].symbol);
    }
  }, [currentIndex, onNavigate, mode]);

  // Get current and adjacent items for display
  const getVisibleItems = useCallback(() => {
    const total = items.length;
    if (total === 0) {
      return { prev: null, current: null, next: null };
    }
    const prevIndex = (activeIndex - 1 + total) % total;
    const nextIndex = (activeIndex + 1) % total;

    if (mode === 'category') {
      return {
        prev: categories?.[prevIndex] || null,
        current: categories?.[activeIndex] || null,
        next: categories?.[nextIndex] || null,
      };
    } else {
      return {
        prev: AVAILABLE_INDICES[prevIndex],
        current: AVAILABLE_INDICES[currentIndex],
        next: AVAILABLE_INDICES[nextIndex],
      };
    }
  }, [currentIndex, activeIndex, items.length, mode, categories]);

  const scrollUp = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (mode === 'category') {
      const newIndex = (activeIndex - 1 + items.length) % items.length;
      onCategoryChange?.(newIndex);
    } else {
      setCurrentIndex((prev) => (prev - 1 + AVAILABLE_INDICES.length) % AVAILABLE_INDICES.length);
    }

    setTimeout(() => setIsAnimating(false), 200);
  }, [isAnimating, mode, activeIndex, items.length, onCategoryChange]);

  const scrollDown = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (mode === 'category') {
      const newIndex = (activeIndex + 1) % items.length;
      onCategoryChange?.(newIndex);
    } else {
      setCurrentIndex((prev) => (prev + 1) % AVAILABLE_INDICES.length);
    }

    setTimeout(() => setIsAnimating(false), 200);
  }, [isAnimating, mode, activeIndex, items.length, onCategoryChange]);

  // Handle mouse wheel scrolling
  useEffect(() => {
    const element = wheelRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        scrollDown();
      } else {
        scrollUp();
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [scrollUp, scrollDown]);

  // Handle touch/swipe scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;

    const deltaY = touchStartY - e.touches[0].clientY;
    if (Math.abs(deltaY) > 20) {
      if (deltaY > 0) {
        scrollDown();
      } else {
        scrollUp();
      }
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  const { prev, current, next } = getVisibleItems();

  // Determine colors based on mode
  let currentColor: string | undefined;
  let prevColor: string | undefined;
  let nextColor: string | undefined;
  let isSelected = false;

  if (mode === 'category') {
    // In category mode, use the category's color
    currentColor = (current as Category | null)?.color;
    prevColor = (prev as Category | null)?.color;
    nextColor = (next as Category | null)?.color;
  } else {
    // In symbol mode, use symbolColors map
    const currentSymbol = current as typeof AVAILABLE_INDICES[number] | null;
    const prevSymbol = prev as typeof AVAILABLE_INDICES[number] | null;
    const nextSymbol = next as typeof AVAILABLE_INDICES[number] | null;

    isSelected = currentSymbol ? selectedSymbols.includes(currentSymbol.symbol) : false;
    currentColor = currentSymbol ? symbolColors[currentSymbol.symbol] : undefined;
    prevColor = prevSymbol ? symbolColors[prevSymbol.symbol] : undefined;
    nextColor = nextSymbol ? symbolColors[nextSymbol.symbol] : undefined;
  }

  // Empty state for category mode
  if (mode === 'category' && (!categories || categories.length === 0)) {
    return (
      <div className={cn("relative flex flex-col items-center", className)}>
        <div className="relative w-[100px] h-[90px] flex items-center justify-center">
          <div className="text-xs text-muted-foreground/50">No categories</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Glass container with backlit effect */}
      <div
        ref={wheelRef}
        className="relative w-[100px] h-[90px] cursor-ns-resize select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Backlit glow effect - uses the current index's color when selected */}
        <div
          className="absolute inset-0 rounded-xl transition-all duration-300"
          style={{
            background: currentColor
              ? `radial-gradient(ellipse at center, ${currentColor}40 0%, ${currentColor}20 40%, transparent 70%)`
              : `radial-gradient(ellipse at center, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 40%, transparent 70%)`,
            filter: 'blur(12px)',
            transform: 'scale(1.3)',
          }}
        />

        {/* Secondary glow ring */}
        <div
          className="absolute inset-0 rounded-xl transition-all duration-300"
          style={{
            boxShadow: currentColor
              ? `0 0 30px ${currentColor}30, inset 0 0 20px ${currentColor}10`
              : `0 0 30px rgba(245, 158, 11, 0.2), inset 0 0 20px rgba(245, 158, 11, 0.05)`,
          }}
        />

        {/* Glass surface */}
        <div className="absolute inset-0 rounded-xl backdrop-blur-md bg-background/40 border border-primary/20 overflow-hidden">
          {/* Top fade gradient */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background/80 to-transparent z-10 pointer-events-none" />

          {/* Bottom fade gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background/80 to-transparent z-10 pointer-events-none" />

          {/* Scroll items */}
          <div className="flex flex-col items-center justify-center h-full py-1">
            {/* Previous item (dimmed) */}
            {prev && (
              <div
                className={cn(
                  "flex items-center gap-1 text-[9px] text-muted-foreground/40 font-medium transition-all duration-200 cursor-pointer hover:text-muted-foreground/60",
                  isAnimating && "transform -translate-y-1"
                )}
                onClick={scrollUp}
              >
                {prevColor && (
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: prevColor, opacity: 0.6 }}
                  />
                )}
                {prev.name}
              </div>
            )}

            {/* Current item (highlighted) */}
            {current && (
              <button
                onClick={() => {
                  // Only call onSelect in symbol mode
                  if (mode === 'symbol' && 'symbol' in current) {
                    onSelect(current.symbol);
                  }
                }}
                className={cn(
                  "flex flex-col items-center py-1.5 px-3 rounded-lg transition-all duration-200",
                  mode === 'symbol' && "hover:bg-primary/10",
                  mode === 'symbol' && isSelected && "bg-primary/15",
                  mode === 'category' && "scale-110" // Slightly larger in category mode
                )}
                disabled={mode === 'category'} // Not clickable in category mode
              >
                <div className="flex items-center gap-1.5">
                  {currentColor && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: currentColor,
                        boxShadow: `0 0 6px ${currentColor}80`
                      }}
                    />
                  )}
                  <span className={cn(
                    "font-bold text-foreground leading-tight",
                    mode === 'category' ? "text-sm" : "text-xs"
                  )}>
                    {current.name}
                  </span>
                </div>
                <span className="text-[8px] text-muted-foreground leading-tight">
                  {current.description}
                </span>
                {/* Selection indicator - only shown in symbol mode */}
                {mode === 'symbol' && (
                  <div
                    className={cn(
                      "h-0.5 w-8 mt-1 rounded-full transition-all duration-200",
                      isSelected
                        ? "opacity-100"
                        : "bg-muted-foreground/30 opacity-50"
                    )}
                    style={{
                      backgroundColor: currentColor || (isSelected ? 'hsl(var(--primary))' : undefined)
                    }}
                  />
                )}
              </button>
            )}

            {/* Next item (dimmed) */}
            {next && (
              <div
                className={cn(
                  "flex items-center gap-1 text-[9px] text-muted-foreground/40 font-medium transition-all duration-200 cursor-pointer hover:text-muted-foreground/60",
                  isAnimating && "transform translate-y-1"
                )}
                onClick={scrollDown}
              >
                {nextColor && (
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: nextColor, opacity: 0.6 }}
                  />
                )}
                {next.name}
              </div>
            )}
          </div>
        </div>

        {/* Navigation arrows - subtle */}
        <button
          onClick={scrollUp}
          className="absolute -top-1 left-1/2 -translate-x-1/2 p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Previous index"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          onClick={scrollDown}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Next index"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Counter indicator */}
      <div className="text-[8px] text-muted-foreground/60 mt-1">
        {activeIndex + 1} / {items.length}
      </div>
    </div>
  );
}
