'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export function createClient(): SupabaseClient | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase environment variables not configured. Auth features will be disabled.')
        return null
    }

    if (!supabaseClient) {
        supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
    }

    return supabaseClient
}
