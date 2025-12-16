'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * CalendarEventsWidget - Upcoming economic events widget
 *
 * Features:
 * - Fetches real economic/earnings events from /api/calendar
 * - Shows next 3-4 events with date/time
 * - Impact indicator (high/medium/low)
 * - Height: ~130px
 *
 * Usage:
 * <CalendarEventsWidget />
 */

export type ImpactLevel = 'high' | 'medium' | 'low';

export interface EconomicEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  impact: ImpactLevel;
  type?: 'earnings' | 'economic' | 'dividend' | 'ipo' | 'market';
  symbol?: string;
}

interface CalendarEventsWidgetProps {
  className?: string;
}

// Format ISO date to human-readable
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

const IMPACT_CONFIG = {
  high: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'High',
  },
  medium: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Med',
  },
  low: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Low',
  },
};

export function CalendarEventsWidget({
  className
}: CalendarEventsWidgetProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/calendar');
        if (!response.ok) throw new Error('Failed to fetch calendar');
        const data = await response.json();

        // Map API response to widget format
        const mapped: EconomicEvent[] = (data.events || []).slice(0, 4).map((e: any, idx: number) => ({
          id: e.id || `event-${idx}`,
          title: e.title || e.symbol || 'Event',
          date: formatDate(e.date),
          time: e.time || '—',
          impact: e.importance || 'medium',
          type: e.type,
          symbol: e.symbol,
        }));

        setEvents(mapped);
        setError(null);
      } catch (err) {
        console.error('Calendar fetch error:', err);
        setError('Could not load events');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, []);
  // Show next 3-4 events
  const upcomingEvents = events.slice(0, 4);

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ minHeight: '130px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Economic Calendar
        </span>
      </div>

      {/* Events List */}
      <div className="space-y-1.5">
        {upcomingEvents.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">
            No upcoming events
          </div>
        ) : (
          upcomingEvents.map((event) => {
            const impactConfig = IMPACT_CONFIG[event.impact];
            return (
              <div
                key={event.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                {/* Date & Time */}
                <div className="flex flex-col items-center flex-shrink-0 w-12">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {event.date}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground">
                      {event.time}
                    </span>
                  </div>
                </div>

                {/* Event Title */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">
                    {event.title}
                  </p>
                </div>

                {/* Impact Badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] px-1.5 py-0 flex-shrink-0',
                    impactConfig.color,
                    impactConfig.bgColor,
                    impactConfig.borderColor
                  )}
                >
                  {impactConfig.label}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default CalendarEventsWidget;
