'use client';

import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Briefcase, Bell, FileText } from 'lucide-react';

/**
 * Chart skeleton - mimics candlestick chart loading
 */
export function ChartSkeleton({ className }: { className?: string }) {
  // Pre-calculated heights for chart bars
  const barHeights = [
    { wick1: 35, body: 25, wick2: 20 },
    { wick1: 45, body: 30, wick2: 15 },
    { wick1: 30, body: 20, wick2: 25 },
    { wick1: 50, body: 35, wick2: 10 },
    { wick1: 40, body: 25, wick2: 20 },
    { wick1: 35, body: 30, wick2: 15 },
    { wick1: 45, body: 20, wick2: 25 },
    { wick1: 30, body: 35, wick2: 20 },
    { wick1: 55, body: 25, wick2: 10 },
    { wick1: 40, body: 30, wick2: 15 },
    { wick1: 35, body: 20, wick2: 25 },
    { wick1: 45, body: 35, wick2: 20 },
    { wick1: 30, body: 25, wick2: 15 },
    { wick1: 50, body: 30, wick2: 10 },
    { wick1: 40, body: 20, wick2: 25 },
    { wick1: 35, body: 35, wick2: 20 },
    { wick1: 45, body: 25, wick2: 15 },
    { wick1: 30, body: 30, wick2: 10 },
    { wick1: 55, body: 20, wick2: 25 },
    { wick1: 40, body: 35, wick2: 20 },
  ];

  return (
    <div className={cn('flex flex-col h-full p-4', className)}>
      {/* Header with symbol */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Chart area - fake candlesticks */}
      <div className="flex-1 flex items-end justify-around gap-1 pb-4 px-4">
        {barHeights.map((heights, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Skeleton className="w-1" style={{ height: `${heights.wick1}%` }} />
            <Skeleton className="w-2" style={{ height: `${heights.body}%` }} />
            <Skeleton className="w-1" style={{ height: `${heights.wick2}%` }} />
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-12" />
        ))}
      </div>
    </div>
  );
}

/**
 * Portfolio position skeleton
 */
export function PositionSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}

/**
 * Portfolio panel skeleton
 */
export function PortfolioSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      {/* Position list */}
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <PositionSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Watchlist skeleton
 */
export function WatchlistSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2 p-4', className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * News item skeleton
 */
export function NewsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 pb-4 border-b border-border">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
interface EmptyStateProps {
  icon?: 'chart' | 'portfolio' | 'alerts' | 'news' | 'trending';
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const ICONS = {
  chart: BarChart3,
  portfolio: Briefcase,
  alerts: Bell,
  news: FileText,
  trending: TrendingUp,
};

export function EmptyState({
  icon = 'chart',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = ICONS[icon];

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[200px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Market closed state
 */
export function MarketClosedState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon="chart"
      title="Market Closed"
      description="US markets are closed. Displaying last available data."
      className={className}
    />
  );
}

/**
 * No positions state
 */
export function NoPositionsState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon="portfolio"
      title="No Positions"
      description="Start trading to build your portfolio."
      className={className}
    />
  );
}

/**
 * No alerts state
 */
export function NoAlertsState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon="alerts"
      title="No Price Alerts"
      description="Set alerts to get notified when prices hit your targets."
      className={className}
    />
  );
}

/**
 * Empty watchlist state
 */
export function EmptyWatchlistState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon="trending"
      title="Empty Watchlist"
      description="Add symbols to track your favorite stocks."
      className={className}
    />
  );
}

/**
 * Loading spinner
 */
export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary/20 border-t-primary',
        sizes[size],
        className
      )}
    />
  );
}

/**
 * Full panel loading state
 */
export function PanelLoading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center h-full', className)}>
      <LoadingSpinner size="md" />
    </div>
  );
}
