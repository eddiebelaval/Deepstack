import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchPaletteStore, useShortcut } from '../useKeyboardShortcuts';

describe('useSearchPaletteStore', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useSearchPaletteStore.setState({
        isSearchOpen: false,
        searchQuery: '',
      });
    });
  });

  describe('initial state', () => {
    it('starts with search closed', () => {
      const { isSearchOpen } = useSearchPaletteStore.getState();
      expect(isSearchOpen).toBe(false);
    });

    it('starts with empty search query', () => {
      const { searchQuery } = useSearchPaletteStore.getState();
      expect(searchQuery).toBe('');
    });
  });

  describe('setSearchOpen', () => {
    it('opens search', () => {
      act(() => {
        useSearchPaletteStore.getState().setSearchOpen(true);
      });

      expect(useSearchPaletteStore.getState().isSearchOpen).toBe(true);
    });

    it('clears query when opening', () => {
      act(() => {
        useSearchPaletteStore.setState({ searchQuery: 'test' });
        useSearchPaletteStore.getState().setSearchOpen(true);
      });

      expect(useSearchPaletteStore.getState().searchQuery).toBe('');
    });

    it('closes search', () => {
      act(() => {
        useSearchPaletteStore.setState({ isSearchOpen: true });
        useSearchPaletteStore.getState().setSearchOpen(false);
      });

      expect(useSearchPaletteStore.getState().isSearchOpen).toBe(false);
    });
  });

  describe('setSearchQuery', () => {
    it('updates search query', () => {
      act(() => {
        useSearchPaletteStore.getState().setSearchQuery('AAPL');
      });

      expect(useSearchPaletteStore.getState().searchQuery).toBe('AAPL');
    });
  });

  describe('toggleSearch', () => {
    it('opens search when closed', () => {
      act(() => {
        useSearchPaletteStore.getState().toggleSearch();
      });

      expect(useSearchPaletteStore.getState().isSearchOpen).toBe(true);
    });

    it('closes search when open', () => {
      act(() => {
        useSearchPaletteStore.setState({ isSearchOpen: true });
        useSearchPaletteStore.getState().toggleSearch();
      });

      expect(useSearchPaletteStore.getState().isSearchOpen).toBe(false);
    });

    it('clears query on toggle', () => {
      act(() => {
        useSearchPaletteStore.setState({ searchQuery: 'test' });
        useSearchPaletteStore.getState().toggleSearch();
      });

      expect(useSearchPaletteStore.getState().searchQuery).toBe('');
    });
  });
});

describe('useShortcut', () => {
  beforeEach(() => {
    // Clean up any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls handler when key is pressed', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('x', handler));

    // Simulate keydown
    const event = new KeyboardEvent('keydown', {
      key: 'x',
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('does not call handler for different key', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('x', handler));

    const event = new KeyboardEvent('keydown', {
      key: 'y',
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('handles shift modifier', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('x', handler, { shift: true }));

    // Without shift - should not trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(handler).not.toHaveBeenCalled();

    // With shift - should trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', shiftKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('handles meta modifier', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('k', handler, { meta: true }));

    // Without meta - should not trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(handler).not.toHaveBeenCalled();

    // With meta - should trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('handles ctrl modifier', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('k', handler, { ctrl: true }));

    // Without ctrl - should not trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(handler).not.toHaveBeenCalled();

    // With ctrl - should trigger
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('case insensitive key matching', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('k', handler));

    // Uppercase K should match
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K' }));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('prevents default on matching shortcut', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('x', handler));

    const event = new KeyboardEvent('keydown', {
      key: 'x',
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();

    unmount();
  });

  it('does not trigger when typing in input', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useShortcut('x', handler));

    // Create an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'x',
      bubbles: true,
    });

    // Override the target
    Object.defineProperty(event, 'target', { value: input, writable: false });
    document.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
    unmount();
  });

  it('removes event listener on unmount', () => {
    const handler = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useShortcut('x', handler));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
