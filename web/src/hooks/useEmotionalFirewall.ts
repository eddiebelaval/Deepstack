'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FirewallCheckResult } from '@/app/api/emotional-firewall/check/route';

interface UseEmotionalFirewallOptions {
  pollInterval?: number; // ms, default 30000 (30 seconds)
  enabled?: boolean;
}

export function useEmotionalFirewall(options: UseEmotionalFirewallOptions = {}) {
  const { pollInterval = 30000, enabled = true } = options;

  const [status, setStatus] = useState<FirewallCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current firewall status
  const checkStatus = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch('/api/emotional-firewall/check');
      if (!response.ok) {
        throw new Error('Failed to fetch firewall status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Check if a specific trade would be blocked
  const checkTrade = useCallback(
    async (symbol: string, size?: number): Promise<FirewallCheckResult> => {
      const response = await fetch('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_trade',
          symbol,
          size,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check trade');
      }

      const result = await response.json();
      setStatus(result);
      return result;
    },
    []
  );

  // Record a completed trade
  const recordTrade = useCallback(
    async (symbol: string, pnl: number, size?: number) => {
      const response = await fetch('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_trade',
          symbol,
          pnl,
          size,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record trade');
      }

      // Refresh status after recording
      await checkStatus();
    },
    [checkStatus]
  );

  // Clear active cooldown (admin action)
  const clearCooldown = useCallback(async () => {
    const response = await fetch('/api/emotional-firewall/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_cooldown' }),
    });

    if (!response.ok) {
      throw new Error('Failed to clear cooldown');
    }

    await checkStatus();
  }, [checkStatus]);

  // Initial fetch and polling
  useEffect(() => {
    checkStatus();

    if (enabled && pollInterval > 0) {
      const interval = setInterval(checkStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [checkStatus, enabled, pollInterval]);

  // Computed values
  const isBlocked = status?.blocked ?? false;
  const isWarning = status?.status === 'warning';
  const isSafe = status?.status === 'safe';
  const cooldownRemaining = status?.cooldown_expires
    ? Math.max(0, new Date(status.cooldown_expires).getTime() - Date.now())
    : null;

  return {
    // State
    status,
    loading,
    error,

    // Computed
    isBlocked,
    isWarning,
    isSafe,
    cooldownRemaining,
    patterns: status?.patterns_detected ?? [],
    reasons: status?.reasons ?? [],
    stats: status?.stats ?? null,

    // Actions
    checkStatus,
    checkTrade,
    recordTrade,
    clearCooldown,
  };
}

export type { FirewallCheckResult };
