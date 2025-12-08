'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { Mail, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
    const { signInWithGoogle, signInWithMagicLink, isConfigured } = useAuth()
    const [email, setEmail] = useState('')
    const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
    const [isLoadingMagicLink, setIsLoadingMagicLink] = useState(false)
    const [magicLinkSent, setMagicLinkSent] = useState(false)

    const handleGoogleLogin = async () => {
        setIsLoadingGoogle(true)
        const { error } = await signInWithGoogle()
        if (error) {
            toast.error('Failed to sign in with Google', {
                description: error.message,
            })
            setIsLoadingGoogle(false)
        }
        // Note: If successful, the page will redirect, so we don't need to reset loading
    }

    const handleMagicLinkLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim()) {
            toast.error('Please enter your email address')
            return
        }

        setIsLoadingMagicLink(true)
        const { error } = await signInWithMagicLink(email)
        setIsLoadingMagicLink(false)

        if (error) {
            toast.error('Failed to send magic link', {
                description: error.message,
            })
        } else {
            setMagicLinkSent(true)
            toast.success('Magic link sent!', {
                description: 'Check your email to complete sign in',
            })
        }
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Subtle ambient glow in background - matching app's 'living surface' feel */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
            </div>

            {/* Login card */}
            <div className="relative z-10 w-full max-w-sm mx-4">
                <div className="glass-surface-elevated rounded-2xl p-8 shadow-2xl">
                    {/* Logo and title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                            DeepStack
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Autonomous trading agent
                        </p>
                    </div>

                    {/* Configuration Warning */}
                    {!isConfigured && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-amber-500 mb-1">Supabase Not Configured</p>
                                    <p className="text-amber-500/80">
                                        Set <code className="bg-black/20 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                                        <code className="bg-black/20 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your .env.local file.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!magicLinkSent ? (
                        <>
                            {/* Google OAuth button */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoadingGoogle || isLoadingMagicLink}
                                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed border border-border rounded-xl transition-all duration-200 mb-4 group text-sm font-medium"
                            >
                                {isLoadingGoogle ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                )}
                                <span className="text-secondary-foreground">Continue with Google</span>
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-border/50" />
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                                <div className="flex-1 h-px bg-border/50" />
                            </div>

                            {/* Magic Link form */}
                            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="sr-only">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full px-4 py-2.5 glass-input text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200 text-sm"
                                        disabled={isLoadingGoogle || isLoadingMagicLink}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoadingGoogle || isLoadingMagicLink}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all duration-200 text-sm shadow-sm"
                                >
                                    {isLoadingMagicLink ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Mail className="w-4 h-4" />
                                    )}
                                    <span>Send Magic Link</span>
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Magic link sent confirmation */
                        <div className="text-center py-8">
                            <div className="w-12 h-12 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                                <Mail className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold mb-2">Check your email</h2>
                            <p className="text-muted-foreground text-sm mb-6">
                                We sent a magic link to <span className="text-foreground font-medium">{email}</span>
                            </p>
                            <button
                                onClick={() => setMagicLinkSent(false)}
                                className="text-sm text-primary hover:text-primary/80 transition-colors"
                            >
                                Use a different email
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer links */}
                <div className="mt-8 text-center text-xs text-muted-foreground space-x-4">
                    <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                    <Link href="/help" className="hover:text-foreground transition-colors">Help</Link>
                </div>
            </div>
        </div>
    )
}
