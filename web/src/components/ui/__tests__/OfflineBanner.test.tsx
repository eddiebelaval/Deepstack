import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineBanner, SessionExpiredBanner, RateLimitBanner } from '../OfflineBanner';

// Mock the network status hook
const mockNetworkStatus = {
  isOffline: false,
  wasOffline: false,
  clearWasOffline: vi.fn(),
};

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockNetworkStatus,
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockNetworkStatus.isOffline = false;
    mockNetworkStatus.wasOffline = false;
    mockNetworkStatus.clearWasOffline = vi.fn();
  });

  describe('rendering', () => {
    it('renders nothing when online', () => {
      mockNetworkStatus.isOffline = false;
      mockNetworkStatus.wasOffline = false;

      const { container } = render(<OfflineBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('renders offline banner when offline', () => {
      mockNetworkStatus.isOffline = true;

      render(<OfflineBanner />);
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      mockNetworkStatus.isOffline = true;

      const { container } = render(<OfflineBanner className="custom-banner" />);
      const banner = container.querySelector('.custom-banner');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('offline state', () => {
    it('shows offline message', () => {
      mockNetworkStatus.isOffline = true;

      render(<OfflineBanner />);
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
      expect(screen.getByText(/some features may not work/i)).toBeInTheDocument();
    });

    it('shows WifiOff icon', () => {
      mockNetworkStatus.isOffline = true;

      const { container } = render(<OfflineBanner />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('shows retry button', () => {
      mockNetworkStatus.isOffline = true;

      render(<OfflineBanner />);
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('reloads page when retry button clicked', () => {
      mockNetworkStatus.isOffline = true;
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      });

      render(<OfflineBanner />);
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('has destructive background color', () => {
      mockNetworkStatus.isOffline = true;

      const { container } = render(<OfflineBanner />);
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('bg-destructive');
      expect(banner).toHaveClass('text-destructive-foreground');
    });

    it('is positioned at top of screen', () => {
      mockNetworkStatus.isOffline = true;

      const { container } = render(<OfflineBanner />);
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('fixed');
      expect(banner).toHaveClass('top-0');
      expect(banner).toHaveClass('left-0');
      expect(banner).toHaveClass('right-0');
    });
  });

  describe('reconnected state', () => {
    it('shows reconnected message when coming back online', () => {
      mockNetworkStatus.isOffline = false;
      mockNetworkStatus.wasOffline = true;

      render(<OfflineBanner />);
      expect(screen.getByText(/you're back online/i)).toBeInTheDocument();
    });

    it('shows CheckCircle icon', () => {
      mockNetworkStatus.isOffline = false;
      mockNetworkStatus.wasOffline = true;

      const { container } = render(<OfflineBanner />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('has green background color', () => {
      mockNetworkStatus.isOffline = false;
      mockNetworkStatus.wasOffline = true;

      const { container } = render(<OfflineBanner />);
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('bg-green-600');
      expect(banner).toHaveClass('text-white');
    });

    it('auto-hides after 3 seconds', async () => {
      mockNetworkStatus.isOffline = false;
      mockNetworkStatus.wasOffline = true;

      const { container } = render(<OfflineBanner />);
      expect(screen.getByText(/you're back online/i)).toBeInTheDocument();

      // Wait for auto-hide (3 seconds)
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      }, { timeout: 4000 });
    });

    it('calls clearWasOffline after hiding', async () => {
      mockNetworkStatus.isOffline = false;
      mockNetworkStatus.wasOffline = true;

      render(<OfflineBanner />);

      // Wait for clearWasOffline to be called
      await waitFor(() => {
        expect(mockNetworkStatus.clearWasOffline).toHaveBeenCalled();
      }, { timeout: 4000 });
    });
  });

  describe('accessibility', () => {
    it('has appropriate z-index for overlay', () => {
      mockNetworkStatus.isOffline = true;

      const { container } = render(<OfflineBanner />);
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('z-50');
    });

    it('has medium font weight for readability', () => {
      mockNetworkStatus.isOffline = true;

      const { container } = render(<OfflineBanner />);
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('font-medium');
    });
  });
});

describe('SessionExpiredBanner', () => {
  describe('rendering', () => {
    it('renders session expired message', () => {
      render(
        <SessionExpiredBanner onRefresh={vi.fn()} onSignOut={vi.fn()} />
      );
      expect(screen.getByText(/your session has expired/i)).toBeInTheDocument();
    });

    it('renders refresh button', () => {
      render(
        <SessionExpiredBanner onRefresh={vi.fn()} onSignOut={vi.fn()} />
      );
      expect(screen.getByRole('button', { name: /refresh session/i })).toBeInTheDocument();
    });

    it('renders sign out button', () => {
      render(
        <SessionExpiredBanner onRefresh={vi.fn()} onSignOut={vi.fn()} />
      );
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <SessionExpiredBanner
          onRefresh={vi.fn()}
          onSignOut={vi.fn()}
          className="custom-session"
        />
      );
      const banner = container.querySelector('.custom-session');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onRefresh when refresh button clicked', () => {
      const onRefresh = vi.fn();
      render(
        <SessionExpiredBanner onRefresh={onRefresh} onSignOut={vi.fn()} />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh session/i });
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('calls onSignOut when sign out button clicked', () => {
      const onSignOut = vi.fn();
      render(
        <SessionExpiredBanner onRefresh={vi.fn()} onSignOut={onSignOut} />
      );

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutButton);

      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('has yellow background', () => {
      const { container } = render(
        <SessionExpiredBanner onRefresh={vi.fn()} onSignOut={vi.fn()} />
      );
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('bg-yellow-600');
      expect(banner).toHaveClass('text-white');
    });

    it('is positioned at top', () => {
      const { container } = render(
        <SessionExpiredBanner onRefresh={vi.fn()} onSignOut={vi.fn()} />
      );
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('fixed');
      expect(banner).toHaveClass('top-0');
      expect(banner).toHaveClass('z-50');
    });
  });
});

describe('RateLimitBanner', () => {

  describe('rendering', () => {
    it('renders rate limit message', () => {
      render(<RateLimitBanner waitTime={5000} />);
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });

    it('shows remaining seconds', () => {
      render(<RateLimitBanner waitTime={5000} />);
      expect(screen.getByText(/wait 5 seconds/i)).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <RateLimitBanner waitTime={5000} className="custom-rate" />
      );
      const banner = container.querySelector('.custom-rate');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('countdown', () => {
    it('updates countdown every second', async () => {
      render(<RateLimitBanner waitTime={5000} />);

      expect(screen.getByText(/wait 5 seconds/i)).toBeInTheDocument();

      // Wait for countdown to update
      await waitFor(() => {
        expect(screen.getByText(/wait [1-4] seconds/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('hides banner when countdown reaches zero', async () => {
      const { container } = render(<RateLimitBanner waitTime={1000} />);

      expect(screen.getByText(/wait 1 seconds/i)).toBeInTheDocument();

      // Wait for banner to hide
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      }, { timeout: 2000 });
    });

    it('displays initial wait time', () => {
      render(<RateLimitBanner waitTime={5000} />);
      // Should show initial wait time
      expect(screen.getByText(/wait 5 seconds/i)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has orange background', () => {
      const { container } = render(<RateLimitBanner waitTime={5000} />);
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('bg-orange-600');
      expect(banner).toHaveClass('text-white');
    });

    it('is positioned at top', () => {
      const { container } = render(<RateLimitBanner waitTime={5000} />);
      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('fixed');
      expect(banner).toHaveClass('top-0');
      expect(banner).toHaveClass('z-50');
    });
  });
});
