'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrial } from '@/hooks/useTrial';
import { useTrialStore } from '@/lib/stores/trial-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Crown, Sparkles, ArrowRight, X, Shield, Brain, Zap } from 'lucide-react';

interface TrialCountdownBannerProps {
    variant?: 'inline' | 'floating' | 'compact';
    className?: string;
    onUpgradeClick?: () => void;
}

const featureIcons: Record<string, React.ElementType> = {
    'Emotional Firewall': Shield,
    'Psychology Analytics': Brain,
    'Unlimited AI': Zap,
    'Deep Research': Sparkles,
};

export function TrialCountdownBanner({
    variant = 'inline',
    className,
    onUpgradeClick,
}: TrialCountdownBannerProps) {
    const { isTrialing, daysRemaining, phase, nudge, logTrialEvent } = useTrial();
    const {
        shouldShowMidpointNudge,
        shouldShowUrgencyNudge,
        dismissMidpointNudge,
        dismissUrgencyNudge,
        recordUpgradeClick,
    } = useTrialStore();

    // Don't render if not trialing or no nudge
    if (!isTrialing || !nudge) return null;

    // Check if we should show based on dismissal state
    const shouldShow =
        (phase === 'midpoint' && shouldShowMidpointNudge()) ||
        (phase === 'urgency' && shouldShowUrgencyNudge());

    if (!shouldShow) return null;

    const isUrgent = phase === 'urgency';

    const handleDismiss = () => {
        if (phase === 'midpoint') {
            dismissMidpointNudge();
            logTrialEvent('midpoint_nudge_dismissed');
        } else {
            dismissUrgencyNudge();
            logTrialEvent('urgency_dismissed');
        }
    };

    const handleUpgradeClick = () => {
        recordUpgradeClick();
        logTrialEvent('upgrade_clicked', { from: 'countdown_banner', phase });
        onUpgradeClick?.();
    };

    if (variant === 'compact') {
        return (
            <Link
                href="/pricing"
                onClick={handleUpgradeClick}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                    isUrgent
                        ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30',
                    className
                )}
            >
                <div
                    className={cn(
                        'p-1.5 rounded',
                        isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'
                    )}
                >
                    {isUrgent ? (
                        <Clock className="w-4 h-4 text-red-400 animate-pulse" />
                    ) : (
                        <Crown className="w-4 h-4 text-amber-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={cn('text-xs font-medium', isUrgent ? 'text-red-400' : 'text-amber-400')}>
                        {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        {nudge.cta}
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                    'rounded-xl p-4 relative overflow-hidden',
                    isUrgent
                        ? 'bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 border border-red-500/30'
                        : 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20',
                    className
                )}
            >
                {/* Background pulse for urgency */}
                {isUrgent && (
                    <motion.div
                        className="absolute inset-0 bg-red-500/5"
                        animate={{ opacity: [0.3, 0.1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    />
                )}

                {/* Dismiss button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors z-10"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>

                <div className="flex items-start gap-4 relative">
                    {/* Icon */}
                    <div
                        className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                            isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'
                        )}
                    >
                        {isUrgent ? (
                            <Clock className="w-6 h-6 text-red-400 animate-pulse" />
                        ) : (
                            <Crown className="w-6 h-6 text-amber-400" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-8">
                        <p
                            className={cn(
                                'text-sm font-semibold mb-1',
                                isUrgent ? 'text-red-400' : 'text-amber-400'
                            )}
                        >
                            {nudge.title}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">{nudge.message}</p>

                        {/* Features preview */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {nudge.features.slice(0, 4).map((feature) => {
                                const Icon = featureIcons[feature] || Sparkles;
                                return (
                                    <span
                                        key={feature}
                                        className={cn(
                                            'inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full',
                                            isUrgent ? 'bg-red-500/10' : 'bg-amber-500/10'
                                        )}
                                    >
                                        <Icon className="w-3 h-3" />
                                        {feature}
                                    </span>
                                );
                            })}
                        </div>

                        {/* CTA Button */}
                        <Button
                            asChild
                            size="sm"
                            onClick={handleUpgradeClick}
                            className={cn(
                                'text-xs font-medium',
                                isUrgent
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                            )}
                        >
                            <Link href="/pricing">
                                <Sparkles className="w-3 h-3 mr-1.5" />
                                {nudge.cta}
                                <ArrowRight className="w-3 h-3 ml-1.5" />
                            </Link>
                        </Button>
                    </div>

                    {/* Countdown badge */}
                    <div
                        className={cn(
                            'text-center px-4 py-3 rounded-xl shrink-0',
                            isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'
                        )}
                    >
                        <div
                            className={cn(
                                'text-3xl font-bold tabular-nums',
                                isUrgent ? 'text-red-400' : 'text-amber-400'
                            )}
                        >
                            {daysRemaining}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {daysRemaining === 1 ? 'Day' : 'Days'} Left
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Global trial banner for the top of the page
 */
export function TrialGlobalBanner() {
    const { isTrialing, phase } = useTrial();
    const { shouldShowGlobalBanner, dismissGlobalBanner } = useTrialStore();

    // Only show during midpoint and urgency phases
    if (!isTrialing || phase === 'active' || phase === 'none') return null;
    if (!shouldShowGlobalBanner()) return null;

    return (
        <div className="w-full">
            <TrialCountdownBanner
                variant="inline"
                className="rounded-none border-x-0 border-t-0"
                onUpgradeClick={() => dismissGlobalBanner()}
            />
        </div>
    );
}
