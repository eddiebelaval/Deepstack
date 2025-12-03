"use client"

import { useEffect, useState, useCallback } from 'react';
import { api, type PositionData } from '@/lib/api';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { useTradingStore } from '@/lib/stores/trading-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, TrendingUp, TrendingDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PositionsList() {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [closingPositions, setClosingPositions] = useState<Set<string>>(new Set());

  const { quotes } = useMarketDataStore();
  const { setActiveSymbol } = useTradingStore();

  const fetchPositions = useCallback(async () => {
    try {
      const data = await api.positions();
      setPositions(data);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    // Poll every 10 seconds for position updates
    const interval = setInterval(fetchPositions, 10000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const toggleExpanded = (symbol: string) => {
    setExpandedPositions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const handleClosePosition = async (position: PositionData) => {
    setClosingPositions((prev) => new Set(prev).add(position.symbol));

    try {
      const action = position.position > 0 ? 'SELL' : 'BUY';
      const qty = Math.abs(position.position);

      const response = await api.placeOrder({
        symbol: position.symbol,
        quantity: qty,
        action,
        order_type: 'MKT',
      });

      toast.success('Position Closed', {
        description: `${action} ${qty} ${position.symbol} - ${response.message}`,
      });

      // Refresh positions
      fetchPositions();
    } catch (error) {
      toast.error('Failed to close position', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setClosingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(position.symbol);
        return newSet;
      });
    }
  };

  // Calculate real-time P&L using live quotes
  const getRealtimePnL = (position: PositionData) => {
    const liveQuote = quotes[position.symbol];
    if (!liveQuote?.last) {
      return {
        unrealized: position.unrealized_pnl,
        marketValue: position.market_value,
        currentPrice: position.avg_cost,
      };
    }

    const currentPrice = liveQuote.last;
    const marketValue = position.position * currentPrice;
    const costBasis = position.position * position.avg_cost;
    const unrealized = marketValue - costBasis;

    return {
      unrealized,
      marketValue,
      currentPrice,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No open positions
      </div>
    );
  }

  // Calculate total P&L
  const totalPnL = positions.reduce((sum, pos) => {
    const { unrealized } = getRealtimePnL(pos);
    return sum + unrealized;
  }, 0);

  return (
    <div className="space-y-3">
      {/* Total P&L Summary */}
      <div className="flex items-center justify-between px-1 py-2 border-b border-border">
        <span className="text-sm text-muted-foreground">Total P&L</span>
        <span
          className={cn(
            'font-semibold',
            totalPnL >= 0 ? 'text-profit' : 'text-loss'
          )}
        >
          {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
        </span>
      </div>

      {/* Positions List */}
      {positions.map((position) => {
        const { unrealized, marketValue, currentPrice } = getRealtimePnL(position);
        const isExpanded = expandedPositions.has(position.symbol);
        const isClosing = closingPositions.has(position.symbol);
        const pnlPercent = position.avg_cost > 0
          ? ((currentPrice - position.avg_cost) / position.avg_cost) * 100
          : 0;

        return (
          <Collapsible
            key={position.symbol}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(position.symbol)}
          >
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <div
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    // Don't toggle if clicking close button
                    if ((e.target as HTMLElement).closest('button')) return;
                    toggleExpanded(position.symbol);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSymbol(position.symbol);
                        }}
                        className="font-semibold hover:underline"
                      >
                        {position.symbol}
                      </button>
                      {unrealized >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-profit" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-loss" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'text-sm font-medium',
                          unrealized >= 0 ? 'text-profit' : 'text-loss'
                        )}
                      >
                        {unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform',
                          isExpanded && 'transform rotate-180'
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{position.position} shares @ ${position.avg_cost.toFixed(2)}</span>
                    <span
                      className={cn(
                        pnlPercent >= 0 ? 'text-profit' : 'text-loss'
                      )}
                    >
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Current Price</span>
                      <div className="font-medium">${currentPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Market Value</span>
                      <div className="font-medium">${marketValue.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost Basis</span>
                      <div className="font-medium">
                        ${(position.position * position.avg_cost).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Realized P&L</span>
                      <div
                        className={cn(
                          'font-medium',
                          position.realized_pnl >= 0 ? 'text-profit' : 'text-loss'
                        )}
                      >
                        {position.realized_pnl >= 0 ? '+' : ''}${position.realized_pnl.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-loss border-loss/50 hover:bg-loss/10 hover:text-loss"
                    onClick={() => handleClosePosition(position)}
                    disabled={isClosing}
                  >
                    {isClosing ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-2" />
                        Close Position
                      </>
                    )}
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
