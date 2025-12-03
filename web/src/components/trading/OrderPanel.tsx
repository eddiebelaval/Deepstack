"use client";

import { useState, useRef } from "react";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { api } from "@/lib/api";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderType = "MKT" | "LMT" | "STP";
type OrderSide = "buy" | "sell";

export function OrderPanel() {
  const { activeSymbol } = useTradingStore();
  const { quotes } = useMarketDataStore();

  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("MKT");
  const [quantity, setQuantity] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quote = quotes[activeSymbol];
  const currentPrice = quote?.last ?? 0;
  const qty = parseInt(quantity) || 0;
  const estimatedValue = qty * currentPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (qty <= 0 || !activeSymbol) return;

    setIsSubmitting(true);

    try {
      const response = await api.placeOrder({
        symbol: activeSymbol,
        quantity: qty,
        action: side === "buy" ? "BUY" : "SELL",
        order_type: orderType,
        limit_price: orderType === "LMT" ? parseFloat(limitPrice) : undefined,
        stop_price: orderType === "STP" ? parseFloat(stopPrice) : undefined,
      });

      const isSuccess = response.status === "filled" || response.status === "submitted";
      if (isSuccess) {
        toast.success("Order Submitted", {
          description: `${side.toUpperCase()} ${qty} ${activeSymbol} - ${response.message}`,
        });
        // Reset form on success
        setQuantity("1");
        setLimitPrice("");
        setStopPrice("");
      } else {
        toast.error("Order Issue", {
          description: response.message,
        });
      }
    } catch (error) {
      toast.error("Order Failed", {
        description: error instanceof Error ? error.message : "Failed to place order",
      });
    } finally {
      setIsSubmitting(false);
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
