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

interface IndexScrollWheelProps {
  selectedSymbols: string[];
  onSelect: (symbol: string) => void;
  /** Called when the wheel navigates to a new index (for auto-adding to chart) */
  onNavigate?: (symbol: string) => void;
  /** Map of symbol to its assigned color in the chart */
  symbolColors?: Record<string, string>;
  className?: string;
}

export function IndexScrollWheel({ selectedSymbols, onSelect, onNavigate, symbolColors = {}, className }: IndexScrollWheelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Fire onNavigate when currentIndex changes (after initial render)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (onNavigate) {
      onNavigate(AVAILABLE_INDICES[currentIndex].symbol);
    }
  }, [currentIndex, onNavigate]);

  // Get current and adjacent items for display
  const getVisibleItems = useCallback(() => {
    const total = AVAILABLE_INDICES.length;
    const prevIndex = (currentIndex - 1 + total) % total;
    const nextIndex = (currentIndex + 1) % total;

    return {
      prev: AVAILABLE_INDICES[prevIndex],
      current: AVAILABLE_INDICES[currentIndex],
      next: AVAILABLE_INDICES[nextIndex],
    };
  }, [currentIndex]);

  const scrollUp = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + AVAILABLE_INDICES.length) % AVAILABLE_INDICES.length);
    setTimeout(() => setIsAnimating(false), 200);
  }, [isAnimating]);

  const scrollDown = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % AVAILABLE_INDICES.length);
    setTimeout(() => setIsAnimating(false), 200);
  }, [isAnimating]);

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
  const isSelected = selectedSymbols.includes(current.symbol);
  const currentColor = symbolColors[current.symbol];
  const prevColor = symbolColors[prev.symbol];
  const nextColor = symbolColors[next.symbol];

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

            {/* Current item (highlighted) */}
            <button
              onClick={() => onSelect(current.symbol)}
              className={cn(
                "flex flex-col items-center py-1.5 px-3 rounded-lg transition-all duration-200",
                "hover:bg-primary/10",
                isSelected && "bg-primary/15"
              )}
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
                <span className="text-xs font-bold text-foreground leading-tight">
                  {current.name}
                </span>
              </div>
              <span className="text-[8px] text-muted-foreground leading-tight">
                {current.description}
              </span>
              {/* Selection indicator - uses the index color when selected */}
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
            </button>

            {/* Next item (dimmed) */}
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
        {currentIndex + 1} / {AVAILABLE_INDICES.length}
      </div>
    </div>
  );
}
