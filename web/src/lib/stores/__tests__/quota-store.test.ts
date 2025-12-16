import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useQuotaStore } from '../quota-store';
import { act } from '@testing-library/react';

describe('useQuotaStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useQuotaStore.setState({
        tier: 'free',
        queriesUsed: 0,
        queryLimit: 10,
        quotaResetTime: null,
      });
    });

    // Mock Date.now for consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('has free tier by default', () => {
      const state = useQuotaStore.getState();
      expect(state.tier).toBe('free');
    });

    it('has no queries used initially', () => {
      const state = useQuotaStore.getState();
      expect(state.queriesUsed).toBe(0);
    });

    it('has 10 query limit for free tier', () => {
      const state = useQuotaStore.getState();
      expect(state.queryLimit).toBe(10);
    });

    it('has no quota reset time initially', () => {
      const state = useQuotaStore.getState();
      expect(state.quotaResetTime).toBeNull();
    });
  });

  describe('setTier', () => {
    it('sets tier to pro', () => {
      act(() => {
        useQuotaStore.getState().setTier('pro');
      });

      const state = useQuotaStore.getState();
      expect(state.tier).toBe('pro');
      expect(state.queryLimit).toBe(Infinity);
    });

    it('resets queries used when changing tier', () => {
      act(() => {
        useQuotaStore.setState({ queriesUsed: 5 });
        useQuotaStore.getState().setTier('pro');
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(0);
    });

    it('sets tier back to free', () => {
      act(() => {
        useQuotaStore.getState().setTier('pro');
        useQuotaStore.getState().setTier('free');
      });

      const state = useQuotaStore.getState();
      expect(state.tier).toBe('free');
      expect(state.queryLimit).toBe(10);
    });
  });

  describe('consumeQuery', () => {
    it('allows query consumption for pro tier', () => {
      act(() => {
        useQuotaStore.getState().setTier('pro');
      });

      const result = useQuotaStore.getState().consumeQuery();
      expect(result).toBe(true);
    });

    it('does not increment queries for pro tier', () => {
      act(() => {
        useQuotaStore.getState().setTier('pro');
        useQuotaStore.getState().consumeQuery();
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(0);
    });

    it('increments queries used for free tier', () => {
      act(() => {
        useQuotaStore.getState().consumeQuery();
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(1);
    });

    it('sets quota reset time on first query', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      act(() => {
        useQuotaStore.getState().consumeQuery();
      });

      const state = useQuotaStore.getState();
      expect(state.quotaResetTime).toBe(now + 12 * 60 * 60 * 1000);
    });

    it('does not change reset time on subsequent queries', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      act(() => {
        useQuotaStore.getState().consumeQuery();
        vi.advanceTimersByTime(1000);
        useQuotaStore.getState().consumeQuery();
      });

      const state = useQuotaStore.getState();
      expect(state.quotaResetTime).toBe(now + 12 * 60 * 60 * 1000);
    });

    it('allows queries up to limit', () => {
      let result = true;
      act(() => {
        for (let i = 0; i < 10; i++) {
          result = useQuotaStore.getState().consumeQuery();
        }
      });

      expect(result).toBe(true);
      expect(useQuotaStore.getState().queriesUsed).toBe(10);
    });

    it('blocks queries over limit', () => {
      let result = true;
      act(() => {
        for (let i = 0; i < 10; i++) {
          useQuotaStore.getState().consumeQuery();
        }
        result = useQuotaStore.getState().consumeQuery();
      });

      expect(result).toBe(false);
      expect(useQuotaStore.getState().queriesUsed).toBe(10);
    });

    it('dispatches paywall event when limit reached', () => {
      const eventSpy = vi.fn();
      window.addEventListener('deepstack-paywall', eventSpy);

      act(() => {
        for (let i = 0; i < 11; i++) {
          useQuotaStore.getState().consumeQuery();
        }
      });

      expect(eventSpy).toHaveBeenCalled();
      window.removeEventListener('deepstack-paywall', eventSpy);
    });
  });

  describe('resetQuota', () => {
    it('resets queries used to zero', () => {
      act(() => {
        useQuotaStore.setState({ queriesUsed: 5 });
        useQuotaStore.getState().resetQuota();
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(0);
    });

    it('clears quota reset time', () => {
      act(() => {
        useQuotaStore.setState({ quotaResetTime: Date.now() + 1000000 });
        useQuotaStore.getState().resetQuota();
      });

      expect(useQuotaStore.getState().quotaResetTime).toBeNull();
    });
  });

  describe('checkAndResetIfNeeded', () => {
    it('does nothing if reset time not reached', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      act(() => {
        useQuotaStore.setState({
          queriesUsed: 5,
          quotaResetTime: now + 1000000,
        });
        useQuotaStore.getState().checkAndResetIfNeeded();
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(5);
    });

    it('resets quota when reset time reached', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      act(() => {
        useQuotaStore.setState({
          queriesUsed: 5,
          quotaResetTime: now - 1000,
        });
        useQuotaStore.getState().checkAndResetIfNeeded();
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(0);
      expect(useQuotaStore.getState().quotaResetTime).toBeNull();
    });

    it('does nothing if quota reset time is null', () => {
      act(() => {
        useQuotaStore.setState({
          queriesUsed: 5,
          quotaResetTime: null,
        });
        useQuotaStore.getState().checkAndResetIfNeeded();
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(5);
    });

    it('is called automatically during consumeQuery', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      act(() => {
        // First set some queries used and a past reset time
        useQuotaStore.setState({
          queriesUsed: 8,
          quotaResetTime: now - 1000,
        });

        // Consuming a query should trigger the reset check
        useQuotaStore.getState().consumeQuery();
      });

      // Should have reset to 0, then incremented to 1
      expect(useQuotaStore.getState().queriesUsed).toBe(1);
    });
  });

  describe('quota period workflow', () => {
    it('handles complete quota lifecycle', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      act(() => {
        // Use 5 queries
        for (let i = 0; i < 5; i++) {
          useQuotaStore.getState().consumeQuery();
        }
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(5);
      expect(useQuotaStore.getState().quotaResetTime).toBeTruthy();

      // Advance time past reset period
      vi.setSystemTime(now + 13 * 60 * 60 * 1000);

      act(() => {
        // Next query should reset quota first
        useQuotaStore.getState().consumeQuery();
      });

      expect(useQuotaStore.getState().queriesUsed).toBe(1);
    });

    it('prevents queries after limit until reset', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let result: boolean;

      act(() => {
        // Max out queries
        for (let i = 0; i < 10; i++) {
          useQuotaStore.getState().consumeQuery();
        }
      });

      // Try one more, should fail
      result = useQuotaStore.getState().consumeQuery();
      expect(result).toBe(false);

      // Advance time past reset
      vi.setSystemTime(now + 13 * 60 * 60 * 1000);

      // Manually call checkAndResetIfNeeded to reset the quota
      act(() => {
        useQuotaStore.getState().checkAndResetIfNeeded();
      });

      // Now consumeQuery should work
      result = useQuotaStore.getState().consumeQuery();

      // Should work now
      expect(result).toBe(true);
      expect(useQuotaStore.getState().queriesUsed).toBe(1);
    });
  });
});
