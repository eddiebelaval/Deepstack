'use client';

import { useUser as useAuthUser } from './useSession';
import { useProfile } from './useProfile';
import { useTrial } from './useTrial';

/**
 * Combined hook that provides auth user, profile data, and trial state
 *
 * @example
 * ```tsx
 * const { user, tier, trial } = useUser();
 *
 * // tier is the effective tier (accounts for trial)
 * if (tier === 'elite') {
 *   // User has elite access (either paid or trial)
 * }
 *
 * // Check if user is specifically trialing
 * if (trial.isTrialing) {
 *   // Show trial-specific UI
 * }
 * ```
 */
export function useUser() {
    const user = useAuthUser();
    const { profile, isLoading: profileLoading, isActive } = useProfile();
    const trial = useTrial();

    return {
        user,
        profile,
        isLoading: profileLoading || trial.isLoading,
        // Use effective tier from trial hook (accounts for trial status)
        tier: trial.effectiveTier,
        // Active if paid subscription OR in trial
        isActive: isActive || trial.isTrialing,
        // Expose full trial state for components that need it
        trial,
    };
}
