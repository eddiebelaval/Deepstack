import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserTier = 'free' | 'pro';

interface QuotaState {
    tier: UserTier;
    queriesUsed: number;
    queryLimit: number;
    quotaResetTime: number | null; // Unix timestamp (ms)

    // Actions
    setTier: (tier: UserTier) => void;
    consumeQuery: () => boolean; // Returns false if over limit
    resetQuota: () => void;
    checkAndResetIfNeeded: () => void;
}

const FREE_QUERY_LIMIT = 10;
const FREE_QUOTA_PERIOD_MS = 12 * 60 * 60 * 1000; // 12 hours

export const useQuotaStore = create<QuotaState>()(
    persist(
        (set, get) => ({
            tier: 'free',
            queriesUsed: 0,
            queryLimit: FREE_QUERY_LIMIT,
            quotaResetTime: null,

            setTier: (tier) => set({
                tier,
                queryLimit: tier === 'pro' ? Infinity : FREE_QUERY_LIMIT,
                queriesUsed: 0,
            }),

            consumeQuery: () => {
                const state = get();
                state.checkAndResetIfNeeded();

                if (state.tier === 'pro') {
                    return true; // Pro has unlimited
                }

                if (state.queriesUsed >= state.queryLimit) {
                    // Trigger paywall
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('deepstack-paywall'));
                    }
                    return false;
                }

                const now = Date.now();
                set((s) => ({
                    queriesUsed: s.queriesUsed + 1,
                    quotaResetTime: s.quotaResetTime ?? now + FREE_QUOTA_PERIOD_MS,
                }));
                return true;
            },

            resetQuota: () => set({
                queriesUsed: 0,
                quotaResetTime: null,
            }),

            checkAndResetIfNeeded: () => {
                const { quotaResetTime } = get();
                if (quotaResetTime && Date.now() >= quotaResetTime) {
                    set({ queriesUsed: 0, quotaResetTime: null });
                }
            },
        }),
        {
            name: 'deepstack-quota-storage',
        }
    )
);
