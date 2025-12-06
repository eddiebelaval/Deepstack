import { supabase, isSupabaseConfigured } from '../supabase';
import { PriceAlert, AlertCondition } from '../stores/alerts-store';

// Types matching the price_alerts table
export interface AlertRow {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  condition: AlertCondition;
  is_active: boolean;
  triggered_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all alerts for the current user
 */
export async function fetchAlerts(): Promise<PriceAlert[]> {
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
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }

  return (data || []).map(row => ({
    id: row.id,
    symbol: row.symbol,
    targetPrice: row.target_price,
    condition: row.condition as AlertCondition,
    isActive: row.is_active,
    triggeredAt: row.triggered_at || undefined,
    note: row.note || undefined,
    createdAt: row.created_at,
  }));
}

/**
 * Create a new price alert
 */
export async function createAlert(alert: {
  symbol: string;
  targetPrice: number;
  condition: AlertCondition;
  note?: string;
}): Promise<PriceAlert> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('price_alerts')
    .insert({
      user_id: user.id,
      symbol: alert.symbol.toUpperCase(),
      target_price: alert.targetPrice,
      condition: alert.condition,
      note: alert.note,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating alert:', error);
    throw error;
  }

  return {
    id: data.id,
    symbol: data.symbol,
    targetPrice: data.target_price,
    condition: data.condition as AlertCondition,
    isActive: data.is_active,
    createdAt: data.created_at,
    note: data.note || undefined,
  };
}

/**
 * Update an alert
 */
export async function updateAlert(
  alertId: string,
  updates: Partial<{
    targetPrice: number;
    condition: AlertCondition;
    isActive: boolean;
    note: string;
  }>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.targetPrice !== undefined) {
    updateData.target_price = updates.targetPrice;
  }
  if (updates.condition !== undefined) {
    updateData.condition = updates.condition;
  }
  if (updates.isActive !== undefined) {
    updateData.is_active = updates.isActive;
  }
  if (updates.note !== undefined) {
    updateData.note = updates.note;
  }

  const { error } = await supabase
    .from('price_alerts')
    .update(updateData)
    .eq('id', alertId);

  if (error) {
    console.error('Error updating alert:', error);
    throw error;
  }
}

/**
 * Trigger an alert (mark as triggered)
 */
export async function triggerAlert(alertId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('price_alerts')
    .update({
      is_active: false,
      triggered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error triggering alert:', error);
    throw error;
  }
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId);

  if (error) {
    console.error('Error deleting alert:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time alert updates
 */
export function subscribeToAlerts(
  onInsert: (alert: PriceAlert) => void,
  onUpdate: (alert: PriceAlert) => void,
  onDelete: (alertId: string) => void
) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, skipping subscription');
    return () => {};
  }

  const channel = supabase
    .channel('alert_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'price_alerts',
      },
      (payload) => {
        const row = payload.new as AlertRow;
        onInsert({
          id: row.id,
          symbol: row.symbol,
          targetPrice: row.target_price,
          condition: row.condition,
          isActive: row.is_active,
          triggeredAt: row.triggered_at || undefined,
          note: row.note || undefined,
          createdAt: row.created_at,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'price_alerts',
      },
      (payload) => {
        const row = payload.new as AlertRow;
        onUpdate({
          id: row.id,
          symbol: row.symbol,
          targetPrice: row.target_price,
          condition: row.condition,
          isActive: row.is_active,
          triggeredAt: row.triggered_at || undefined,
          note: row.note || undefined,
          createdAt: row.created_at,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'price_alerts',
      },
      (payload) => {
        onDelete((payload.old as { id: string }).id);
      }
    )
    .subscribe();

  return () => {
    supabase!.removeChannel(channel);
  };
}

/**
 * Check alerts against current prices and trigger if conditions met
 */
export function checkAlertConditions(
  alerts: PriceAlert[],
  prices: Record<string, number>
): PriceAlert[] {
  const triggered: PriceAlert[] = [];

  for (const alert of alerts) {
    if (!alert.isActive) continue;

    const currentPrice = prices[alert.symbol];
    if (!currentPrice) continue;

    let shouldTrigger = false;

    switch (alert.condition) {
      case 'above':
        shouldTrigger = currentPrice >= alert.targetPrice;
        break;
      case 'below':
        shouldTrigger = currentPrice <= alert.targetPrice;
        break;
      case 'crosses':
        // For crosses, we'd need to track previous price - simplified for now
        shouldTrigger = Math.abs(currentPrice - alert.targetPrice) < 0.01;
        break;
    }

    if (shouldTrigger) {
      triggered.push(alert);
    }
  }

  return triggered;
}
