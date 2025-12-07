'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
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
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        return { error }
    }, [supabase])

    const signInWithMagicLink = useCallback(async (email: string) => {
        if (!supabase) {
            return { error: { message: 'Supabase is not configured', name: 'ConfigError' } as AuthError }
        }
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        return { error }
    }, [supabase])

    const value = {
        user,
        session,
        loading,
        isConfigured,
        signOut,
        signInWithGoogle,
        signInWithMagicLink,
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
