import { supabase, isSupabaseConfigured } from '../supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Connection status types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Callback types
export type StatusCallback = (status: ConnectionStatus) => void;
export type ChangeCallback<T> = (
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: T
) => void;

// Channel registry for cleanup
const activeChannels: Map<string, RealtimeChannel> = new Map();

// Connection status tracking
let globalStatus: ConnectionStatus = 'disconnected';
const statusListeners: Set<StatusCallback> = new Set();

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return globalStatus;
}

/**
 * Subscribe to connection status changes
 */
export function onConnectionStatusChange(callback: StatusCallback): () => void {
  statusListeners.add(callback);
  // Immediately call with current status
  callback(globalStatus);

  return () => {
    statusListeners.delete(callback);
  };
}

/**
 * Update and broadcast connection status
 */
function setConnectionStatus(status: ConnectionStatus): void {
  if (globalStatus !== status) {
    globalStatus = status;
    statusListeners.forEach(listener => listener(status));
  }
}

/**
 * Create a realtime subscription for a table
 */
export function subscribeToTable<T extends { id: string }>(
  tableName: string,
  callback: ChangeCallback<T>,
  filter?: { column: string; value: string }
): () => void {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, skipping realtime subscription');
    return () => {};
  }

  const channelName = filter
    ? `${tableName}_${filter.column}_${filter.value}`
    : tableName;

  // Clean up existing channel if any
  if (activeChannels.has(channelName)) {
    const existing = activeChannels.get(channelName);
    if (existing) {
      supabase.removeChannel(existing);
    }
  }

  setConnectionStatus('connecting');

  const channelConfig: {
    event: '*';
    schema: 'public';
    table: string;
    filter?: string;
  } = {
    event: '*',
    schema: 'public',
    table: tableName,
  };

  if (filter) {
    channelConfig.filter = `${filter.column}=eq.${filter.value}`;
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      channelConfig,
      (payload: RealtimePostgresChangesPayload<T>) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const data = event === 'DELETE'
          ? payload.old as T
          : payload.new as T;
        callback(event, data);
      }
    )
    .subscribe((status) => {
      switch (status) {
        case 'SUBSCRIBED':
          setConnectionStatus('connected');
          break;
        case 'CHANNEL_ERROR':
          setConnectionStatus('error');
          break;
        case 'TIMED_OUT':
          setConnectionStatus('disconnected');
          // Attempt reconnection
          setTimeout(() => {
            if (activeChannels.has(channelName)) {
              channel.subscribe();
            }
          }, 5000);
          break;
        case 'CLOSED':
          setConnectionStatus('disconnected');
          break;
      }
    });

  activeChannels.set(channelName, channel);

  return () => {
    const ch = activeChannels.get(channelName);
    if (ch && supabase) {
      supabase.removeChannel(ch);
    }
    activeChannels.delete(channelName);

    // Update status if no more channels
    if (activeChannels.size === 0) {
      setConnectionStatus('disconnected');
    }
  };
}

/**
 * Subscribe to trade journal updates for the current user
 */
export function subscribeToTrades(
  userId: string,
  callback: ChangeCallback<{
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    order_type: string;
    status: string;
    notes: string | null;
    created_at: string;
  }>
): () => void {
  return subscribeToTable('trade_journal', callback, {
    column: 'user_id',
    value: userId,
  });
}

/**
 * Subscribe to price alert updates for the current user
 */
export function subscribeToAlerts(
  userId: string,
  callback: ChangeCallback<{
    id: string;
    symbol: string;
    target_price: number;
    condition: 'above' | 'below' | 'crosses';
    is_active: boolean;
    triggered_at: string | null;
    note: string | null;
    created_at: string;
  }>
): () => void {
  return subscribeToTable('price_alerts', callback, {
    column: 'user_id',
    value: userId,
  });
}

/**
 * Subscribe to watchlist updates for the current user
 */
export function subscribeToWatchlists(
  userId: string,
  callback: ChangeCallback<{
    id: string;
    name: string;
    items: Array<{ symbol: string; addedAt: string }>;
    is_default: boolean;
    created_at: string;
    updated_at: string;
  }>
): () => void {
  return subscribeToTable('watchlists', callback, {
    column: 'user_id',
    value: userId,
  });
}

/**
 * Unsubscribe from all active channels
 */
export function unsubscribeAll(): void {
  if (!supabase) return;

  activeChannels.forEach((channel) => {
    supabase!.removeChannel(channel);
  });
  activeChannels.clear();
  setConnectionStatus('disconnected');
}

/**
 * Get count of active subscriptions
 */
export function getActiveSubscriptionCount(): number {
  return activeChannels.size;
}

/**
 * Check if connected to realtime
 */
export function isRealtimeConnected(): boolean {
  return globalStatus === 'connected';
}
