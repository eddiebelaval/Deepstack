import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)

    // OAuth flow uses 'code' parameter
    const code = searchParams.get('code')

    // Magic link flow uses 'token_hash' and 'type' parameters
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null

    // if "next" is in params, use it as the redirect URL
    const next = searchParams.get('next') ?? '/app'

    const supabase = await createClient()

    // Helper function to build redirect URL
    const buildRedirectUrl = (path: string) => {
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'

        if (isLocalEnv) {
            return `${origin}${path}`
        } else if (forwardedHost) {
            return `https://${forwardedHost}${path}`
        } else {
            return `${origin}${path}`
        }
    }

    // Handle OAuth code exchange (e.g., Google sign-in)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(buildRedirectUrl(next))
        }
        console.error('OAuth code exchange failed:', error.message)
    }

    // Handle magic link / email OTP verification
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        if (!error) {
            return NextResponse.redirect(buildRedirectUrl(next))
        }
        console.error('Magic link verification failed:', error.message)
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
