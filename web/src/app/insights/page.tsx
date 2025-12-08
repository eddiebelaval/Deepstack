'use client';

import { LazyInsightsPanel } from '@/components/lazy';

export default function InsightsPage() {
    return (
        <div className="container max-w-3xl mx-auto py-8 px-4">
            <LazyInsightsPanel />
        </div>
    );
}
