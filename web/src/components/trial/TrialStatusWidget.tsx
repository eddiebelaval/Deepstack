'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { useTrial } from '@/hooks/useTrial';
import { useTrialStore } from '@/lib/stores/trial-store';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface TrialStatusWidgetProps {
    variant?: 'sidebar' | 'card' | 'minimal';
    className?: string;
    showProgress?: boolean;
}

/**
 * Trial Status Widget
 *
 * Compact widget showing trial status for sidebars and profile areas.
 *
 * @example
 * ```tsx
 * // In sidebar
 * <TrialStatusWidget variant="sidebar" />
 *
 * // In profile card
 * <TrialStatusWidget variant="card" showProgress />
 * ```
 */
export function TrialStatusWidget({
    variant = 'sidebar',
    className,
    showProgress = false,
}: TrialStatusWidgetProps) {
    const { isTrialing, daysRemaining, phase, trialTier, logTrialEvent } = useTrial();
    const { recordUpgradeClick } = useTrialStore();

    // Don't render if not trialing
    if (!isTrialing) return null;

    const isUrgent = phase === 'urgency';
    const progressPercent = Math.max(0, Math.min(100, ((14 - daysRemaining) / 14) * 100));

    const handleClick = () => {
        recordUpgradeClick();
        logTrialEvent('upgrade_clicked', { from: 'status_widget', variant });
    };

    if (variant === 'minimal') {
        return (
            <Link
                href="/pricing"
                onClick={handleClick}
                className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                    isUrgent
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
                    className
                )}
            >
                {isUrgent ? (
                    <Clock className="w-3 h-3 animate-pulse" />
                ) : (
                    <Crown className="w-3 h-3" />
                )}
                {daysRemaining}d left
            </Link>
        );
    }

    if (variant === 'card') {
        return (
            <Link
                href="/pricing"
                onClick={handleClick}
                className={cn(
                    'block p-4 rounded-xl border transition-colors',
                    isUrgent
                        ? 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10'
                        : 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10',
                    className
                )}
            >
                <div className="flex items-center gap-3 mb-3">
                    <div
                        className={cn(
                            'p-2 rounded-lg',
                            isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'
                        )}
                    >
                        {isUrgent ? (
                            <Clock className="w-5 h-5 text-red-400 animate-pulse" />
                        ) : (
                            <Crown className="w-5 h-5 text-amber-400" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-medium">
                            {trialTier.toUpperCase()} Trial
                        </div>
                        <div
                            className={cn(
                                'text-xs',
                                isUrgent ? 'text-red-400' : 'text-muted-foreground'
                            )}
                        >
                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>

                {showProgress && (
                    <div className="space-y-1.5">
                        <Progress
                            value={progressPercent}
                            className={cn(
                                'h-1.5',
                                isUrgent ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500'
                            )}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Day {14 - daysRemaining + 1} of 14</span>
                            <span>{Math.round(progressPercent)}% complete</span>
                        </div>
                    </div>
                )}
            </Link>
        );
    }

    // Default: sidebar variant
    return (
        <Link
            href="/pricing"
            onClick={handleClick}
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all group',
                isUrgent
                    ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30',
                className
            )}
        >
            <div
                className={cn(
                    'p-1.5 rounded transition-colors',
                    isUrgent
                        ? 'bg-red-500/20 group-hover:bg-red-500/30'
                        : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                )}
            >
                {isUrgent ? (
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    >
                        <Clock className="w-4 h-4 text-red-400" />
                    </motion.div>
                ) : (
                    <Crown className="w-4 h-4 text-amber-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{trialTier.toUpperCase()} Trial</div>
                <div
                    className={cn(
                        'text-[10px]',
                        isUrgent ? 'text-red-400 font-medium' : 'text-muted-foreground'
                    )}
                >
                    {isUrgent
                        ? `Only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left!`
                        : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
                </div>
            </div>
            <Sparkles
                className={cn(
                    'w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity',
                    isUrgent ? 'text-red-400' : 'text-amber-400'
                )}
            />
        </Link>
    );
}

/**
 * Post-trial reminder widget
 */
export function PostTrialReminderWidget({ className }: { className?: string }) {
    const { recentlyEndedTrial, isTrialing, logTrialEvent } = useTrial();
    const { shouldShowPostTrialReminder, dismissPostTrialReminder, recordUpgradeClick } =
        useTrialStore();

    // Only show if trial recently ended and reminder not dismissed
    if (!recentlyEndedTrial || isTrialing || !shouldShowPostTrialReminder()) return null;

    const handleClick = () => {
        recordUpgradeClick();
        logTrialEvent('upgrade_clicked', { from: 'post_trial_reminder' });
    };

    return (
        <div
            className={cn(
                'relative p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20',
                className
            )}
        >
            <button
                onClick={dismissPostTrialReminder}
                className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded text-muted-foreground"
                aria-label="Dismiss"
            >
                <span className="text-xs">Later</span>
            </button>

            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                    <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium">Miss Your ELITE Features?</div>
                    <div className="text-xs text-muted-foreground">
                        Upgrade to restore Emotional Firewall and more
                    </div>
                </div>
            </div>

            <Link
                href="/pricing"
                onClick={handleClick}
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
                <Sparkles className="w-4 h-4" />
                Restore Access
            </Link>
        </div>
    );
}
