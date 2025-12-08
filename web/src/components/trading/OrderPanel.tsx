"use client";

import { useState, useRef } from "react";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { usePlacePaperTrade } from "@/hooks/usePortfolio";
import { useUser } from "@/hooks/useUser";
import { canAccess } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DotScrollIndicator } from "@/components/ui/DotScrollIndicator";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderType = "MKT" | "LMT" | "STP";
type OrderSide = "buy" | "sell";

export function OrderPanel() {
  const { tier } = useUser();
  const { activeSymbol } = useTradingStore();
  const { quotes } = useMarketDataStore();
  const { execute: placePaperTrade, isSubmitting: isPaperTradeSubmitting } = usePlacePaperTrade();

  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("MKT");
  const [quantity, setQuantity] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [isCheckingFirewall, setIsCheckingFirewall] = useState(false);
  const [firewallWarning, setFirewallWarning] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quote = quotes[activeSymbol];
  const currentPrice = quote?.last ?? 0;
  const qty = parseInt(quantity) || 0;
  const estimatedValue = qty * currentPrice;
  const isSubmitting = isPaperTradeSubmitting || isCheckingFirewall;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (qty <= 0 || !activeSymbol) return;

    setFirewallWarning(null);
    setIsCheckingFirewall(true);

    try {
      // Only check Emotional Firewall for Elite users
      if (canAccess(tier, 'emotionalFirewall')) {
        const firewallResponse = await fetch('/api/emotional-firewall/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_trade', symbol: activeSymbol }),
        });

        if (firewallResponse.ok) {
          const firewallResult = await firewallResponse.json();

          if (firewallResult.blocked) {
            toast.error("Trade Blocked", {
              description: `Emotional Firewall: ${firewallResult.reasons?.join(', ') || 'Take a break'}`,
              duration: 5000,
            });
            setIsCheckingFirewall(false);
            return;
          }

          if (firewallResult.status === 'warning') {
            setFirewallWarning(firewallResult.reasons?.join(', ') || 'Proceed with caution');
          }
        }
      }
      // Free/Pro users: no firewall, trade proceeds directly
    } catch {
      // Firewall check failed - proceed anyway
      console.warn('Emotional firewall check failed, proceeding with trade');
    }

    setIsCheckingFirewall(false);

    // Get execution price
    const executionPrice = orderType === "LMT"
      ? parseFloat(limitPrice) || currentPrice
      : currentPrice;

    // Record trade in Supabase portfolio
    const trade = await placePaperTrade({
      symbol: activeSymbol,
      action: side === "buy" ? "BUY" : "SELL",
      quantity: qty,
      price: executionPrice,
      orderType: orderType,
      notes: `${orderType} order via Order Panel`,
    });

    if (trade) {
      toast.success("Trade Recorded", {
        description: `${side.toUpperCase()} ${qty} ${activeSymbol} @ $${executionPrice.toFixed(2)}`,
      });
      // Reset form on success
      setQuantity("1");
      setLimitPrice("");
      setStopPrice("");
      setFirewallWarning(null);
    } else {
      toast.error("Trade Failed", {
        description: "Failed to record trade. Check Supabase connection.",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold">Order Entry</h3>
        <p className="text-sm text-muted-foreground">{activeSymbol}</p>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full" viewportRef={scrollRef} hideScrollbar>
          <form onSubmit={handleSubmit} className="p-3 space-y-4">
            {/* Buy/Sell Tabs */}
            <Tabs
              value={side}
              onValueChange={(v) => setSide(v as OrderSide)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="buy"
                  className={cn(
                    "data-[state=active]:bg-profit data-[state=active]:text-white"
                  )}
                >
                  Buy
                </TabsTrigger>
                <TabsTrigger
                  value="sell"
                  className={cn(
                    "data-[state=active]:bg-loss data-[state=active]:text-white"
                  )}
                >
                  Sell
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Order Type */}
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select
                value={orderType}
                onValueChange={(v) => setOrderType(v as OrderType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MKT">Market</SelectItem>
                  <SelectItem value="LMT">Limit</SelectItem>
                  <SelectItem value="STP">Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
              <Slider
                value={[qty]}
                onValueChange={([v]) => setQuantity(v.toString())}
                max={100}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Limit Price (for LMT orders) */}
            {orderType === "LMT" && (
              <div className="space-y-2">
                <Label>Limit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={`Current: $${currentPrice.toFixed(2)}`}
                />
              </div>
            )}

            {/* Stop Price (for STP orders) */}
            {orderType === "STP" && (
              <div className="space-y-2">
                <Label>Stop Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder={`Current: $${currentPrice.toFixed(2)}`}
                />
              </div>
            )}

            <Separator />

            {/* Firewall Warning */}
            {firewallWarning && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-500">{firewallWarning}</p>
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Price</span>
                <span>${currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span>{qty} shares</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Estimated Value</span>
                <span>${estimatedValue.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className={cn(
                "w-full",
                side === "buy"
                  ? "bg-profit hover:bg-profit/90"
                  : "bg-loss hover:bg-loss/90"
              )}
              disabled={qty <= 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {side === "buy" ? "Buy" : "Sell"} {activeSymbol}
                </>
              )}
            </Button>
          </form>

          {/* Positions Section */}
          <div className="p-3 border-t border-border">
            <h4 className="font-medium mb-2">Open Positions</h4>
            <div className="text-sm text-muted-foreground text-center py-4">
              No open positions
            </div>
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
