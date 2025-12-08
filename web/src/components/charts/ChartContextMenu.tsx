"use client";

import { useState, useCallback } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Bell, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { useAlertsSync } from "@/hooks/useAlertsSync";
import { useTradingStore } from "@/lib/stores/trading-store";
import { toast } from "sonner";

type ChartContextMenuProps = {
  children: React.ReactNode;
  onPriceAtCursor: () => number | null;
};

export function ChartContextMenu({ children, onPriceAtCursor }: ChartContextMenuProps) {
  const { activeSymbol } = useTradingStore();
  const { addAlert } = useAlertsSync();
  const [contextPrice, setContextPrice] = useState<number | null>(null);

  const handleContextMenu = useCallback(() => {
    const price = onPriceAtCursor();
    setContextPrice(price);
  }, [onPriceAtCursor]);

  const handleSetAlert = async (condition: 'above' | 'below' | 'crosses') => {
    if (!contextPrice || !activeSymbol) {
      toast.error("Unable to set alert: no price detected");
      return;
    }

    try {
      await addAlert({
        symbol: activeSymbol,
        targetPrice: contextPrice,
        condition,
        note: `Set from chart at $${contextPrice.toFixed(2)}`,
      });

      const conditionText = condition === 'above' ? 'above' : condition === 'below' ? 'below' : 'crosses';
      toast.success(`Alert set: ${activeSymbol} ${conditionText} $${contextPrice.toFixed(2)}`);
    } catch {
      toast.error("Failed to create alert");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          {contextPrice ? (
            <>Set Alert at ${contextPrice.toFixed(2)}</>
          ) : (
            <>Set Price Alert</>
          )}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleSetAlert('above')}
          disabled={!contextPrice}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span>Alert when price goes above</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleSetAlert('below')}
          disabled={!contextPrice}
          className="gap-2"
        >
          <TrendingDown className="h-4 w-4 text-red-500" />
          <span>Alert when price goes below</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleSetAlert('crosses')}
          disabled={!contextPrice}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4 text-blue-500" />
          <span>Alert when price crosses</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled className="gap-2 text-xs text-muted-foreground">
          <Bell className="h-3 w-3" />
          <span>Right-click on chart to set alerts</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
