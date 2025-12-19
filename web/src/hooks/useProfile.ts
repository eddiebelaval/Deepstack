'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useSession';
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/subscription';

// Profile from profiles table (basic user info)
export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

// Combined profile with subscription and trial data
export interface UserProfileWithSubscription extends UserProfile {
    subscription_tier: SubscriptionTier;
    subscription_status: SubscriptionStatus;
    subscription_ends_at: string | null;
    // Trial fields
    trial_started_at: string | null;
    trial_ends_at: string | null;
    trial_tier: SubscriptionTier | null;
    has_used_trial: boolean;
    trial_downgraded_at: string | null;
    trial_converted_at: string | null;
}

export function useProfile() {
    const user = useUser();
    const [profile, setProfile] = useState<UserProfileWithSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const fetchAttempted = useRef(false);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            fetchAttempted.current = false;
            return;
        }

        // Prevent repeated fetch attempts for the same user
        if (fetchAttempted.current) {
            return;
        }

        const fetchProfile = async () => {
            fetchAttempted.current = true;

            try {
                const supabase = createClient();
                if (!supabase) {
                    setProfile(null);
                    setIsLoading(false);
                    return;
                }

                // Fetch profile - use maybeSingle() to handle no rows gracefully
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                // Profile not found is not an error - user may not have profile yet
                if (profileError && profileError.code !== 'PGRST116') {
                    throw profileError;
                }

                // Fetch subscription data
                const { data: subData } = await supabase
                    .from('subscriptions')
                    .select('tier, status, active, current_period_end')
                    .eq('user_id', user.id)
                    .maybeSingle();

                // Build combined profile - prefer profiles table data over subscriptions table
                const combinedProfile: UserProfileWithSubscription = {
                    id: user.id,
                    email: profileData?.email ?? user.email ?? null,
                    full_name: profileData?.full_name ?? null,
                    avatar_url: profileData?.avatar_url ?? null,
                    created_at: profileData?.created_at ?? new Date().toISOString(),
                    updated_at: profileData?.updated_at ?? new Date().toISOString(),
                    // Use profiles table subscription fields first, fall back to subscriptions table
                    subscription_tier: (profileData?.subscription_tier as SubscriptionTier) ??
                        (subData?.tier?.toLowerCase() as SubscriptionTier) ?? 'free',
                    subscription_status: (profileData?.subscription_status as SubscriptionStatus) ??
                        (subData?.active ? 'active' : 'inactive'),
                    subscription_ends_at: profileData?.subscription_ends_at ?? subData?.current_period_end ?? null,
                    // Trial fields from profiles table
                    trial_started_at: profileData?.trial_started_at ?? null,
                    trial_ends_at: profileData?.trial_ends_at ?? null,
                    trial_tier: (profileData?.trial_tier as SubscriptionTier) ?? null,
                    has_used_trial: profileData?.has_used_trial ?? false,
                    trial_downgraded_at: profileData?.trial_downgraded_at ?? null,
                    trial_converted_at: profileData?.trial_converted_at ?? null,
                };

                setProfile(combinedProfile);
                setError(null);
            } catch (err) {
                // Only log unexpected errors, not "no rows" which is expected
                const pgError = err as { code?: string };
                if (pgError.code !== 'PGRST116') {
                    console.error('Error fetching profile:', err);
                }
                setError(err as Error);
                // Still provide a minimal profile from auth user
                setProfile({
                    id: user.id,
                    email: user.email ?? null,
                    full_name: null,
                    avatar_url: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    subscription_tier: 'free',
                    subscription_status: 'inactive',
                    subscription_ends_at: null,
                    // Trial fields default
                    trial_started_at: null,
                    trial_ends_at: null,
                    trial_tier: null,
                    has_used_trial: false,
                    trial_downgraded_at: null,
                    trial_converted_at: null,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();

        // Set up real-time subscription for profile changes
        const supabase = createClient();
        if (!supabase) return;

        const channel = supabase
            .channel(`profile:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                () => {
                    // Reset fetch flag to allow refetch on realtime update
                    fetchAttempted.current = false;
                    fetchProfile();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user]);

    return {
        profile,
        isLoading,
        error,
        tier: profile?.subscription_tier ?? 'free',
        isActive: profile?.subscription_status === 'active',
    };
}
