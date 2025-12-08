'use client';

import { useUser as useAuthUser } from './useSession';
import { useProfile } from './useProfile';

/**
 * Combined hook that provides both auth user and profile data
 */
export function useUser() {
    const user = useAuthUser();
    const { profile, isLoading: profileLoading, tier, isActive } = useProfile();

    return {
        user,
        profile,
        isLoading: profileLoading,
        tier,
        isActive,
    };
}
