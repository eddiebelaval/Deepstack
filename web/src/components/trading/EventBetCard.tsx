'use client';

import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Building2,
  CalendarDays,
  Clock,
  Target,
  History,
  CheckCircle2,
  CircleDashed,
  BarChart3,
  Coins,
  Scale,
  TrendingDown,
  Sun,
  Moon,
} from 'lucide-react';
import type { CalendarEvent, CalendarEventType } from '@/lib/stores/calendar-store';

/**
 * EventBetCard - Calendar event card with earnings focus
 *
 * For earnings: Large symbol display with comprehensive financial metrics
 * For other events: Compact layout
 */

interface EventBetCardProps {
  event: CalendarEvent;
  onSymbolClick?: (symbol: string) => void;
  className?: string;
}

const EVENT_ICONS: Record<CalendarEventType, React.ElementType> = {
  earnings: DollarSign,
  economic: TrendingUp,
  dividend: Building2,
  ipo: CalendarDays,
};

const EVENT_COLORS: Record<
  CalendarEventType,
  { bg: string; border: string; text: string; gradient: string }
> = {
  earnings: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    gradient: 'from-blue-500/5 to-transparent',
  },
  economic: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    gradient: 'from-amber-500/5 to-transparent',
  },
  dividend: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-500',
    gradient: 'from-green-500/5 to-transparent',
  },
  ipo: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    gradient: 'from-purple-500/5 to-transparent',
  },
};

