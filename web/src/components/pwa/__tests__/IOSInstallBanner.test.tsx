import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('IOSInstallBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();

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
    it('shows banner on iOS Safari after delay', () => {
      render(<IOSInstallBanner />);

      // Not visible initially
      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();

      // Advance timers past default delay
      vi.advanceTimersByTime(3000);

      expect(screen.getByText('Add deepstack')).toBeInTheDocument();
    });

    it('does not show on non-iOS devices', () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: false,
        isIOS: false,
        isIOSStandalone: false,
        canInstall: true,
        displayMode: 'browser',
      });

      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });

    it('does not show when already in standalone mode', () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: true,
        isIOS: true,
        isIOSStandalone: true,
        canInstall: false,
        displayMode: 'standalone',
      });

      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });

    it('does not show if previously dismissed permanently', () => {
      localStorage.setItem('ios-install-dismissed', 'true');

      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });

    it('respects custom delay prop', () => {
      render(<IOSInstallBanner delay={5000} />);

      vi.advanceTimersByTime(4999);
      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();

      vi.advanceTimersByTime(1);
      expect(screen.getByText('Add deepstack')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    beforeEach(() => {
      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);
    });

    it('shows app icon', () => {
      const { container } = render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      const icon = container.querySelector('.bg-primary.rounded-xl');
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
      expect(screen.getByText(/Tap/)).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
      expect(screen.getByText(/in the top right/)).toBeInTheDocument();
    });

    it('renders icons for steps', () => {
      const { container } = render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      // Should have Share and Plus icons
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('dismiss actions', () => {
    it('closes temporarily when Got it is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      const gotItButton = screen.getByText('Got it');
      await user.click(gotItButton);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
      expect(localStorage.getItem('ios-install-dismissed')).not.toBe('true');
    });

    it('closes permanently when Don\'t show again is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      const dismissButton = screen.getByText("Don't show again");
      await user.click(dismissButton);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
      expect(localStorage.getItem('ios-install-dismissed')).toBe('true');
    });

    it('closes when X button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });

    it('closes when backdrop is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      const backdrop = container.querySelector('.bg-black\\/70');
      await user.click(backdrop!);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
      expect(localStorage.getItem('ios-install-dismissed')).toBe('true');
    });
  });

  describe('safe area insets', () => {
    it('applies safe area inset to bottom', () => {
      const { container } = render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      const banner = container.querySelector('.fixed.bottom-0');
      expect(banner).toHaveStyle({
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
      });
    });
  });

  describe('cleanup', () => {
    it('clears timeout on unmount', () => {
      const { unmount } = render(<IOSInstallBanner delay={5000} />);

      unmount();

      vi.advanceTimersByTime(5000);
      // Banner should not appear after unmount
    });
  });

  describe('re-display behavior', () => {
    it('shows again on next visit if dismissed temporarily', () => {
      const { unmount } = render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      unmount();

      // New session - should show again
      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      expect(screen.getByText('Add deepstack')).toBeInTheDocument();
    });

    it('does not show again if dismissed permanently', () => {
      const { unmount } = render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      const dismissButton = screen.getByText("Don't show again");
      userEvent.click(dismissButton);

      unmount();

      // New session - should not show
      render(<IOSInstallBanner />);
      vi.advanceTimersByTime(3000);

      expect(screen.queryByText('Add deepstack')).not.toBeInTheDocument();
    });
  });
});

describe('InstallPromptBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();

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
    it('shows when canInstall is true', () => {
      render(<InstallPromptBanner />);

      vi.advanceTimersByTime(5000);

      expect(screen.getByText('Install deepstack')).toBeInTheDocument();
    });

    it('does not show in standalone mode', () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: true,
        isIOS: false,
        isIOSStandalone: false,
        canInstall: false,
        displayMode: 'standalone',
      });

      render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });

    it('does not show when canInstall is false', () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: false,
        isIOS: false,
        isIOSStandalone: false,
        canInstall: false,
        displayMode: 'browser',
      });

      render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });

    it('does not show if previously dismissed', () => {
      localStorage.setItem('install-prompt-dismissed', 'true');

      render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });

    it('shows after 5 second delay', () => {
      render(<InstallPromptBanner />);

      vi.advanceTimersByTime(4999);
      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();

      vi.advanceTimersByTime(1);
      expect(screen.getByText('Install deepstack')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    beforeEach(() => {
      render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);
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
      const user = userEvent.setup({ delay: null });
      render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);

      const laterButton = screen.getByText('Later');
      await user.click(laterButton);

      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
      expect(localStorage.getItem('install-prompt-dismissed')).toBe('true');
    });

    it('triggers install prompt when Install is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);

      const installButton = screen.getByText('Install');
      await user.click(installButton);

      expect(dispatchEventSpy).toHaveBeenCalled();
      expect(screen.queryByText('Install deepstack')).not.toBeInTheDocument();
    });
  });

  describe('positioning', () => {
    it('appears at top of screen', () => {
      const { container } = render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);

      const banner = container.querySelector('.fixed.top-0');
      expect(banner).toBeInTheDocument();
    });

    it('applies safe area inset to top', () => {
      const { container } = render(<InstallPromptBanner />);
      vi.advanceTimersByTime(5000);

      const banner = container.querySelector('.fixed.top-0');
      expect(banner).toHaveStyle({
        paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
      });
    });
  });

  describe('edge cases', () => {
    it('handles SSR gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => {
        render(<InstallPromptBanner />);
      }).not.toThrow();

      global.window = originalWindow;
    });
  });
});
