"use client";

import { Skeleton } from "@/components/ui/skeleton";

type ChartSkeletonProps = {
  showToolbar?: boolean;
  showVolume?: boolean;
  className?: string;
};

export function ChartSkeleton({
  showToolbar = true,
  showVolume = true,
  className,
}: ChartSkeletonProps) {
  return (
    <div className={className}>
      {/* Toolbar skeleton */}
      {showToolbar && (
        <div className="flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      )}

      {/* Chart area skeleton */}
      <div className="relative flex-1 p-4">
        {/* Price axis skeleton (right side) */}
        <div className="absolute right-4 top-4 bottom-20 w-16 flex flex-col justify-between">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>

        {/* Candlestick/bars skeleton */}
        <div className="flex items-end gap-1 h-[300px] pr-20">
          {[...Array(40)].map((_, i) => {
            const height = 30 + Math.random() * 200;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <Skeleton
                  className="w-1"
                  style={{ height: `${height}px` }}
                />
              </div>
            );
          })}
        </div>

        {/* Volume skeleton */}
        {showVolume && (
          <div className="flex items-end gap-1 h-[60px] pr-20 mt-2 border-t border-border pt-2">
            {[...Array(40)].map((_, i) => {
              const height = 10 + Math.random() * 40;
              return (
                <Skeleton
                  key={i}
                  className="flex-1"
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        )}

        {/* Time axis skeleton (bottom) */}
        <div className="flex justify-between mt-2 pr-20">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WatchlistSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="p-2 space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

export function OrderPanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>

      <div className="space-y-2 py-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function PositionsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between px-1 py-2 border-b border-border">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChartSkeleton;
