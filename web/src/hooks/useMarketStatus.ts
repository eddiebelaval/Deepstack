'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getMarketStatus,
  MarketStatus,
  formatTimeUntil,
} from '@/lib/market-hours';

interface UseMarketStatusOptions {
  refreshInterval?: number; // ms, default 60000 (1 min)
}

interface UseMarketStatusReturn extends MarketStatus {
  timeUntilChange: string | null;
  refresh: () => void;
}

/**
 * Hook for tracking market status with auto-refresh
 */
export function useMarketStatus(
  options: UseMarketStatusOptions = {}
): UseMarketStatusReturn {
  const { refreshInterval = 60000 } = options;

  const [status, setStatus] = useState<MarketStatus>(() => getMarketStatus());

  const refresh = useCallback(() => {
    setStatus(getMarketStatus());
  }, []);

  useEffect(() => {
    // Initial refresh
    refresh();

    // Set up interval
    const interval = setInterval(refresh, refreshInterval);

    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  // Calculate time until next state change
  const timeUntilChange = status.isOpen
    ? status.nextClose
      ? formatTimeUntil(status.nextClose)
      : null
    : status.nextOpen
      ? formatTimeUntil(status.nextOpen)
      : null;

  return {
    ...status,
    timeUntilChange,
    refresh,
  };
}

/**
 * Simple hook that just returns if market is open
 */
export function useIsMarketOpen(): boolean {
  const { isOpen } = useMarketStatus();
  return isOpen;
}
