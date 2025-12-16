import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeModal } from '../WelcomeModal';

describe('WelcomeModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial display', () => {
    it('does not show on first render (before delay)', () => {
      render(<WelcomeModal />);
      expect(screen.queryByText('Welcome to deepstack')).not.toBeInTheDocument();
    });

    it('shows after delay when not completed', () => {
      render(<WelcomeModal />);

      vi.advanceTimersByTime(500);

      expect(screen.getByText('Welcome to deepstack')).toBeInTheDocument();
    });

    it('does not show if onboarding already completed', () => {
      localStorage.setItem('deepstack_onboarding_complete', 'true');

      render(<WelcomeModal />);

      vi.advanceTimersByTime(500);

      expect(screen.queryByText('Welcome to deepstack')).not.toBeInTheDocument();
    });

    it('shows first step content initially', () => {
      render(<WelcomeModal />);

      vi.advanceTimersByTime(500);

      expect(screen.getByText('Welcome to deepstack')).toBeInTheDocument();
      expect(screen.getByText(/AI-powered trading assistant/)).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('shows Next button on first step', () => {
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('advances to next step when Next is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      expect(screen.getByText('AI Chat Assistant')).toBeInTheDocument();
    });

    it('shows Back button on second step', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('goes back to previous step when Back is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(screen.getByText('Welcome to deepstack')).toBeInTheDocument();
    });

    it('hides Back button on first step', () => {
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const backButton = screen.queryByText('Back');
      expect(backButton).toHaveClass('opacity-0');
    });

    it('shows Get Started button on last step', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);
      }

      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });
  });

  describe('step indicators', () => {
    it('shows all step dots', () => {
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const indicators = screen.getAllByRole('button', { name: /Go to step/ });
      expect(indicators).toHaveLength(6);
    });

    it('highlights current step', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      const indicators = screen.getAllByRole('button', { name: /Go to step/ });
      // Second indicator should be highlighted (w-6 class)
      expect(indicators[1]).toHaveClass('w-6');
    });

    it('navigates to step when indicator is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const thirdStepButton = screen.getByRole('button', { name: 'Go to step 3' });
      await user.click(thirdStepButton);

      expect(screen.getByText('Market Data & Charts')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('shows progress bar', () => {
      const { container } = render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const progressBar = container.querySelector('.bg-primary');
      expect(progressBar).toBeInTheDocument();
    });

    it('updates progress as user advances', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      const progressBar = container.querySelector('.bg-primary') as HTMLElement;
      expect(progressBar?.style.width).toBeTruthy();
    });
  });

  describe('skip functionality', () => {
    it('shows Skip tour button', () => {
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      expect(screen.getByText('Skip tour')).toBeInTheDocument();
    });

    it('closes modal and marks complete when Skip is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const skipButton = screen.getByText('Skip tour');
      await user.click(skipButton);

      expect(screen.queryByText('Welcome to deepstack')).not.toBeInTheDocument();
      expect(localStorage.getItem('deepstack_onboarding_complete')).toBe('true');
    });

    it('closes modal when X button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const closeButton = screen.getByLabelText('Close onboarding');
      await user.click(closeButton);

      expect(screen.queryByText('Welcome to deepstack')).not.toBeInTheDocument();
      expect(localStorage.getItem('deepstack_onboarding_complete')).toBe('true');
    });

    it('closes modal when backdrop is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const backdrop = container.querySelector('.bg-black\\/70') as HTMLElement;
      await user.click(backdrop);

      expect(screen.queryByText('Welcome to deepstack')).not.toBeInTheDocument();
    });
  });

  describe('completion', () => {
    it('marks onboarding complete when Get Started is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        const nextButton = screen.getByText('Next');
        await user.click(nextButton);
      }

      const getStartedButton = screen.getByText('Get Started');
      await user.click(getStartedButton);

      expect(localStorage.getItem('deepstack_onboarding_complete')).toBe('true');
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });

  describe('step content', () => {
    it('shows icon for each step', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const icon = container.querySelector('.w-10.h-10');
      expect(icon).toBeInTheDocument();

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      const icon2 = container.querySelector('.w-10.h-10');
      expect(icon2).toBeInTheDocument();
    });

    it('shows tip for each step', () => {
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      expect(screen.getByText(/You can revisit this guide/)).toBeInTheDocument();
    });

    it('displays all 6 steps', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const steps = [
        'Welcome to deepstack',
        'AI Chat Assistant',
        'Market Data & Charts',
        'Emotional Firewall',
        'Journal & Thesis',
        'Keyboard Shortcuts',
      ];

      for (let i = 0; i < steps.length; i++) {
        expect(screen.getByText(steps[i])).toBeInTheDocument();

        if (i < steps.length - 1) {
          const nextButton = screen.getByText('Next');
          await user.click(nextButton);
        }
      }
    });
  });

  describe('accessibility', () => {
    it('has accessible close button', () => {
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const closeButton = screen.getByLabelText('Close onboarding');
      expect(closeButton).toBeInTheDocument();
    });

    it('step indicators have accessible labels', () => {
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const stepButton = screen.getByRole('button', { name: 'Go to step 1' });
      expect(stepButton).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles rapid navigation clicks', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      const nextButton = screen.getByText('Next');

      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      expect(screen.getByText('Emotional Firewall')).toBeInTheDocument();
    });

    it('prevents navigating beyond first step with Back', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      expect(screen.getByText('Welcome to deepstack')).toBeInTheDocument();

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(screen.getByText('Welcome to deepstack')).toBeInTheDocument();
    });

    it('prevents navigating beyond last step with Next', async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeModal />);
      vi.advanceTimersByTime(500);

      // Navigate to last step
      for (let i = 0; i < 6; i++) {
        const nextButton = screen.queryByText('Next');
        if (nextButton) {
          await user.click(nextButton);
        }
      }

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });
});
