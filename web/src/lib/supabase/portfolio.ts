import { TradeEntry } from '../stores/trades-store';

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
  trades: TradeEntry[];
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
 * Calculate positions from trade history using FIFO method
 */
export function calculatePositions(trades: TradeEntry[]): Position[] {
  const positionMap = new Map<string, {
    lots: Array<{ quantity: number; price: number; date: string }>;
    realized_pnl: number;
    trades: TradeEntry[];
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
        date: trade.createdAt,
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
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    positions.push({
      symbol,
      quantity: totalQty,
      avg_cost: avgCost,
      total_cost: totalCost,
      realized_pnl: data.realized_pnl,
      trades: sortedTrades,
      first_trade_at: sortedTrades[0]?.createdAt || '',
      last_trade_at: sortedTrades[sortedTrades.length - 1]?.createdAt || '',
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
