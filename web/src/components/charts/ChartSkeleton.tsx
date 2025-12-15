"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ChartSkeletonProps = {
  showToolbar?: boolean;
  showVolume?: boolean;
  className?: string;
};

// Pre-calculated bar heights for consistent rendering (no Math.random for SSR)
const BAR_HEIGHTS = [
  { height: 180, bullish: true }, { height: 140, bullish: false }, { height: 190, bullish: true },
  { height: 160, bullish: true }, { height: 120, bullish: false }, { height: 170, bullish: false },
  { height: 200, bullish: true }, { height: 150, bullish: true }, { height: 130, bullish: false },
  { height: 185, bullish: true }, { height: 145, bullish: false }, { height: 175, bullish: true },
  { height: 155, bullish: true }, { height: 125, bullish: false }, { height: 195, bullish: true },
  { height: 165, bullish: false }, { height: 135, bullish: true }, { height: 180, bullish: true },
  { height: 150, bullish: false }, { height: 170, bullish: true }, { height: 140, bullish: false },
  { height: 190, bullish: true }, { height: 160, bullish: true }, { height: 130, bullish: false },
  { height: 175, bullish: true }, { height: 145, bullish: false }, { height: 185, bullish: true },
  { height: 155, bullish: true }, { height: 120, bullish: false }, { height: 200, bullish: true },
  { height: 165, bullish: false }, { height: 175, bullish: true }, { height: 145, bullish: true },
  { height: 135, bullish: false }, { height: 180, bullish: true }, { height: 160, bullish: false },
  { height: 190, bullish: true }, { height: 150, bullish: true }, { height: 170, bullish: false },
  { height: 185, bullish: true },
];

const VOLUME_HEIGHTS = [
  35, 25, 40, 30, 20, 45, 35, 25, 30, 40, 20, 35, 45, 25, 30, 40, 35, 25, 45, 30,
  20, 35, 40, 25, 30, 45, 35, 20, 40, 30, 25, 35, 45, 30, 40, 20, 35, 25, 30, 40,
];

export function ChartSkeleton({
  showToolbar = true,
  showVolume = true,
  className,
}: ChartSkeletonProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar skeleton - matches ChartToolbar structure */}
      {showToolbar && (
        <div className="flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center gap-3">
            {/* Symbol badge */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Price display */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-14 bg-green-500/20" />
            </div>
          </div>
          {/* Timeframe selector */}
          <div className="flex items-center gap-1">
            {['1D', '1W', '1M', '3M', '1Y'].map((tf, i) => (
              <Skeleton
                key={tf}
                className={cn(
                  "h-7 w-10 rounded-md",
                  i === 0 && "bg-primary/30"
                )}
              />
            ))}
          </div>
          {/* Chart controls */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      )}

      {/* Chart area with price axis */}
      <div className="flex-1 flex min-h-0">
        {/* Main chart */}
        <div className="flex-1 relative p-4 overflow-hidden">
          {/* Candlestick bars with color coding */}
          <div className="flex items-end gap-0.5 h-full pb-8">
            {BAR_HEIGHTS.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                {/* Wick top */}
                <Skeleton
                  className={cn(
                    "w-px",
                    bar.bullish ? "bg-green-500/30" : "bg-red-500/30"
                  )}
                  style={{ height: `${bar.height * 0.15}px` }}
                />
                {/* Body */}
                <Skeleton
                  className={cn(
                    "w-2",
                    bar.bullish ? "bg-green-500/40" : "bg-red-500/40"
                  )}
                  style={{ height: `${bar.height * 0.6}px` }}
                />
                {/* Wick bottom */}
                <Skeleton
                  className={cn(
                    "w-px",
                    bar.bullish ? "bg-green-500/30" : "bg-red-500/30"
                  )}
                  style={{ height: `${bar.height * 0.25}px` }}
                />
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-4 right-16 flex justify-between">
            {['9:30', '10:00', '11:00', '12:00', '13:00', '14:00'].map((time, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>

        {/* Price axis (right side) */}
        <div className="w-16 border-l border-border flex flex-col justify-between py-4 px-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
      </div>

      {/* Volume section */}
      {showVolume && (
        <div className="h-16 border-t border-border flex">
          <div className="flex-1 flex items-end gap-0.5 px-4 py-2">
            {VOLUME_HEIGHTS.map((height, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "flex-1",
                  BAR_HEIGHTS[i]?.bullish ? "bg-green-500/20" : "bg-red-500/20"
                )}
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
          <div className="w-16 border-l border-border" />
        </div>
      )}
    </div>
  );
}

/**
 * Compact watchlist skeleton for sidebar
 * High-fidelity: matches actual watchlist item structure with mini chart
 */
export function WatchlistSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="p-2 space-y-1">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between p-2 rounded-lg",
            i === 0 && "bg-muted/50"
          )}
        >
          <div className="flex items-center gap-2">
            {/* Selection indicator */}
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              i === 0 ? "bg-primary" : "bg-transparent"
            )} />
            <div className="space-y-1">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          {/* Price and change */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className={cn(
              "h-4 w-12",
              i % 2 === 0 ? "bg-green-500/20" : "bg-red-500/20"
            )} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Order panel skeleton - matches trading order form structure
 * High-fidelity: includes symbol header, order type tabs, quantity input,
 * price input with slider, order summary, and action button
 */
export function OrderPanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Symbol header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-20 bg-green-500/20" />
      </div>

      {/* Order type tabs - Buy/Sell */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg">
        <Skeleton className="h-9 rounded-md bg-green-500/30" />
        <Skeleton className="h-9 rounded-md" />
      </div>

      {/* Order type selector */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Quantity input */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <div className="flex gap-1">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
        {/* Quick amount buttons */}
        <div className="flex gap-2">
          {['25%', '50%', '75%', '100%'].map((pct) => (
            <Skeleton key={pct} className="h-7 flex-1 rounded" />
          ))}
        </div>
      </div>

      {/* Price input (for limit orders) */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-10 w-full rounded-lg" />
        {/* Price slider */}
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Order summary */}
      <div className="space-y-2 p-3 rounded-lg bg-muted/30">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="h-px bg-border my-1" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Submit button */}
      <Skeleton className="h-12 w-full rounded-xl bg-green-500/30" />
    </div>
  );
}

/**
 * Positions skeleton - matches PositionCard structure
 * High-fidelity: includes header with tabs, individual position cards
 */
export function PositionsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {/* Header with Active/History tabs */}
      <div className="flex justify-between items-center px-1 py-2">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-lg bg-muted" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Position cards */}
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-border space-y-2">
          {/* Top row: Symbol and current value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className={cn(
                "h-4 w-10 rounded-full",
                i % 2 === 0 ? "bg-green-500/20" : "bg-red-500/20"
              )} />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
          {/* Bottom row: Quantity/cost and P&L */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className={cn(
                "h-4 w-14",
                i % 2 === 0 ? "bg-green-500/25" : "bg-red-500/25"
              )} />
              <Skeleton className={cn(
                "h-3 w-10",
                i % 2 === 0 ? "bg-green-500/15" : "bg-red-500/15"
              )} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChartSkeleton;
