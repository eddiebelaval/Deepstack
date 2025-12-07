'use client';

import { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';

interface NetworkStatusState {
  isOnline: boolean;
  wasOffline: boolean; // Track if we've been offline this session
  setOnline: (online: boolean) => void;
  setWasOffline: (wasOffline: boolean) => void;
}

export const useNetworkStatusStore = create<NetworkStatusState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  wasOffline: false,
  setOnline: (isOnline) => set({ isOnline }),
  setWasOffline: (wasOffline) => set({ wasOffline }),
}));

/**
 * Hook for tracking network connectivity
 */
export function useNetworkStatus() {
  const { isOnline, wasOffline, setOnline, setWasOffline } = useNetworkStatusStore();
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);

  const handleOnline = useCallback(() => {
    setOnline(true);
    setLastOnlineAt(new Date());
  }, [setOnline]);

  const handleOffline = useCallback(() => {
    setOnline(false);
    setWasOffline(true);
  }, [setOnline, setWasOffline]);

  useEffect(() => {
    // Set initial state
    setOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, setOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline, // Useful for showing "reconnected" message
    lastOnlineAt,
    clearWasOffline: () => setWasOffline(false),
  };
}

/**
 * Simple check if online
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}
