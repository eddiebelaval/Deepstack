"use client";

import React from 'react';
import { cn } from '@/lib/utils';

// ===============================================================================
// CATEGORY TICKER BUTTONS
// A glass morphism button grid for displaying tickers within a selected category
// Design: Luxury glass with backlit glows and color indicators
// Usage: Market watcher - replaces 6x2 grid when scrolling through categories
// ===============================================================================

export interface CategoryTickerButtonsProps {
  /** Ticker symbols to display as buttons */
  symbols: string[];
  /** Currently active symbols (shown on chart) */
  activeSymbols: string[];
  /** Map of symbol to chart line color */
  symbolColors: Record<string, string>;
  /** Real-time price data for symbols */
  priceData: Record<string, { price: number; percentChange: number }>;
  /** Called when a ticker is clicked (toggle on/off) */
  onToggle: (symbol: string) => void;
  /** Category color for theming */
  categoryColor?: string;
  className?: string;
}

export function CategoryTickerButtons({
  symbols,
  activeSymbols,
  symbolColors,
  priceData,
  onToggle,
  categoryColor = '#f59e0b',
  className
}: CategoryTickerButtonsProps) {
  // Empty state
  if (symbols.length === 0) {
    return (
      <div className={cn("relative rounded-xl overflow-hidden", className)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
        <div className="relative z-10 p-6 text-center text-white/50 text-sm">
          No tickers in this category
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-xl overflow-hidden", className)}>
      {/* Ambient category glow */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${categoryColor}20 0%, transparent 40%)`,
        }}
      />

      {/* Glass background */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

      {/* Border with subtle gradient */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05),
                      inset 0 -1px 0 rgba(0,0,0,0.3),
                      0 4px 24px rgba(0,0,0,0.4)`,
        }}
      />

      {/* Top highlight line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Button Grid - Responsive: 3-5 buttons per row depending on count */}
      <div className="relative z-10 p-4">
        <div
          className="grid gap-2 w-full"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(${symbols.length <= 4 ? '120px' : '100px'}, 1fr))`,
          }}
        >
          {symbols.map((symbol) => {
            const isActive = activeSymbols.includes(symbol);
            const color = symbolColors[symbol] || categoryColor;
            const data = priceData[symbol];
            const isPositive = (data?.percentChange ?? 0) >= 0;

            return (
              <TickerButton
                key={symbol}
                symbol={symbol}
                price={data?.price}
                percentChange={data?.percentChange}
                isActive={isActive}
                color={color}
                isPositive={isPositive}
                onClick={() => onToggle(symbol)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===============================================================================
// TICKER BUTTON COMPONENT
// Individual button for each ticker with glass morphism and backlit glow
// ===============================================================================

interface TickerButtonProps {
  symbol: string;
  price?: number;
  percentChange?: number;
  isActive: boolean;
  color: string;
  isPositive: boolean;
  onClick: () => void;
}

function TickerButton({
  symbol,
  price,
  percentChange,
  isActive,
  color,
  isPositive,
  onClick
}: TickerButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
      style={{ minHeight: '68px' }}
    >
      {/* Backlit glow - stronger when active */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isActive ? "opacity-70" : "opacity-0 group-hover:opacity-40"
        )}
        style={{
          background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${color}60 0%, transparent 65%)`,
          filter: 'blur(8px)',
        }}
      />

      {/* Glass surface */}
      <div
        className="absolute inset-0 backdrop-blur-sm rounded-lg transition-all duration-200"
        style={{
          background: isActive
            ? `linear-gradient(180deg, ${color}18 0%, ${color}10 100%)`
            : 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          border: isActive ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
          boxShadow: isActive ? `inset 0 0 0 1px ${color}30` : undefined,
        }}
      />

      {/* Top shine */}
      <div
        className="absolute top-0 left-2 right-2 h-px"
        style={{
          background: isActive
            ? `linear-gradient(90deg, transparent, ${color}60, transparent)`
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)'
        }}
      />

      {/* Color indicator bar - left edge (active only) */}
      {isActive && (
        <div
          className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}, 0 0 4px ${color}`,
          }}
        />
      )}

      {/* Content - stacked vertically */}
      <div className={cn(
        "relative z-10 flex flex-col items-start justify-center h-full px-3 py-2",
        isActive && "pl-4"
      )}>
        {/* Symbol - Bold, white */}
        <span className="text-[11px] font-bold text-white leading-tight tracking-wide mb-1">
          {symbol}
        </span>

        {/* Price */}
        {price !== undefined ? (
          <span className="text-[13px] font-semibold text-white leading-none tabular-nums">
            ${price >= 1000
              ? price.toLocaleString('en-US', { maximumFractionDigits: 0 })
              : price >= 100
              ? price.toFixed(1)
              : price.toFixed(2)}
          </span>
        ) : (
          <span className="text-[13px] font-semibold text-white/40 leading-none">
            --
          </span>
        )}

        {/* Percent Change */}
        {percentChange !== undefined ? (
          <span
            className="text-[11px] font-bold leading-none tabular-nums mt-0.5"
            style={{ color: isPositive ? '#4ade80' : '#f87171' }}
          >
            {isPositive ? '▲' : '▼'}{Math.abs(percentChange).toFixed(2)}%
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-white/30 leading-none mt-0.5">
            --
          </span>
        )}
      </div>
    </button>
  );
}
