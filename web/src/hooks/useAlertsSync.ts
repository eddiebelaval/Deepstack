'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAlertsStore, type PriceAlert, type AlertCondition } from '@/lib/stores/alerts-store';
import {
  fetchAlerts,
  createAlert,
  updateAlert as updateAlertApi,
  triggerAlert as triggerAlertApi,
  deleteAlert,
  subscribeToAlerts,
} from '@/lib/supabase/alerts';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook that syncs price alerts with Supabase.
 * Falls back to localStorage when Supabase is not configured or user is not authenticated.
 */
export function useAlertsSync() {
  const store = useAlertsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

  // Load alerts from Supabase on mount
  useEffect(() => {
    async function loadAlerts() {
      if (!isSupabaseConfigured()) {
        setIsOnline(false);
        setIsLoading(false);
        return;
      }

      try {
        const alerts = await fetchAlerts();
        if (alerts.length > 0) {
          // Replace local alerts with remote ones
          useAlertsStore.setState({ alerts });
        }
        setIsOnline(true);
        setError(null);
      } catch (err) {
        console.error('Failed to load alerts:', err);
        setError('Failed to load alerts. Using local data.');
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadAlerts();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = subscribeToAlerts(
      // onInsert
      (alert) => {
        useAlertsStore.setState((state) => ({
          alerts: [alert, ...state.alerts.filter((a) => a.id !== alert.id)],
        }));
      },
      // onUpdate
      (alert) => {
        useAlertsStore.setState((state) => ({
          alerts: state.alerts.map((a) => (a.id === alert.id ? alert : a)),
        }));
      },
      // onDelete
      (alertId) => {
        useAlertsStore.setState((state) => ({
          alerts: state.alerts.filter((a) => a.id !== alertId),
        }));
      }
    );

    return unsubscribe;
  }, []);

  // Wrapped addAlert that syncs to Supabase
  const addAlert = useCallback(async (
    alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>
  ): Promise<PriceAlert | void> => {
    if (!isOnline) {
      // Fallback to local store
      store.addAlert(alert);
      return;
    }

    try {
      const newAlert = await createAlert({
        symbol: alert.symbol,
        targetPrice: alert.targetPrice,
        condition: alert.condition,
        note: alert.note,
      });
      // Update local store
      useAlertsStore.setState((state) => ({
        alerts: [newAlert, ...state.alerts],
      }));
      return newAlert;
    } catch (err) {
      console.error('Failed to create alert:', err);
      // Fallback to local
      store.addAlert(alert);
    }
  }, [isOnline, store]);

  // Wrapped updateAlert that syncs to Supabase
  const updateAlert = useCallback(async (
    id: string,
    updates: Partial<{
      targetPrice: number;
      condition: AlertCondition;
      isActive: boolean;
      note: string;
    }>
  ): Promise<void> => {
    if (!isOnline) {
      store.updateAlert(id, updates);
      return;
    }

    try {
      await updateAlertApi(id, updates);
      // Update local store
      useAlertsStore.setState((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      }));
    } catch (err) {
      console.error('Failed to update alert:', err);
      // Fallback to local
      store.updateAlert(id, updates);
    }
  }, [isOnline, store]);

  // Wrapped triggerAlert that syncs to Supabase
  const triggerAlert = useCallback(async (id: string): Promise<void> => {
    if (!isOnline) {
      store.triggerAlert(id);
      return;
    }

    try {
      await triggerAlertApi(id);
      // Update local store
      useAlertsStore.setState((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id
            ? { ...a, triggeredAt: new Date().toISOString(), isActive: false }
            : a
        ),
      }));
    } catch (err) {
      console.error('Failed to trigger alert:', err);
      // Fallback to local
      store.triggerAlert(id);
    }
  }, [isOnline, store]);

  // Wrapped removeAlert that syncs to Supabase
  const removeAlert = useCallback(async (id: string): Promise<void> => {
    if (!isOnline) {
      store.removeAlert(id);
      return;
    }

    try {
      await deleteAlert(id);
      // Update local store
      useAlertsStore.setState((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete alert:', err);
      // Fallback to local
      store.removeAlert(id);
    }
  }, [isOnline, store]);

  return {
    alerts: store.alerts,
    addAlert,
    updateAlert,
    triggerAlert,
    removeAlert,
    clearTriggered: store.clearTriggered,
    getActiveAlerts: store.getActiveAlerts,
    getTriggeredAlerts: store.getTriggeredAlerts,
    isLoading,
    isOnline,
    error,
  };
}
