'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TOUR_STORAGE_KEY = 'deepstack_tour_progress';
const TOUR_COMPLETE_KEY = 'deepstack_onboarding_complete';

export interface TourStep {
    id: string;
    title: string;
    description: string;
    tip?: string;
    targetId?: string; // DOM element ID to position near
}

// Default tour steps
export const DEFAULT_TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to deepstack',
        description: 'Your AI research assistant for smarter investment decisions. Click through these green pings to learn the features.',
        tip: 'You can restart this tour anytime from Settings.',
    },
    {
        id: 'chat',
        title: 'AI Chat Assistant',
        description: 'Ask questions about stocks, get analysis, and receive insights. Try "Analyze NVDA" or "What are the best growth stocks?"',
        tip: 'The AI has access to your thesis and journal for personalized guidance.',
        targetId: 'chat-input',
    },
    {
        id: 'market-watch',
        title: 'Market Watch Panel',
        description: 'View real-time quotes and mini charts. Click to expand for more detail, or use the Full Chart button for in-depth analysis.',
        tip: 'The market status indicator shows green when US markets are open.',
        targetId: 'market-watch-panel',
    },
    {
        id: 'thesis',
        title: 'Thesis Engine',
        description: 'Build and track your investment hypotheses. Set entry/exit targets and validate your ideas over time.',
        tip: 'Link journal entries to theses to track emotional patterns.',
        targetId: 'thesis-nav',
    },
    {
        id: 'journal',
        title: 'Trade Journal',
        description: 'Log trades with emotional tracking. Understanding your emotional state helps improve decision-making.',
        tip: 'The AI can analyze patterns in your journal entries.',
        targetId: 'journal-nav',
    },
    {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'Power up your workflow! Press Cmd/Ctrl+K to search, use number keys for timeframes, and ? for the full shortcut list.',
        tip: 'Most actions have keyboard shortcuts for speed.',
    },
];

interface TourContextType {
    isActive: boolean;
    currentStepIndex: number;
    currentStep: TourStep | null;
    completedSteps: string[];
    startTour: () => void;
    skipTour: () => void;
    completeStep: (stepId: string) => void;
    resetTour: () => void;
    isStepActive: (stepId: string) => boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}

interface TourProviderProps {
    children: React.ReactNode;
    steps?: TourStep[];
}

export function TourProvider({ children, steps = DEFAULT_TOUR_STEPS }: TourProviderProps) {
    const [isActive, setIsActive] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Calculate current step based on completed steps
    const currentStepIndex = completedSteps.length;
    const currentStep = currentStepIndex < steps.length ? steps[currentStepIndex] : null;

    // Mark component as mounted (client-side only)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Load progress from localStorage (only on client after mount)
    useEffect(() => {
        if (!isMounted) return;

        const savedProgress = localStorage.getItem(TOUR_STORAGE_KEY);
        const tourComplete = localStorage.getItem(TOUR_COMPLETE_KEY);

        if (tourComplete === 'true') {
            // Tour already completed
            setCompletedSteps(steps.map(s => s.id));
            setIsActive(false);
        } else if (savedProgress) {
            const parsed = JSON.parse(savedProgress);
            setCompletedSteps(parsed.completedSteps || []);
            setIsActive(parsed.isActive ?? true);
        } else {
            // First time - start tour after a delay
            setTimeout(() => {
                setIsActive(true);
            }, 1000);
        }
        setHasInitialized(true);
    }, [isMounted, steps]);

    // Save progress to localStorage
    useEffect(() => {
        if (!hasInitialized) return;

        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
            completedSteps,
            isActive,
        }));

        // Mark complete if all steps done
        if (completedSteps.length >= steps.length) {
            localStorage.setItem(TOUR_COMPLETE_KEY, 'true');
        }
    }, [completedSteps, isActive, hasInitialized, steps.length]);

    const startTour = useCallback(() => {
        setCompletedSteps([]);
        setIsActive(true);
        localStorage.removeItem(TOUR_COMPLETE_KEY);
    }, []);

    const skipTour = useCallback(() => {
        setIsActive(false);
        setCompletedSteps(steps.map(s => s.id));
        localStorage.setItem(TOUR_COMPLETE_KEY, 'true');
    }, [steps]);

    const completeStep = useCallback((stepId: string) => {
        setCompletedSteps(prev => {
            if (prev.includes(stepId)) return prev;
            return [...prev, stepId];
        });
    }, []);

    const resetTour = useCallback(() => {
        localStorage.removeItem(TOUR_STORAGE_KEY);
        localStorage.removeItem(TOUR_COMPLETE_KEY);
        setCompletedSteps([]);
        setIsActive(true);
    }, []);

    const isStepActive = useCallback((stepId: string) => {
        if (!isActive) return false;
        return currentStep?.id === stepId;
    }, [isActive, currentStep]);

    const value: TourContextType = {
        isActive,
        currentStepIndex,
        currentStep,
        completedSteps,
        startTour,
        skipTour,
        completeStep,
        resetTour,
        isStepActive,
    };

    return (
        <TourContext.Provider value={value}>
            {children}
        </TourContext.Provider>
    );
}

/**
 * Hook to use at specific tour stop locations
 */
export function useTourStep(stepId: string) {
    const { isStepActive, completeStep, currentStep } = useTour();
    const isActive = isStepActive(stepId);
    const step = isActive ? currentStep : null;

    const dismiss = useCallback(() => {
        completeStep(stepId);
    }, [completeStep, stepId]);

    return {
        isActive,
        step,
        dismiss,
    };
}
