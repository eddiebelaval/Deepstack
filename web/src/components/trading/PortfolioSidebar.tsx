"use client"

import { useRef } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PositionCard } from './PositionCard';
import { ManualPositionDialog } from './ManualPositionDialog';
import { PositionHistory } from './PositionHistory';
import { Loader2, RefreshCw, Cloud, CloudOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Format relative time for last update
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function PortfolioSidebar() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    positions,
    summary,
    isLoading,
    isRefreshing,
    isPriceLoading,
    error,
    lastPriceUpdate,
    refresh,
    refreshPrices,
    isConnected,
  } = usePortfolio({ pollInterval: 30000 });

  // Loading state (only on initial load)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-destructive">{error}</div>
        <Button onClick={refresh} variant="outline" size="sm" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Portfolio</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {isConnected ? (
                      <Cloud className="h-3 w-3 text-green-500" />
                    ) : (
                      <CloudOff className="h-3 w-3 text-yellow-500" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {isConnected ? 'Synced with cloud' : 'Using local storage'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshPrices}
            disabled={isRefreshing || isPriceLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", (isRefreshing || isPriceLoading) && "animate-spin")} />
          </Button>
        </div>
        {/* Last price update indicator */}
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Prices updated: {formatRelativeTime(lastPriceUpdate)}</span>
          {isPriceLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full p-4" viewportRef={scrollRef} hideScrollbar>
          <div className="space-y-4">
            {/* Account Summary */}
            <Card className="p-4 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Portfolio Value</div>
                <div className="text-2xl font-bold">
                  ${summary.total_value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                {/* Total P&L percentage from starting cash */}
                {(() => {
                  const totalPnl = summary.unrealized_pnl + summary.realized_pnl;
                  const pnlPercent = (totalPnl / 100000) * 100; // Starting cash is $100,000
                  return (
                    <div className={cn(
                      "text-xs font-medium mt-1",
                      totalPnl >= 0 ? 'text-profit' : 'text-loss'
                    )}>
                      {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                    </div>
                  );
                })()}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Cash</div>
                  <div className="text-sm font-medium">
                    ${summary.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Positions</div>
                  <div className="text-sm font-medium">
                    ${summary.positions_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <Separator />

              {/* P&L Section with enhanced visual styling */}
              <div className="grid grid-cols-2 gap-3">
                <div className={cn(
                  "p-2 rounded-md",
                  summary.unrealized_pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                )}>
                  <div className="text-xs text-muted-foreground">Unrealized P&L</div>
                  <div className={cn(
                    "text-sm font-bold",
                    summary.unrealized_pnl >= 0 ? 'text-profit' : 'text-loss'
                  )}>
                    {summary.unrealized_pnl >= 0 ? '+' : ''}
                    ${Math.abs(summary.unrealized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={cn(
                  "p-2 rounded-md",
                  summary.realized_pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                )}>
                  <div className="text-xs text-muted-foreground">Realized P&L</div>
                  <div className={cn(
                    "text-sm font-bold",
                    summary.realized_pnl >= 0 ? 'text-profit' : 'text-loss'
                  )}>
                    {summary.realized_pnl >= 0 ? '+' : ''}
                    ${Math.abs(summary.realized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Positions Section with Tabs */}
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="active" className="text-xs">
                  Active
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {summary.positions_count}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  History
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {positions.filter(p => p.quantity === 0 && p.realized_pnl !== 0).length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Active Positions Tab */}
              <TabsContent value="active" className="mt-0 space-y-3">
                {/* Manual Entry Dialog */}
                <ManualPositionDialog onSuccess={refresh} />

                {/* Active Positions List */}
                {positions.filter(p => p.quantity !== 0).length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No open positions
                  </div>
                ) : (
                  <div className="space-y-2">
                    {positions
                      .filter(p => p.quantity !== 0)
                      .map((position) => (
                        <PositionCard
                          key={position.symbol}
                          position={position}
                          onClose={async () => {
                            // For now, we'd need to record a closing trade
                            // This would be handled by the close position flow
                          }}
                        />
                      ))}
                  </div>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-0">
                <PositionHistory positions={positions} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        <DotScrollIndicator
          scrollRef={scrollRef}
          maxDots={5}
          className="absolute right-1 top-1/2 -translate-y-1/2"
          minHeightGrowth={0}
        />
      </div>
    </div>
  );
}
