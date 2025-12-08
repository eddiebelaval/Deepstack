export type SubscriptionTier = 'free' | 'pro' | 'elite';

export const TIER_FEATURES = {
    free: {
        aiChatsPerDay: 5,
        journalEntries: 10,
        emotionalFirewall: false,
        psychologyAnalytics: false,
        automation: false,
        thesisTracking: false,
        optionsAnalysis: false,
        unlimitedJournal: false,
    },
    pro: {
        aiChatsPerDay: Infinity,
        journalEntries: Infinity,
        emotionalFirewall: false,
        psychologyAnalytics: false,
        automation: false,
        thesisTracking: true,
        optionsAnalysis: true,
        unlimitedJournal: true,
    },
    elite: {
        aiChatsPerDay: Infinity,
        journalEntries: Infinity,
        emotionalFirewall: true,
        psychologyAnalytics: true,
        automation: true,
        thesisTracking: true,
        optionsAnalysis: true,
        unlimitedJournal: true,
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
