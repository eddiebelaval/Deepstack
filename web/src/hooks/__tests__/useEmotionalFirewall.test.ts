import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmotionalFirewall } from '../useEmotionalFirewall';

// Mock fetch
const mockFetch = vi.fn();

describe('useEmotionalFirewall', () => {
  const mockFocusedStatus = {
    compromised: false,
    status: 'focused',
    patterns_detected: [],
    reasons: [],
    break_recommended_until: null,
    session: {
      duration_minutes: 30,
      started_at: new Date().toISOString(),
      queries_this_session: 5,
      sessions_today: 2,
    },
  };

  const mockCautionStatus = {
    compromised: false,
    status: 'caution',
    patterns_detected: ['session_fatigue'],
    reasons: ['Long session (125 min) - consider a break to maintain clarity'],
    break_recommended_until: null,
    session: {
      duration_minutes: 125,
      started_at: new Date().toISOString(),
      queries_this_session: 20,
      sessions_today: 3,
    },
  };

  const mockCompromisedStatus = {
    compromised: true,
    status: 'compromised',
    patterns_detected: ['late_night', 'extended_session'],
    reasons: ['Late night session', 'Extended session (200 min)'],
    break_recommended_until: new Date(Date.now() + 3600000).toISOString(),
    session: {
      duration_minutes: 200,
      started_at: new Date().toISOString(),
      queries_this_session: 50,
      sessions_today: 5,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Properly mock global fetch
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFocusedStatus),
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
    it('should parse focused status correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFocusedStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.isFocused).toBe(true);
        expect(result.current.isSafe).toBe(true); // backward compat
        expect(result.current.isCaution).toBe(false);
        expect(result.current.isWarning).toBe(false); // backward compat
        expect(result.current.isCompromised).toBe(false);
        expect(result.current.isBlocked).toBe(false); // backward compat
      });
    });

    it('should parse caution status correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCautionStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.isFocused).toBe(false);
        expect(result.current.isCaution).toBe(true);
        expect(result.current.isWarning).toBe(true); // backward compat
        expect(result.current.isCompromised).toBe(false);
        expect(result.current.patterns).toContain('session_fatigue');
      });
    });

    it('should parse compromised status correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCompromisedStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.isFocused).toBe(false);
        expect(result.current.isCaution).toBe(false);
        expect(result.current.isCompromised).toBe(true);
        expect(result.current.isBlocked).toBe(true); // backward compat
        expect(result.current.patterns).toContain('late_night');
        expect(result.current.patterns).toContain('extended_session');
      });
    });

    it('should calculate break remaining', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCompromisedStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.breakRemaining).toBeGreaterThan(0);
        expect(result.current.breakRemaining).toBeLessThanOrEqual(3600000);
        expect(result.current.cooldownRemaining).toBeGreaterThan(0); // backward compat
      });
    });

    it('should return session data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFocusedStatus),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
        expect(result.current.session?.duration_minutes).toBe(30);
        expect(result.current.session?.queries_this_session).toBe(5);
        expect(result.current.session?.sessions_today).toBe(2);
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
        expect(result.current.error).toBe('Failed to fetch decision fitness status');
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

  describe('recordQuery', () => {
    it('should record a query interaction', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ...mockFocusedStatus }),
      });

      await act(async () => {
        const recordResult = await result.current.recordQuery();
        expect(recordResult?.status).toBe('focused');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_query' }),
      });
    });

    it('should handle record query error gracefully', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await act(async () => {
        const recordResult = await result.current.recordQuery();
        expect(recordResult).toBeNull();
      });

      expect(result.current.error).toBe('Failed to record query');
    });
  });

  describe('startSession', () => {
    it('should start a new session', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.startSession();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_session' }),
      });
    });
  });

  describe('endSession', () => {
    it('should end current session', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.endSession();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end_session' }),
      });
    });
  });

  describe('takeBreak', () => {
    it('should acknowledge break', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.takeBreak();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take_break' }),
      });
    });
  });

  describe('dismissBreak', () => {
    it('should dismiss break recommendation', async () => {
      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.dismissBreak();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/emotional-firewall/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_break' }),
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
        json: () => Promise.resolve({ compromised: false, status: 'focused' }),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.patterns).toEqual([]);
      expect(result.current.reasons).toEqual([]);
    });

    it('should return null session when not available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ compromised: false, status: 'focused' }),
      });

      const { result } = renderHook(() => useEmotionalFirewall());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toBeNull();
    });
  });

  describe('useDecisionFitness alias', () => {
    it('should export useDecisionFitness as an alias', async () => {
      const { useDecisionFitness } = await import('../useEmotionalFirewall');
      expect(useDecisionFitness).toBe(useEmotionalFirewall);
    });
  });
});
