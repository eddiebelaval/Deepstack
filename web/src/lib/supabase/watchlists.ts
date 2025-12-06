import { supabase, isSupabaseConfigured } from '../supabase';
import { Watchlist, WatchlistItem, useWatchlistStore } from '../stores/watchlist-store';

// Types matching the watchlists table
export interface WatchlistRow {
  id: string;
  user_id: string;
  name: string;
  items: WatchlistItem[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all watchlists for the current user
 */
export async function fetchWatchlists(): Promise<Watchlist[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, using local storage');
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('No authenticated user, using local storage');
    return [];
  }

  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching watchlists:', error);
    throw error;
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    items: row.items || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Create a new watchlist
 */
export async function createWatchlist(name: string): Promise<Watchlist> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('watchlists')
    .insert({
      user_id: user.id,
      name,
      items: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating watchlist:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    items: data.items || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Update a watchlist (name or items)
 */
export async function updateWatchlist(
  watchlistId: string,
  updates: { name?: string; items?: WatchlistItem[] }
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.items !== undefined) {
    updateData.items = updates.items;
  }

  const { error } = await supabase
    .from('watchlists')
    .update(updateData)
    .eq('id', watchlistId);

  if (error) {
    console.error('Error updating watchlist:', error);
    throw error;
  }
}

/**
 * Delete a watchlist
 */
export async function deleteWatchlist(watchlistId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('id', watchlistId);

  if (error) {
    console.error('Error deleting watchlist:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time watchlist updates
 */
export function subscribeToWatchlists(
  onUpdate: () => void
) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, skipping subscription');
    return () => {};
  }

  const channel = supabase
    .channel('watchlist_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'watchlists',
      },
      () => {
        // Refetch all watchlists on any change
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase!.removeChannel(channel);
  };
}

/**
 * Sync local watchlist store to Supabase
 */
export async function syncWatchlistsToSupabase(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const store = useWatchlistStore.getState();
  store.setSyncing(true);

  try {
    // Fetch remote watchlists
    const remote = await fetchWatchlists();

    if (remote.length === 0) {
      // No remote data - push local to remote
      for (const local of store.watchlists) {
        await supabase
          .from('watchlists')
          .insert({
            user_id: user.id,
            name: local.name,
            items: local.items,
            is_default: local.id === 'default',
          });
      }
    } else {
      // Remote data exists - update local store
      store.setWatchlists(remote);
      if (remote.length > 0 && !store.activeWatchlistId) {
        store.setActiveWatchlist(remote[0].id);
      }
    }

    store.setLastSyncedAt(new Date().toISOString());
  } catch (error) {
    console.error('Error syncing watchlists:', error);
  } finally {
    store.setSyncing(false);
  }
}
