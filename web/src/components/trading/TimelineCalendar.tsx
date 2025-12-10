'use client';

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Building2,
  CalendarDays,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventBetCard } from './EventBetCard';
import type { CalendarEvent, CalendarEventType } from '@/lib/stores/calendar-store';

/**
 * TimelineCalendar - Vertical timeline with event cards
 *
 * Layout:
 * - Month navigation at top
 * - Filter tabs (All, Earnings, Economic, Dividend, IPO)
 * - Vertical timeline with date markers
 * - EventBetCard components appear inline where events occur
 * - Scrollable with smooth scrolling
 * - Today highlighted differently
 *
 * Features:
 * - Month-based navigation
 * - Filter by event type
 * - Timeline scroll view
 * - Date markers with visual timeline
 * - Responsive grid layout for cards
 * - Empty state handling
 *
 * Usage:
 * <TimelineCalendar
 *   events={events}
 *   filterType="all"
 *   onFilterChange={(type) => setFilterType(type)}
 *   onSymbolClick={(symbol) => console.log(symbol)}
 * />
 */

interface TimelineCalendarProps {
  events: CalendarEvent[];
  filterType: CalendarEventType | 'all';
  onFilterChange: (type: CalendarEventType | 'all') => void;
  onSymbolClick: (symbol: string) => void;
  currentMonth?: Date;
  onMonthChange?: (month: Date) => void;
}

export function TimelineCalendar({
  events,
  filterType,
  onFilterChange,
  onSymbolClick,
  currentMonth = new Date(),
  onMonthChange,
}: TimelineCalendarProps) {
  // Group events by date
  const groupedEvents = useMemo(() => {
    const filtered = filterType === 'all' ? events : events.filter((e) => e.type === filterType);

    return filtered.reduce((acc, event) => {
      const date = event.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);
  }, [events, filterType]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEvents).sort((a, b) => a.localeCompare(b));
  }, [groupedEvents]);

  const handlePrevMonth = () => {
    if (!onMonthChange) return;
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    if (!onMonthChange) return;
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.getTime() === today.getTime();
    const isTomorrow = date.getTime() === tomorrow.getTime();

    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();

    if (isToday) return { label: `Today, ${weekday} ${day}`, isToday: true };
    if (isTomorrow) return { label: `Tomorrow, ${weekday} ${day}`, isToday: false };

    return { label: `${weekday} ${day}`, isToday: false };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          disabled={!onMonthChange}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">{formatMonthYear(currentMonth)}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          disabled={!onMonthChange}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={filterType}
        onValueChange={(v) => onFilterChange(v as CalendarEventType | 'all')}
        className="flex-1 min-h-0 flex flex-col"
      >
        <TabsList className="grid grid-cols-5 flex-shrink-0 mx-4 mt-2">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="earnings" className="text-xs gap-1">
            <DollarSign className="h-3 w-3" />
            Earn
          </TabsTrigger>
          <TabsTrigger value="economic" className="text-xs gap-1">
            <TrendingUp className="h-3 w-3" />
            Econ
          </TabsTrigger>
          <TabsTrigger value="dividend" className="text-xs gap-1">
            <Building2 className="h-3 w-3" />
            Div
          </TabsTrigger>
          <TabsTrigger value="ipo" className="text-xs gap-1">
            <CalendarDays className="h-3 w-3" />
            IPO
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="flex-1 min-h-0 mt-2">
          {sortedDates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <CalendarIcon className="h-8 w-8 opacity-50" />
              <p className="text-sm">No events found</p>
              <p className="text-xs">Check back later or try a different filter</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="px-4 pb-4">
                {sortedDates.map((date, idx) => {
                  const dayEvents = groupedEvents[date];
                  const { label, isToday } = formatDateLabel(date);

                  return (
                    <div key={date} className="relative">
                      {/* Timeline line (vertical connector) */}
                      {idx < sortedDates.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-border/50" />
                      )}

                      {/* Date marker */}
                      <div className="flex items-center gap-3 mb-3 mt-4 relative">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            isToday ? 'bg-primary ring-4 ring-primary/20' : 'bg-border'
                          )}
                        />
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            isToday ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {label}
                        </div>
                      </div>

                      {/* Event cards - vertical stack */}
                      <div className="ml-8 flex flex-col gap-1.5 mb-2">
                        {dayEvents.map((event) => (
                          <EventBetCard
                            key={event.id}
                            event={event}
                            onSymbolClick={onSymbolClick}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TimelineCalendar;
