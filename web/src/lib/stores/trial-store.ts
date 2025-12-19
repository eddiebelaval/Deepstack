import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Trial UI Store
 *
 * Manages trial-related UI state that persists across sessions:
 * - Nudge dismissals (don't show midpoint nudge again after dismiss)
 * - Urgency nudge timing (re-show after 24h)
 * - Feature exploration tracking (for personalized messaging)
 * - Upgrade click tracking
 */

interface TrialUIState {
    // Nudge dismissals
    midpointNudgeDismissed: boolean;
    urgencyNudgeDismissedAt: number | null; // timestamp
    globalBannerDismissedAt: number | null; // timestamp

    // User interactions during trial
    upgradeClickedDuringTrial: boolean;
    upgradeClickedAt: number | null;
    featuresExplored: string[];
    pricingPageVisits: number;

    // Ghost feature interactions
    ghostFeatureClicks: Record<string, number>; // feature -> click count

    // Post-trial state
    postTrialReminderDismissedAt: number | null;

    // Actions
    dismissMidpointNudge: () => void;
    dismissUrgencyNudge: () => void;
    dismissGlobalBanner: () => void;
    dismissPostTrialReminder: () => void;
    recordUpgradeClick: () => void;
    recordFeatureExplored: (feature: string) => void;
    recordGhostFeatureClick: (feature: string) => void;
    recordPricingPageVisit: () => void;
    resetTrialUI: () => void;

    // Computed checks
    shouldShowMidpointNudge: () => boolean;
    shouldShowUrgencyNudge: () => boolean;
    shouldShowGlobalBanner: () => boolean;
    shouldShowPostTrialReminder: () => boolean;
    getMostClickedGhostFeature: () => string | null;
}

// Re-show urgency nudge after this many hours
const URGENCY_NUDGE_COOLDOWN_HOURS = 24;
// Re-show global banner after this many hours
const GLOBAL_BANNER_COOLDOWN_HOURS = 12;
// Show post-trial reminder for this many days
const POST_TRIAL_REMINDER_DAYS = 7;

export const useTrialStore = create<TrialUIState>()(
    persist(
        (set, get) => ({
            // Initial state
            midpointNudgeDismissed: false,
            urgencyNudgeDismissedAt: null,
            globalBannerDismissedAt: null,
            upgradeClickedDuringTrial: false,
            upgradeClickedAt: null,
            featuresExplored: [],
            pricingPageVisits: 0,
            ghostFeatureClicks: {},
            postTrialReminderDismissedAt: null,

            // Actions
            dismissMidpointNudge: () => set({ midpointNudgeDismissed: true }),

            dismissUrgencyNudge: () => set({ urgencyNudgeDismissedAt: Date.now() }),

            dismissGlobalBanner: () => set({ globalBannerDismissedAt: Date.now() }),

            dismissPostTrialReminder: () => set({ postTrialReminderDismissedAt: Date.now() }),

            recordUpgradeClick: () =>
                set({
                    upgradeClickedDuringTrial: true,
                    upgradeClickedAt: Date.now(),
                }),

            recordFeatureExplored: (feature) =>
                set((state) => ({
                    featuresExplored: state.featuresExplored.includes(feature)
                        ? state.featuresExplored
                        : [...state.featuresExplored, feature],
                })),

            recordGhostFeatureClick: (feature) =>
                set((state) => ({
                    ghostFeatureClicks: {
                        ...state.ghostFeatureClicks,
                        [feature]: (state.ghostFeatureClicks[feature] || 0) + 1,
                    },
                })),

            recordPricingPageVisit: () =>
                set((state) => ({
                    pricingPageVisits: state.pricingPageVisits + 1,
                })),

            resetTrialUI: () =>
                set({
                    midpointNudgeDismissed: false,
                    urgencyNudgeDismissedAt: null,
                    globalBannerDismissedAt: null,
                    upgradeClickedDuringTrial: false,
                    upgradeClickedAt: null,
                    featuresExplored: [],
                    pricingPageVisits: 0,
                    ghostFeatureClicks: {},
                    postTrialReminderDismissedAt: null,
                }),

            // Computed checks
            shouldShowMidpointNudge: () => {
                const { midpointNudgeDismissed } = get();
                return !midpointNudgeDismissed;
            },

            shouldShowUrgencyNudge: () => {
                const { urgencyNudgeDismissedAt } = get();
                if (!urgencyNudgeDismissedAt) return true;
                const hoursSinceDismiss =
                    (Date.now() - urgencyNudgeDismissedAt) / (1000 * 60 * 60);
                return hoursSinceDismiss >= URGENCY_NUDGE_COOLDOWN_HOURS;
            },

            shouldShowGlobalBanner: () => {
                const { globalBannerDismissedAt } = get();
                if (!globalBannerDismissedAt) return true;
                const hoursSinceDismiss =
                    (Date.now() - globalBannerDismissedAt) / (1000 * 60 * 60);
                return hoursSinceDismiss >= GLOBAL_BANNER_COOLDOWN_HOURS;
            },

            shouldShowPostTrialReminder: () => {
                const { postTrialReminderDismissedAt } = get();
                if (!postTrialReminderDismissedAt) return true;
                const daysSinceDismiss =
                    (Date.now() - postTrialReminderDismissedAt) / (1000 * 60 * 60 * 24);
                return daysSinceDismiss >= POST_TRIAL_REMINDER_DAYS;
            },

            getMostClickedGhostFeature: () => {
                const { ghostFeatureClicks } = get();
                const entries = Object.entries(ghostFeatureClicks);
                if (entries.length === 0) return null;
                entries.sort(([, a], [, b]) => b - a);
                return entries[0][0];
            },
        }),
        {
            name: 'deepstack-trial-ui',
            version: 1,
        }
    )
);

/**
 * Selector for trial nudge visibility
 */
export function useTrialNudgeVisibility(phase: 'midpoint' | 'urgency' | 'none') {
    const shouldShowMidpoint = useTrialStore((s) => s.shouldShowMidpointNudge());
    const shouldShowUrgency = useTrialStore((s) => s.shouldShowUrgencyNudge());

    if (phase === 'midpoint') return shouldShowMidpoint;
    if (phase === 'urgency') return shouldShowUrgency;
    return false;
}
