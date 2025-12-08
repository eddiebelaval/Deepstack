'use client';

import { ThesisList } from '@/components/thesis/ThesisList';
import { useUser } from '@/hooks/useUser';
import { canAccess } from '@/lib/subscription';
import { UpgradePrompt } from '@/components/UpgradePrompt';

export default function ThesisPage() {
    const { tier } = useUser();

    // Thesis tracking requires Pro or Elite tier
    if (!canAccess(tier, 'thesisTracking')) {
        return (
            <div className="container max-w-7xl mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold mb-4">Thesis Tracker</h1>
                <UpgradePrompt
                    feature="Thesis Tracking"
                    requiredTier="pro"
                    description="Build and validate your investment theses. Track key conditions, measure validation scores, and learn what works in your trading strategy."
                />
            </div>
        );
    }

    return (
        <div className="container max-w-7xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-4">Thesis Tracker</h1>
            <ThesisList />
        </div>
    );
}
