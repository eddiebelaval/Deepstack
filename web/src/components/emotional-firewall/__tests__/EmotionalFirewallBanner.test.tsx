import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmotionalFirewallBanner, EmotionalFirewallIndicator } from '../EmotionalFirewallBanner';
import { useEmotionalFirewall } from '@/hooks/useEmotionalFirewall';

// Mock dependencies
vi.mock('@/hooks/useEmotionalFirewall');

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, size, variant, ...props }: any) => (
    <button onClick={onClick} className={className} data-size={size} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

describe('EmotionalFirewallBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading state', () => {
    it('does not render when loading', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: null,
        loading: true,
        isCompromised: false,
        isCaution: false,
        isFocused: false,
        breakRemaining: 0,
        patterns: [],
        session: null,
      });

      const { container } = render(<EmotionalFirewallBanner />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Focused state', () => {
    beforeEach(() => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'focused' },
        loading: false,
        isCompromised: false,
        isCaution: false,
        isFocused: true,
        breakRemaining: 0,
        patterns: [],
        session: { duration_minutes: 5, queries_this_session: 3, sessions_today: 1 },
      });
    });

    it('renders focused state', () => {
      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Focused')).toBeInTheDocument();
    });

    it('applies green color scheme for focused state', () => {
      const { container } = render(<EmotionalFirewallBanner />);

      const banner = container.querySelector('.bg-green-500\\/10');
      expect(banner).toBeInTheDocument();
    });

    it('renders brain icon for focused state', () => {
      const { container } = render(<EmotionalFirewallBanner />);

      // Look for icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('shows dismiss button when focused', () => {
      render(<EmotionalFirewallBanner />);

      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toBeInTheDocument();
    });

    it('dismisses banner when dismiss clicked', async () => {
      const user = userEvent.setup({ delay: null });

      const { container } = render(<EmotionalFirewallBanner />);

      const dismissButton = screen.getByRole('button');
      await user.click(dismissButton);

      // Banner should be removed
      expect(container.firstChild).toBeNull();
    });

    it('does not render in compact mode when focused', () => {
      const { container } = render(<EmotionalFirewallBanner compact={true} />);

      expect(container.firstChild).toBeNull();
    });

    it('shows session stats in non-compact mode', () => {
      render(<EmotionalFirewallBanner compact={false} />);

      expect(screen.getByText('5m')).toBeInTheDocument();
      expect(screen.getByText('3 queries')).toBeInTheDocument();
    });

    it('hides session stats in compact mode', () => {
      render(<EmotionalFirewallBanner compact={true} />);

      expect(screen.queryByText('5m')).not.toBeInTheDocument();
    });
  });

  describe('Caution state', () => {
    beforeEach(() => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['late_night'],
        session: { duration_minutes: 45, queries_this_session: 20, sessions_today: 2 },
      });
    });

    it('renders caution state', () => {
      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Stay Mindful')).toBeInTheDocument();
    });

    it('applies yellow color scheme for caution state', () => {
      const { container } = render(<EmotionalFirewallBanner />);

      const banner = container.querySelector('.bg-yellow-500\\/10');
      expect(banner).toBeInTheDocument();
    });

    it('renders brain cog icon for caution state', () => {
      const { container } = render(<EmotionalFirewallBanner />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('shows pattern badges', () => {
      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Late Night')).toBeInTheDocument();
    });

    it('shows dismiss button when caution', () => {
      render(<EmotionalFirewallBanner />);

      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('Compromised state', () => {
    beforeEach(() => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: {
          decision_quality: 'compromised',
          break_recommended_until: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
        },
        loading: false,
        isCompromised: true,
        isCaution: false,
        isFocused: false,
        breakRemaining: 300,
        patterns: ['session_fatigue', 'rapid_queries'],
        session: { duration_minutes: 120, queries_this_session: 50, sessions_today: 3 },
      });
    });

    it('renders compromised state', () => {
      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Break Recommended')).toBeInTheDocument();
    });

    it('applies red color scheme for compromised state', () => {
      const { container } = render(<EmotionalFirewallBanner />);

      const banner = container.querySelector('.bg-red-500\\/10');
      expect(banner).toBeInTheDocument();
    });

    it('renders coffee icon for compromised state', () => {
      const { container } = render(<EmotionalFirewallBanner />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('shows multiple pattern badges', () => {
      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Session Fatigue')).toBeInTheDocument();
      expect(screen.getByText('Rushing')).toBeInTheDocument();
    });

    it('does not show dismiss button when compromised', () => {
      render(<EmotionalFirewallBanner />);

      // No dismiss button in compromised state
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });

    it('shows break timer', () => {
      render(<EmotionalFirewallBanner />);

      // Timer will show minutes and seconds
      expect(screen.getByText(/m/)).toBeInTheDocument();
    });

    it('updates break timer every second', async () => {
      render(<EmotionalFirewallBanner />);

      // Initial render shows 5m 0s
      expect(screen.getByText(/5m/)).toBeInTheDocument();

      // Advance timer by 1 second
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/4m 59s/)).toBeInTheDocument();
      });
    });

    it('clears timer when break ends', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: {
          decision_quality: 'compromised',
          break_recommended_until: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        },
        loading: false,
        isCompromised: true,
        isCaution: false,
        isFocused: false,
        breakRemaining: 0,
        patterns: [],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      // Timer should not be displayed
      expect(screen.queryByText(/m/)).not.toBeInTheDocument();
    });
  });

  describe('Pattern badges', () => {
    it('displays late night pattern', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['late_night'],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Late Night')).toBeInTheDocument();
    });

    it('displays session fatigue pattern', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['session_fatigue'],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Session Fatigue')).toBeInTheDocument();
    });

    it('displays extended session pattern', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['extended_session'],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Extended Session')).toBeInTheDocument();
    });

    it('displays rapid queries pattern', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['rapid_queries'],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Rushing')).toBeInTheDocument();
    });

    it('displays session overload pattern', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['session_overload'],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('High Activity')).toBeInTheDocument();
    });

    it('displays multiple patterns', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['late_night', 'session_fatigue', 'rapid_queries'],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('Late Night')).toBeInTheDocument();
      expect(screen.getByText('Session Fatigue')).toBeInTheDocument();
      expect(screen.getByText('Rushing')).toBeInTheDocument();
    });

    it('handles unknown patterns gracefully', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'caution' },
        loading: false,
        isCompromised: false,
        isCaution: true,
        isFocused: false,
        breakRemaining: 0,
        patterns: ['unknown_pattern'],
        session: null,
      });

      render(<EmotionalFirewallBanner />);

      // Should replace underscores with spaces
      expect(screen.getByText('unknown pattern')).toBeInTheDocument();
    });
  });

  describe('Session stats', () => {
    it('shows session duration', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'focused' },
        loading: false,
        isCompromised: false,
        isCaution: false,
        isFocused: true,
        breakRemaining: 0,
        patterns: [],
        session: { duration_minutes: 25, queries_this_session: 10, sessions_today: 1 },
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('25m')).toBeInTheDocument();
    });

    it('shows query count', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'focused' },
        loading: false,
        isCompromised: false,
        isCaution: false,
        isFocused: true,
        breakRemaining: 0,
        patterns: [],
        session: { duration_minutes: 25, queries_this_session: 15, sessions_today: 1 },
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('15 queries')).toBeInTheDocument();
    });

    it('shows sessions today count when more than 1', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'focused' },
        loading: false,
        isCompromised: false,
        isCaution: false,
        isFocused: true,
        breakRemaining: 0,
        patterns: [],
        session: { duration_minutes: 25, queries_this_session: 10, sessions_today: 3 },
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.getByText('3 sessions today')).toBeInTheDocument();
    });

    it('does not show sessions today when only 1 session', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'focused' },
        loading: false,
        isCompromised: false,
        isCaution: false,
        isFocused: true,
        breakRemaining: 0,
        patterns: [],
        session: { duration_minutes: 25, queries_this_session: 10, sessions_today: 1 },
      });

      render(<EmotionalFirewallBanner />);

      expect(screen.queryByText(/sessions today/)).not.toBeInTheDocument();
    });

    it('hides stats in compact mode', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'focused' },
        loading: false,
        isCompromised: false,
        isCaution: false,
        isFocused: true,
        breakRemaining: 0,
        patterns: [],
        session: { duration_minutes: 25, queries_this_session: 10, sessions_today: 1 },
      });

      render(<EmotionalFirewallBanner compact={true} />);

      expect(screen.queryByText('25m')).not.toBeInTheDocument();
      expect(screen.queryByText('10 queries')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        status: { decision_quality: 'focused' },
        loading: false,
        isCompromised: false,
        isCaution: false,
        isFocused: true,
        breakRemaining: 0,
        patterns: [],
        session: null,
      });

      const { container } = render(<EmotionalFirewallBanner className="custom-class" />);

      const banner = container.querySelector('.custom-class');
      expect(banner).toBeInTheDocument();
    });
  });
});

