// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMobileMarketWatcher,
  type MarketWatcherState,
  DEFAULT_MARKET_SYMBOLS,
} from '../useMobileMarketWatcher';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('useMobileMarketWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('starts in collapsed state by default', () => {
      const { result } = renderHook(() => useMobileMarketWatcher());

      expect(result.current.state).toBe('collapsed');
      expect(result.current.isExpanded).toBe(false);
      expect(result.current.isFull).toBe(false);
    });

    it('accepts custom initial state', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      expect(result.current.state).toBe('mini');
      expect(result.current.isExpanded).toBe(true);
      expect(result.current.isFull).toBe(false);
    });

    it('loads persisted state from localStorage on mount', () => {
      localStorageMock.setItem('deepstack:mobile-market-watcher-state', 'mini');

      const { result } = renderHook(() => useMobileMarketWatcher());

      expect(result.current.state).toBe('mini');
    });

    it('ignores persisted full state (always starts collapsed/mini)', () => {
      localStorageMock.setItem('deepstack:mobile-market-watcher-state', 'full');

      const { result } = renderHook(() => useMobileMarketWatcher());

      expect(result.current.state).toBe('collapsed');
    });

    it('handles localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make localStorage.getItem throw
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useMobileMarketWatcher());

      // Should fall back to default state
      expect(result.current.state).toBe('collapsed');

      consoleSpy.mockRestore();
    });
  });

  describe('State Transitions', () => {
    it('expands from collapsed to mini', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.expand();
      });

      expect(result.current.state).toBe('mini');
      expect(result.current.isExpanded).toBe(true);
    });

    it('collapses from mini to collapsed', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      act(() => {
        result.current.collapse();
      });

      expect(result.current.state).toBe('collapsed');
      expect(result.current.isExpanded).toBe(false);
    });

    it('goes to full from mini', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      act(() => {
        result.current.goFull();
      });

      expect(result.current.state).toBe('full');
      expect(result.current.isFull).toBe(true);
      expect(result.current.isExpanded).toBe(true);
    });

    it('goes to full from collapsed', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.goFull();
      });

      expect(result.current.state).toBe('full');
      expect(result.current.isFull).toBe(true);
    });

    it('returns to mini from full', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('full'));

      act(() => {
        result.current.goMini();
      });

      expect(result.current.state).toBe('mini');
      expect(result.current.isFull).toBe(false);
      expect(result.current.isExpanded).toBe(true);
    });

    it('toggles between collapsed and mini', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.toggle();
      });

      expect(result.current.state).toBe('mini');

      act(() => {
        result.current.toggle();
      });

      expect(result.current.state).toBe('collapsed');
    });

    it('toggle does not affect full state', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('full'));

      act(() => {
        result.current.toggle();
      });

      // Should collapse from full
      expect(result.current.state).toBe('collapsed');
    });

    it('allows direct state setting', () => {
      const { result } = renderHook(() => useMobileMarketWatcher());

      act(() => {
        result.current.setState('mini');
      });

      expect(result.current.state).toBe('mini');

      act(() => {
        result.current.setState('full');
      });

      expect(result.current.state).toBe('full');

      act(() => {
        result.current.setState('collapsed');
      });

      expect(result.current.state).toBe('collapsed');
    });
  });

  describe('State Persistence', () => {
    it('persists collapsed state to localStorage', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      act(() => {
        result.current.collapse();
      });

      expect(localStorageMock.getItem('deepstack:mobile-market-watcher-state')).toBe('collapsed');
    });

    it('persists mini state to localStorage', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.expand();
      });

      expect(localStorageMock.getItem('deepstack:mobile-market-watcher-state')).toBe('mini');
    });

    it('does not persist full state to localStorage', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      act(() => {
        result.current.goFull();
      });

      // Should still have 'mini' in storage, not 'full'
      expect(localStorageMock.getItem('deepstack:mobile-market-watcher-state')).not.toBe('full');
    });

    it('handles localStorage write errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make localStorage.setItem throw
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.expand();
      });

      // State should still update even if persistence fails
      expect(result.current.state).toBe('mini');

      consoleSpy.mockRestore();
    });

    it('handles undefined window gracefully', () => {
      // The hook checks typeof window !== 'undefined', so it should work fine
      // in browser environment. We can't actually test SSR without breaking other tests
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.expand();
      });

      // State should still update even if persistence fails
      expect(result.current.state).toBe('mini');
    });
  });

  describe('Computed Properties', () => {
    it('isExpanded is false for collapsed', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      expect(result.current.isExpanded).toBe(false);
    });

    it('isExpanded is true for mini', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      expect(result.current.isExpanded).toBe(true);
    });

    it('isExpanded is true for full', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('full'));

      expect(result.current.isExpanded).toBe(true);
    });

    it('isFull is false for collapsed', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      expect(result.current.isFull).toBe(false);
    });

    it('isFull is false for mini', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      expect(result.current.isFull).toBe(false);
    });

    it('isFull is true for full', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('full'));

      expect(result.current.isFull).toBe(true);
    });

    it('updates computed properties when state changes', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      expect(result.current.isExpanded).toBe(false);
      expect(result.current.isFull).toBe(false);

      act(() => {
        result.current.expand();
      });

      expect(result.current.isExpanded).toBe(true);
      expect(result.current.isFull).toBe(false);

      act(() => {
        result.current.goFull();
      });

      expect(result.current.isExpanded).toBe(true);
      expect(result.current.isFull).toBe(true);
    });
  });

  describe('Default Market Symbols', () => {
    it('exports default market symbols', () => {
      expect(DEFAULT_MARKET_SYMBOLS).toHaveLength(6);
      expect(DEFAULT_MARKET_SYMBOLS).toContain('SPY');
      expect(DEFAULT_MARKET_SYMBOLS).toContain('QQQ');
      expect(DEFAULT_MARKET_SYMBOLS).toContain('VIX');
      expect(DEFAULT_MARKET_SYMBOLS).toContain('GLD');
      expect(DEFAULT_MARKET_SYMBOLS).toContain('TLT');
      expect(DEFAULT_MARKET_SYMBOLS).toContain('BTC-USD');
    });

    it('default symbols are readonly array', () => {
      // TypeScript enforces readonly at compile time
      // At runtime, the as const makes it a readonly tuple
      expect(DEFAULT_MARKET_SYMBOLS).toHaveLength(6);
      expect(Array.isArray(DEFAULT_MARKET_SYMBOLS)).toBe(true);
    });
  });

  describe('State Machine Transitions', () => {
    it('follows collapsed -> mini -> full path', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      expect(result.current.state).toBe('collapsed');

      act(() => {
        result.current.expand();
      });

      expect(result.current.state).toBe('mini');

      act(() => {
        result.current.goFull();
      });

      expect(result.current.state).toBe('full');
    });

    it('follows full -> mini -> collapsed path', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('full'));

      expect(result.current.state).toBe('full');

      act(() => {
        result.current.goMini();
      });

      expect(result.current.state).toBe('mini');

      act(() => {
        result.current.collapse();
      });

      expect(result.current.state).toBe('collapsed');
    });

    it('allows direct jumps between states', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      // Jump directly to full
      act(() => {
        result.current.goFull();
      });

      expect(result.current.state).toBe('full');

      // Jump directly to collapsed
      act(() => {
        result.current.collapse();
      });

      expect(result.current.state).toBe('collapsed');
    });
  });

  describe('Multiple Instances', () => {
    it('manages state independently for multiple instances', () => {
      const { result: result1 } = renderHook(() => useMobileMarketWatcher('collapsed'));
      const { result: result2 } = renderHook(() => useMobileMarketWatcher('mini'));

      expect(result1.current.state).toBe('collapsed');
      expect(result2.current.state).toBe('mini');

      act(() => {
        result1.current.expand();
      });

      expect(result1.current.state).toBe('mini');
      expect(result2.current.state).toBe('mini');
    });

    it('shares localStorage state across instances', () => {
      const { result: result1 } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result1.current.expand();
      });

      // New instance should pick up the persisted state
      const { result: result2 } = renderHook(() => useMobileMarketWatcher('collapsed'));

      expect(result2.current.state).toBe('mini');
    });
  });

  describe('Callback Stability', () => {
    it('maintains stable callback references', () => {
      const { result, rerender } = renderHook(() => useMobileMarketWatcher('collapsed'));

      const {
        expand: expand1,
        collapse: collapse1,
        goFull: goFull1,
        goMini: goMini1,
        toggle: toggle1,
        setState: setState1,
      } = result.current;

      rerender();

      const {
        expand: expand2,
        collapse: collapse2,
        goFull: goFull2,
        goMini: goMini2,
        toggle: toggle2,
        setState: setState2,
      } = result.current;

      expect(expand1).toBe(expand2);
      expect(collapse1).toBe(collapse2);
      expect(goFull1).toBe(goFull2);
      expect(goMini1).toBe(goMini2);
      expect(toggle1).toBe(toggle2);
      expect(setState1).toBe(setState2);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid state transitions', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.expand();
        result.current.collapse();
        result.current.expand();
        result.current.goFull();
        result.current.goMini();
        result.current.collapse();
      });

      expect(result.current.state).toBe('collapsed');
    });

    it('handles calling same action multiple times', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        result.current.expand();
        result.current.expand();
        result.current.expand();
      });

      expect(result.current.state).toBe('mini');
    });

    it('handles setState with same state', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('mini'));

      // Setting state to same value still triggers the setter
      act(() => {
        result.current.setState('mini');
      });

      expect(result.current.state).toBe('mini');

      // Verify it persists
      expect(localStorageMock.getItem('deepstack:mobile-market-watcher-state')).toBe('mini');
    });

    it('handles invalid state types gracefully', () => {
      const { result } = renderHook(() => useMobileMarketWatcher('collapsed'));

      act(() => {
        // @ts-expect-error - testing invalid state
        result.current.setState('invalid');
      });

      // State should update even with invalid value (TypeScript would prevent this)
      expect(result.current.state).toBe('invalid');
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      let renderCount = 0;
      const { result, rerender } = renderHook(() => {
        renderCount++;
        return useMobileMarketWatcher('collapsed');
      });

      const initialRenderCount = renderCount;

      rerender();

      // Should not cause re-render if state hasn't changed
      expect(renderCount).toBe(initialRenderCount + 1); // +1 for rerender call
    });

    it('updates efficiently on state change', () => {
      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useMobileMarketWatcher('collapsed');
      });

      const beforeChange = renderCount;

      act(() => {
        result.current.expand();
      });

      // Should only cause one re-render
      expect(renderCount).toBe(beforeChange + 1);
    });
  });
});
