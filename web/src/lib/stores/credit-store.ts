import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User subscription tiers with credit allocations:
 * - free: 100 credits/month (no rollover)
 * - pro: 1,000 credits/month (rollover capped at 2x)
 * - elite: 5,000 credits/month (rollover capped at 2x)
 */
export type UserTier = 'free' | 'pro' | 'elite';

/**
 * Category breakdown for usage tracking.
 * Matches backend ActionCategory enum.
 */
export type UsageCategory = 'ai_chat' | 'data_api' | 'analysis' | 'options' | 'other';

export interface CategoryUsage {
  category: UsageCategory;
  credits: number;
  label: string;
  color: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  credits: number;
  category: UsageCategory;
  timestamp: Date;
}

interface CreditState {
  // Core credit state (synced from backend)
  credits: number;
  tier: UserTier;
  monthlyBase: number;  // Monthly allocation for tier
  rolloverCredits: number;

  // Usage tracking
  categoryUsage: CategoryUsage[];
  recentActivity: RecentActivity[];

  // Billing cycle
  billingCycleAnchor: Date | null;
  lastReset: Date | null;

  // UI state
  isLoading: boolean;
  lastSyncedAt: Date | null;

  // Actions
  setCredits: (credits: number) => void;
  setTier: (tier: UserTier) => void;
  syncFromHeader: (creditsHeader: string | null) => void;
  syncFromProfile: (profile: {
    credits: number;
    subscription_tier: UserTier;
    credits_monthly_base: number;
    credits_rollover: number;
    billing_cycle_anchor: string | null;
    last_credit_reset: string | null;
  }) => void;
  addUsage: (category: UsageCategory, credits: number, action: string) => void;
  resetUsageTracking: () => void;
  triggerPaywall: () => void;

  // Computed values
  getTierLimit: () => number;
  getUsagePercent: () => number;
  getDaysUntilReset: () => number;
  getTotalUsedThisCycle: () => number;
}

// Tier credit limits
const TIER_LIMITS: Record<UserTier, number> = {
  free: 100,
  pro: 1000,
  elite: 5000,
};

// Category display configuration
const CATEGORY_CONFIG: Record<UsageCategory, { label: string; color: string }> = {
  ai_chat: { label: 'AI Chat', color: '#3B82F6' },      // blue
  data_api: { label: 'Market Data', color: '#10B981' }, // green
  analysis: { label: 'Analysis', color: '#8B5CF6' },    // purple
  options: { label: 'Options', color: '#F59E0B' },      // amber
  other: { label: 'Other', color: '#6B7280' },          // gray
};

