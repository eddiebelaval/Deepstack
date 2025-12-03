'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
            <h2 className="text-2xl font-bold">Something went wrong!</h2>
            <button
                className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                onClick={() => reset()}
            >
                Try again
            </button>
        </div>
    );
}
