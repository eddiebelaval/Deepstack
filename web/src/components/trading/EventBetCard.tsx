'use client';

import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Building2,
  CalendarDays,
  Clock,
} from 'lucide-react';
import type { CalendarEvent, CalendarEventType } from '@/lib/stores/calendar-store';

/**
 * EventBetCard - Compact horizontal calendar event card
 *
 * Compact rectangular layout optimized to show more events on screen.
 * Similar to news feed items - horizontal with essential info only.
 *
 * Features:
 * - Color-coded by event type (earnings=blue, economic=amber, dividend=green, ipo=purple)
 * - Icon badge for event type
 * - Symbol link (clickable)
 * - Importance indicator
 * - Estimate/Actual/Prior data display
 * - Time display
 * - Compact horizontal layout
 *
 * Usage:
 * <EventBetCard event={event} onSymbolClick={(symbol) => console.log(symbol)} />
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
  low: 'bg-muted-foreground/30',
  medium: 'bg-amber-500/70',
  high: 'bg-red-500/70',
};

export function EventBetCard({
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
        'group relative flex items-center gap-2 p-2 rounded-lg border border-border/50',
        'bg-card hover:bg-accent/50 transition-all duration-200',
        'border-l-2',
        colors.border,
        event.symbol && 'cursor-pointer',
        className
      )}
    >
      {/* Icon + Importance */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className={cn('p-1 rounded-md', colors.bg)}>
          <Icon className={cn('h-3 w-3', colors.text)} />
        </div>
        {event.importance && (
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              IMPORTANCE_COLORS[event.importance]
            )}
            title={`${event.importance} importance`}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Title + Symbol */}
        <div className="flex items-baseline gap-1 mb-0.5">
          {event.symbol && (
            <span className={cn('text-[10px] font-bold shrink-0', colors.text)}>
              {event.symbol}
            </span>
          )}
          <h4 className="text-[11px] font-medium text-foreground truncate">
            {event.title}
          </h4>
        </div>

        {/* Data Row */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {event.time && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              <span>{event.time}</span>
            </div>
          )}
          {event.estimate && (
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="opacity-60">Est:</span>
              <span className="font-mono font-medium">{event.estimate}</span>
            </div>
          )}
          {event.actual && (
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="opacity-60">Act:</span>
              <span className={cn('font-mono font-bold', colors.text)}>{event.actual}</span>
            </div>
          )}
          {event.prior && (
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="opacity-60">Prior:</span>
              <span className="font-mono">{event.prior}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventBetCard;
