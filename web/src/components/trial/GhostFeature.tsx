'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Shield, Brain, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStore } from '@/lib/stores/trial-store';
import { useTrial } from '@/hooks/useTrial';
import { cn } from '@/lib/utils';
import type { SubscriptionTier } from '@/lib/subscription';

interface GhostFeatureProps {
    featureName: string;
    featureKey: string;
    description: string;
    previewContent: React.ReactNode;
    requiredTier: SubscriptionTier;
    className?: string;
    /** Show fake activity indicators */
    showActivity?: boolean;
    /** Activity text to display */
    activityText?: string;
}

const tierColors = {
    pro: {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        button: 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
    },
    elite: {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        button: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    },
    free: {
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30',
        text: 'text-gray-400',
        button: 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
    },
};

const featureIcons: Record<string, React.ElementType> = {
    emotionalFirewall: Shield,
    psychologyAnalytics: Brain,
    automation: Zap,
    deepResearch: TrendingUp,
};

/**
 * Ghost Feature Component
 *
 * Shows a locked feature with a blurred preview and activity indicators.
 * Creates FOMO by showing the feature "working" but not acting.
 *
 * @example
 * ```tsx
 * <GhostFeature
 *   featureName="Emotional Firewall"
 *   featureKey="emotionalFirewall"
 *   description="Your trading guardian is monitoring patterns..."
 *   previewContent={<EmotionalFirewallPreview />}
 *   requiredTier="elite"
 *   showActivity
 *   activityText="Detected 3 patterns today"
 * />
 * ```
 */
export function GhostFeature({
    featureName,
    featureKey,
    description,
    previewContent,
    requiredTier,
    className,
    showActivity = true,
    activityText = 'Monitoring...',
}: GhostFeatureProps) {
    const { recordGhostFeatureClick } = useTrialStore();
    const { logTrialEvent, recentlyEndedTrial } = useTrial();
    const colors = tierColors[requiredTier];
    const Icon = featureIcons[featureKey] || Sparkles;

    const handleClick = () => {
        recordGhostFeatureClick(featureKey);
        logTrialEvent('upgrade_clicked', { from: 'ghost_feature', feature: featureKey });
    };

    return (
        <div className={cn('relative rounded-xl overflow-hidden', colors.border, 'border', className)}>
            {/* Blurred preview with activity */}
            <div className="relative">
                <div className="blur-sm pointer-events-none select-none opacity-60">
                    {previewContent}
                </div>

                {/* Fake activity indicators */}
                {showActivity && (
                    <motion.div
                        className={cn(
                            'absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full',
                            colors.bg
                        )}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                    >
                        <motion.div
                            className={cn('w-2 h-2 rounded-full', colors.text.replace('text-', 'bg-'))}
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                        <span className={cn('text-xs font-medium', colors.text)}>{activityText}</span>
                    </motion.div>
                )}
            </div>

            {/* Overlay with unlock prompt */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/50 flex flex-col items-center justify-end p-6">
                <div className="text-center space-y-4 max-w-sm">
                    {/* Icon */}
                    <motion.div
                        className={cn(
                            'inline-flex items-center justify-center w-14 h-14 rounded-2xl',
                            colors.bg
                        )}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                    >
                        <Icon className={cn('w-7 h-7', colors.text)} />
                    </motion.div>

                    {/* Title and description */}
                    <div>
                        <h3 className="font-semibold text-lg mb-1">{featureName}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>

                    {/* Post-trial messaging */}
                    {recentlyEndedTrial && (
                        <p className="text-xs text-amber-400">
                            You had access to this during your trial. Upgrade to restore it.
                        </p>
                    )}

                    {/* Unlock button */}
                    <Button
                        asChild
                        onClick={handleClick}
                        className={cn('bg-gradient-to-r', colors.button)}
                    >
                        <Link href="/pricing">
                            <Lock className="w-4 h-4 mr-2" />
                            Unlock with {requiredTier === 'elite' ? 'Elite' : 'Pro'}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Smaller inline ghost feature prompt
 */
export function GhostFeatureInline({
    featureName,
    featureKey,
    requiredTier,
    className,
}: {
    featureName: string;
    featureKey: string;
    requiredTier: SubscriptionTier;
    className?: string;
}) {
    const { recordGhostFeatureClick } = useTrialStore();
    const { logTrialEvent } = useTrial();
    const colors = tierColors[requiredTier];
    const Icon = featureIcons[featureKey] || Sparkles;

    const handleClick = () => {
        recordGhostFeatureClick(featureKey);
        logTrialEvent('upgrade_clicked', { from: 'ghost_feature_inline', feature: featureKey });
    };

    return (
        <Link
            href="/pricing"
            onClick={handleClick}
            className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                colors.border,
                'hover:bg-muted/50',
                className
            )}
        >
            <div className={cn('p-2 rounded-lg', colors.bg)}>
                <Icon className={cn('w-4 h-4', colors.text)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{featureName}</div>
                <div className="text-xs text-muted-foreground">
                    {requiredTier === 'elite' ? 'Elite' : 'Pro'} feature
                </div>
            </div>
            <Lock className="w-4 h-4 text-muted-foreground" />
        </Link>
    );
}

/**
 * Emotional Firewall ghost preview content
 */
export function EmotionalFirewallGhostPreview() {
    return (
        <div className="p-6 space-y-4">
            {/* Fake alert */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-red-400" />
                    <div>
                        <div className="text-sm font-medium text-red-400">Revenge Trade Detected</div>
                        <div className="text-xs text-muted-foreground">
                            Trading TSLA after recent -$450 loss
                        </div>
                    </div>
                </div>
            </div>

            {/* Fake stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">3</div>
                    <div className="text-xs text-muted-foreground">Blocked Today</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">$1,250</div>
                    <div className="text-xs text-muted-foreground">Saved</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">12</div>
                    <div className="text-xs text-muted-foreground">This Week</div>
                </div>
            </div>
        </div>
    );
}
