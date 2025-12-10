'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * CalendarEventsWidget - Upcoming economic events widget
 *
 * Features:
 * - Shows next 3-4 economic events with date/time
 * - Impact indicator (high/medium/low)
 * - Compact calendar view
 * - Height: ~130px
 *
 * Usage:
 * <CalendarEventsWidget events={events} />
 */

export type ImpactLevel = 'high' | 'medium' | 'low';

export interface EconomicEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  impact: ImpactLevel;
}

interface CalendarEventsWidgetProps {
  events?: EconomicEvent[];
  className?: string;
}

// Mock events for demo - replace with real calendar data
const MOCK_EVENTS: EconomicEvent[] = [
  {
    id: '1',
    title: 'FOMC Meeting Minutes',
    date: 'Dec 13',
    time: '2:00 PM',
    impact: 'high',
  },
  {
    id: '2',
    title: 'CPI Report',
    date: 'Dec 14',
    time: '8:30 AM',
    impact: 'high',
  },
  {
    id: '3',
    title: 'Retail Sales',
    date: 'Dec 15',
    time: '8:30 AM',
    impact: 'medium',
  },
  {
    id: '4',
    title: 'Jobless Claims',
    date: 'Dec 16',
    time: '8:30 AM',
    impact: 'low',
  },
];

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
  events = MOCK_EVENTS,
  className
}: CalendarEventsWidgetProps) {
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
