import type { SubscriptionTier, TrialPhase } from '@/lib/subscription';

/**
 * Trial state for a user
 */
export interface TrialState {
    /** Whether user is currently in an active trial */
    isTrialing: boolean;
    /** When the trial started */
    trialStartedAt: Date | null;
    /** When the trial ends/ended */
    trialEndsAt: Date | null;
    /** The tier the user has access to during trial */
    trialTier: SubscriptionTier;
    /** Days remaining in the trial */
    daysRemaining: number;
    /** Current phase of the trial */
    phase: TrialPhase;
    /** Whether user has ever used a trial (prevents re-trial) */
    hasUsedTrial: boolean;
    /** When the user was downgraded after trial ended */
    trialDowngradedAt: Date | null;
    /** When the user converted to paid during trial */
    trialConvertedAt: Date | null;
}

/**
 * Trial nudge configuration for UI display
 */
export interface TrialNudge {
    type: 'midpoint' | 'urgency' | 'post_trial';
    title: string;
    message: string;
    daysRemaining: number;
    features: string[];
    cta: string;
    urgency: 'low' | 'high';
}

/**
 * Trial event types for analytics
 */
export type TrialEventType =
    | 'trial_started'
    | 'midpoint_nudge_shown'
    | 'midpoint_nudge_dismissed'
    | 'urgency_shown'
    | 'urgency_dismissed'
    | 'upgrade_clicked'
    | 'trial_ended'
    | 'trial_converted'
    | 'trial_extended';

/**
 * Trial event for logging
 */
export interface TrialEvent {
    id: string;
    userId: string;
    eventType: TrialEventType;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

/**
 * Trial configuration from database
 */
export interface TrialConfig {
    trialDurationDays: number;
    trialTier: SubscriptionTier;
    midpointNudgeDay: number;
    urgencyStartDay: number;
    enabled: boolean;
}

/**
 * User profile with trial fields
 */
export interface UserTrialProfile {
    id: string;
    email: string | null;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled' | 'trialing';
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    trialTier: SubscriptionTier | null;
    hasUsedTrial: boolean;
    trialDowngradedAt: string | null;
    trialConvertedAt: string | null;
}
