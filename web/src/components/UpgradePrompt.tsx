import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TIER_PRICES, getTierDisplayName } from '@/lib/subscription';

interface UpgradePromptProps {
    feature: string;
    requiredTier: 'pro' | 'elite';
    description?: string;
}

export function UpgradePrompt({ feature, requiredTier, description }: UpgradePromptProps) {
    const tierInfo = TIER_PRICES[requiredTier];
    const tierName = getTierDisplayName(requiredTier);

    return (
        <div className="border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-8 text-center max-w-md mx-auto mt-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-xl font-semibold mb-2">
                {feature} is {tierName} Only
            </h3>

            <p className="text-sm text-muted-foreground mb-6">
                {description || `Upgrade to ${tierName} to unlock ${feature.toLowerCase()} and take your trading to the next level.`}
            </p>

            <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <Link href="/pricing">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade to {tierName} - {tierInfo.display}
                    </Link>
                </Button>

                <Button asChild variant="ghost" size="sm">
                    <Link href="/pricing">
                        View All Features
                    </Link>
                </Button>
            </div>
        </div>
    );
}