export const useCreditStore = create<CreditState>()(
  persist(
    (set, get) => ({
      // Initial state
      credits: 100,
      tier: 'free',
      monthlyBase: 100,
      rolloverCredits: 0,

      categoryUsage: Object.entries(CATEGORY_CONFIG).map(([category, config]) => ({
        category: category as UsageCategory,
        credits: 0,
        label: config.label,
        color: config.color,
      })),
      recentActivity: [],

      billingCycleAnchor: null,
      lastReset: null,

      isLoading: false,
      lastSyncedAt: null,

      // Actions
      setCredits: (credits) => set({ credits, lastSyncedAt: new Date() }),

      setTier: (tier) => set({
        tier,
        monthlyBase: TIER_LIMITS[tier],
      }),

      /**
       * Sync credits from X-DeepStack-Credits response header.
       * Called by API client interceptor on every response.
       */
      syncFromHeader: (creditsHeader) => {
        if (creditsHeader === null) return;

        const credits = parseInt(creditsHeader, 10);
        if (!isNaN(credits)) {
          set({ credits, lastSyncedAt: new Date() });
        }
      },

      /**
       * Full sync from user profile data.
       * Called after login, subscription changes, etc.
       */
      syncFromProfile: (profile) => {
        set({
          credits: profile.credits,
          tier: profile.subscription_tier,
          monthlyBase: profile.credits_monthly_base,
          rolloverCredits: profile.credits_rollover,
          billingCycleAnchor: profile.billing_cycle_anchor
            ? new Date(profile.billing_cycle_anchor)
            : null,
          lastReset: profile.last_credit_reset
            ? new Date(profile.last_credit_reset)
            : null,
          lastSyncedAt: new Date(),
        });
      },

      /**
       * Track usage by category (for visualization).
       * This is client-side tracking - actual deduction happens on backend.
       */
      addUsage: (category, credits, action) => {
        set((state) => {
          // Update category totals
          const categoryUsage = state.categoryUsage.map((cat) =>
            cat.category === category
              ? { ...cat, credits: cat.credits + credits }
              : cat
          );

          // Add to recent activity (keep last 50)
          const recentActivity = [
            {
              id: crypto.randomUUID(),
              action,
              credits,
              category,
              timestamp: new Date(),
            },
            ...state.recentActivity.slice(0, 49),
          ];

          return { categoryUsage, recentActivity };
        });
      },

      /**
       * Reset usage tracking (called on billing cycle reset).
       */
      resetUsageTracking: () => {
        set({
          categoryUsage: Object.entries(CATEGORY_CONFIG).map(([category, config]) => ({
            category: category as UsageCategory,
            credits: 0,
            label: config.label,
            color: config.color,
          })),
          recentActivity: [],
        });
      },

      /**
       * Dispatch paywall event when credits exhausted.
       */
      triggerPaywall: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('deepstack-paywall'));
        }
      },

      // Computed values
      getTierLimit: () => {
        const { tier, monthlyBase, rolloverCredits } = get();
        // For pro/elite, limit includes potential rollover
        if (tier === 'free') return monthlyBase;
        return monthlyBase + Math.min(rolloverCredits, monthlyBase * 2);
      },

      getUsagePercent: () => {
        const { credits } = get();
        const limit = get().getTierLimit();
        if (limit === 0) return 100;
        // Remaining credits as percent of limit (inverted for "used" display)
        const used = limit - credits;
        return Math.min(100, Math.max(0, (used / limit) * 100));
      },

      getDaysUntilReset: () => {
        const { billingCycleAnchor, lastReset } = get();

        if (!billingCycleAnchor && !lastReset) {
          // Default to end of current month
          const now = new Date();
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Calculate days until next billing date
        const now = new Date();
        const anchorValue = billingCycleAnchor || lastReset!;
        // Defensive: handle both Date objects and ISO strings
        const anchor = anchorValue instanceof Date
          ? anchorValue
          : new Date(anchorValue as unknown as string);

        // Validate date
        if (isNaN(anchor.getTime())) {
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        const anchorDay = anchor.getDate();

        // Find next occurrence of anchor day
        let nextReset = new Date(now.getFullYear(), now.getMonth(), anchorDay);
        if (nextReset <= now) {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, anchorDay);
        }

        return Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      },

      getTotalUsedThisCycle: () => {
        const { categoryUsage } = get();
        return categoryUsage.reduce((sum, cat) => sum + cat.credits, 0);
      },
    }),
    {
      name: 'deepstack-credit-storage',
      partialize: (state) => ({
        // Only persist these fields
        credits: state.credits,
        tier: state.tier,
        monthlyBase: state.monthlyBase,
        rolloverCredits: state.rolloverCredits,
        billingCycleAnchor: state.billingCycleAnchor,
        lastReset: state.lastReset,
        // Don't persist usage tracking - it resets on reload
      }),
      // Custom storage to handle Date serialization/deserialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Rehydrate dates from ISO strings
          if (parsed.state) {
            if (parsed.state.billingCycleAnchor) {
              parsed.state.billingCycleAnchor = new Date(parsed.state.billingCycleAnchor);
            }
            if (parsed.state.lastReset) {
              parsed.state.lastReset = new Date(parsed.state.lastReset);
            }
          }
          return parsed;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

// Export for legacy compatibility
export const useQuotaStore = useCreditStore;
