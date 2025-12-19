'use client';

import { useMemo, useCallback } from 'react';
import { useProfile } from './useProfile';
import {
    getTrialDaysRemaining,
    getTrialPhase,
    isInActiveTrial,
    getEffectiveTier,
    getTrialNudgeConfig,
    type SubscriptionTier,
    type TrialPhase,
} from '@/lib/subscription';
import type { TrialState, TrialNudge } from '@/lib/types/trial';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook for accessing trial state and helpers
 *
 * @example
 * ```tsx
 * const { isTrialing, daysRemaining, phase, nudge, effectiveTier } = useTrial();
 *
 * if (isTrialing && phase === 'urgency') {
 *   return <TrialCountdownBanner />;
 * }
 * ```
 */
export function useTrial() {
    const { profile, isLoading } = useProfile();

    const trialState: TrialState = useMemo(() => {
        if (!profile) {
            return {
                isTrialing: false,
                trialStartedAt: null,
                trialEndsAt: null,
                trialTier: 'elite',
                daysRemaining: 0,
                phase: 'none' as TrialPhase,
                hasUsedTrial: false,
                trialDowngradedAt: null,
                trialConvertedAt: null,
            };
        }

        const isTrialing = isInActiveTrial(profile.subscription_status, profile.trial_ends_at);
        const daysRemaining = getTrialDaysRemaining(profile.trial_ends_at);
        const phase = isTrialing ? getTrialPhase(profile.trial_ends_at) : 'none';

        return {
            isTrialing,
            trialStartedAt: profile.trial_started_at ? new Date(profile.trial_started_at) : null,
            trialEndsAt: profile.trial_ends_at ? new Date(profile.trial_ends_at) : null,
            trialTier: profile.trial_tier || 'elite',
            daysRemaining,
            phase,
            hasUsedTrial: profile.has_used_trial || false,
            trialDowngradedAt: profile.trial_downgraded_at ? new Date(profile.trial_downgraded_at) : null,
            trialConvertedAt: profile.trial_converted_at ? new Date(profile.trial_converted_at) : null,
        };
    }, [profile]);

    // Get the appropriate nudge based on trial phase
    const nudge: TrialNudge | null = useMemo(() => {
        if (!trialState.isTrialing) return null;

        const { phase, daysRemaining } = trialState;
        const config = getTrialNudgeConfig(phase, daysRemaining);

        if (!config) return null;

        return {
            type: phase === 'urgency' ? 'urgency' : 'midpoint',
            title: config.title,
            message: config.message,
            daysRemaining,
            features: config.features,
            cta: config.cta,
            urgency: config.urgency,
        };
    }, [trialState]);

    // Calculate effective tier (trial tier during trial, base tier otherwise)
    const effectiveTier: SubscriptionTier = useMemo(() => {
        if (!profile) return 'free';

        return getEffectiveTier(
            profile.subscription_tier,
            profile.subscription_status,
            profile.trial_tier || undefined,
            profile.trial_ends_at
        );
    }, [profile]);

    // Log trial event to database
    const logTrialEvent = useCallback(async (
        eventType: string,
        metadata: Record<string, unknown> = {}
    ) => {
        if (!profile?.id) return;

        try {
            const supabase = createClient();
            if (!supabase) return;

            await supabase.rpc('log_trial_event', {
                p_user_id: profile.id,
                p_event_type: eventType,
                p_metadata: metadata,
            });
        } catch (error) {
            console.error('Failed to log trial event:', error);
        }
    }, [profile?.id]);

    // Check if user can start a trial
    const canStartTrial = useMemo(() => {
        return !trialState.hasUsedTrial && !trialState.isTrialing;
    }, [trialState.hasUsedTrial, trialState.isTrialing]);

    // Check if trial recently ended (for post-trial messaging)
    const recentlyEndedTrial = useMemo(() => {
        if (!trialState.trialDowngradedAt) return false;
        const daysSinceDowngrade = Math.floor(
            (Date.now() - trialState.trialDowngradedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceDowngrade <= 7; // Show post-trial messaging for 7 days
    }, [trialState.trialDowngradedAt]);

    return {
        // Trial state
        ...trialState,
        isLoading,
        nudge,
        effectiveTier,

        // Actions
        logTrialEvent,

        // Computed helpers
        canStartTrial,
        recentlyEndedTrial,

        // Convenience checks
        isAtMidpoint: trialState.phase === 'midpoint',
        isUrgent: trialState.phase === 'urgency',
        hasConverted: !!trialState.trialConvertedAt,
    };
}

/**
 * Lighter hook that only returns trial status without profile fetching
 * Use this when you only need to check if user is trialing
 */
export function useTrialStatus() {
    const { profile, isLoading } = useProfile();

    const isTrialing = useMemo(() => {
        if (!profile) return false;
        return isInActiveTrial(profile.subscription_status, profile.trial_ends_at);
    }, [profile]);

    const daysRemaining = useMemo(() => {
        if (!profile) return 0;
        return getTrialDaysRemaining(profile.trial_ends_at);
    }, [profile]);

    return {
        isTrialing,
        daysRemaining,
        isLoading,
    };
}
