export type SubscriptionTier = 'free' | 'pro' | 'elite';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled' | 'trialing';
export type TrialPhase = 'active' | 'midpoint' | 'urgency' | 'ended' | 'none';
export type AIModel = 'haiku' | 'sonnet' | 'all';

export const TIER_FEATURES = {
    free: {
        aiChatsPerDay: 5,
        aiModel: 'haiku' as AIModel,
        journalEntries: 10,
        journalReadOnly: false, // First 10 editable, rest read-only after downgrade
        emotionalFirewall: false,
        emotionalFirewallGhost: true, // Show ghost feature on FREE tier
        psychologyAnalytics: false,
        psychologyAnalyticsLevel: 'none' as const,
        automation: false,
        thesisTracking: false,
        optionsAnalysis: false,
        optionsView: true, // Can view options chains
        deepResearch: 0,
        unlimitedJournal: false,
        watchlists: 3,
        dashboardWidgets: 6,
    },
    pro: {
        aiChatsPerDay: 50,
        aiModel: 'sonnet' as AIModel,
        journalEntries: Infinity,
        journalReadOnly: false,
        emotionalFirewall: false,
        emotionalFirewallGhost: false,
        psychologyAnalytics: true,
        psychologyAnalyticsLevel: 'basic' as const,
        automation: false,
        thesisTracking: true,
        optionsAnalysis: true,
        optionsView: true,
        deepResearch: 10,
        unlimitedJournal: true,
        watchlists: Infinity,
        dashboardWidgets: Infinity,
    },
    elite: {
        aiChatsPerDay: Infinity,
        aiModel: 'all' as AIModel,
        journalEntries: Infinity,
        journalReadOnly: false,
        emotionalFirewall: true,
        emotionalFirewallGhost: false,
        psychologyAnalytics: true,
        psychologyAnalyticsLevel: 'full' as const,
        automation: true,
        thesisTracking: true,
        optionsAnalysis: true,
        optionsView: true,
        deepResearch: 50,
        unlimitedJournal: true,
        watchlists: Infinity,
        dashboardWidgets: Infinity,
    },
} as const;

export const TIER_PRICES = {
    free: { monthly: 0, display: 'Free' },
    pro: { monthly: 19, display: '$19/mo' },
    elite: { monthly: 49, display: '$49/mo' },
} as const;

export function canAccess(
    tier: SubscriptionTier,
    feature: keyof typeof TIER_FEATURES.elite
): boolean {
    return TIER_FEATURES[tier][feature] as boolean;
}

export function getRequiredTier(feature: keyof typeof TIER_FEATURES.elite): SubscriptionTier {
    if (TIER_FEATURES.free[feature]) return 'free';
    if (TIER_FEATURES.pro[feature]) return 'pro';
    return 'elite';
}

export function getTierDisplayName(tier: SubscriptionTier): string {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// ============================================
// TRIAL HELPER FUNCTIONS
// ============================================

/**
 * Calculate days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt: Date | string | null | undefined): number {
    if (!trialEndsAt) return 0;
    const end = new Date(trialEndsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Determine the current trial phase based on days remaining
 * - active: Days 1-6 (more than 7 days left)
 * - midpoint: Days 7-11 (3-7 days left)
 * - urgency: Days 12-14 (1-3 days left)
 * - ended: Day 15+ (0 days left)
 */
export function getTrialPhase(trialEndsAt: Date | string | null | undefined): TrialPhase {
    const days = getTrialDaysRemaining(trialEndsAt);
    if (days <= 0) return 'ended';
    if (days <= 3) return 'urgency';   // Days 12-14 (3 or fewer days left)
    if (days <= 7) return 'midpoint';  // Days 7-11 (4-7 days left)
    return 'active';                    // Days 1-6 (more than 7 days left)
}

/**
 * Check if a user is currently in an active trial
 */
export function isInActiveTrial(
    subscriptionStatus: SubscriptionStatus | undefined,
    trialEndsAt: Date | string | null | undefined
): boolean {
    if (subscriptionStatus !== 'trialing') return false;
    return getTrialDaysRemaining(trialEndsAt) > 0;
}

/**
 * Get the effective tier (accounts for trial status)
 */
export function getEffectiveTier(
    baseTier: SubscriptionTier,
    subscriptionStatus: SubscriptionStatus | undefined,
    trialTier: SubscriptionTier | undefined,
    trialEndsAt: Date | string | null | undefined
): SubscriptionTier {
    if (isInActiveTrial(subscriptionStatus, trialEndsAt) && trialTier) {
        return trialTier;
    }
    return baseTier;
}

/**
 * Format trial end date for display
 */
export function formatTrialEndDate(trialEndsAt: Date | string | null | undefined): string {
    if (!trialEndsAt) return '';
    const date = new Date(trialEndsAt);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Get trial nudge configuration based on phase
 */
export function getTrialNudgeConfig(phase: TrialPhase, daysRemaining: number) {
    switch (phase) {
        case 'midpoint':
            return {
                title: 'Halfway Through Your Trial!',
                message: `You have ${daysRemaining} days left to explore ELITE features.`,
                urgency: 'low' as const,
                features: ['Emotional Firewall', 'Psychology Analytics', 'Unlimited AI', 'Deep Research'],
                cta: 'Keep These Features',
            };
        case 'urgency':
            return {
                title: `Only ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} Left!`,
                message: 'Upgrade now to keep your ELITE features and trading edge.',
                urgency: 'high' as const,
                features: ['All AI models', 'Emotional Firewall', 'Unlimited everything'],
                cta: 'Upgrade Now',
            };
        case 'ended':
            return {
                title: 'Trial Ended',
                message: 'Your ELITE trial has ended. Upgrade to restore full access.',
                urgency: 'high' as const,
                features: ['Restore Emotional Firewall', 'Unlock all AI models', 'Unlimited access'],
                cta: 'Upgrade to Continue',
            };
        default:
            return null;
    }
}
