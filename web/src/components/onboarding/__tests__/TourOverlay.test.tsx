import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourOverlay, RestartTourButton } from '../TourOverlay';
import { TourProvider } from '../TourManager';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('TourOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      expect(document.body).toBeInTheDocument();
    });

    it('shows welcome ping on first step', () => {
      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      vi.advanceTimersByTime(1000);

      expect(screen.getByText(/Welcome to deepstack/i)).toBeInTheDocument();
    });

    it('shows progress indicator when tour is active', () => {
      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      vi.advanceTimersByTime(1000);

      expect(screen.getByText(/\/6/)).toBeInTheDocument();
    });

    it('does not show when tour is complete', () => {
      localStorage.setItem('deepstack_onboarding_complete', 'true');

      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      vi.advanceTimersByTime(1000);

      expect(screen.queryByText(/Welcome to deepstack/i)).not.toBeInTheDocument();
    });
  });

  describe('progress indicator', () => {
    it('shows current step number', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      vi.advanceTimersByTime(1000);

      expect(screen.getByText('0/6')).toBeInTheDocument();
    });

    it('shows skip tour button', () => {
      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      vi.advanceTimersByTime(1000);

      expect(screen.getByText('Skip tour')).toBeInTheDocument();
    });

    it('hides when all steps completed', () => {
      localStorage.setItem('deepstack_tour_progress', JSON.stringify({
        completedSteps: ['welcome', 'chat', 'market-watch', 'thesis', 'journal', 'shortcuts'],
        isActive: true,
      }));

      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      expect(screen.queryByText(/\/6/)).not.toBeInTheDocument();
    });
  });

  describe('skip functionality', () => {
    it('skips tour when skip button clicked', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TourProvider>
          <TourOverlay />
        </TourProvider>
      );

      vi.advanceTimersByTime(1000);

      const skipButton = screen.getByText('Skip tour');
      await user.click(skipButton);

      expect(localStorage.getItem('deepstack_onboarding_complete')).toBe('true');
    });
  });
});

describe('RestartTourButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not show when tour is incomplete', () => {
    render(
      <TourProvider>
        <RestartTourButton />
      </TourProvider>
    );

    expect(screen.queryByText('Restart Tour')).not.toBeInTheDocument();
  });

  it('shows when tour is complete', () => {
    localStorage.setItem('deepstack_tour_progress', JSON.stringify({
      completedSteps: ['welcome', 'chat', 'market-watch', 'thesis', 'journal', 'shortcuts'],
      isActive: false,
    }));

    render(
      <TourProvider>
        <RestartTourButton />
      </TourProvider>
    );

    expect(screen.getByText('Restart Tour')).toBeInTheDocument();
  });

  it('restarts tour when clicked', async () => {
    const user = userEvent.setup({ delay: null });

    localStorage.setItem('deepstack_tour_progress', JSON.stringify({
      completedSteps: ['welcome', 'chat', 'market-watch', 'thesis', 'journal', 'shortcuts'],
      isActive: false,
    }));

    render(
      <TourProvider>
        <RestartTourButton />
      </TourProvider>
    );

    const button = screen.getByText('Restart Tour');
    await user.click(button);

    expect(localStorage.getItem('deepstack_tour_progress')).toBeNull();
    expect(localStorage.getItem('deepstack_onboarding_complete')).toBeNull();
  });

  it('renders icon', () => {
    localStorage.setItem('deepstack_tour_progress', JSON.stringify({
      completedSteps: ['welcome', 'chat', 'market-watch', 'thesis', 'journal', 'shortcuts'],
      isActive: false,
    }));

    const { container } = render(
      <TourProvider>
        <RestartTourButton />
      </TourProvider>
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
