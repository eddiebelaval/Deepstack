"use client"

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Position } from '@/lib/supabase/portfolio';
import { format, isAfter, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface PositionHistoryProps {
  positions: Position[];
}

type DateFilter = 'all' | 'last7days' | 'last30days' | 'thismonth';

interface ClosedPosition {
  symbol: string;
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  trades: number;
}

/**
 * Extracts closed positions from the position data
 * A position is considered closed when quantity = 0 and realized_pnl != 0
 */
function getClosedPositions(positions: Position[]): ClosedPosition[] {
  return positions
    .filter(p => p.quantity === 0 && p.realized_pnl !== 0)
    .map(pos => {
      // Get entry and exit info from trades
      const buyTrades = pos.trades.filter(t => t.action === 'BUY');
      const sellTrades = pos.trades.filter(t => t.action === 'SELL');

      const entryDate = new Date(pos.first_trade_at);
      const exitDate = new Date(pos.last_trade_at);

      // Calculate weighted average entry price
      const totalBuyQty = buyTrades.reduce((sum, t) => sum + t.quantity, 0);
      const totalBuyCost = buyTrades.reduce((sum, t) => sum + t.quantity * t.price, 0);
      const avgEntryPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

      // Calculate weighted average exit price
      const totalSellQty = sellTrades.reduce((sum, t) => sum + t.quantity, 0);
      const totalSellRevenue = sellTrades.reduce((sum, t) => sum + t.quantity * t.price, 0);
      const avgExitPrice = totalSellQty > 0 ? totalSellRevenue / totalSellQty : 0;

      // P&L percentage based on entry cost
      const pnlPercent = avgEntryPrice > 0 ? (pos.realized_pnl / (totalBuyQty * avgEntryPrice)) * 100 : 0;

      return {
        symbol: pos.symbol,
        entryDate,
        exitDate,
        entryPrice: avgEntryPrice,
        exitPrice: avgExitPrice,
        quantity: totalBuyQty,
        pnl: pos.realized_pnl,
        pnlPercent,
        trades: pos.trades.length,
      };
    })
    .sort((a, b) => b.exitDate.getTime() - a.exitDate.getTime()); // Most recent first
}

/**
 * Filter closed positions by date range
 */
function filterByDateRange(positions: ClosedPosition[], filter: DateFilter): ClosedPosition[] {
  const now = new Date();

  switch (filter) {
    case 'last7days':
      const last7Days = subDays(now, 7);
      return positions.filter(p => isAfter(p.exitDate, last7Days));

    case 'last30days':
      const last30Days = subDays(now, 30);
      return positions.filter(p => isAfter(p.exitDate, last30Days));

    case 'thismonth':
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      return positions.filter(p =>
        isAfter(p.exitDate, monthStart) && !isAfter(p.exitDate, monthEnd)
      );

    case 'all':
    default:
      return positions;
  }
}

/**
 * Calculate aggregate statistics for closed positions
 */
function calculateStats(positions: ClosedPosition[]) {
  if (positions.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      biggestWin: 0,
      biggestLoss: 0,
    };
  }

  const winners = positions.filter(p => p.pnl > 0);
  const losers = positions.filter(p => p.pnl < 0);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const winRate = positions.length > 0 ? (winners.length / positions.length) * 100 : 0;

  const avgWin = winners.length > 0
    ? winners.reduce((sum, p) => sum + p.pnl, 0) / winners.length
    : 0;

  const avgLoss = losers.length > 0
    ? losers.reduce((sum, p) => sum + p.pnl, 0) / losers.length
    : 0;

  const biggestWin = winners.length > 0
    ? Math.max(...winners.map(p => p.pnl))
    : 0;

  const biggestLoss = losers.length > 0
    ? Math.min(...losers.map(p => p.pnl))
    : 0;

  return {
    totalTrades: positions.length,
    winRate,
    totalPnl,
    avgWin,
    avgLoss,
    biggestWin,
    biggestLoss,
  };
}

export function PositionHistory({ positions }: PositionHistoryProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Extract and filter closed positions
  const closedPositions = useMemo(() => {
    const closed = getClosedPositions(positions);
    return filterByDateRange(closed, dateFilter);
  }, [positions, dateFilter]);

  // Calculate stats
  const stats = useMemo(() => calculateStats(closedPositions), [closedPositions]);

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Trade History
        </h3>
        <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="last7days">Last 7 Days</SelectItem>
            <SelectItem value="last30days">Last 30 Days</SelectItem>
            <SelectItem value="thismonth">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aggregate Stats */}
      {closedPositions.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
              <div className="text-lg font-bold">{stats.totalTrades}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="text-lg font-bold">
                {stats.winRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total P&L</div>
              <div className={cn(
                "text-lg font-bold",
                stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'
              )}>
                {stats.totalPnl >= 0 ? '+' : ''}
                ${stats.totalPnl.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded-md bg-green-500/10">
              <div className="text-muted-foreground">Avg Win</div>
              <div className="font-semibold text-profit">
                +${Math.abs(stats.avgWin).toFixed(2)}
              </div>
            </div>
            <div className="p-2 rounded-md bg-red-500/10">
              <div className="text-muted-foreground">Avg Loss</div>
              <div className="font-semibold text-loss">
                ${stats.avgLoss.toFixed(2)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Closed Positions List */}
      {closedPositions.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No closed positions {dateFilter !== 'all' && `in selected period`}
        </div>
      ) : (
        <div className="space-y-2">
          {closedPositions.map((position, idx) => (
            <Card key={`${position.symbol}-${position.exitDate.getTime()}-${idx}`} className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{position.symbol}</span>
                  <Badge variant="outline" className="text-xs">
                    {position.trades} trades
                  </Badge>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-sm font-bold flex items-center gap-1",
                    position.pnl >= 0 ? 'text-profit' : 'text-loss'
                  )}>
                    {position.pnl >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {position.pnl >= 0 ? '+' : ''}
                    ${position.pnl.toFixed(2)}
                  </div>
                  <div className={cn(
                    "text-xs",
                    position.pnl >= 0 ? 'text-profit' : 'text-loss'
                  )}>
                    {position.pnlPercent >= 0 ? '+' : ''}
                    {position.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry:</span>
                  <span className="font-medium">${position.entryPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exit:</span>
                  <span className="font-medium">${position.exitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opened:</span>
                  <span className="font-medium">{format(position.entryDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed:</span>
                  <span className="font-medium">{format(position.exitDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{position.quantity} shares</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
