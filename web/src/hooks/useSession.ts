'use client';

import { useEffect, useCallback, useRef } from 'react';
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

interface SessionState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isExpired: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setExpired: (expired: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isExpired: false,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setExpired: (isExpired) => set({ isExpired }),
}));

/**
 * Hook for managing session state and detecting expiry
 */
export function useSession() {
  const router = useRouter();
  const {
    session,
    user,
    isLoading,
    isExpired,
    setSession,
    setUser,
    setLoading,
    setExpired,
  } = useSessionStore();

  const expiryCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Check if session is about to expire (within 5 minutes)
  const checkSessionExpiry = useCallback(() => {
    if (!session?.expires_at || !supabase) return;

    const expiresAt = session.expires_at * 1000; // Convert to ms
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // If expired
    if (timeUntilExpiry <= 0) {
      setExpired(true);
      return;
    }

    // If expiring within 5 minutes, try to refresh
    if (timeUntilExpiry < 5 * 60 * 1000) {
      supabase.auth.refreshSession();
    }
  }, [session, setExpired]);

  // Initialize session
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured() || !client) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await client.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('Failed to get session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setExpired(false);
          router.push('/login');
        }

        if (event === 'TOKEN_REFRESHED') {
          setExpired(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, setSession, setUser, setLoading, setExpired]);

  // Set up expiry check interval
  useEffect(() => {
    // Check every minute
    expiryCheckRef.current = setInterval(checkSessionExpiry, 60 * 1000);

    // Initial check
    checkSessionExpiry();

    return () => {
      if (expiryCheckRef.current) {
        clearInterval(expiryCheckRef.current);
      }
    };
  }, [checkSessionExpiry]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  }, [router]);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setExpired(true);
      return;
    }

    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Failed to refresh session:', error);
      setExpired(true);
    } else {
      setSession(data.session);
      setUser(data.user);
      setExpired(false);
    }
  }, [setSession, setUser, setExpired]);

  return {
    session,
    user,
    isLoading,
    isExpired,
    isAuthenticated: !!session && !isExpired,
    signOut,
    refreshSession,
  };
}

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useSession();
  return isAuthenticated;
}

/**
 * Get current user
 */
export function useUser(): User | null {
  const { user } = useSession();
  return user;
}
