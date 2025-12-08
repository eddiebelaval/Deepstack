"use client"

import { useState } from 'react';
import { usePortfolio, usePlacePaperTrade } from '@/hooks/usePortfolio';
import { useTradingStore } from '@/lib/stores/trading-store';
import { Position } from '@/lib/supabase/portfolio';
import { api } from '@/lib/api-extended';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, TrendingUp, TrendingDown, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ManualPositionDialog } from './ManualPositionDialog';

export function PositionsList() {
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [closingPositions, setClosingPositions] = useState<Set<string>>(new Set());

  const { positions, summary, isLoading, isRefreshing, refresh } = usePortfolio({ pollInterval: 30000 });
  const { setActiveSymbol } = useTradingStore();
  const paperTrade = usePlacePaperTrade();

  const openPositions = positions.filter(p => p.quantity !== 0);

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

  const handleClosePosition = async (position: Position) => {
    setClosingPositions((prev) => new Set(prev).add(position.symbol));

    try {
      const action = position.quantity > 0 ? 'SELL' : 'BUY';
      const qty = Math.abs(position.quantity);

      // Get current price for the closing trade
      const quote = await api.quote(position.symbol);
      const price = quote.last;

      if (!price) {
        throw new Error('Could not get current price');
      }

      // Record the closing trade
      await paperTrade.execute({
        symbol: position.symbol,
        action,
        quantity: qty,
        price,
        orderType: 'MKT',
        notes: 'Position closed',
      });

      toast.success('Position Closed', {
        description: `${action} ${qty} ${position.symbol} @ $${price.toFixed(2)}`,
      });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Total P&L Summary */}
      <div className="flex items-center justify-between px-1 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Unrealized P&L</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          </Button>
        </div>
        <span
          className={cn(
            'font-semibold',
            summary.unrealized_pnl >= 0 ? 'text-profit' : 'text-loss'
          )}
        >
          {summary.unrealized_pnl >= 0 ? '+' : ''}${summary.unrealized_pnl.toFixed(2)}
        </span>
      </div>

      {/* Manual Entry Dialog */}
      <div className="px-1">
        <ManualPositionDialog onSuccess={refresh} />
      </div>

      {openPositions.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No open positions
        </div>
      ) : (
        /* Positions List */
        openPositions.map((position) => {
          const unrealized = position.unrealized_pnl ?? 0;
          const marketValue = position.market_value ?? position.total_cost;
          const currentPrice = position.current_price ?? position.avg_cost;
          const pnlPercent = position.unrealized_pnl_pct ?? 0;
          const isExpanded = expandedPositions.has(position.symbol);
          const isClosing = closingPositions.has(position.symbol);

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
                      <span>{position.quantity} shares @ ${position.avg_cost.toFixed(2)}</span>
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
                          ${position.total_cost.toFixed(2)}
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
        })
      )}
    </div>
  );
}
