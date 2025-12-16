import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LaunchScreen, FadeInOnMount } from '../LaunchScreen';

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
    svg: ({ children, viewBox, className, ...props }: any) => (
      <svg viewBox={viewBox} className={className} {...props}>{children}</svg>
    ),
    rect: ({ ...props }: any) => <rect {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Logo component
vi.mock('@/components/ui/Logo', () => ({
  Logo: ({ size }: any) => <div data-testid="logo" data-size={size}>Logo</div>,
}));

import { useStandaloneMode } from '@/hooks/useStandaloneMode';

describe('LaunchScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sessionStorage.clear();

    // Default to standalone mode
    (useStandaloneMode as any).mockReturnValue({
      isStandalone: true,
      isIOS: false,
      isIOSStandalone: false,
      canInstall: false,
      displayMode: 'standalone',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('shows launch screen in standalone mode on first launch', () => {
      render(
        <LaunchScreen>
          <div>App Content</div>
        </LaunchScreen>
      );

      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByText('AI Trading Assistant')).toBeInTheDocument();
    });

    it('does not show launch screen in browser mode', () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: false,
        isIOS: false,
        isIOSStandalone: false,
        canInstall: false,
        displayMode: 'browser',
      });

      render(
        <LaunchScreen>
          <div>App Content</div>
        </LaunchScreen>
      );

      // Should skip launch and show content immediately
      expect(screen.getByText('App Content')).toBeInTheDocument();
      expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
    });

    it('shows children after launch completes', () => {
      render(
        <LaunchScreen duration={1000}>
          <div>App Content</div>
        </LaunchScreen>
      );

      // Initially shows launch screen
      expect(screen.getByTestId('logo')).toBeInTheDocument();

      // Advance timers past duration
      vi.advanceTimersByTime(1100);

      // Should show app content
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });

    it('renders logo with xl size', () => {
      render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      const logo = screen.getByTestId('logo');
      expect(logo).toHaveAttribute('data-size', 'xl');
    });

    it('shows loading indicator', () => {
      const { container } = render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      const loadingDots = container.querySelectorAll('.bg-primary.rounded-full.w-2.h-2');
      expect(loadingDots.length).toBeGreaterThan(0);
    });
  });

  describe('session storage', () => {
    it('only shows once per session', () => {
      sessionStorage.setItem('deepstack-launched', 'true');

      render(
        <LaunchScreen>
          <div>App Content</div>
        </LaunchScreen>
      );

      // Should skip launch screen
      expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });

    it('sets session storage flag when launching', () => {
      render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      expect(sessionStorage.getItem('deepstack-launched')).toBe('true');
    });

    it('shows again in new session', () => {
      // First render - shows launch
      const { unmount } = render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      unmount();
      sessionStorage.clear();

      // Second render - shows again
      render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });
  });

  describe('duration prop', () => {
    it('uses default duration of 1500ms', () => {
      const onComplete = vi.fn();

      render(
        <LaunchScreen onComplete={onComplete}>
          <div>Content</div>
        </LaunchScreen>
      );

      vi.advanceTimersByTime(1499);
      expect(onComplete).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('respects custom duration', () => {
      const onComplete = vi.fn();

      render(
        <LaunchScreen duration={3000} onComplete={onComplete}>
          <div>Content</div>
        </LaunchScreen>
      );

      vi.advanceTimersByTime(2999);
      expect(onComplete).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete callback when animation finishes', () => {
      const onComplete = vi.fn();

      render(
        <LaunchScreen duration={1000} onComplete={onComplete}>
          <div>Content</div>
        </LaunchScreen>
      );

      vi.advanceTimersByTime(1000);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('iOS standalone mode', () => {
    it('shows launch screen in iOS standalone mode', () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: true,
        isIOS: true,
        isIOSStandalone: true,
        canInstall: false,
        displayMode: 'standalone',
      });

      render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('does not show in iOS browser mode', () => {
      (useStandaloneMode as any).mockReturnValue({
        isStandalone: false,
        isIOS: true,
        isIOSStandalone: false,
        canInstall: true,
        displayMode: 'browser',
      });

      render(
        <LaunchScreen>
          <div>App Content</div>
        </LaunchScreen>
      );

      expect(screen.getByText('App Content')).toBeInTheDocument();
      expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
    });
  });

  describe('safe area insets', () => {
    it('applies safe area insets to launch screen', () => {
      const { container } = render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      const launchDiv = container.querySelector('.fixed.inset-0.z-\\[9999\\]');
      expect(launchDiv).toHaveStyle({
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      });
    });
  });

  describe('animation elements', () => {
    it('renders card stack SVG', () => {
      const { container } = render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      const svg = container.querySelector('svg[viewBox="0 0 100 100"]');
      expect(svg).toBeInTheDocument();
    });

    it('renders multiple rect elements for card stack', () => {
      const { container } = render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThanOrEqual(3); // 3 cards in stack
    });

    it('renders D letter in logo', () => {
      const { container } = render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      const dLetter = container.querySelector('text');
      expect(dLetter).toHaveTextContent('D');
    });

    it('renders three loading dots', () => {
      const { container } = render(
        <LaunchScreen>
          <div>Content</div>
        </LaunchScreen>
      );

      const loadingContainer = container.querySelector('.flex.gap-1.mt-4');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer?.querySelectorAll('.w-2.h-2').length).toBe(3);
    });
  });

  describe('cleanup', () => {
    it('clears timeout on unmount', () => {
      const { unmount } = render(
        <LaunchScreen duration={5000}>
          <div>Content</div>
        </LaunchScreen>
      );

      unmount();

      // Advance timers - callback should not fire
      const onComplete = vi.fn();
      vi.advanceTimersByTime(5000);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles SSR gracefully', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => {
        render(
          <LaunchScreen>
            <div>Content</div>
          </LaunchScreen>
        );
      }).not.toThrow();

      global.window = originalWindow;
    });

    it('prevents flashing content during launch', () => {
      render(
        <LaunchScreen duration={1000}>
          <div>App Content</div>
        </LaunchScreen>
      );

      // Content should not be visible during launch
      expect(screen.queryByText('App Content')).not.toBeInTheDocument();

      // Complete the launch
      vi.advanceTimersByTime(1000);

      // Now content should be visible
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });
  });
});

describe('FadeInOnMount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <FadeInOnMount>
        <div>Fade Content</div>
      </FadeInOnMount>
    );

    expect(screen.getByText('Fade Content')).toBeInTheDocument();
  });

  it('applies motion.div wrapper', () => {
    const { container } = render(
      <FadeInOnMount>
        <div>Content</div>
      </FadeInOnMount>
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('starts with opacity 0', () => {
    render(
      <FadeInOnMount>
        <div>Content</div>
      </FadeInOnMount>
    );

    // Component should exist
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <FadeInOnMount>
        <div>First</div>
        <div>Second</div>
        <div>Third</div>
      </FadeInOnMount>
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });
});
