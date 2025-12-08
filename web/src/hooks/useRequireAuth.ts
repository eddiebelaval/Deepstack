'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook to check authentication status and prompt sign-in for gated features.
 *
 * Usage:
 * ```tsx
 * const { isAuthenticated, requireAuth } = useRequireAuth();
 *
 * const handleSendMessage = () => {
 *     if (!requireAuth('AI Chat')) return;
 *     // ... send message
 * };
 * ```
 */
export function useRequireAuth() {
    const { user, loading } = useAuth();
    const router = useRouter();

    /**
     * Check if user is authenticated. If not, redirect to login.
     * @param featureName Optional name of the feature for the login prompt
     * @returns true if authenticated, false if redirecting to login
     */
    const requireAuth = useCallback((featureName?: string) => {
        if (!user && !loading) {
            // Redirect to login with return URL
            const returnUrl = window.location.pathname;
            const params = new URLSearchParams();
            params.set('next', returnUrl);
            if (featureName) {
                params.set('feature', featureName);
            }
            router.push(`/login?${params.toString()}`);
            return false;
        }
        return !!user;
    }, [user, loading, router]);

    return {
        user,
        loading,
        isAuthenticated: !!user,
        requireAuth
    };
}
