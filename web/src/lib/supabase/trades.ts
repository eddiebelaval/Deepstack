import { supabase, isSupabaseConfigured } from '../supabase';
import { TradeEntry, useTradesStore } from '../stores/trades-store';

// Types matching the trade_journal table (snake_case)
// Columns: id, user_id, symbol, action, quantity, price, order_type, notes, tags, pnl, created_at
export interface TradeEntryRow {
    id: string;
    user_id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    order_type: 'MKT' | 'LMT' | 'STP';
    notes: string | null;
    tags: string[] | null;
    pnl: number | null;
    created_at: string;
    // updated_at might not exist in schema based on previous portfolio.ts view, so we rely on created_at or optional
}

// Convert database row (snake_case) to app model (camelCase)
function rowToEntry(row: TradeEntryRow): TradeEntry {
    return {
        id: row.id,
        userId: row.user_id,
        symbol: row.symbol,
        action: row.action,
        quantity: row.quantity,
        price: row.price,
        orderType: row.order_type,
        notes: row.notes ?? undefined,
        tags: row.tags ?? undefined,
        pnl: row.pnl ?? undefined,
        createdAt: row.created_at,
    };
}

// Convert app model (camelCase) to database insert (snake_case)
function entryToInsert(entry: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
    return {
        user_id: userId,
        symbol: entry.symbol.toUpperCase(),
        action: entry.action,
        quantity: entry.quantity,
        price: entry.price,
        order_type: entry.orderType,
        notes: entry.notes || null,
        tags: entry.tags || null,
        pnl: entry.pnl || null,
    };
}

/**
 * Fetch all trade entries for the current user
 */
export async function fetchTradeEntries(): Promise<TradeEntry[]> {
    if (!isSupabaseConfigured() || !supabase) {
        console.warn('Supabase not configured, using local storage');
        return [];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn('No authenticated user, returning empty');
        return [];
    }

    const { data, error } = await supabase
        .from('trade_journal')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching trade entries:', error);
        throw error;
    }

    return (data || []).map(rowToEntry);
}

/**
 * Create a new trade entry
 */
export async function createTradeEntry(
    entry: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TradeEntry> {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
        .from('trade_journal')
        .insert(entryToInsert(entry, user.id))
        .select()
        .single();

    if (error) {
        console.error('Error creating trade entry:', error);
        throw error;
    }

    return rowToEntry(data);
}

/**
 * Update a trade entry
 */
export async function updateTradeEntry(
    id: string,
    updates: Partial<Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const updateData: Record<string, unknown> = {};

    if (updates.symbol !== undefined) updateData.symbol = updates.symbol.toUpperCase();
    if (updates.action !== undefined) updateData.action = updates.action;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.orderType !== undefined) updateData.order_type = updates.orderType;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.pnl !== undefined) updateData.pnl = updates.pnl;

    const { error } = await supabase
        .from('trade_journal')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating trade entry:', error);
        throw error;
    }
}

/**
 * Delete a trade entry
 */
export async function deleteTradeEntry(id: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase
        .from('trade_journal')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting trade entry:', error);
        throw error;
    }
}

/**
 * Subscribe to real-time trade changes
 */
export function subscribeToTradeEntries(onUpdate: () => void) {
    if (!isSupabaseConfigured() || !supabase) {
        console.warn('Supabase not configured, skipping subscription');
        return () => { };
    }

    const channel = supabase
        .channel('trade_journal_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'trade_journal',
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
