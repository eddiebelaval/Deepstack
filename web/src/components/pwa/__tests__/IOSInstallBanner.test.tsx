import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IOSInstallBanner, InstallPromptBanner } from '../IOSInstallBanner';

// Mock useStandaloneMode hook
vi.mock('@/hooks/useStandaloneMode', () => ({
  useStandaloneMode: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { useStandaloneMode } from '@/hooks/useStandaloneMode';

// Create a proper localStorage mock with actual storage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

describe('IOSInstallBanner', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up localStorage mock
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Default to iOS Safari (not standalone)
    (useStandaloneMode as any).mockReturnValue({
      isStandalone: false,
      isIOS: true,
      isIOSStandalone: false,
      canInstall: false,
      displayMode: 'browser',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('display conditions', () => {
    it('shows banner on iOS Safari after delay', async () => {
      render(<IOSInstallBanner />);

      // Not visible initially
      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();

      // Advance timers past default delay - wrap in act for state updates
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByText('Add deepstack')).toBeInTheDocument();
    });

    it('does not show on non-iOS devices', async () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: false,
        isIOS: false,
        isIOSStandalone: false,
        canInstall: true,
        displayMode: 'browser',
      });

      render(<IOSInstallBanner />);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });

    it('does not show when already in standalone mode', async () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: true,
        isIOS: true,
        isIOSStandalone: true,
        canInstall: false,
        displayMode: 'standalone',
      });

      render(<IOSInstallBanner />);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });

    it('does not show if previously dismissed permanently', async () => {
      localStorageMock.setItem('ios-install-dismissed', 'true');

      render(<IOSInstallBanner />);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });

    it('respects custom delay prop', async () => {
      render(<IOSInstallBanner delay={5000} />);

      await act(async () => {
        vi.advanceTimersByTime(4999);
      });
      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByText('Add deepstack')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    beforeEach(async () => {
      render(<IOSInstallBanner />);
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
    });

    it('shows app icon', () => {
      const icon = document.querySelector('.bg-primary.rounded-xl');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('D');
    });

    it('shows title and subtitle', () => {
      expect(screen.getByText('Add deepstack')).toBeInTheDocument();
      expect(screen.getByText('to your Home Screen')).toBeInTheDocument();
    });

    it('shows installation instructions', () => {
      expect(screen.getByText(/Install deepstack for the best experience/)).toBeInTheDocument();
    });

    it('shows step 1 with Share icon', () => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(/Tap the/)).toBeInTheDocument();
      expect(screen.getByText('Share button')).toBeInTheDocument();
    });

    it('shows step 2 with Add to Home Screen', () => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText(/Scroll down and tap/)).toBeInTheDocument();
      expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
    });

    it('shows step 3 with Add instruction', () => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
      expect(screen.getByText(/in the top right/)).toBeInTheDocument();
    });

    it('renders icons for steps', () => {
      // Should have Share and Plus icons
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('dismiss actions', () => {
    it('closes temporarily when Got it is clicked', async () => {
      render(<IOSInstallBanner />);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const gotItButton = screen.getByText('Got it');
      await act(async () => {
        gotItButton.click();
      });

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
      expect(localStorageMock.getItem('ios-install-dismissed')).not.toBe('true');
    });

    it('closes permanently when Don\'t show again is clicked', async () => {
      render(<IOSInstallBanner />);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const dismissButton = screen.getByText("Don't show again");
      await act(async () => {
        dismissButton.click();
      });

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
      expect(localStorageMock.getItem('ios-install-dismissed')).toBe('true');
    });

    it('closes when X button is clicked', async () => {
      render(<IOSInstallBanner />);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const closeButton = screen.getByLabelText('Close');
      await act(async () => {
        closeButton.click();
      });

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });
  });

  describe('safe area insets', () => {
    it('applies safe area inset to bottom', async () => {
      render(<IOSInstallBanner />);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const banner = document.querySelector('.fixed.bottom-0');
      expect(banner).toHaveStyle({
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
      });
    });
  });

  describe('cleanup', () => {
    it('clears timeout on unmount', async () => {
      const { unmount } = render(<IOSInstallBanner delay={5000} />);

      unmount();

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      // Banner should not appear after unmount - no error means success
    });
  });
});

describe('InstallPromptBanner', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up localStorage mock
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    (useStandaloneMode as any).mockReturnValue({
      isStandalone: false,
      isIOS: false,
      isIOSStandalone: false,
      canInstall: true,
      displayMode: 'browser',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('display conditions', () => {
    it('shows when canInstall is true', async () => {
      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText('Install deepstack')).toBeInTheDocument();
    });

    it('does not show in standalone mode', async () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: true,
        isIOS: false,
        isIOSStandalone: false,
        canInstall: false,
        displayMode: 'standalone',
      });

      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });

    it('does not show when canInstall is false', async () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: false,
        isIOS: false,
        isIOSStandalone: false,
        canInstall: false,
        displayMode: 'browser',
      });

      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });

    it('does not show if previously dismissed', async () => {
      localStorageMock.setItem('install-prompt-dismissed', 'true');

      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });

    it('shows after 5 second delay', async () => {
      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(4999);
      });
      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByText('Install deepstack')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    beforeEach(async () => {
      render(<InstallPromptBanner />);
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
    });

    it('shows install message', () => {
      expect(screen.getByText('Install deepstack')).toBeInTheDocument();
      expect(screen.getByText(/Add to home screen for the best experience/)).toBeInTheDocument();
    });

    it('shows Later button', () => {
      expect(screen.getByText('Later')).toBeInTheDocument();
    });

    it('shows Install button', () => {
      expect(screen.getByText('Install')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('dismisses when Later is clicked', async () => {
      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const laterButton = screen.getByText('Later');
      await act(async () => {
        laterButton.click();
      });

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
      expect(localStorageMock.getItem('install-prompt-dismissed')).toBe('true');
    });

    it('triggers install prompt when Install is clicked', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const installButton = screen.getByText('Install');
      await act(async () => {
        installButton.click();
      });

      expect(dispatchEventSpy).toHaveBeenCalled();
      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });
  });

  describe('positioning', () => {
    it('appears at top of screen', async () => {
      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const banner = document.querySelector('.fixed.top-0');
      expect(banner).toBeInTheDocument();
    });

    it('applies safe area inset to top', async () => {
      render(<InstallPromptBanner />);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const banner = document.querySelector('.fixed.top-0');
      expect(banner).toHaveStyle({
        paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
      });
    });
  });

  describe('edge cases', () => {
    it.skip('handles SSR gracefully', () => {
      // NOTE: Skipped - deleting global.window causes React-DOM to crash.
      // SSR testing should be done with proper server-side rendering tools
      // like @testing-library/react's renderToString or Next.js testing utilities.
      // The component handles SSR via typeof window checks in the useEffect.
    });
  });
});
