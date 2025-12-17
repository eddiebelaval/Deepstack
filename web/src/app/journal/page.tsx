'use client';

import { LazyJournalList } from '@/components/lazy';

export default function JournalPage() {
    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <LazyJournalList />
        </div>
    );
}
