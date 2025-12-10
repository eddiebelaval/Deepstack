'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, TrendingUp, Shield, BookOpen, Keyboard, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const ONBOARDING_COMPLETE_KEY = 'deepstack_onboarding_complete';

interface Step {
    icon: React.ReactNode;
    title: string;
    description: string;
    tip?: string;
}

const STEPS: Step[] = [
    {
        icon: <Sparkles className="w-10 h-10 text-primary" />,
        title: "Welcome to deepstack",
        description: "Your AI-powered trading assistant with emotional discipline frameworks. Let's take a quick tour of what you can do.",
        tip: "You can revisit this guide anytime from the Help page.",
    },
    {
        icon: <MessageSquare className="w-10 h-10 text-primary" />,
        title: "AI Chat Assistant",
        description: "Ask questions about stocks, get analysis, and receive trading insights. Try asking \"Analyze AAPL\" or \"What are the best tech stocks today?\"",
        tip: "The AI has access to real-time market data and can execute research commands.",
    },
    {
        icon: <TrendingUp className="w-10 h-10 text-primary" />,
        title: "Market Data & Charts",
        description: "View real-time quotes, interactive charts, and technical indicators. Click any symbol in your watchlist to see detailed charts.",
        tip: "Use number keys 1-5 to quickly change timeframes on charts.",
    },
    {
        icon: <Shield className="w-10 h-10 text-primary" />,
        title: "Emotional Firewall",
        description: "Our unique discipline system helps prevent emotional trading decisions. You'll be warned before making potentially risky trades.",
        tip: "The firewall analyzes your trading patterns and emotional state.",
    },
    {
        icon: <BookOpen className="w-10 h-10 text-primary" />,
        title: "Journal & Thesis",
        description: "Log your trades with emotions, track your investment thesis, and learn from your history. Great for improving discipline.",
        tip: "Link journal entries to your thesis to track validation over time.",
    },
    {
        icon: <Keyboard className="w-10 h-10 text-primary" />,
        title: "Keyboard Shortcuts",
        description: "Power users love shortcuts. Press Cmd/Ctrl+K to search symbols, use 1-5 for timeframes, and c/l/a for chart types.",
        tip: "Press '?' at any time to see all available shortcuts.",
    },
];

export function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        // Check if onboarding has been completed
        const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (!completed) {
            // Small delay to let the page render first
            const timer = setTimeout(() => setIsOpen(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleComplete = () => {
        localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        setIsOpen(false);
    };

    const handleSkip = () => {
        localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        setIsOpen(false);
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isOpen) return null;

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
                    aria-label="Close onboarding"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Progress bar */}
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                        {step.icon}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-semibold mb-3">{step.title}</h2>

                    {/* Description */}
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                        {step.description}
                    </p>

                    {/* Tip */}
                    {step.tip && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-primary/90">
                            <strong>Tip:</strong> {step.tip}
                        </div>
                    )}
                </div>

                {/* Step indicators */}
                <div className="flex justify-center gap-2 pb-4">
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentStep(i)}
                            className={`w-2 h-2 rounded-full transition-all ${
                                i === currentStep
                                    ? 'bg-primary w-6'
                                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                            }`}
                            aria-label={`Go to step ${i + 1}`}
                        />
                    ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between px-6 pb-6">
                    <button
                        onClick={handlePrev}
                        disabled={isFirstStep}
                        className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>

                    <button
                        onClick={handleSkip}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Skip tour
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-1 px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all font-medium"
                    >
                        {isLastStep ? "Get Started" : "Next"}
                        {!isLastStep && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
