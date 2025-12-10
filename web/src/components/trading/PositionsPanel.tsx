"use client";

import { useRef } from "react";
import { usePositionsStore } from "@/lib/stores/positions-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DotScrollIndicator } from "@/components/ui/DotScrollIndicator";
import {
  Briefcase,
  Plus,
  TrendingUp,
  TrendingDown,
  Edit,
  X,
} from "lucide-react";
import { PortfolioMiniChart } from "./PortfolioMiniChart";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PositionsPanelProps = {
  onAddPosition?: () => void;
};

export function PositionsPanel({ onAddPosition }: PositionsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const positions = usePositionsStore((state) => state.positions);
  const totalValue = usePositionsStore((state) => {
    return state.positions.reduce((total, position) => {
      const currentPrice = position.currentPrice ?? position.avgCost;
      return total + position.shares * currentPrice;
    }, 0);
  });
  const totalPnL = usePositionsStore((state) => {
    return state.positions.reduce((total, position) => {
      const currentPrice = position.currentPrice ?? position.avgCost;
      const marketValue = position.shares * currentPrice;
      const costBasis = position.shares * position.avgCost;
      const pnl = position.side === 'long'
        ? marketValue - costBasis
        : costBasis - marketValue;
      return total + pnl;
    }, 0);
  });
  const totalPnLPercent = usePositionsStore((state) => {
    const totalCostBasis = state.positions.reduce((total, position) => {
      return total + position.shares * position.avgCost;
    }, 0);
    const pnl = state.positions.reduce((total, position) => {
      const currentPrice = position.currentPrice ?? position.avgCost;
      const marketValue = position.shares * currentPrice;
      const costBasis = position.shares * position.avgCost;
      const pnl = position.side === 'long'
        ? marketValue - costBasis
        : costBasis - marketValue;
      return total + pnl;
    }, 0);
    return totalCostBasis !== 0 ? (pnl / totalCostBasis) * 100 : 0;
  });

  const isProfitable = totalPnL >= 0;
  const activePositionsCount = positions.length;

  // Calculate day change (mock for now - would need real-time data)
  const dayChange = 0;
  const dayChangePercent = 0;
  const buyingPower = 50000; // Mock value

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Positions</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddPosition}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {/* Portfolio Summary */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">
              Total Portfolio
            </span>
            <span className="text-lg font-bold">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Total P/L</span>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-sm font-semibold",
                  isProfitable ? "text-profit" : "text-loss"
                )}
              >
                {isProfitable ? "+" : ""}
                ${Math.abs(totalPnL).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  isProfitable ? "text-profit" : "text-loss"
                )}
              >
                ({isProfitable ? "+" : ""}
                {totalPnLPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-border bg-muted/30">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Positions</div>
          <div className="text-sm font-semibold">{activePositionsCount}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Day Change</div>
          <div
            className={cn(
              "text-sm font-semibold",
              dayChange >= 0 ? "text-profit" : "text-loss"
            )}
          >
            {dayChange >= 0 ? "+" : ""}${Math.abs(dayChange).toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Buying Power</div>
          <div className="text-sm font-semibold">
            ${buyingPower.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Portfolio Mini Chart */}
      {positions.length > 0 && (
        <div className="p-3 border-b border-border">
          <PortfolioMiniChart />
        </div>
      )}

      {/* Positions List */}
      <div className="flex-1 relative overflow-hidden">
        {positions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-sm mb-1">No positions yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add your first position to start tracking
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddPosition}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Position
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="h-full" viewportRef={scrollRef} hideScrollbar>
              <div className="p-2 space-y-0.5">
                {positions.map((position) => {
                  const currentPrice = position.currentPrice ?? position.avgCost;
                  const marketValue = position.shares * currentPrice;
                  const costBasis = position.shares * position.avgCost;
                  const pnl = position.side === 'long'
                    ? marketValue - costBasis
                    : costBasis - marketValue;
                  const pnlPercent = costBasis !== 0 ? (pnl / costBasis) * 100 : 0;

                  return (
                    <PositionCard
                      key={position.id}
                      position={{
                        ...position,
                        currentPrice,
                        pnl,
                        pnlPercent,
                      }}
                    />
                  );
                })}
              </div>
            </ScrollArea>
            <DotScrollIndicator
              scrollRef={scrollRef}
              maxDots={5}
              className="absolute right-1 top-1/2 -translate-y-1/2"
              minHeightGrowth={0}
            />
          </>
        )}
      </div>
    </div>
  );
}

type PositionCardProps = {
  position: {
    id: string;
    symbol: string;
    side: "long" | "short";
    shares: number;
    avgCost: number;
    currentPrice: number;
    openDate: string;
    pnl: number;
    pnlPercent: number;
  };
};

function PositionCard({ position }: PositionCardProps) {
  const removePosition = usePositionsStore((state) => state.removePosition);
  const isProfitable = position.pnl >= 0;
  const isLong = position.side === "long";

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Edit position:", position.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePosition(position.id);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors",
        "hover:bg-muted/40 cursor-pointer"
      )}
    >
      {/* Symbol & Side */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-semibold">{position.symbol}</span>
        <span
          className={cn(
            "text-[9px] font-medium px-1 py-0.5 rounded",
            isLong ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
          )}
        >
          {isLong ? "L" : "S"}
        </span>
      </div>

      {/* Shares & Price */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{position.shares}</span>
        <span>@</span>
        <span className="font-mono">${position.currentPrice.toFixed(2)}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* P&L */}
      <div className="flex items-center gap-1.5">
        {isProfitable ? (
          <TrendingUp className="h-3 w-3 text-profit" />
        ) : (
          <TrendingDown className="h-3 w-3 text-loss" />
        )}
        <span
          className={cn(
            "text-xs font-mono font-medium",
            isProfitable ? "text-profit" : "text-loss"
          )}
        >
          {isProfitable ? "+" : ""}
          ${Math.abs(position.pnl).toFixed(0)}
        </span>
        <span
          className={cn(
            "text-[10px] font-medium",
            isProfitable ? "text-profit" : "text-loss"
          )}
        >
          ({isProfitable ? "+" : ""}{position.pnlPercent.toFixed(1)}%)
        </span>
      </div>

      {/* Action buttons - show on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={handleEdit}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                onClick={handleClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
