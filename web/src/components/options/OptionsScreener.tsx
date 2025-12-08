'use client';

import { OptionsScreenerPanel as OriginalOptionsScreener } from './OptionsScreenerPanel';
import { useUser } from '@/hooks/useUser';
import { canAccess } from '@/lib/subscription';
import { UpgradePrompt } from '@/components/UpgradePrompt';

export function OptionsScreener() {
    const { tier } = useUser();

    // Options analysis requires Pro or Elite tier
    if (!canAccess(tier, 'optionsAnalysis')) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <UpgradePrompt
                    feature="Options Analysis"
                    requiredTier="pro"
                    description="Screen options chains, analyze Greeks, and build advanced options strategies with the Options Screener and Strategy Builder."
                />
            </div>
        );
    }

    return <OriginalOptionsScreener />;
}
