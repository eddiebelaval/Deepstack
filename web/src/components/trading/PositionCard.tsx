"use client"

import { useState } from 'react';
import { Position } from '@/lib/supabase/portfolio';
import { useTradingStore } from '@/lib/stores/trading-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  X,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PositionCardProps {
  position: Position;
  onClose?: () => Promise<void>;
}

export function PositionCard({ position, onClose }: PositionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { setActiveSymbol } = useTradingStore();

  const unrealizedPnl = position.unrealized_pnl ?? 0;
  const marketValue = position.market_value ?? position.total_cost;
  const currentPrice = position.current_price ?? position.avg_cost;
  const pnlPercent = position.unrealized_pnl_pct ?? 0;

  const handleClose = async () => {
    if (!onClose) return;
    setIsClosing(true);
    try {
      await onClose();
    } finally {
      setIsClosing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <div
            className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              setIsExpanded(!isExpanded);
            }}
          >
            {/* Header Row */}
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
                {unrealizedPnl >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-profit" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-loss" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'text-sm font-medium',
                    unrealizedPnl >= 0 ? 'text-profit' : 'text-loss'
                  )}
                >
                  {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isExpanded && 'transform rotate-180'
                  )}
                />
              </div>
            </div>

            {/* Summary Row */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {position.quantity} shares @ ${position.avg_cost.toFixed(2)}
              </span>
              <span className={cn(pnlPercent >= 0 ? 'text-profit' : 'text-loss')}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
            {/* Position Details */}
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
                <div className="font-medium">${position.total_cost.toFixed(2)}</div>
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

            {/* Trade History */}
            {position.trades.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent Trades ({position.trades.length})
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {position.trades.slice(-5).reverse().map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between text-xs py-1 px-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-medium',
                            trade.action === 'BUY' ? 'text-profit' : 'text-loss'
                          )}
                        >
                          {trade.action}
                        </span>
                        <span className="text-muted-foreground">
                          {trade.quantity} @ ${trade.price.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatDate(trade.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Position Button */}
            {onClose && position.quantity !== 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-loss border-loss/50 hover:bg-loss/10 hover:text-loss"
                onClick={handleClose}
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
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
