"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET CONTROL PANEL (formerly INDEX CONTROL PANEL)
// A unified, premium trading terminal component combining wheel selector + grid
// Design: Luxury glass morphism with amber/gold accents
// Now generic - works with any asset type (indices, crypto, watchlist, custom)
// ═══════════════════════════════════════════════════════════════════════════════

// Asset item interface for wheel selector
export interface AssetItem {
  symbol: string;
  name: string;
  shortName: string;
  description: string;
}

// Available market indices
export const AVAILABLE_INDICES: AssetItem[] = [
  { symbol: 'SPY', name: 'S&P 500', shortName: 'S&P', description: 'US Large Cap' },
  { symbol: 'QQQ', name: 'NASDAQ 100', shortName: 'NDX', description: 'US Tech' },
  { symbol: 'DIA', name: 'Dow Jones', shortName: 'DOW', description: 'US Blue Chip' },
  { symbol: 'IWM', name: 'Russell 2000', shortName: 'RUT', description: 'US Small Cap' },
  { symbol: 'VIXY', name: 'Volatility', shortName: 'VIXY', description: 'VIX ETF' },
  { symbol: 'VTI', name: 'Total Market', shortName: 'VTI', description: 'All US Stocks' },
  { symbol: 'EFA', name: 'EAFE', shortName: 'EAFE', description: 'Intl Developed' },
  { symbol: 'EEM', name: 'Emerging', shortName: 'EM', description: 'Emerging Mkts' },
  { symbol: 'GLD', name: 'Gold', shortName: 'GLD', description: 'Gold ETF' },
  { symbol: 'TLT', name: 'Treasuries', shortName: 'TLT', description: '20+ Yr Bonds' },
  { symbol: 'XLF', name: 'Financials', shortName: 'XLF', description: 'Financials' },
  { symbol: 'XLE', name: 'Energy', shortName: 'XLE', description: 'Energy' },
  { symbol: 'XLK', name: 'Technology', shortName: 'XLK', description: 'Tech Sector' },
  { symbol: 'XLV', name: 'Healthcare', shortName: 'XLV', description: 'Healthcare' },
];

// Available cryptocurrencies
export const AVAILABLE_CRYPTO: AssetItem[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin', shortName: 'BTC', description: 'Digital Gold' },
  { symbol: 'ETH/USD', name: 'Ethereum', shortName: 'ETH', description: 'Smart Contracts' },
  { symbol: 'SOL/USD', name: 'Solana', shortName: 'SOL', description: 'High Performance' },
  { symbol: 'DOGE/USD', name: 'Dogecoin', shortName: 'DOGE', description: 'Meme Coin' },
  { symbol: 'AVAX/USD', name: 'Avalanche', shortName: 'AVAX', description: 'DeFi Platform' },
  { symbol: 'DOT/USD', name: 'Polkadot', shortName: 'DOT', description: 'Interoperability' },
  { symbol: 'LINK/USD', name: 'Chainlink', shortName: 'LINK', description: 'Oracle Network' },
  { symbol: 'MATIC/USD', name: 'Polygon', shortName: 'MATIC', description: 'L2 Scaling' },
  { symbol: 'UNI/USD', name: 'Uniswap', shortName: 'UNI', description: 'DEX Protocol' },
  { symbol: 'AAVE/USD', name: 'Aave', shortName: 'AAVE', description: 'DeFi Lending' },
  { symbol: 'XRP/USD', name: 'Ripple', shortName: 'XRP', description: 'Payments' },
  { symbol: 'ADA/USD', name: 'Cardano', shortName: 'ADA', description: 'Proof of Stake' },
  { symbol: 'LTC/USD', name: 'Litecoin', shortName: 'LTC', description: 'Silver to BTC' },
  { symbol: 'SHIB/USD', name: 'Shiba Inu', shortName: 'SHIB', description: 'Meme Token' },
];

