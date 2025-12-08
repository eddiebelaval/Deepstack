'use client';

import { useEffect, useState } from 'react';
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

    // Free users have a limit of 5 chats/day
    const dailyLimit = tier === 'free' ? 5 : Infinity;
    const isAtLimit = chatsToday >= dailyLimit;
    const remaining = Math.max(0, dailyLimit - chatsToday);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchTodaysChats = async () => {
            try {
                const supabase = createClient();
                if (!supabase) {
                    setChatsToday(0);
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
                    console.error('Error fetching chat count:', error);
                    setChatsToday(0);
                } else {
                    setChatsToday(count || 0);
                }
            } catch (err) {
                console.error('Error in useChatLimit:', err);
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