describe('EmotionalFirewallIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('does not render when loading', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: true,
        isCompromised: false,
        isCaution: false,
      });

      const { container } = render(<EmotionalFirewallIndicator />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Focused state', () => {
    it('renders green brain icon when focused', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: false,
        isCompromised: false,
        isCaution: false,
      });

      const { container } = render(<EmotionalFirewallIndicator />);

      const icon = container.querySelector('.text-green-500');
      expect(icon).toBeInTheDocument();
    });

    it('shows tooltip for focused state', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: false,
        isCompromised: false,
        isCaution: false,
      });

      render(<EmotionalFirewallIndicator />);

      expect(screen.getByText('Focused - clear state for analysis')).toBeInTheDocument();
    });
  });

  describe('Caution state', () => {
    it('renders yellow brain cog icon when caution', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: false,
        isCompromised: false,
        isCaution: true,
      });

      const { container } = render(<EmotionalFirewallIndicator />);

      const icon = container.querySelector('.text-yellow-500');
      expect(icon).toBeInTheDocument();
    });

    it('shows tooltip for caution state', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: false,
        isCompromised: false,
        isCaution: true,
      });

      render(<EmotionalFirewallIndicator />);

      expect(screen.getByText('Stay mindful - early signs of fatigue')).toBeInTheDocument();
    });
  });

  describe('Compromised state', () => {
    it('renders red coffee icon when compromised', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: false,
        isCompromised: true,
        isCaution: false,
      });

      const { container } = render(<EmotionalFirewallIndicator />);

      const icon = container.querySelector('.text-red-500');
      expect(icon).toBeInTheDocument();
    });

    it('shows tooltip for compromised state', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: false,
        isCompromised: true,
        isCaution: false,
      });

      render(<EmotionalFirewallIndicator />);

      expect(screen.getByText('Break recommended - protect your decision quality')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has cursor pointer for interactivity', () => {
      (useEmotionalFirewall as any).mockReturnValue({
        loading: false,
        isCompromised: false,
        isCaution: false,
      });

      const { container } = render(<EmotionalFirewallIndicator />);

      const wrapper = container.querySelector('.cursor-pointer');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