interface IndexData {
  symbol: string;
  name: string;
  price?: number;
  percentChange?: number;
  color?: string;
}

interface AssetControlPanelProps {
  /** Available assets to show in the wheel selector */
  availableAssets: AssetItem[];
  /** Currently selected asset symbols */
  selectedSymbols: string[];
  /** Active assets with price data */
  activeAssets: IndexData[];
  /** Map of symbol to chart line color */
  symbolColors: Record<string, string>;
  /** Called to add a symbol */
  onAdd: (symbol: string) => void;
  /** Called to remove a symbol */
  onRemove: (symbol: string) => void;
  /** Max symbols allowed (default 12) */
  maxSymbols?: number;
  className?: string;
}

// Backwards compatible alias
type IndexControlPanelProps = Omit<AssetControlPanelProps, 'availableAssets' | 'activeAssets'> & {
  availableAssets?: AssetItem[];
  activeIndices?: IndexData[];
  activeAssets?: IndexData[];
};

export function IndexControlPanel({
  availableAssets = AVAILABLE_INDICES,
  selectedSymbols,
  activeIndices,
  activeAssets,
  symbolColors,
  onAdd,
  onRemove,
  maxSymbols = 12,
  className
}: IndexControlPanelProps) {
  // Use activeAssets if provided, fall back to activeIndices for backwards compatibility
  const assets = activeAssets || activeIndices || [];

  const [currentWheelIndex, setCurrentWheelIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Fire add when navigating to unselected asset
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (availableAssets.length === 0) return;
    const symbol = availableAssets[currentWheelIndex].symbol;
    if (!selectedSymbols.includes(symbol) && selectedSymbols.length < maxSymbols) {
      onAdd(symbol);
    }
  }, [currentWheelIndex, selectedSymbols, maxSymbols, onAdd, availableAssets]);

  // Get visible wheel items
  const wheelItems = useMemo(() => {
    if (availableAssets.length === 0) {
      return { prev: null, current: null, next: null };
    }
    const total = availableAssets.length;
    const prev = (currentWheelIndex - 1 + total) % total;
    const next = (currentWheelIndex + 1) % total;
    return {
      prev: availableAssets[prev],
      current: availableAssets[currentWheelIndex],
      next: availableAssets[next],
    };
  }, [currentWheelIndex, availableAssets]);

  const scrollUp = useCallback(() => {
    if (isAnimating || availableAssets.length === 0) return;
    setIsAnimating(true);
    setCurrentWheelIndex(prev => (prev - 1 + availableAssets.length) % availableAssets.length);
    setTimeout(() => setIsAnimating(false), 180);
  }, [isAnimating, availableAssets.length]);

  const scrollDown = useCallback(() => {
    if (isAnimating || availableAssets.length === 0) return;
    setIsAnimating(true);
    setCurrentWheelIndex(prev => (prev + 1) % availableAssets.length);
    setTimeout(() => setIsAnimating(false), 180);
  }, [isAnimating, availableAssets.length]);

  // Mouse wheel handling
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.deltaY > 0 ? scrollDown() : scrollUp();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [scrollUp, scrollDown]);

  const currentColor = wheelItems.current ? (symbolColors[wheelItems.current.symbol] || '#f59e0b') : '#f59e0b';
  const isCurrentSelected = wheelItems.current ? selectedSymbols.includes(wheelItems.current.symbol) : false;

  // Build grid slots (12 slots, filled with active assets)
  const gridSlots = useMemo(() => {
    const slots: (IndexData | null)[] = [];
    for (let i = 0; i < 12; i++) {
      slots.push(assets[i] || null);
    }
    return slots;
  }, [assets]);

  // Early return for empty state
  if (availableAssets.length === 0 || !wheelItems.current) {
    return (
      <div className={cn("relative", className)}>
        <div className="relative flex items-center rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
          <div className="relative z-10 p-6 text-center text-white/50 text-sm">
            No assets available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Main container - unified glass panel */}
      <div className="relative flex items-center rounded-xl overflow-hidden">
        {/* Ambient glow layer */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 100% at 10% 50%, ${currentColor}25 0%, transparent 50%),
                         radial-gradient(ellipse 80% 60% at 50% 100%, ${currentColor}15 0%, transparent 40%)`,
          }}
        />

        {/* Glass background */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

        {/* Refined border with subtle gradient */}
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

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* WHEEL SELECTOR */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div
          ref={wheelRef}
          className="relative flex flex-col items-center w-[110px] cursor-ns-resize select-none shrink-0"
          style={{ height: '114px' }} /* Match grid height: 2 rows × 54px + 6px gap */
        >
          {/* Wheel glow */}
          <div
            className="absolute inset-2 rounded-lg transition-all duration-300"
            style={{
              background: `radial-gradient(ellipse at center, ${currentColor}20 0%, transparent 70%)`,
              filter: 'blur(8px)',
            }}
          />

          {/* Upper half - grows to push name to center */}
          <div className="flex-1 flex flex-col items-center justify-end pb-2">
            {/* Navigation: Up */}
            <button
              onClick={scrollUp}
              className="relative z-10 p-0.5 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Previous index"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>

            {/* Previous item */}
            <button
              onClick={scrollUp}
              className={cn(
                "relative z-10 text-[10px] text-white/25 font-medium transition-all duration-200",
                "hover:text-white/40",
                isAnimating && "transform -translate-y-0.5 opacity-50"
              )}
            >
              {wheelItems.prev.shortName}
            </button>
          </div>

          {/* CENTER LINE - Asset name sits exactly on the seam */}
          <button
            onClick={() => {
              if (isCurrentSelected) {
                onRemove(wheelItems.current.symbol);
              } else if (selectedSymbols.length < maxSymbols) {
                onAdd(wheelItems.current.symbol);
              }
            }}
            className={cn(
              "relative z-10 flex items-center gap-1.5 px-2 py-0.5 rounded transition-all duration-200 shrink-0 mt-1",
              "hover:bg-white/5",
              isCurrentSelected && "bg-white/5"
            )}
          >
            {/* Color indicator */}
            <div
              className="h-2 w-2 rounded-full transition-all duration-300 shrink-0"
              style={{
                backgroundColor: isCurrentSelected ? currentColor : 'rgba(255,255,255,0.2)',
                boxShadow: isCurrentSelected ? `0 0 6px ${currentColor}` : 'none',
              }}
            />
            {/* Asset Name - THE CENTER POINT */}
            <span className="text-[11px] font-semibold text-white tracking-wide">
              {wheelItems.current.name}
            </span>
          </button>

          {/* Lower half - grows to balance upper */}
          <div className="flex-1 flex flex-col items-center justify-start pt-0.5">
            {/* Description */}
            <span className="text-[9px] text-white/35 font-medium">
              {wheelItems.current.description}
            </span>

            {/* Next item */}
            <button
              onClick={scrollDown}
              className={cn(
                "relative z-10 text-[10px] text-white/25 font-medium mt-1 transition-all duration-200",
                "hover:text-white/40",
                isAnimating && "transform translate-y-0.5 opacity-50"
              )}
            >
              {wheelItems.next.shortName}
            </button>

            {/* Navigation: Down */}
            <button
              onClick={scrollDown}
              className="relative z-10 p-0.5 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Next index"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {/* Counter */}
            <div className="relative z-10 text-[8px] text-white/20 font-medium tracking-wider">
              {currentWheelIndex + 1}/{availableAssets.length}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DIVIDER */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-px shrink-0 my-3">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/8 to-transparent" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* GRID DISPLAY - 6 columns x 2 rows */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 py-3 px-3 relative z-10 flex items-center justify-center">
          <div
            className="grid gap-1.5 w-full"
            style={{
              gridTemplateColumns: 'repeat(6, 1fr)',
              gridTemplateRows: 'repeat(2, 54px)',
            }}
          >
            {gridSlots.map((slot, idx) => (
              <GridCell
                key={slot?.symbol || `empty-${idx}`}
                data={slot}
                onRemove={slot ? () => onRemove(slot.symbol) : undefined}
                adjacentColors={getAdjacentColors(gridSlots, idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRID CELL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function GridCell({
  data,
  onRemove,
  adjacentColors
}: {
  data: IndexData | null;
  onRemove?: () => void;
  adjacentColors: string[];
}) {
  if (data) {
    // ─── ACTIVE CELL ───
    const color = data.color || '#f59e0b';
    const isPositive = (data.percentChange ?? 0) >= 0;

    return (
      <button
        onClick={onRemove}
        className="group relative h-[54px] rounded-lg overflow-hidden transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
      >
        {/* Backlit glow */}
        <div
          className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity duration-200"
          style={{
            background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${color}50 0%, transparent 60%)`,
            filter: 'blur(6px)',
          }}
        />

        {/* Glass surface */}
        <div
          className="absolute inset-0 backdrop-blur-sm rounded-lg"
          style={{
            background: `linear-gradient(180deg, ${color}15 0%, ${color}08 100%)`,
            border: `1px solid ${color}35`,
          }}
        />

        {/* Top shine */}
        <div
          className="absolute top-0 left-2 right-2 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }}
        />

        {/* Color indicator bar - left edge */}
        <div
          className="absolute top-1 bottom-1 left-0 w-[3px] rounded-r-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />

        {/* Remove X (on hover) */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <X className="h-3 w-3 text-white/40 hover:text-white/80" />
        </div>

        {/* Content - Name on top, Price | % below */}
        <div className="relative z-10 flex flex-col items-start justify-center h-full pl-3 pr-2">
          {/* Asset Name - Top */}
          <span className="text-[9px] font-medium text-white/60 leading-tight truncate max-w-full">
            {data.name.length > 12 ? data.name.split(' ')[0] : data.name}
          </span>
          {/* Price | % Change - Bottom row */}
          <div className="flex items-baseline gap-1 mt-0.5">
            {data.price !== undefined && (
              <span className="text-[13px] font-bold text-white leading-none tabular-nums">
                {data.price >= 1000 ? data.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : data.price >= 100 ? data.price.toFixed(1)
                  : data.price.toFixed(2)}
              </span>
            )}
            {data.price !== undefined && data.percentChange !== undefined && (
              <span className="text-[11px] text-white/30 font-light">|</span>
            )}
            {data.percentChange !== undefined && (
              <span
                className="text-[13px] font-bold leading-none tabular-nums"
                style={{ color: isPositive ? '#4ade80' : '#f87171' }}
              >
                {isPositive ? '▲' : '▼'}{Math.abs(data.percentChange).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  // ─── EMPTY CELL ───
  const hasAdjacentGlow = adjacentColors.length > 0;

  return (
    <div className="relative h-[54px] rounded-lg overflow-hidden">
      {/* Subtle shimmer from adjacent */}
      {hasAdjacentGlow && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, ${adjacentColors[0]}30 0%, transparent 70%)`,
            filter: 'blur(6px)',
          }}
        />
      )}

      {/* Empty glass */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      />

      {/* Subtle top shine */}
      <div className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

// Helper: get colors of adjacent filled cells
function getAdjacentColors(slots: (IndexData | null)[], idx: number): string[] {
  const cols = 6;
  const row = Math.floor(idx / cols);
  const col = idx % cols;
  const colors: string[] = [];

  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of neighbors) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 2 && nc >= 0 && nc < cols) {
      const ni = nr * cols + nc;
      if (slots[ni]?.color) colors.push(slots[ni]!.color!);
    }
  }
  return colors;
}
