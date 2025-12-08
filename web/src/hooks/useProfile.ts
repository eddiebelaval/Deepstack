'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useSession';
import type { SubscriptionTier } from '@/lib/subscription';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    subscription_tier: SubscriptionTier;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: 'inactive' | 'active' | 'past_due' | 'canceled' | 'trialing';
    subscription_starts_at: string | null;
    subscription_ends_at: string | null;
    created_at: string;
    updated_at: string;
}

export function useProfile() {
    const user = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const supabase = createClient();
                if (!supabase) {
                    setProfile(null);
                    return;
                }
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (fetchError) {
                    throw fetchError;
                }

                setProfile(data as UserProfile);
                setError(null);
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError(err as Error);
                setProfile(null);
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
                (payload) => {
                    setProfile(payload.new as UserProfile);
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
        tier: profile?.subscription_tier || 'free',
        isActive: profile?.subscription_status === 'active',
    };
}