const IMPORTANCE_COLORS = {
  low: 'bg-muted-foreground/50',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

// Format large numbers (billions/millions)
function formatMarketCap(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
  if (value >= 1) return `$${value.toFixed(0)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

function formatRevenue(value: number): string {
  if (value >= 1) return `$${value.toFixed(1)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatChange(value: number): { text: string; isPositive: boolean } {
  const isPositive = value >= 0;
  return {
    text: `${isPositive ? '+' : ''}${value.toFixed(1)}%`,
    isPositive,
  };
}

// Earnings card - larger, more detailed
function EarningsCard({
  event,
  onSymbolClick,
  className,
}: EventBetCardProps) {
  const colors = EVENT_COLORS.earnings;
  const hasActual = !!event.actual;

  return (
    <div
      onClick={() => event.symbol && onSymbolClick?.(event.symbol)}
      className={cn(
        'group relative p-3 rounded-xl border-2 border-border/50',
        'bg-gradient-to-br from-card via-card to-blue-500/5',
        'hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10',
        'transition-all duration-300',
        event.symbol && 'cursor-pointer',
        className
      )}
    >
      {/* Header Row: Symbol + Price + Time Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {/* Symbol + Company + Price */}
        <div className="flex-1 min-w-0">
          {event.symbol && (
            <div className="flex items-center gap-3">
              {/* Symbol */}
              <span className={cn('text-2xl font-black tracking-tight shrink-0', colors.text)}>
                {event.symbol}
              </span>

              {/* Price Block */}
              {event.currentPrice && (
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono">
                      {formatPrice(event.currentPrice)}
                    </span>
                    {event.changeWeek !== undefined && (
                      <span className={cn(
                        'text-sm font-semibold',
                        event.changeWeek >= 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        {formatChange(event.changeWeek).text}
                      </span>
                    )}
                  </div>

                  {/* Extended hours price */}
                  {(event.preMarketPrice || event.afterHoursPrice) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {event.time === 'BMO' && event.preMarketPrice ? (
                        <>
                          <Sun className="h-3 w-3 text-orange-400" />
                          <span className="font-mono">{formatPrice(event.preMarketPrice)}</span>
                          {event.currentPrice && (
                            <span className={cn(
                              'font-medium',
                              event.preMarketPrice >= event.currentPrice ? 'text-green-500' : 'text-red-500'
                            )}>
                              ({event.preMarketPrice >= event.currentPrice ? '+' : ''}{((event.preMarketPrice - event.currentPrice) / event.currentPrice * 100).toFixed(1)}%)
                            </span>
                          )}
                        </>
                      ) : event.afterHoursPrice ? (
                        <>
                          <Moon className="h-3 w-3 text-indigo-400" />
                          <span className="font-mono">{formatPrice(event.afterHoursPrice)}</span>
                          {event.currentPrice && (
                            <span className={cn(
                              'font-medium',
                              event.afterHoursPrice >= event.currentPrice ? 'text-green-500' : 'text-red-500'
                            )}>
                              ({event.afterHoursPrice >= event.currentPrice ? '+' : ''}{((event.afterHoursPrice - event.currentPrice) / event.currentPrice * 100).toFixed(1)}%)
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Company name + Change stats */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground truncate">
              {event.title.replace(event.symbol || '', '').trim()}
            </span>
            {/* Week/Month/Year changes */}
            {(event.changeMonth !== undefined || event.changeYear !== undefined) && (
              <div className="flex items-center gap-2 text-[10px] ml-auto">
                {event.changeMonth !== undefined && (
                  <span className={cn(
                    'font-medium',
                    event.changeMonth >= 0 ? 'text-green-500/70' : 'text-red-500/70'
                  )}>
                    1M: {formatChange(event.changeMonth).text}
                  </span>
                )}
                {event.changeYear !== undefined && (
                  <span className={cn(
                    'font-medium',
                    event.changeYear >= 0 ? 'text-green-500/70' : 'text-red-500/70'
                  )}>
                    1Y: {formatChange(event.changeYear).text}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Time + Status Badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {event.time && (
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold',
              event.time === 'BMO' ? 'bg-orange-500/20 text-orange-400' : 'bg-indigo-500/20 text-indigo-400'
            )}>
              {event.time === 'BMO' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              <span>{event.time === 'BMO' ? 'Pre' : 'AH'}</span>
            </div>
          )}
          {event.importance && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className={cn('w-2 h-2 rounded-full', IMPORTANCE_COLORS[event.importance])} />
              <span className="capitalize">{event.importance}</span>
            </div>
          )}
        </div>
      </div>

      {/* EPS Section */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Estimate */}
        <div className="flex flex-col p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <Target className="h-3 w-3" />
            <span>Expected</span>
          </div>
          <span className="text-base font-bold font-mono">{event.estimate || '—'}</span>
        </div>

        {/* Actual or Pending */}
        <div className={cn(
          'flex flex-col p-2 rounded-lg',
          hasActual ? 'bg-green-500/10' : 'bg-muted/30'
        )}>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            {hasActual ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>Actual</span>
              </>
            ) : (
              <>
                <CircleDashed className="h-3 w-3" />
                <span>Pending</span>
              </>
            )}
          </div>
          <span className={cn(
            'text-base font-bold font-mono',
            hasActual ? 'text-green-500' : 'text-muted-foreground'
          )}>
            {event.actual || '—'}
          </span>
        </div>

        {/* Prior */}
        <div className="flex flex-col p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <History className="h-3 w-3" />
            <span>Prior</span>
          </div>
          <span className="text-base font-bold font-mono">{event.prior || '—'}</span>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      {(event.peRatio || event.psRatio || event.marketCap || event.revenueEstimate) && (
        <div className="grid grid-cols-5 gap-1.5 pt-3 border-t border-border/30">
          {event.peRatio !== undefined && (
            <div className="flex flex-col items-center p-1.5 rounded-md bg-muted/20">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                <Scale className="h-2.5 w-2.5" />
                <span>P/E</span>
              </div>
              <span className={cn(
                'text-sm font-bold font-mono',
                event.peRatio < 15 ? 'text-green-500' : event.peRatio > 30 ? 'text-amber-500' : ''
              )}>
                {event.peRatio.toFixed(1)}
              </span>
            </div>
          )}
          {event.psRatio !== undefined && (
            <div className="flex flex-col items-center p-1.5 rounded-md bg-muted/20">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                <BarChart3 className="h-2.5 w-2.5" />
                <span>P/S</span>
              </div>
              <span className="text-sm font-bold font-mono">{event.psRatio.toFixed(1)}</span>
            </div>
          )}
          {event.marketCap !== undefined && (
            <div className="flex flex-col items-center p-1.5 rounded-md bg-muted/20">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                <Coins className="h-2.5 w-2.5" />
                <span>MCap</span>
              </div>
              <span className="text-sm font-bold font-mono">{formatMarketCap(event.marketCap)}</span>
            </div>
          )}
          {event.revenueEstimate !== undefined && (
            <div className="flex flex-col items-center p-1.5 rounded-md bg-muted/20">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                <DollarSign className="h-2.5 w-2.5" />
                <span>Rev</span>
              </div>
              <span className="text-sm font-bold font-mono">{formatRevenue(event.revenueEstimate)}</span>
            </div>
          )}
          {event.epsSurprise !== undefined && (
            <div className="flex flex-col items-center p-1.5 rounded-md bg-muted/20">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5">
                {event.epsSurprise >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                <span>Last</span>
              </div>
              <span className={cn(
                'text-sm font-bold font-mono',
                event.epsSurprise > 0 ? 'text-green-500' : event.epsSurprise < 0 ? 'text-red-500' : ''
              )}>
                {event.epsSurprise > 0 ? '+' : ''}{event.epsSurprise.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact card for non-earnings events
function CompactEventCard({
  event,
  onSymbolClick,
  className,
}: EventBetCardProps) {
  const Icon = EVENT_ICONS[event.type];
  const colors = EVENT_COLORS[event.type];

  return (
    <div
      onClick={() => event.symbol && onSymbolClick?.(event.symbol)}
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-lg border border-border/50',
        'bg-card hover:bg-accent/50 transition-all duration-200',
        'border-l-4',
        colors.border,
        event.symbol && 'cursor-pointer',
        className
      )}
    >
      {/* Icon */}
      <div className={cn('p-2 rounded-lg', colors.bg)}>
        <Icon className={cn('h-4 w-4', colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground">
          {event.title}
        </h4>
        {event.time && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            <span>{event.time}</span>
          </div>
        )}
      </div>

      {/* Importance */}
      {event.importance && (
        <div className={cn(
          'w-2.5 h-2.5 rounded-full shrink-0',
          IMPORTANCE_COLORS[event.importance]
        )} />
      )}
    </div>
  );
}

export function EventBetCard(props: EventBetCardProps) {
  // Use the larger card for earnings, compact for everything else
  if (props.event.type === 'earnings' && props.event.symbol) {
    return <EarningsCard {...props} />;
  }
  return <CompactEventCard {...props} />;
}

export default EventBetCard;
