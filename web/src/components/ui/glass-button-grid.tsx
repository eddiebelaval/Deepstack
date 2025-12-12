"use client";

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// Index display info
interface IndexInfo {
  symbol: string;
  name: string;
  price?: number;
  percentChange?: number;
  color?: string;
}

interface GlassButtonGridProps {
  /** Currently active indices with their data */
  activeIndices: IndexInfo[];
  /** Called when user clicks to remove an index */
  onRemove: (symbol: string) => void;
  /** Called when user clicks an empty slot (optional - for adding) */
  onEmptyClick?: () => void;
  /** Total grid slots (default 12 = 6x2) */
  totalSlots?: number;
  /** Columns in grid (default 6) */
  columns?: number;
  className?: string;
}

export function GlassButtonGrid({
  activeIndices,
  onRemove,
  onEmptyClick,
  totalSlots = 12,
  columns = 6,
  className
}: GlassButtonGridProps) {
  // Create array of slots - filled with active indices, rest are empty
  const slots = useMemo(() => {
    const result: (IndexInfo | null)[] = [];
    for (let i = 0; i < totalSlots; i++) {
      result.push(activeIndices[i] || null);
    }
    return result;
  }, [activeIndices, totalSlots]);

  // Calculate which empty slots are adjacent to lit ones (for shimmer effect)
  const getAdjacentLitCount = (index: number): number => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    let count = 0;

    // Check all 8 neighbors
    const neighbors = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of neighbors) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < Math.ceil(totalSlots / columns) &&
          newCol >= 0 && newCol < columns) {
        const neighborIndex = newRow * columns + newCol;
        if (neighborIndex < totalSlots && slots[neighborIndex] !== null) {
          count++;
        }
      }
    }
    return count;
  };

  // Get colors of adjacent lit buttons for shimmer
  const getAdjacentColors = (index: number): string[] => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const colors: string[] = [];

    const neighbors = [
      [-1, 0], [0, -1], [0, 1], [1, 0]
    ];

    for (const [dr, dc] of neighbors) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < Math.ceil(totalSlots / columns) &&
          newCol >= 0 && newCol < columns) {
        const neighborIndex = newRow * columns + newCol;
        if (neighborIndex < totalSlots && slots[neighborIndex]?.color) {
          colors.push(slots[neighborIndex]!.color!);
        }
      }
    }
    return colors;
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`
        }}
      >
        {slots.map((slot, index) => {
          const adjacentLit = getAdjacentLitCount(index);
          const adjacentColors = getAdjacentColors(index);

          if (slot) {
            // Active/Lit button
            return (
              <LitButton
                key={slot.symbol}
                index={slot}
                onRemove={() => onRemove(slot.symbol)}
              />
            );
          } else {
            // Empty/Off button
            return (
              <OffButton
                key={`empty-${index}`}
                adjacentLitCount={adjacentLit}
                adjacentColors={adjacentColors}
                onClick={onEmptyClick}
              />
            );
          }
        })}
      </div>
    </div>
  );
}

// Lit (active) button component
function LitButton({
  index,
  onRemove
}: {
  index: IndexInfo;
  onRemove: () => void;
}) {
  const isPositive = (index.percentChange ?? 0) >= 0;
  const color = index.color || '#f59e0b'; // Default amber if no color

  return (
    <button
      onClick={onRemove}
      className={cn(
        "group relative flex flex-col items-center justify-center",
        "h-[42px] rounded-md overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.02] active:scale-[0.98]"
      )}
      style={{
        // Glass background with color tint
        background: `linear-gradient(135deg, ${color}15 0%, ${color}08 50%, transparent 100%)`,
      }}
    >
      {/* Backlit glow effect */}
      <div
        className="absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-80"
        style={{
          background: `radial-gradient(ellipse at center bottom, ${color}40 0%, ${color}15 40%, transparent 70%)`,
          filter: 'blur(8px)',
        }}
      />

      {/* Glass border with color */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          border: `1px solid ${color}40`,
          boxShadow: `0 0 20px ${color}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      />

      {/* Inner glass surface */}
      <div className="absolute inset-[1px] rounded-lg backdrop-blur-sm bg-background/30" />

      {/* Color indicator dot */}
      <div
        className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />

      {/* Remove button (appears on hover) */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-2">
        <span className="text-[10px] font-semibold text-foreground truncate max-w-full">
          {index.name}
        </span>
        {index.percentChange !== undefined && (
          <span
            className={cn(
              "text-[9px] font-medium",
              isPositive ? "text-green-400" : "text-red-400"
            )}
          >
            {isPositive ? '▲' : '▼'}{Math.abs(index.percentChange).toFixed(2)}%
          </span>
        )}
      </div>
    </button>
  );
}

// Off (empty) button component
function OffButton({
  adjacentLitCount,
  adjacentColors,
  onClick
}: {
  adjacentLitCount: number;
  adjacentColors: string[];
  onClick?: () => void;
}) {
  // Calculate shimmer intensity based on adjacent lit buttons
  const shimmerIntensity = Math.min(adjacentLitCount * 0.08, 0.3);

  // Create gradient from adjacent colors
  const shimmerGradient = adjacentColors.length > 0
    ? `radial-gradient(ellipse at center, ${adjacentColors.map(c => `${c}${Math.round(shimmerIntensity * 255).toString(16).padStart(2, '0')}`).join(', ')}, transparent 70%)`
    : 'none';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative flex items-center justify-center",
        "h-[42px] rounded-md overflow-hidden",
        "transition-all duration-500 ease-out",
        onClick && "hover:bg-white/5 cursor-pointer",
        !onClick && "cursor-default"
      )}
    >
      {/* Base dark glass */}
      <div className="absolute inset-0 rounded-lg bg-white/[0.02] backdrop-blur-sm" />

      {/* Shimmer effect from adjacent lit buttons */}
      {adjacentLitCount > 0 && (
        <div
          className="absolute inset-0 rounded-lg transition-opacity duration-700"
          style={{
            background: shimmerGradient,
            opacity: shimmerIntensity,
            filter: 'blur(12px)',
          }}
        />
      )}

      {/* Subtle glass border */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          border: '1px solid rgba(255,255,255,0.03)',
          boxShadow: adjacentLitCount > 0
            ? `inset 0 0 15px rgba(255,255,255,${shimmerIntensity * 0.1})`
            : 'none',
        }}
      />

      {/* Inner reflection line */}
      <div className="absolute inset-[1px] rounded-lg">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* Plus icon hint (very subtle) */}
      {onClick && (
        <div className="relative z-10 text-white/10 text-lg font-light">+</div>
      )}
    </button>
  );
}
