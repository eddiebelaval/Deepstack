import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMarketStatus, useIsMarketOpen } from '../useMarketStatus';

describe('useMarketStatus', () => {
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

    // Should not throw
    act(() => {
      result.current.refresh();
    });
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useMarketStatus());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

describe('useIsMarketOpen', () => {
  it('returns a boolean', () => {
    const { result } = renderHook(() => useIsMarketOpen());

    expect(typeof result.current).toBe('boolean');
  });
});
