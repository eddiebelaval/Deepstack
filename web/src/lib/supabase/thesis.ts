import { supabase, isSupabaseConfigured } from '../supabase';
import { ThesisEntry, useThesisStore } from '../stores/thesis-store';

// Types matching the thesis table (snake_case)
export interface ThesisRow {
  id: string;
  user_id: string;
  title: string;
  symbol: string;
  status: 'drafting' | 'active' | 'validated' | 'invalidated' | 'archived';
  hypothesis: string;
  timeframe: string;
  entry_target: number | null;
  exit_target: number | null;
  stop_loss: number | null;
  risk_reward_ratio: number | null;
  key_conditions: string[];
  validation_score: number | null;
  validation_notes: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

// Convert database row (snake_case) to app model (camelCase)
function rowToThesis(row: ThesisRow): ThesisEntry {
  return {
    id: row.id,
    title: row.title,
    symbol: row.symbol,
    status: row.status,
    hypothesis: row.hypothesis,
    timeframe: row.timeframe,
    entryTarget: row.entry_target ?? undefined,
    exitTarget: row.exit_target ?? undefined,
    stopLoss: row.stop_loss ?? undefined,
    riskRewardRatio: row.risk_reward_ratio ?? undefined,
    keyConditions: row.key_conditions ?? [],
    validationScore: row.validation_score ?? undefined,
    validationNotes: row.validation_notes ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert app model (camelCase) to database insert (snake_case)
function thesisToInsert(thesis: Omit<ThesisEntry, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
  return {
    user_id: userId,
    title: thesis.title,
    symbol: thesis.symbol,
    status: thesis.status,
    hypothesis: thesis.hypothesis,
    timeframe: thesis.timeframe,
    entry_target: thesis.entryTarget ?? null,
    exit_target: thesis.exitTarget ?? null,
    stop_loss: thesis.stopLoss ?? null,
    risk_reward_ratio: thesis.riskRewardRatio ?? null,
    key_conditions: thesis.keyConditions ?? [],
    validation_score: thesis.validationScore ?? null,
    validation_notes: thesis.validationNotes ?? null,
    conversation_id: thesis.conversationId ?? null,
  };
}

/**
 * Fetch all theses for the current user
 */
export async function fetchTheses(): Promise<ThesisEntry[]> {
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
    .from('thesis')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching theses:', error);
    throw error;
  }

  return (data || []).map(rowToThesis);
}

/**
 * Fetch active theses only
 */
export async function fetchActiveTheses(): Promise<ThesisEntry[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, using local storage');
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('thesis')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active theses:', error);
    throw error;
  }

  return (data || []).map(rowToThesis);
}

/**
 * Fetch a single thesis by ID
 */
export async function fetchThesisById(id: string): Promise<ThesisEntry | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('thesis')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching thesis:', error);
    throw error;
  }

  return rowToThesis(data);
}

/**
 * Create a new thesis
 */
export async function createThesis(
  thesis: Omit<ThesisEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ThesisEntry> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('thesis')
    .insert(thesisToInsert(thesis, user.id))
    .select()
    .single();

  if (error) {
    console.error('Error creating thesis:', error);
    throw error;
  }

  return rowToThesis(data);
}

/**
 * Update a thesis
 */
export async function updateThesis(
  id: string,
  updates: Partial<Omit<ThesisEntry, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Map camelCase to snake_case for each field
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.symbol !== undefined) updateData.symbol = updates.symbol;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.hypothesis !== undefined) updateData.hypothesis = updates.hypothesis;
  if (updates.timeframe !== undefined) updateData.timeframe = updates.timeframe;
  if (updates.entryTarget !== undefined) updateData.entry_target = updates.entryTarget;
  if (updates.exitTarget !== undefined) updateData.exit_target = updates.exitTarget;
  if (updates.stopLoss !== undefined) updateData.stop_loss = updates.stopLoss;
  if (updates.riskRewardRatio !== undefined) updateData.risk_reward_ratio = updates.riskRewardRatio;
  if (updates.keyConditions !== undefined) updateData.key_conditions = updates.keyConditions;
  if (updates.validationScore !== undefined) updateData.validation_score = updates.validationScore;
  if (updates.validationNotes !== undefined) updateData.validation_notes = updates.validationNotes;
  if (updates.conversationId !== undefined) updateData.conversation_id = updates.conversationId;

  const { error } = await supabase
    .from('thesis')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating thesis:', error);
    throw error;
  }
}

/**
 * Delete a thesis
 */
export async function deleteThesis(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('thesis')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting thesis:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time thesis updates
 */
export function subscribeToTheses(onUpdate: () => void) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, skipping subscription');
    return () => {};
  }

  const channel = supabase
    .channel('thesis_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'thesis',
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
 * Sync local thesis store to Supabase
 */
export async function syncThesesToSupabase(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const store = useThesisStore.getState();

  try {
    // Fetch remote theses
    const remote = await fetchTheses();

    if (remote.length === 0 && store.theses.length > 0) {
      // No remote data - push local to remote
      for (const local of store.theses) {
        const { id, createdAt, updatedAt, ...rest } = local;
        await createThesis(rest);
      }
    } else if (remote.length > 0) {
      // Remote data exists - update local store
      store.theses.splice(0, store.theses.length, ...remote);
    }
  } catch (error) {
    console.error('Error syncing theses:', error);
  }
}
