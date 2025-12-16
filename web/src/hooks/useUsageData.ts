'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useSession';
import {
  useCreditStore,
  type UserTier,
  type CategoryUsage,
  type RecentActivity,
  type UsageCategory,
} from '@/lib/stores/credit-store';

/**
 * Usage data hook return type.
 * Provides all data needed for the Usage Panel.
 */
export interface UsageData {
  // Credit state
  credits: number;
  tier: UserTier;
  tierLimit: number;
  usagePercent: number;

  // Category breakdown
  categories: CategoryUsage[];
  totalUsed: number;

  // Recent activity
  recentActivity: RecentActivity[];

  // Reset info
  resetDate: Date | null;
  daysUntilReset: number;

  // Loading state
  isLoading: boolean;
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
}

// Category labels for display
const CATEGORY_LABELS: Record<UsageCategory, string> = {
  ai_chat: 'AI Chat',
  data_api: 'Market Data',
  analysis: 'Analysis',
  options: 'Options',
  other: 'Other',
};

/**
 * Hook to fetch and manage usage data for the Usage Panel.
 *
 * Combines data from:
 * - Credit store (local state synced from backend)
 * - Supabase credit_usage table (detailed history)
 * - Supabase profiles table (billing cycle info)
 */
export function useUsageData(): UsageData {
  const user = useUser();

  // Credit store state and actions
  const credits = useCreditStore((s) => s.credits);
  const tier = useCreditStore((s) => s.tier);
  const categories = useCreditStore((s) => s.categoryUsage);
  const recentActivity = useCreditStore((s) => s.recentActivity);
  const billingCycleAnchor = useCreditStore((s) => s.billingCycleAnchor);
  const syncFromProfile = useCreditStore((s) => s.syncFromProfile);

  // Computed values from store
  const getTierLimit = useCreditStore((s) => s.getTierLimit);
  const getUsagePercent = useCreditStore((s) => s.getUsagePercent);
  const getDaysUntilReset = useCreditStore((s) => s.getDaysUntilReset);
  const getTotalUsedThisCycle = useCreditStore((s) => s.getTotalUsedThisCycle);

  // Local state for loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch fresh usage data from Supabase.
   */
  const fetchUsageData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      // Fetch profile with credit data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          credits,
          subscription_tier,
          credits_monthly_base,
          credits_rollover,
          credits_rollover_cap,
          billing_cycle_anchor,
          last_credit_reset
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        // Sync to credit store
        syncFromProfile({
          credits: profileData.credits ?? 100,
          subscription_tier: (profileData.subscription_tier as UserTier) ?? 'free',
          credits_monthly_base: profileData.credits_monthly_base ?? 100,
          credits_rollover: profileData.credits_rollover ?? 0,
          billing_cycle_anchor: profileData.billing_cycle_anchor,
          last_credit_reset: profileData.last_credit_reset,
        });
      }

      // Fetch usage breakdown by category for current billing cycle
      const lastReset = profileData?.last_credit_reset
        ? new Date(profileData.last_credit_reset)
        : new Date(new Date().setDate(1)); // Default to start of month

      const { data: usageData } = await supabase
        .from('credit_usage')
        .select('category, credits_used, action, created_at')
        .eq('user_id', user.id)
        .gte('created_at', lastReset.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      // Process usage data into categories
      if (usageData && usageData.length > 0) {
        // Aggregate by category
        const categoryTotals: Record<UsageCategory, number> = {
          ai_chat: 0,
          data_api: 0,
          analysis: 0,
          options: 0,
          other: 0,
        };

        usageData.forEach((item) => {
          const cat = item.category as UsageCategory;
          if (cat in categoryTotals) {
            categoryTotals[cat] += item.credits_used;
          }
        });

        // Update store with aggregated category data
        // Note: This is a simplification - in production you might want
        // to merge this with client-side tracking
      }
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, syncFromProfile]);

  // Initial fetch on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUsageData();
    }
  }, [user, fetchUsageData]);

  // Set up real-time subscription for credit changes
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`credits:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // Update credits from real-time change
          if (payload.new && typeof payload.new.credits === 'number') {
            useCreditStore.getState().setCredits(payload.new.credits);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Calculate reset date
  const calculateResetDate = (): Date | null => {
    if (!billingCycleAnchor) return null;

    const now = new Date();
    // Defensive: handle both Date objects and ISO strings (from localStorage hydration)
    const anchorDate = billingCycleAnchor instanceof Date
      ? billingCycleAnchor
      : new Date(billingCycleAnchor as unknown as string);

    // Validate the date is valid
    if (isNaN(anchorDate.getTime())) return null;

    const anchorDay = anchorDate.getDate();
    let nextReset = new Date(now.getFullYear(), now.getMonth(), anchorDay);

    if (nextReset <= now) {
      nextReset = new Date(now.getFullYear(), now.getMonth() + 1, anchorDay);
    }

    return nextReset;
  };

  return {
    credits,
    tier,
    tierLimit: getTierLimit(),
    usagePercent: getUsagePercent(),
    categories,
    totalUsed: getTotalUsedThisCycle(),
    recentActivity,
    resetDate: calculateResetDate(),
    daysUntilReset: getDaysUntilReset(),
    isLoading,
    error,
    refresh: fetchUsageData,
  };
}

// Re-export types for convenience
export type { UserTier, CategoryUsage, RecentActivity, UsageCategory };
