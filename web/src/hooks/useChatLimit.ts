'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from './useUser';

/**
 * Hook to check if user has reached their daily AI chat limit.
 * Free users: 5 chats/day
 * Pro/Elite: Unlimited
 */
export function useChatLimit() {
    const { user, tier } = useUser();
    const [chatsToday, setChatsToday] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const fetchAttempted = useRef(false);

    // Free users have a limit of 5 chats/day
    const dailyLimit = tier === 'free' ? 5 : Infinity;
    const isAtLimit = chatsToday >= dailyLimit;
    const remaining = Math.max(0, dailyLimit - chatsToday);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            fetchAttempted.current = false;
            return;
        }

        // Prevent repeated fetch attempts for the same user
        if (fetchAttempted.current) {
            return;
        }

        const fetchTodaysChats = async () => {
            fetchAttempted.current = true;

            try {
                const supabase = createClient();
                if (!supabase) {
                    setChatsToday(0);
                    setIsLoading(false);
                    return;
                }

                // Get start of today in user's timezone (UTC for simplicity)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayISO = today.toISOString();

                // Count conversations created today
                const { count, error } = await supabase
                    .from('conversations')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .gte('created_at', todayISO);

                if (error) {
                    // Table might not exist yet - fail silently, don't spam console
                    if (error.code === '42P01' || error.message?.includes('does not exist')) {
                        // Table doesn't exist - that's okay, just use 0
                        setChatsToday(0);
                    } else {
                        // Log other errors but don't spam
                        console.warn('Chat limit check:', error.message);
                        setChatsToday(0);
                    }
                } else {
                    setChatsToday(count || 0);
                }
            } catch (err) {
                // Silently fail - don't block the user from chatting
                setChatsToday(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTodaysChats();
    }, [user]);

    return {
        chatsToday,
        dailyLimit,
        isAtLimit,
        remaining,
        isLoading,
        canChat: !isAtLimit,
    };
}
