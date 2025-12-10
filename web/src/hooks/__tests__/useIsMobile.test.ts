import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIsMobile, useIsMobileOnly } from '../useIsMobile';

describe('useIsMobile', () => {
  let matchMediaMock: {
    matches: boolean;
    media: string;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    addListener: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
    dispatchEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Create a fresh matchMedia mock for each test
    matchMediaMock = {
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        ...matchMediaMock,
        media: query,
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns desktop state for desktop viewport (>= 1024px)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.width).toBe(1024);
    });

    it('returns mobile state for mobile viewport (< 768px)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(375);
    });

    it('returns tablet state for tablet viewport (768px - 1023px)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(800);
    });
  });

  describe('breakpoint detection', () => {
    it('correctly identifies mobile breakpoint at 767px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 767, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('correctly identifies tablet breakpoint at 768px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('correctly identifies tablet breakpoint at 1023px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1023, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('correctly identifies desktop breakpoint at 1024px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('event listeners', () => {
    it('sets up matchMedia event listeners', () => {
      renderHook(() => useIsMobile());

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1023px)');
      expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('sets up window resize listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useIsMobile());

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useIsMobile());

      unmount();

      expect(matchMediaMock.removeEventListener).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('responsive updates', () => {
    it('updates state when window is resized', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isDesktop).toBe(true);

      // Resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(result.current.isMobile).toBe(true);
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.width).toBe(375);
      });
    });

    it('updates state when matchMedia changes', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

      const mockAddEventListener = vi.fn((event, handler) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('max-width: 767px') ? false : true,
          media: query,
          addEventListener: mockAddEventListener,
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useIsMobile());

      expect(result.current.isDesktop).toBe(true);

      // Trigger matchMedia change
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
        if (changeHandler) {
          changeHandler({} as MediaQueryListEvent);
        }
      });

      await waitFor(() => {
        expect(result.current.isMobile).toBe(true);
      });
    });
  });
});

describe('useIsMobileOnly', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it('returns true when viewport is mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

    const { result } = renderHook(() => useIsMobileOnly());

    expect(result.current).toBe(true);
  });

  it('returns false when viewport is tablet', () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });

    const { result } = renderHook(() => useIsMobileOnly());

    expect(result.current).toBe(false);
  });

  it('returns false when viewport is desktop', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });

    const { result } = renderHook(() => useIsMobileOnly());

    expect(result.current).toBe(false);
  });
});
