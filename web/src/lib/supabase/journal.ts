import { supabase, isSupabaseConfigured } from '../supabase';
import { JournalEntry, EmotionType, useJournalStore } from '../stores/journal-store';

// Types matching the journal_entries table (snake_case)
export interface JournalEntryRow {
  id: string;
  user_id: string;
  symbol: string;
  trade_date: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  pnl_percent: number | null;
  emotion_at_entry: EmotionType;
  emotion_at_exit: EmotionType | null;
  notes: string | null;
  lessons_learned: string | null;
  thesis_id: string | null;
  screenshot_urls: string[];
  created_at: string;
  updated_at: string;
}

// Convert database row (snake_case) to app model (camelCase)
function rowToEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    symbol: row.symbol,
    tradeDate: row.trade_date,
    direction: row.direction,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price ?? undefined,
    quantity: row.quantity,
    pnl: row.pnl ?? undefined,
    pnlPercent: row.pnl_percent ?? undefined,
    emotionAtEntry: row.emotion_at_entry,
    emotionAtExit: row.emotion_at_exit ?? undefined,
    notes: row.notes ?? '',
    lessonsLearned: row.lessons_learned ?? undefined,
    thesisId: row.thesis_id ?? undefined,
    screenshotUrls: row.screenshot_urls ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert app model (camelCase) to database insert (snake_case)
function entryToInsert(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
  return {
    user_id: userId,
    symbol: entry.symbol,
    trade_date: entry.tradeDate,
    direction: entry.direction,
    entry_price: entry.entryPrice,
    exit_price: entry.exitPrice ?? null,
    quantity: entry.quantity,
    pnl: entry.pnl ?? null,
    pnl_percent: entry.pnlPercent ?? null,
    emotion_at_entry: entry.emotionAtEntry,
    emotion_at_exit: entry.emotionAtExit ?? null,
    notes: entry.notes || null,
    lessons_learned: entry.lessonsLearned ?? null,
    thesis_id: entry.thesisId ?? null,
    screenshot_urls: entry.screenshotUrls ?? [],
  };
}

/**
 * Fetch all journal entries for the current user
 */
export async function fetchJournalEntries(): Promise<JournalEntry[]> {
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
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('trade_date', { ascending: false });

  if (error) {
    console.error('Error fetching journal entries:', error);
    throw error;
  }

  return (data || []).map(rowToEntry);
}

/**
 * Create a new journal entry
 */
export async function createJournalEntry(
  entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<JournalEntry> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert(entryToInsert(entry, user.id))
    .select()
    .single();

  if (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }

  return rowToEntry(data);
}

/**
 * Update a journal entry
 */
export async function updateJournalEntry(
  id: string,
  updates: Partial<Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Map camelCase to snake_case for each field
  if (updates.symbol !== undefined) updateData.symbol = updates.symbol;
  if (updates.tradeDate !== undefined) updateData.trade_date = updates.tradeDate;
  if (updates.direction !== undefined) updateData.direction = updates.direction;
  if (updates.entryPrice !== undefined) updateData.entry_price = updates.entryPrice;
  if (updates.exitPrice !== undefined) updateData.exit_price = updates.exitPrice;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.pnl !== undefined) updateData.pnl = updates.pnl;
  if (updates.pnlPercent !== undefined) updateData.pnl_percent = updates.pnlPercent;
  if (updates.emotionAtEntry !== undefined) updateData.emotion_at_entry = updates.emotionAtEntry;
  if (updates.emotionAtExit !== undefined) updateData.emotion_at_exit = updates.emotionAtExit;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.lessonsLearned !== undefined) updateData.lessons_learned = updates.lessonsLearned;
  if (updates.thesisId !== undefined) updateData.thesis_id = updates.thesisId;
  if (updates.screenshotUrls !== undefined) updateData.screenshot_urls = updates.screenshotUrls;

  const { error } = await supabase
    .from('journal_entries')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating journal entry:', error);
    throw error;
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting journal entry:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time journal entry updates
 */
export function subscribeToJournalEntries(onUpdate: () => void) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, skipping subscription');
    return () => {};
  }

  const channel = supabase
    .channel('journal_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'journal_entries',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase!.removeChannel(channel);
  };
}

/**
 * Sync local journal store to Supabase
 */
export async function syncJournalToSupabase(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const store = useJournalStore.getState();

  try {
    // Fetch remote entries
    const remote = await fetchJournalEntries();

    if (remote.length === 0 && store.entries.length > 0) {
      // No remote data - push local to remote
      for (const local of store.entries) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, ...rest } = local;
        await createJournalEntry(rest);
      }
    } else if (remote.length > 0) {
      // Remote data exists - merge with local (remote wins for conflicts)
      // For simplicity, we just replace local with remote
      // A more sophisticated sync would merge by timestamp
      store.entries.splice(0, store.entries.length, ...remote);
    }
  } catch (error) {
    console.error('Error syncing journal:', error);
  }
}
