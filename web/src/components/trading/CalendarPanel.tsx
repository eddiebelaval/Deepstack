'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, RefreshCw } from 'lucide-react';
import { ChatTip } from '@/components/ui/chat-tip';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { TimelineCalendar } from './TimelineCalendar';

export function CalendarPanel() {
  const {
    events,
    isLoading,
    error,
    filterType,
    setFilterType,
    fetchEvents,
  } = useCalendarStore();
  const { setActiveSymbol } = useTradingStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents();
    }
  }, [events.length, fetchEvents]);

  const handleSymbolClick = (symbol: string) => {
    setActiveSymbol(symbol);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    // Optionally update the date range in the store to fetch events for the new month
    // For now, we'll just update the display month
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 p-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Market Calendar</h2>
          </div>
          <ChatTip
            example="What earnings are coming this week?"
            moreExamples={['When does NVDA report?', 'Any Fed meetings soon?']}
            className="mt-0.5 ml-7"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {/* Timeline Calendar Content */}
      <div className="flex-1 min-h-0">
        {error ? (
          <div className="h-full flex items-center justify-center text-destructive px-4">
            {error}
          </div>
        ) : isLoading && events.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TimelineCalendar
            events={events}
            filterType={filterType}
            onFilterChange={setFilterType}
            onSymbolClick={handleSymbolClick}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
          />
        )}
      </div>
    </div>
  );
}
