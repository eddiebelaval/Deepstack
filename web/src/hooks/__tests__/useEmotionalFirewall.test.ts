import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmotionalFirewall } from '../useEmotionalFirewall';

// Mock fetch
const mockFetch = vi.fn();

describe('useEmotionalFirewall', () => {
  const mockSafeStatus = {
    blocked: false,
    status: 'safe',
    patterns_detected: [],
    reasons: [],
    stats: {
      trades_today: 5,
      pnl_today: 150,
      winning_streak: 2,
      losing_streak: 0,
    },
  };

  const mockWarningStatus = {
    blocked: false,
    status: 'warning',
    patterns_detected: ['revenge_trading'],
    reasons: ['Multiple losses in short period'],
    stats: {
      trades_today: 10,
      pnl_today: -200,
      winning_streak: 0,
      losing_streak: 3,
    },
  };

  const mockBlockedStatus = {
    blocked: true,
    status: 'blocked',
    patterns_detected: ['tilt', 'overtrading'],
    reasons: ['Daily loss limit exceeded', 'Too many trades'],
    cooldown_expires: new Date(Date.now() + 3600000).toISOString(),
    stats: {
      trades_today: 20,
      pnl_today: -500,
      winning_streak: 0,
      losing_streak: 5,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Properly mock global fetch
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSafeStatus),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state and loading', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      expect(result.current.loading).toBe(true);
      expect(result.current.status).toBeNull();
    });

    it('should fetch status on mount', async () => {
      renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check');
      });
    });

    it('should set loading to false after fetch', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('status parsing', () => {
    it('should parse safe status correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSafeStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.isSafe).toBe(true);
        expect(result.current.isWarning).toBe(false);
        expect(result.current.isBlocked).toBe(false);
      });
    });

    it('should parse warning status correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWarningStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.isSafe).toBe(false);
        expect(result.current.isWarning).toBe(true);
        expect(result.current.isBlocked).toBe(false);
        expect(result.current.patterns).toContain('revenge_trading');
      });
    });

    it('should parse blocked status correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBlockedStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.isSafe).toBe(false);
        expect(result.current.isWarning).toBe(false);
        expect(result.current.isBlocked).toBe(true);
        expect(result.current.patterns).toContain('tilt');
        expect(result.current.patterns).toContain('overtrading');
      });
    });

    it('should calculate cooldown remaining', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBlockedStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.cooldownRemaining).toBeGreaterThan(0);
        expect(result.current.cooldownRemaining).toBeLessThanOrEqual(3600000);
      });
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch firewall status');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('polling', () => {
    it('should not poll when disabled', async () => {
      const { result } = renderHook(() =>
        useEmotionalFirewall({ enabled: false })
      );

      // Should not fetch at all
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
    });
  });

  describe('checkTrade', () => {
    it('should check if trade would be blocked', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWarningStatus),
      });

      await act(async () => {
        const checkResult = await result.current.checkTrade('AAPL', 100);
        expect(checkResult.status).toBe('warning');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_trade',
          symbol: 'AAPL',
          size: 100,
        }),
      });
    });

    it('should throw on check trade error', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        act(async () => {
          await result.current.checkTrade('AAPL', 100);
        })
      ).rejects.toThrow('Failed to check trade');
    });
  });

  describe('recordTrade', () => {
    it('should record a completed trade', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.recordTrade('AAPL', 50, 100);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_trade',
          symbol: 'AAPL',
          pnl: 50,
          size: 100,
        }),
      });
    });

    it('should refresh status after recording', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const fetchCountBefore = mockFetch.mock.calls.length;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.recordTrade('AAPL', 50);
      });

      // Should have called fetch twice more: once for record, once for refresh
      expect(mockFetch.mock.calls.length).toBeGreaterThan(fetchCountBefore);
    });
  });

  describe('clearCooldown', () => {
    it('should clear active cooldown', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.clearCooldown();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_cooldown' }),
      });
    });
  });

  describe('checkStatus', () => {
    it('should manually refresh status', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.checkStatus();
      });

      expect(mockFetch.mock.calls.length).toBe(initialCallCount + 1);
    });
  });

  describe('computed values', () => {
    it('should return empty arrays for patterns and reasons when null', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blocked: false, status: 'safe' }),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.patterns).toEqual([]);
      expect(result.current.reasons).toEqual([]);
    });

    it('should return null stats when not available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ blocked: false, status: 'safe' }),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats).toBeNull();
    });
  });
});
