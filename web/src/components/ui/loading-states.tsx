'use client';

import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Briefcase, Bell, FileText, Cloud, Clock, RefreshCw } from 'lucide-react';

/**
 * Chart skeleton - mimics candlestick chart loading
 * High-fidelity: matches TradingViewChart structure with toolbar, price axis, and volume
 */
export function ChartSkeleton({ className }: { className?: string }) {
  // Pre-calculated heights for chart bars - creates realistic candlestick pattern
  const barHeights = [
    { wick1: 35, body: 25, wick2: 20, bullish: true },
    { wick1: 45, body: 30, wick2: 15, bullish: false },
    { wick1: 30, body: 20, wick2: 25, bullish: true },
    { wick1: 50, body: 35, wick2: 10, bullish: true },
    { wick1: 40, body: 25, wick2: 20, bullish: false },
    { wick1: 35, body: 30, wick2: 15, bullish: false },
    { wick1: 45, body: 20, wick2: 25, bullish: true },
    { wick1: 30, body: 35, wick2: 20, bullish: true },
    { wick1: 55, body: 25, wick2: 10, bullish: true },
    { wick1: 40, body: 30, wick2: 15, bullish: false },
    { wick1: 35, body: 20, wick2: 25, bullish: true },
    { wick1: 45, body: 35, wick2: 20, bullish: true },
    { wick1: 30, body: 25, wick2: 15, bullish: false },
    { wick1: 50, body: 30, wick2: 10, bullish: true },
    { wick1: 40, body: 20, wick2: 25, bullish: false },
    { wick1: 35, body: 35, wick2: 20, bullish: true },
    { wick1: 45, body: 25, wick2: 15, bullish: true },
    { wick1: 30, body: 30, wick2: 10, bullish: false },
    { wick1: 55, body: 20, wick2: 25, bullish: true },
    { wick1: 40, body: 35, wick2: 20, bullish: true },
  ];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar - matches ChartToolbar structure */}
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
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
        {/* Timeframe selector */}
        <div className="flex items-center gap-1">
          {['1D', '1W', '1M', '3M', '1Y'].map((tf) => (
            <Skeleton key={tf} className="h-7 w-10 rounded-md" />
          ))}
        </div>
        {/* Chart controls */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* Chart area with price axis */}
      <div className="flex-1 flex">
        {/* Main chart */}
        <div className="flex-1 relative p-4">
          {/* Chart area - fake candlesticks with color coding */}
          <div className="flex items-end justify-around gap-1 h-full pb-8">
            {barHeights.map((heights, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                <Skeleton
                  className={cn("w-0.5", heights.bullish ? "bg-green-500/30" : "bg-red-500/30")}
                  style={{ height: `${heights.wick1}%` }}
                />
                <Skeleton
                  className={cn("w-2", heights.bullish ? "bg-green-500/40" : "bg-red-500/40")}
                  style={{ height: `${heights.body}%` }}
                />
                <Skeleton
                  className={cn("w-0.5", heights.bullish ? "bg-green-500/30" : "bg-red-500/30")}
                  style={{ height: `${heights.wick2}%` }}
                />
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-16 flex justify-between px-4">
            {['9:30', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((time, i) => (
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
      <div className="h-16 border-t border-border flex">
        <div className="flex-1 flex items-end justify-around gap-1 px-4 py-2">
          {barHeights.map((heights, i) => (
            <Skeleton
              key={i}
              className={cn("flex-1", heights.bullish ? "bg-green-500/20" : "bg-red-500/20")}
              style={{ height: `${20 + heights.body}%` }}
            />
          ))}
        </div>
        <div className="w-16 border-l border-border" />
      </div>
    </div>
  );
}

/**
 * Portfolio position skeleton - matches PositionCard structure
 * High-fidelity: includes symbol badge, quantity, P&L with colors
 */
export function PositionSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border space-y-2">
      {/* Top row: Symbol and current value */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Symbol badge */}
          <Skeleton className="h-5 w-12 rounded" />
          {/* Direction badge */}
          <Skeleton className="h-4 w-10 rounded-full bg-green-500/20" />
        </div>
        {/* Current value */}
        <Skeleton className="h-5 w-20" />
      </div>
      {/* Bottom row: Quantity/avg cost and P&L */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        {/* P&L with color */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-14 bg-green-500/20" />
          <Skeleton className="h-3 w-12 bg-green-500/15" />
        </div>
      </div>
    </div>
  );
}

/**
 * Portfolio panel skeleton - matches PortfolioSidebar structure
 * High-fidelity: includes header with sync status, account summary card,
 * tabs, and position list
 */
export function PortfolioSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - matches actual header structure */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            {/* Cloud sync icon */}
            <Cloud className="h-3 w-3 text-muted-foreground/30" />
          </div>
          {/* Refresh button */}
          <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
            <RefreshCw className="h-4 w-4 text-muted-foreground/30" />
          </div>
        </div>
        {/* Last update indicator */}
        <div className="flex items-center gap-1 mt-1">
          <Clock className="h-3 w-3 text-muted-foreground/30" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Account Summary Card */}
        <div className="p-4 rounded-lg border border-border space-y-3">
          {/* Portfolio Value */}
          <div>
            <Skeleton className="h-2.5 w-20 mb-1" />
            <Skeleton className="h-7 w-32" />
            {/* Total P&L percentage */}
            <Skeleton className="h-3 w-24 mt-1 bg-green-500/20" />
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Cash / Positions grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Skeleton className="h-2.5 w-10 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div>
              <Skeleton className="h-2.5 w-14 mb-1" />
              <Skeleton className="h-4 w-18" />
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* P&L Section with colored backgrounds */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-md bg-green-500/10">
              <Skeleton className="h-2.5 w-20 mb-1" />
              <Skeleton className="h-4 w-16 bg-green-500/30" />
            </div>
            <div className="p-2 rounded-md bg-green-500/10">
              <Skeleton className="h-2.5 w-18 mb-1" />
              <Skeleton className="h-4 w-14 bg-green-500/30" />
            </div>
          </div>
        </div>

        {/* Tabs - Active/History */}
        <div className="space-y-3">
          {/* Tab list */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg">
            <Skeleton className="h-8 rounded-md bg-background" />
            <Skeleton className="h-8 rounded-md" />
          </div>

          {/* Manual Entry Button placeholder */}
          <Skeleton className="h-9 w-full rounded-lg" />

          {/* Position list */}
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <PositionSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Watchlist skeleton - matches MarketWatcherFull structure
 * High-fidelity: includes tabs, symbol detail with chart, and symbol list rows
 */
export function WatchlistSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-28 flex-1" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 px-4 py-2 border-b border-border/50 overflow-x-auto">
        {['Indices', 'Watchlist', 'Crypto', 'Sectors'].map((tab, i) => (
          <Skeleton
            key={tab}
            className={cn(
              'h-9 px-4 rounded-xl',
              i === 0 ? 'w-20 bg-primary/30' : 'w-18'
            )}
          />
        ))}
      </div>

      {/* Selected Symbol Detail */}
      <div className="p-4 border-b border-border/50 space-y-3">
        {/* Symbol header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-14" />
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-28 bg-green-500/20" />
            </div>
          </div>
        </div>

        {/* Chart placeholder */}
        <div className="h-32 w-full flex items-center justify-center">
          <div className="w-full h-20 relative">
            {/* Simulate line chart path */}
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M0,20 Q10,15 20,18 T40,12 T60,16 T80,8 T100,14"
                fill="none"
                stroke="currentColor"
                className="text-green-500/30"
                strokeWidth="2"
              />
              <path
                d="M0,20 Q10,15 20,18 T40,12 T60,16 T80,8 T100,14 L100,30 L0,30 Z"
                fill="currentColor"
                className="text-green-500/10"
              />
            </svg>
          </div>
        </div>

        {/* OHLCV Data */}
        <div className="grid grid-cols-5 gap-2 text-center">
          {['Open', 'High', 'Low', 'Close', 'Vol'].map((label, i) => (
            <div key={label} className="rounded-xl p-2 bg-muted/30">
              <Skeleton className="h-2 w-8 mx-auto mb-1" />
              <Skeleton className={cn(
                'h-3 w-10 mx-auto',
                i === 1 && 'bg-green-500/30',
                i === 2 && 'bg-red-500/30'
              )} />
            </div>
          ))}
        </div>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-hidden">
        {['SPY', 'QQQ', 'DIA', 'IWM', 'VIX'].map((symbol, i) => (
          <div
            key={symbol}
            className={cn(
              'flex items-center justify-between px-4 py-3 border-b border-border/30',
              i === 0 && 'bg-primary/5 border-l-2 border-l-primary'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-2 h-2 rounded-full',
                i === 0 ? 'bg-primary animate-pulse' : 'bg-transparent'
              )} />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className={cn(
                'h-4 w-16',
                i % 2 === 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              )} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * News item skeleton - matches news feed structure
 * High-fidelity: includes thumbnail, headline, source, and timestamp
 */
export function NewsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* News items */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 flex gap-3">
            {/* Thumbnail */}
            <Skeleton className="h-16 w-24 rounded-lg flex-shrink-0" />
            {/* Content */}
            <div className="flex-1 space-y-2">
              {/* Headline - 2 lines */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              {/* Meta row */}
              <div className="flex items-center gap-2">
                {/* Source badge */}
                <Skeleton className="h-3 w-16 rounded-full" />
                {/* Timestamp */}
                <Skeleton className="h-3 w-12" />
                {/* Symbol tags */}
                <div className="flex gap-1 ml-auto">
                  <Skeleton className="h-4 w-10 rounded bg-primary/20" />
                  <Skeleton className="h-4 w-10 rounded bg-primary/20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
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
