import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMarketStatus, useIsMarketOpen } from '../useMarketStatus';
import * as marketHours from '@/lib/market-hours';

// Mock the market-hours module
vi.mock('@/lib/market-hours', async () => {
  const actual = await vi.importActual('@/lib/market-hours');
  return {
    ...actual,
    getMarketStatus: vi.fn(),
    formatTimeUntil: vi.fn(),
  };
});

describe('useMarketStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use fake timers but don't mock requestAnimationFrame
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });

    // Default mock return value
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: true,
      session: 'regular',
      message: 'Market is open',
      nextOpen: null,
      nextClose: new Date('2024-01-01T16:00:00Z'),
    });

    vi.mocked(marketHours.formatTimeUntil).mockReturnValue('2 hours 30 minutes');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns market status object', () => {
    const { result } = renderHook(() => useMarketStatus());

    expect(result.current).toHaveProperty('isOpen');
    expect(result.current).toHaveProperty('session');
    expect(result.current).toHaveProperty('message');
    expect(result.current).toHaveProperty('timeUntilChange');
    expect(result.current).toHaveProperty('refresh');
  });

  it('returns a valid session type', () => {
    const { result } = renderHook(() => useMarketStatus());

    expect(['regular', 'premarket', 'afterhours', 'closed']).toContain(result.current.session);
  });

  it('isOpen is boolean', () => {
    const { result } = renderHook(() => useMarketStatus());

    expect(typeof result.current.isOpen).toBe('boolean');
  });

  it('message is a string', () => {
    const { result } = renderHook(() => useMarketStatus());

    expect(typeof result.current.message).toBe('string');
    expect(result.current.message.length).toBeGreaterThan(0);
  });

  it('refresh function is callable', () => {
    const { result } = renderHook(() => useMarketStatus());

    expect(typeof result.current.refresh).toBe('function');

    const initialCallCount = vi.mocked(marketHours.getMarketStatus).mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    expect(vi.mocked(marketHours.getMarketStatus)).toHaveBeenCalledTimes(initialCallCount + 1);
  });

  it('auto-refreshes at specified interval', () => {
    const refreshInterval = 30000; // 30 seconds
    renderHook(() => useMarketStatus({ refreshInterval }));

    const initialCalls = vi.mocked(marketHours.getMarketStatus).mock.calls.length;

    // Advance time by refresh interval
    act(() => {
      vi.advanceTimersByTime(refreshInterval);
    });

    expect(vi.mocked(marketHours.getMarketStatus).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('uses default refresh interval of 60 seconds', () => {
    renderHook(() => useMarketStatus());

    const initialCalls = vi.mocked(marketHours.getMarketStatus).mock.calls.length;

    // Advance time by default interval (60000ms)
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(vi.mocked(marketHours.getMarketStatus).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useMarketStatus());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('calculates timeUntilChange for open market', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: true,
      session: 'regular',
      message: 'Market is open',
      nextOpen: null,
      nextClose: new Date('2024-01-01T16:00:00Z'),
    });

    vi.mocked(marketHours.formatTimeUntil).mockReturnValue('3 hours 15 minutes');

    const { result } = renderHook(() => useMarketStatus());

    expect(result.current.timeUntilChange).toBe('3 hours 15 minutes');
    expect(marketHours.formatTimeUntil).toHaveBeenCalledWith(expect.any(Date));
  });

  it('calculates timeUntilChange for closed market', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: false,
      session: 'closed',
      message: 'Market is closed',
      nextOpen: new Date('2024-01-02T09:30:00Z'),
      nextClose: null,
    });

    vi.mocked(marketHours.formatTimeUntil).mockReturnValue('14 hours');

    const { result } = renderHook(() => useMarketStatus());

    expect(result.current.timeUntilChange).toBe('14 hours');
    expect(marketHours.formatTimeUntil).toHaveBeenCalledWith(expect.any(Date));
  });

  it('returns null timeUntilChange when no next event', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: false,
      session: 'closed',
      message: 'Market is closed',
      nextOpen: null,
      nextClose: null,
    });

    const { result } = renderHook(() => useMarketStatus());

    expect(result.current.timeUntilChange).toBeNull();
  });

  it('updates status when market transitions from open to closed', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValueOnce({
      isOpen: true,
      session: 'regular',
      message: 'Market is open',
      nextOpen: null,
      nextClose: new Date('2024-01-01T16:00:00Z'),
    });

    const { result } = renderHook(() => useMarketStatus());

    expect(result.current.isOpen).toBe(true);

    // Mock the market closing
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: false,
      session: 'closed',
      message: 'Market is closed',
      nextOpen: new Date('2024-01-02T09:30:00Z'),
      nextClose: null,
    });

    // Trigger refresh
    act(() => {
      result.current.refresh();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.session).toBe('closed');
  });

  it('handles premarket session correctly', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: true,
      session: 'premarket',
      message: 'Pre-market trading',
      nextOpen: new Date('2024-01-01T09:30:00Z'),
      nextClose: null,
    });

    const { result } = renderHook(() => useMarketStatus());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.session).toBe('premarket');
  });

  it('handles afterhours session correctly', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: true,
      session: 'afterhours',
      message: 'After-hours trading',
      nextOpen: new Date('2024-01-02T09:30:00Z'),
      nextClose: null,
    });

    const { result } = renderHook(() => useMarketStatus());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.session).toBe('afterhours');
  });

  it('refreshes status on initial mount', () => {
    const callsBeforeMount = vi.mocked(marketHours.getMarketStatus).mock.calls.length;

    renderHook(() => useMarketStatus());

    expect(vi.mocked(marketHours.getMarketStatus).mock.calls.length).toBeGreaterThan(
      callsBeforeMount
    );
  });
});

describe('useIsMarketOpen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });

    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: true,
      session: 'regular',
      message: 'Market is open',
      nextOpen: null,
      nextClose: new Date('2024-01-01T16:00:00Z'),
    });

    vi.mocked(marketHours.formatTimeUntil).mockReturnValue('2 hours 30 minutes');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a boolean', () => {
    const { result } = renderHook(() => useIsMarketOpen());

    expect(typeof result.current).toBe('boolean');
  });

  it('returns true when market is open', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: true,
      session: 'regular',
      message: 'Market is open',
      nextOpen: null,
      nextClose: new Date(),
    });

    const { result } = renderHook(() => useIsMarketOpen());

    expect(result.current).toBe(true);
  });

  it('returns false when market is closed', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: false,
      session: 'closed',
      message: 'Market is closed',
      nextOpen: new Date(),
      nextClose: null,
    });

    const { result } = renderHook(() => useIsMarketOpen());

    expect(result.current).toBe(false);
  });

  it('updates when market status changes', () => {
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: true,
      session: 'regular',
      message: 'Market is open',
      nextOpen: null,
      nextClose: new Date(),
    });

    const { result } = renderHook(() => useIsMarketOpen());

    expect(result.current).toBe(true);

    // Market closes
    vi.mocked(marketHours.getMarketStatus).mockReturnValue({
      isOpen: false,
      session: 'closed',
      message: 'Market is closed',
      nextOpen: new Date(),
      nextClose: null,
    });

    // Advance time to trigger refresh
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current).toBe(false);
  });
});
