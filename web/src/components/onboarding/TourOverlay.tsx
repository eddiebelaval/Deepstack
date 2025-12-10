'use client';

import React from 'react';
import { useTour, useTourStep } from './TourManager';
import { TourPing } from './TourPing';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

/**
 * Floating welcome ping that appears in a fixed position
 * Used for the initial "Welcome" step before the user navigates to specific areas
 */
function WelcomePing() {
    const { isActive, step, dismiss } = useTourStep('welcome');

    if (!isActive || !step) return null;

    return (
        <div className="fixed bottom-24 right-8 z-50">
            <TourPing
                isActive={isActive}
                title={step.title}
                description={step.description}
                tip={step.tip}
                position="left"
                onDismiss={dismiss}
            />
        </div>
    );
}

/**
 * Tour progress indicator and skip button
 */
function TourProgressIndicator() {
    const { isActive, currentStepIndex, skipTour, completedSteps } = useTour();
    const totalSteps = 6; // Matches DEFAULT_TOUR_STEPS length

    if (!isActive || completedSteps.length >= totalSteps) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card/90 backdrop-blur-md border border-border/60 rounded-full px-4 py-2 shadow-xl"
            >
                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                i < completedSteps.length
                                    ? 'bg-profit'
                                    : i === currentStepIndex
                                    ? 'bg-primary animate-pulse w-4'
                                    : 'bg-muted-foreground/30'
                            }`}
                        />
                    ))}
                </div>

                {/* Step counter */}
                <span className="text-xs text-muted-foreground">
                    {completedSteps.length}/{totalSteps}
                </span>

                {/* Skip button */}
                <button
                    onClick={skipTour}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 pl-2 border-l border-border/50"
                >
                    Skip tour
                    <X className="h-3 w-3" />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Reset tour button (shown when tour is complete, in settings area)
 */
export function RestartTourButton() {
    const { resetTour, completedSteps } = useTour();
    const totalSteps = 6;

    // Only show if tour is complete
    if (completedSteps.length < totalSteps) return null;

    return (
        <button
            onClick={resetTour}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
            <RotateCcw className="h-4 w-4" />
            Restart Tour
        </button>
    );
}

/**
 * Main tour overlay component - renders all floating tour elements
 */
export function TourOverlay() {
    return (
        <>
            <WelcomePing />
            <TourProgressIndicator />
        </>
    );
}

export default TourOverlay;
