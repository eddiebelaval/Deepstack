'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DecisionFitnessResult } from '@/app/api/emotional-firewall/check/route';

interface UseDecisionFitnessOptions {
  pollInterval?: number; // ms, default 30000 (30 seconds)
  enabled?: boolean;
  autoRecordQueries?: boolean; // Auto-record queries on status check
}

export function useEmotionalFirewall(options: UseDecisionFitnessOptions = {}) {
  const { pollInterval = 30000, enabled = true } = options;

  const [status, setStatus] = useState<DecisionFitnessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current decision fitness status
  const checkStatus = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch('/api/emotional-firewall/check');
      if (!response.ok) {
        throw new Error('Failed to fetch decision fitness status');
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

  // Record a query/interaction (tracks engagement patterns)
  const recordQuery = useCallback(async (): Promise<DecisionFitnessResult | null> => {
    try {
      const response = await fetch('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_query' }),
      });

      if (!response.ok) {
        throw new Error('Failed to record query');
      }

      const result = await response.json();
      setStatus(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  // Start a new research session
  const startSession = useCallback(async () => {
    try {
      const response = await fetch('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_session' }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [checkStatus]);

  // End current session
  const endSession = useCallback(async () => {
    try {
      const response = await fetch('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_session' }),
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [checkStatus]);

  // User takes a recommended break
  const takeBreak = useCallback(async () => {
    try {
      const response = await fetch('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take_break' }),
      });

      if (!response.ok) {
        throw new Error('Failed to start break');
      }

      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [checkStatus]);

  // User dismisses break recommendation (continues anyway)
  const dismissBreak = useCallback(async () => {
    try {
      const response = await fetch('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_break' }),
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss break');
      }

      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [checkStatus]);

  // Initial fetch and polling
  useEffect(() => {
    checkStatus();

    if (enabled && pollInterval > 0) {
      const interval = setInterval(checkStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [checkStatus, enabled, pollInterval]);

  // Computed values - maintain backward compatibility with old naming
  const isBlocked = status?.compromised ?? false;
  const isCompromised = status?.compromised ?? false;
  const isWarning = status?.status === 'caution';
  const isCaution = status?.status === 'caution';
  const isSafe = status?.status === 'focused';
  const isFocused = status?.status === 'focused';

  const breakRemaining = status?.break_recommended_until
    ? Math.max(0, new Date(status.break_recommended_until).getTime() - Date.now())
    : null;

  return {
    // State
    status,
    loading,
    error,

    // Computed - new naming
    isCompromised,
    isCaution,
    isFocused,
    breakRemaining,

    // Computed - backward compatible
    isBlocked,
    isWarning,
    isSafe,
    cooldownRemaining: breakRemaining,

    // Patterns and reasons
    patterns: status?.patterns_detected ?? [],
    reasons: status?.reasons ?? [],
    session: status?.session ?? null,

    // Actions
    checkStatus,
    recordQuery,
    startSession,
    endSession,
    takeBreak,
    dismissBreak,
  };
}

// Alias for clearer naming
export const useDecisionFitness = useEmotionalFirewall;

export type { DecisionFitnessResult };

// Re-export for backward compatibility
export type FirewallCheckResult = DecisionFitnessResult;
