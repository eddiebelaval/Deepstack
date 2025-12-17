'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { Clock, Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react';

/**
 * Get accurate Eastern Time using Intl.DateTimeFormat
 * Automatically handles EST/EDT (Daylight Saving Time)
 */
function getEasternTime(): { hours: number; minutes: number; dayOfWeek: number } {
  const now = new Date();

  // Use Intl.DateTimeFormat to get accurate ET (handles DST automatically)
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = etFormatter.formatToParts(now);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || '';

  // Convert weekday string to number (0 = Sunday, 1 = Monday, etc.)
  const weekdayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  const dayOfWeek = weekdayMap[weekdayStr] ?? now.getDay();

  return { hours, minutes, dayOfWeek };
}

/**
 * Check if US stock market is currently open
 * Regular hours: 9:30 AM - 4:00 PM ET, Monday-Friday
 */
function isMarketCurrentlyOpen(): boolean {
  const { hours, minutes, dayOfWeek } = getEasternTime();

  // Market closed on weekends (Saturday = 6, Sunday = 0)
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // Convert to decimal hours for easier comparison
  const decimalTime = hours + minutes / 60;

  // Regular market hours: 9:30 AM (9.5) to 4:00 PM (16.0) ET
  return decimalTime >= 9.5 && decimalTime < 16;
}

export function MarketStatusWidget() {
  const { wsConnected, wsReconnecting, lastError } = useMarketDataStore();

  // Use state to avoid hydration mismatch (server vs client time)
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isWeekday, setIsWeekday] = useState(true);

  // Determine if we're in frontend-only mode (backend unavailable)
  const isFrontendOnlyMode = lastError?.includes('Backend unavailable') || lastError?.includes('cached/REST');

  useEffect(() => {
    const updateMarketStatus = () => {
      const { dayOfWeek } = getEasternTime();
      setIsMarketOpen(isMarketCurrentlyOpen());
      setIsWeekday(dayOfWeek >= 1 && dayOfWeek <= 5);
    };

    updateMarketStatus();
    // Update every minute to catch market open/close transitions
    const interval = setInterval(updateMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Determine connection status display
  const getConnectionStatus = () => {
    if (wsConnected) {
      return {
        icon: <Wifi className="h-3.5 w-3.5 text-profit" />,
        label: 'Live Data',
        dotColor: 'bg-profit',
      };
    }

    if (wsReconnecting) {
      return {
        icon: <RefreshCw className="h-3.5 w-3.5 text-yellow-500 animate-spin" />,
        label: 'Reconnecting...',
        dotColor: 'bg-yellow-500',
      };
    }

    if (isFrontendOnlyMode) {
      return {
        icon: <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />,
        label: 'REST API Mode',
        dotColor: 'bg-muted-foreground',
      };
    }

    return {
      icon: <WifiOff className="h-3.5 w-3.5 text-loss" />,
      label: 'Disconnected',
      dotColor: 'bg-loss',
    };
  };

  const connectionStatus = getConnectionStatus();

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

      {/* Connection Status */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full shrink-0',
            connectionStatus.dotColor
          )}
        />
        <div className="flex items-center gap-1.5 flex-1">
          {connectionStatus.icon}
          <span className="text-sm text-muted-foreground">
            {connectionStatus.label}
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

      {/* Frontend-only mode info */}
      {isFrontendOnlyMode && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Using REST API for data. Real-time updates unavailable.
          </p>
        </div>
      )}
    </div>
  );
}

// Named export for flexibility
export default MarketStatusWidget;
