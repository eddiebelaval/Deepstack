'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    isConfigured: boolean
    signOut: () => Promise<void>
    signInWithGoogle: () => Promise<{ error: AuthError | null }>
    signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
    /** Start trial for eligible users who haven't had one */
    startTrialIfEligible: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Get client once - it will be null if Supabase is not configured
    const supabase = useMemo(() => createClient(), [])
    const isConfigured = supabase !== null

    useEffect(() => {
        if (!supabase) {
            setLoading(false)
            return
        }

        // Get initial session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        }

        getSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
                setLoading(false)

                // Handle sign-in events
                if (event === 'SIGNED_IN' && session?.user) {
                    // Log trial event if user is trialing
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('trial_ends_at, has_used_trial')
                            .eq('id', session.user.id)
                            .single()

                        // If trialing, log the sign-in
                        if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
                            // Fire and forget - don't await, don't block auth
                            void supabase.rpc('log_trial_event', {
                                p_user_id: session.user.id,
                                p_event_type: 'sign_in',
                                p_metadata: { event: 'signed_in_during_trial' },
                            })
                        }

                        // Auto-start trial for existing eligible users (pre-trial-system users)
                        if (!profile?.has_used_trial && !profile?.trial_ends_at) {
                            // Fire and forget - don't await, don't block auth
                            void supabase.rpc('start_user_trial', {
                                p_user_id: session.user.id,
                                p_trial_tier: 'elite',
                                p_duration_days: 14,
                            })
                        }
                    } catch {
                        // Silent fail - don't break sign-in flow
                    }
                }

                // Refresh the page to update server components
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    router.refresh()
                }
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase, router])

    const signOut = useCallback(async () => {
        if (!supabase) return
        await supabase.auth.signOut()
        router.push('/login')
    }, [supabase, router])

    const signInWithGoogle = useCallback(async () => {
        if (!supabase) {
            return { error: { message: 'Supabase is not configured', name: 'ConfigError' } as AuthError }
        }
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${origin}/auth/callback`,
            },
        })
        return { error }
    }, [supabase])

    const signInWithMagicLink = useCallback(async (email: string) => {
        if (!supabase) {
            return { error: { message: 'Supabase is not configured', name: 'ConfigError' } as AuthError }
        }
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${origin}/auth/callback`,
            },
        })
        return { error }
    }, [supabase])

    /**
     * Start a trial for eligible users who haven't had one yet.
     * This is useful for existing users who signed up before the trial system.
     * Returns true if trial was started, false if not eligible or already trialed.
     */
    const startTrialIfEligible = useCallback(async (): Promise<boolean> => {
        if (!supabase || !user) return false

        try {
            // Check if user is eligible (hasn't used trial)
            const { data: profile } = await supabase
                .from('profiles')
                .select('has_used_trial, subscription_tier')
                .eq('id', user.id)
                .single()

            // Not eligible if already used trial or already on paid plan
            if (profile?.has_used_trial || (profile?.subscription_tier && profile.subscription_tier !== 'free')) {
                return false
            }

            // Start the trial via RPC
            const { error } = await supabase.rpc('start_user_trial', {
                p_user_id: user.id,
                p_trial_tier: 'elite',
                p_duration_days: 14,
            })

            if (error) {
                console.error('Failed to start trial:', error)
                return false
            }

            // Refresh to get updated profile
            router.refresh()
            return true
        } catch (error) {
            console.error('Error starting trial:', error)
            return false
        }
    }, [supabase, user, router])

    const value = {
        user,
        session,
        loading,
        isConfigured,
        signOut,
        signInWithGoogle,
        signInWithMagicLink,
        startTrialIfEligible,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
