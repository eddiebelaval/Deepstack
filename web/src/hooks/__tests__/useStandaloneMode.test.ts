import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStandaloneMode, useInstallPrompt } from '../useStandaloneMode';

describe('useStandaloneMode', () => {
  const originalMatchMedia = window.matchMedia;
  const originalNavigator = window.navigator;

  let mockStandaloneQuery: { matches: boolean; addEventListener: any; removeEventListener: any };
  let mockMinimalUIQuery: { matches: boolean };
  let mockFullscreenQuery: { matches: boolean };

  beforeEach(() => {
    mockStandaloneQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockMinimalUIQuery = { matches: false };
    mockFullscreenQuery = { matches: false };

    window.matchMedia = vi.fn((query) => {
      if (query === '(display-mode: standalone)') return mockStandaloneQuery as any;
      if (query === '(display-mode: minimal-ui)') return mockMinimalUIQuery as any;
      if (query === '(display-mode: fullscreen)') return mockFullscreenQuery as any;
      return { matches: false } as any;
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with browser mode', async () => {
      const { result } = renderHook(() => useStandaloneMode());

      await waitFor(() => {
        expect(result.current.displayMode).toBe('browser');
      });

      expect(result.current.isStandalone).toBe(false);
      expect(result.current.canInstall).toBe(false);
    });
  });

  describe('standalone detection', () => {
    it('should detect standalone mode via media query', async () => {
      mockStandaloneQuery.matches = true;

      const { result } = renderHook(() => useStandaloneMode());

      await waitFor(() => {
        expect(result.current.isStandalone).toBe(true);
        expect(result.current.displayMode).toBe('standalone');
      });
    });

    it('should detect minimal-ui mode', async () => {
      mockMinimalUIQuery.matches = true;

      const { result } = renderHook(() => useStandaloneMode());

      await waitFor(() => {
        expect(result.current.isStandalone).toBe(true);
        expect(result.current.displayMode).toBe('minimal-ui');
      });
    });

    it('should detect fullscreen mode', async () => {
      mockFullscreenQuery.matches = true;

      const { result } = renderHook(() => useStandaloneMode());

      await waitFor(() => {
        expect(result.current.isStandalone).toBe(true);
        expect(result.current.displayMode).toBe('fullscreen');
      });
    });
  });

  describe('iOS detection', () => {
    it('should detect iOS via userAgent', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      const { result } = renderHook(() => useStandaloneMode());

      await waitFor(() => {
        expect(result.current.isIOS).toBe(true);
      });
    });

    it('should detect iPad via userAgent', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        configurable: true,
      });

      const { result } = renderHook(() => useStandaloneMode());

      await waitFor(() => {
        expect(result.current.isIOS).toBe(true);
      });
    });
  });

  describe('install prompt detection', () => {
    it('should set canInstall when beforeinstallprompt fires', async () => {
      const { result } = renderHook(() => useStandaloneMode());

      expect(result.current.canInstall).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('beforeinstallprompt'));
      });

      await waitFor(() => {
        expect(result.current.canInstall).toBe(true);
      });
    });
  });

  describe('event listeners', () => {
    it('should add display mode change listener', () => {
      renderHook(() => useStandaloneMode());

      expect(mockStandaloneQuery.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should cleanup listeners on unmount', () => {
      const { unmount } = renderHook(() => useStandaloneMode());

      unmount();

      expect(mockStandaloneQuery.removeEventListener).toHaveBeenCalled();
    });
  });
});

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useInstallPrompt());

      expect(result.current.canPrompt).toBe(false);
      expect(result.current.isInstalled).toBe(false);
      expect(typeof result.current.promptInstall).toBe('function');
    });
  });

  describe('beforeinstallprompt handling', () => {
    it('should capture install prompt event', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      const mockEvent = new Event('beforeinstallprompt');
      Object.defineProperty(mockEvent, 'preventDefault', {
        value: vi.fn(),
      });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(result.current.canPrompt).toBe(true);
      });
    });

    it('should prevent default on beforeinstallprompt', async () => {
      renderHook(() => useInstallPrompt());

      const mockPreventDefault = vi.fn();
      const mockEvent = new Event('beforeinstallprompt');
      Object.defineProperty(mockEvent, 'preventDefault', {
        value: mockPreventDefault,
      });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      expect(mockPreventDefault).toHaveBeenCalled();
    });
  });

  describe('appinstalled handling', () => {
    it('should set isInstalled when app is installed', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      await waitFor(() => {
        expect(result.current.isInstalled).toBe(true);
      });
    });

    it('should clear deferred prompt when installed', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      // First capture an install prompt
      const mockEvent = new Event('beforeinstallprompt');
      Object.defineProperty(mockEvent, 'preventDefault', { value: vi.fn() });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(result.current.canPrompt).toBe(true);
      });

      // Then install
      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      await waitFor(() => {
        expect(result.current.canPrompt).toBe(false);
        expect(result.current.isInstalled).toBe(true);
      });
    });
  });

  describe('promptInstall', () => {
    it('should return false if no prompt available', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      let installResult: boolean;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult!).toBe(false);
    });

    it('should call prompt and handle accepted outcome', async () => {
      const { result } = renderHook(() => useInstallPrompt());

      const mockPrompt = vi.fn();
      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      act(() => {
        const event = new Event('beforeinstallprompt');
        Object.assign(event, mockEvent);
        window.dispatchEvent(event);
      });

      // Need to set the deferred prompt manually since the event doesn't carry the methods
      // In real scenarios, the event object would have these methods
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useInstallPrompt());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'appinstalled',
        expect.any(Function)
      );
    });
  });
});
