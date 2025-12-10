'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { Clock, Wifi, WifiOff } from 'lucide-react';

export function MarketStatusWidget() {
  const { wsConnected } = useMarketDataStore();

  // Simple market hours check (US Eastern Time)
  const now = new Date();
  const etHour = now.getUTCHours() - 5; // Rough ET conversion
  const isWeekday = now.getDay() > 0 && now.getDay() < 6;
  const isMarketHours = etHour >= 9.5 && etHour < 16;
  const isMarketOpen = isWeekday && isMarketHours;

  return (
    <div className="space-y-3">
      {/* Market Status */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full shrink-0',
            isMarketOpen ? 'bg-profit animate-pulse' : 'bg-muted-foreground'
          )}
        />
        <div className="flex items-center gap-1.5 flex-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {isMarketOpen ? 'Market Open' : 'Market Closed'}
          </span>
        </div>
      </div>

      {/* WebSocket Connection */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full shrink-0',
            wsConnected ? 'bg-profit' : 'bg-loss'
          )}
        />
        <div className="flex items-center gap-1.5 flex-1">
          {wsConnected ? (
            <Wifi className="h-3.5 w-3.5 text-profit" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-loss" />
          )}
          <span className="text-sm text-muted-foreground">
            {wsConnected ? 'Live Data' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Market Hours Info (when closed) */}
      {!isMarketOpen && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isWeekday
              ? 'Regular hours: 9:30 AM - 4:00 PM ET'
              : 'Markets open Monday - Friday'}
          </p>
        </div>
      )}
    </div>
  );
}

// Named export for flexibility
export default MarketStatusWidget;
