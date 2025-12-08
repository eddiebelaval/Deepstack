'use client';

import { LazyInsightsPanel } from '@/components/lazy';
import { useUser } from '@/hooks/useUser';
import { canAccess } from '@/lib/subscription';
import { UpgradePrompt } from '@/components/UpgradePrompt';

export default function InsightsPage() {
    const { tier } = useUser();

    // Psychology Analytics requires Elite tier
    if (!canAccess(tier, 'psychologyAnalytics')) {
        return (
            <div className="container max-w-3xl mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold mb-4">Psychology Analytics</h1>
                <UpgradePrompt
                    feature="Psychology Analytics"
                    requiredTier="elite"
                    description="Unlock deep insights into your trading psychology. Track emotional patterns, discover your best trading states, and identify what leads to your wins and losses."
                />
            </div>
        );
    }

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4">
            <LazyInsightsPanel />
        </div>
    );
}
