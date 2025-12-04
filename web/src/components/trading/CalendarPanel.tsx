'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Loader2,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Building2,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarStore, CalendarEvent, CalendarEventType } from '@/lib/stores/calendar-store';
import { useTradingStore } from '@/lib/stores/trading-store';

const EVENT_ICONS: Record<CalendarEventType, React.ElementType> = {
  earnings: DollarSign,
  economic: TrendingUp,
  dividend: Building2,
  ipo: CalendarDays,
};

const EVENT_COLORS: Record<CalendarEventType, string> = {
  earnings: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  economic: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  dividend: 'text-green-500 bg-green-500/10 border-green-500/30',
  ipo: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
};

const IMPORTANCE_COLORS = {
  low: 'bg-muted-foreground/30',
  medium: 'bg-amber-500/50',
  high: 'bg-red-500/50',
};

export function CalendarPanel() {
  const {
    events,
    isLoading,
    error,
    filterType,
    setFilterType,
    fetchEvents,
    getFilteredEvents,
  } = useCalendarStore();
  const { setActiveSymbol } = useTradingStore();

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents();
    }
  }, []);

  const filteredEvents = getFilteredEvents();

  // Group events by date
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = event.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const handleSymbolClick = (symbol: string | undefined) => {
    if (symbol) {
      setActiveSymbol(symbol);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Market Calendar</h2>
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

      {/* Filter Tabs */}
      <Tabs
        value={filterType}
        onValueChange={(v) => setFilterType(v as CalendarEventType | 'all')}
        className="flex-1 min-h-0 flex flex-col"
      >
        <TabsList className="grid grid-cols-5 flex-shrink-0">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="earnings" className="text-xs gap-1">
            <DollarSign className="h-3 w-3" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="economic" className="text-xs gap-1">
            <TrendingUp className="h-3 w-3" />
            Economic
          </TabsTrigger>
          <TabsTrigger value="dividend" className="text-xs gap-1">
            <Building2 className="h-3 w-3" />
            Dividend
          </TabsTrigger>
          <TabsTrigger value="ipo" className="text-xs gap-1">
            <CalendarDays className="h-3 w-3" />
            IPO
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="flex-1 min-h-0 mt-3">
          {error ? (
            <div className="h-full flex items-center justify-center text-destructive">
              {error}
            </div>
          ) : isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Calendar className="h-8 w-8 opacity-50" />
              <p className="text-sm">No events found</p>
              <p className="text-xs">Check back later or try a different filter</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {Object.entries(groupedEvents)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, dayEvents]) => (
                    <div key={date}>
                      <div className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background/95 backdrop-blur py-1">
                        {formatDate(date)}
                      </div>
                      <div className="space-y-2">
                        {dayEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onSymbolClick={handleSymbolClick}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventCard({
  event,
  onSymbolClick,
}: {
  event: CalendarEvent;
  onSymbolClick: (symbol: string | undefined) => void;
}) {
  const Icon = EVENT_ICONS[event.type];
  const colorClass = EVENT_COLORS[event.type];

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        <div className={cn('p-1.5 rounded-md border', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {event.symbol && (
              <button
                onClick={() => onSymbolClick(event.symbol)}
                className="font-semibold hover:text-primary transition-colors"
              >
                {event.symbol}
              </button>
            )}
            <span className="text-sm truncate">{event.title}</span>
            {event.importance && (
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  IMPORTANCE_COLORS[event.importance]
                )}
                title={`${event.importance} importance`}
              />
            )}
          </div>
          {event.time && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {event.time}
            </div>
          )}
          {(event.estimate || event.actual || event.prior) && (
            <div className="flex gap-3 mt-2 text-xs">
              {event.estimate && (
                <div>
                  <span className="text-muted-foreground">Est:</span>{' '}
                  <span className="font-mono">{event.estimate}</span>
                </div>
              )}
              {event.actual && (
                <div>
                  <span className="text-muted-foreground">Act:</span>{' '}
                  <span className="font-mono font-medium">{event.actual}</span>
                </div>
              )}
              {event.prior && (
                <div>
                  <span className="text-muted-foreground">Prior:</span>{' '}
                  <span className="font-mono">{event.prior}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
