'use client';

import { useEffect } from 'react';
import {
  onConnectionStatusChange,
  ConnectionStatus,
} from '@/lib/supabase/realtime';
import { create } from 'zustand';

// Store for connection status
interface RealtimeStatusStore {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

export const useRealtimeStatusStore = create<RealtimeStatusStore>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}));

/**
 * Hook to track real-time connection status
 * The actual subscriptions are handled by usePortfolio via its own subscribeToTrades call
 * This hook just exposes connection status for UI indicators
 */
export function useRealtimePositions() {
  const setStatus = useRealtimeStatusStore((s) => s.setStatus);

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribeStatus = onConnectionStatusChange((status) => {
      setStatus(status);
    });

    return () => {
      unsubscribeStatus();
    };
  }, [setStatus]);

  return useRealtimeStatusStore((s) => s.status);
}

/**
 * Hook to get just the connection status
 */
export function useRealtimeStatus(): ConnectionStatus {
  return useRealtimeStatusStore((s) => s.status);
}
