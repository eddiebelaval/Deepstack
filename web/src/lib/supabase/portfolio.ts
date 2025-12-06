import { supabase, isSupabaseConfigured } from '../supabase';

// Types matching the trade_journal table
export interface TradeJournalEntry {
  id: string;
  user_id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  order_type: 'MKT' | 'LMT' | 'STP';
  notes?: string;
  tags?: string[];
  pnl?: number;
  created_at: string;
}

// Calculated position from trade history
export interface Position {
  symbol: string;
  quantity: number; // Positive = long, negative = short
  avg_cost: number;
  total_cost: number;
  current_price?: number;
  market_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  realized_pnl: number;
  trades: TradeJournalEntry[];
  first_trade_at: string;
  last_trade_at: string;
}

// Account summary calculated from positions
export interface PortfolioSummary {
  total_value: number;
  cash: number;
  positions_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  day_pnl: number;
  positions_count: number;
}

// Default starting cash for paper trading
const STARTING_CASH = 100000;

/**
 * Fetch all trade journal entries for the current user
 */
export async function fetchTrades(): Promise<TradeJournalEntry[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, returning empty trades');
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('trade_journal')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching trades:', error);
    throw error;
  }

  return data || [];
}

/**
 * Record a new trade to the journal
 */
export async function recordTrade(trade: {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  order_type: 'MKT' | 'LMT' | 'STP';
  notes?: string;
  tags?: string[];
}): Promise<TradeJournalEntry> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('trade_journal')
    .insert({
      user_id: user.id,
      symbol: trade.symbol.toUpperCase(),
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      order_type: trade.order_type,
      notes: trade.notes,
      tags: trade.tags,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording trade:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a trade from the journal
 */
export async function deleteTrade(tradeId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('trade_journal')
    .delete()
    .eq('id', tradeId);

  if (error) {
    console.error('Error deleting trade:', error);
    throw error;
  }
}

/**
 * Calculate positions from trade history using FIFO method
 */
export function calculatePositions(trades: TradeJournalEntry[]): Position[] {
  const positionMap = new Map<string, {
    lots: Array<{ quantity: number; price: number; date: string }>;
    realized_pnl: number;
    trades: TradeJournalEntry[];
  }>();

  // Process trades in chronological order
  for (const trade of trades) {
    const symbol = trade.symbol;

    if (!positionMap.has(symbol)) {
      positionMap.set(symbol, { lots: [], realized_pnl: 0, trades: [] });
    }

    const position = positionMap.get(symbol)!;
    position.trades.push(trade);

    if (trade.action === 'BUY') {
      // Add to lots
      position.lots.push({
        quantity: trade.quantity,
        price: trade.price,
        date: trade.created_at,
      });
    } else {
      // SELL - close lots using FIFO
      let remaining = trade.quantity;
      let realizedPnl = 0;

      while (remaining > 0 && position.lots.length > 0) {
        const lot = position.lots[0];
        const closeQty = Math.min(remaining, lot.quantity);

        // Calculate P&L for this lot
        realizedPnl += closeQty * (trade.price - lot.price);

        lot.quantity -= closeQty;
        remaining -= closeQty;

        if (lot.quantity === 0) {
          position.lots.shift();
        }
      }

      position.realized_pnl += realizedPnl;
    }
  }

  // Convert to Position array
  const positions: Position[] = [];

  for (const [symbol, data] of positionMap) {
    // Calculate total quantity and average cost from remaining lots
    const totalQty = data.lots.reduce((sum, lot) => sum + lot.quantity, 0);

    if (totalQty === 0 && data.realized_pnl === 0) {
      continue; // Skip empty positions with no P&L
    }

    const totalCost = data.lots.reduce((sum, lot) => sum + lot.quantity * lot.price, 0);
    const avgCost = totalQty > 0 ? totalCost / totalQty : 0;

    const sortedTrades = [...data.trades].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    positions.push({
      symbol,
      quantity: totalQty,
      avg_cost: avgCost,
      total_cost: totalCost,
      realized_pnl: data.realized_pnl,
      trades: sortedTrades,
      first_trade_at: sortedTrades[0]?.created_at || '',
      last_trade_at: sortedTrades[sortedTrades.length - 1]?.created_at || '',
    });
  }

  return positions;
}

/**
 * Update positions with current market prices
 */
export function updatePositionsWithPrices(
  positions: Position[],
  prices: Record<string, number>
): Position[] {
  return positions.map((pos) => {
    const currentPrice = prices[pos.symbol];

    if (!currentPrice || pos.quantity === 0) {
      return pos;
    }

    const marketValue = pos.quantity * currentPrice;
    const unrealizedPnl = marketValue - pos.total_cost;
    const unrealizedPnlPct = pos.total_cost > 0
      ? (unrealizedPnl / pos.total_cost) * 100
      : 0;

    return {
      ...pos,
      current_price: currentPrice,
      market_value: marketValue,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_pct: unrealizedPnlPct,
    };
  });
}

/**
 * Calculate portfolio summary
 */
export function calculatePortfolioSummary(
  positions: Position[],
  startingCash: number = STARTING_CASH
): PortfolioSummary {
  // Sum up all trades to calculate remaining cash
  let cashUsed = 0;
  let realizedPnl = 0;

  for (const pos of positions) {
    // Cash used = total cost of open positions
    cashUsed += pos.total_cost;
    realizedPnl += pos.realized_pnl;
  }

  const cash = startingCash - cashUsed + realizedPnl;

  const positionsValue = positions.reduce(
    (sum, pos) => sum + (pos.market_value || pos.total_cost),
    0
  );

  const unrealizedPnl = positions.reduce(
    (sum, pos) => sum + (pos.unrealized_pnl || 0),
    0
  );

  const totalValue = cash + positionsValue;

  // Day P&L would require tracking yesterday's values - simplified for now
  const dayPnl = unrealizedPnl; // Placeholder

  return {
    total_value: totalValue,
    cash,
    positions_value: positionsValue,
    unrealized_pnl: unrealizedPnl,
    realized_pnl: realizedPnl,
    day_pnl: dayPnl,
    positions_count: positions.filter((p) => p.quantity !== 0).length,
  };
}

/**
 * Subscribe to real-time trade journal updates
 */
export function subscribeToTrades(
  onInsert: (trade: TradeJournalEntry) => void,
  onDelete: (tradeId: string) => void
) {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured, skipping subscription');
    return () => {};
  }

  const channel = supabase
    .channel('trade_journal_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trade_journal',
      },
      (payload) => {
        onInsert(payload.new as TradeJournalEntry);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'trade_journal',
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
