import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TourProvider, useTour, useTourStep, DEFAULT_TOUR_STEPS } from '../TourManager';

describe('TourProvider and useTour', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('starts tour automatically on first visit', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isActive).toBe(true);
    });

    it('does not start tour if already completed', () => {
      localStorage.setItem('deepstack_onboarding_complete', 'true');

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isActive).toBe(false);
    });

    it('loads saved progress from localStorage', () => {
      const savedProgress = {
        completedSteps: ['welcome', 'chat'],
        isActive: true,
      };
      localStorage.setItem('deepstack_tour_progress', JSON.stringify(savedProgress));

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      expect(result.current.completedSteps).toEqual(['welcome', 'chat']);
      expect(result.current.currentStepIndex).toBe(2);
    });

    it('initializes with correct first step', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.currentStep).toEqual(DEFAULT_TOUR_STEPS[0]);
    });
  });

  describe('startTour', () => {
    it('starts tour from beginning', () => {
      localStorage.setItem('deepstack_onboarding_complete', 'true');

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.startTour();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.completedSteps).toEqual([]);
      expect(result.current.currentStepIndex).toBe(0);
    });

    it('removes completion flag from localStorage', () => {
      localStorage.setItem('deepstack_onboarding_complete', 'true');

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.startTour();
      });

      expect(localStorage.getItem('deepstack_onboarding_complete')).toBeNull();
    });
  });

  describe('skipTour', () => {
    it('marks tour as inactive', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.skipTour();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('marks all steps as completed', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.skipTour();
      });

      expect(result.current.completedSteps.length).toBe(DEFAULT_TOUR_STEPS.length);
    });

    it('saves completion to localStorage', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.skipTour();
      });

      expect(localStorage.getItem('deepstack_onboarding_complete')).toBe('true');
    });
  });

  describe('completeStep', () => {
    it('adds step to completed steps', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.completeStep('welcome');
      });

      expect(result.current.completedSteps).toContain('welcome');
    });

    it('advances to next step', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.completeStep('welcome');
      });

      expect(result.current.currentStepIndex).toBe(1);
      expect(result.current.currentStep?.id).toBe('chat');
    });

    it('does not add duplicate steps', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.completeStep('welcome');
        result.current.completeStep('welcome');
      });

      expect(result.current.completedSteps.filter(s => s === 'welcome')).toHaveLength(1);
    });

    it('marks tour complete when all steps done', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        DEFAULT_TOUR_STEPS.forEach(step => {
          result.current.completeStep(step.id);
        });
      });

      expect(localStorage.getItem('deepstack_onboarding_complete')).toBe('true');
    });
  });

  describe('resetTour', () => {
    it('clears all completed steps', () => {
      localStorage.setItem('deepstack_tour_progress', JSON.stringify({
        completedSteps: ['welcome', 'chat'],
        isActive: false,
      }));

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.resetTour();
      });

      expect(result.current.completedSteps).toEqual([]);
    });

    it('activates tour', () => {
      localStorage.setItem('deepstack_onboarding_complete', 'true');

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.resetTour();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('removes localStorage entries', () => {
      localStorage.setItem('deepstack_tour_progress', 'test');
      localStorage.setItem('deepstack_onboarding_complete', 'true');

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.resetTour();
      });

      expect(localStorage.getItem('deepstack_tour_progress')).toBeNull();
      expect(localStorage.getItem('deepstack_onboarding_complete')).toBeNull();
    });
  });

  describe('isStepActive', () => {
    it('returns true for current step', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isStepActive('welcome')).toBe(true);
    });

    it('returns false for completed step', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.completeStep('welcome');
      });

      expect(result.current.isStepActive('welcome')).toBe(false);
    });

    it('returns false when tour is inactive', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.skipTour();
      });

      expect(result.current.isStepActive('welcome')).toBe(false);
    });
  });

  describe('custom steps', () => {
    it('supports custom tour steps', () => {
      const customSteps = [
        { id: 'step1', title: 'Step 1', description: 'First step' },
        { id: 'step2', title: 'Step 2', description: 'Second step' },
      ];

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider steps={customSteps}>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.currentStep).toEqual(customSteps[0]);
    });
  });
});

describe('useTourStep', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns active state for current step', () => {
    const { result } = renderHook(() => useTourStep('welcome'), {
      wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isActive).toBe(true);
  });

  it('returns step data when active', () => {
    const { result } = renderHook(() => useTourStep('welcome'), {
      wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.step).toEqual(DEFAULT_TOUR_STEPS[0]);
  });

  it('returns inactive for non-current step', () => {
    const { result } = renderHook(() => useTourStep('chat'), {
      wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.step).toBeNull();
  });

  it('dismiss completes the step', () => {
    const { result: tourResult } = renderHook(() => useTour(), {
      wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
    });

    const { result: stepResult } = renderHook(() => useTourStep('welcome'), {
      wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
    });

    act(() => {
      vi.advanceTimersByTime(1000);
      stepResult.current.dismiss();
    });

    expect(tourResult.current.completedSteps).toContain('welcome');
  });

  it('throws error when used outside TourProvider', () => {
    expect(() => {
      renderHook(() => useTourStep('welcome'));
    }).toThrow('useTour must be used within a TourProvider');
  });
});
