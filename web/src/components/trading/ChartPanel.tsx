"use client";

import { useState, useRef, useEffect } from "react";
import { useTradingStore, type Timeframe, type ChartType, type IndicatorType } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CandlestickChart,
  LineChart,
  AreaChart,
  ChevronDown,
  Maximize2,
  Settings2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TradingChart } from "@/components/charts/TradingChart";
import { IndicatorPanel } from "@/components/charts/IndicatorPanel";

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

const CHART_TYPES: { value: ChartType; label: string; icon: React.ElementType }[] = [
  { value: "candlestick", label: "Candles", icon: CandlestickChart },
  { value: "line", label: "Line", icon: LineChart },
  { value: "area", label: "Area", icon: AreaChart },
];

const INDICATORS: { id: IndicatorType; name: string; shortName: string }[] = [
  { id: "SMA", name: "Simple Moving Average", shortName: "SMA" },
  { id: "EMA", name: "Exponential Moving Average", shortName: "EMA" },
  { id: "RSI", name: "Relative Strength Index", shortName: "RSI" },
  { id: "MACD", name: "MACD", shortName: "MACD" },
  { id: "BOLLINGER", name: "Bollinger Bands", shortName: "BB" },
];

export function ChartPanel() {
  const {
    activeSymbol,
    chartType,
    timeframe,
    indicators,
    setActiveSymbol,
    setChartType,
    setTimeframe,
    addIndicator,
    removeIndicator,
  } = useTradingStore();

  const { bars, isLoadingBars, quotes } = useMarketDataStore();
  const symbolBars = bars[activeSymbol] || [];
  const isLoading = isLoadingBars[activeSymbol] ?? false;
  const quote = quotes[activeSymbol];

  // Symbol search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = searchValue.trim().toUpperCase();
    if (symbol) {
      setActiveSymbol(symbol);
      setSearchValue("");
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchValue("");
      setIsSearching(false);
    }
  };

  const activeIndicatorIds = indicators.filter((i) => i.visible).map((i) => i.type);
  const hasRSI = activeIndicatorIds.includes("RSI");
  const hasMACD = activeIndicatorIds.includes("MACD");

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Symbol & Price with Search */}
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            {isSearching ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Symbol..."
                  className="h-7 w-24 text-sm uppercase"
                  maxLength={10}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={!searchValue.trim()}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    setSearchValue("");
                    setIsSearching(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </form>
            ) : (
              <button
                onClick={() => setIsSearching(true)}
                className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded transition-colors group"
                title="Click to search symbol"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                <span className="font-bold text-lg">{activeSymbol}</span>
              </button>
            )}
            {!isSearching && quote && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  ${quote.last?.toFixed(2) ?? "—"}
                </span>
                {quote.changePercent !== undefined && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      quote.changePercent >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {quote.changePercent >= 0 ? "+" : ""}
                    {quote.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Timeframe Selector */}
          <ToggleGroup
            type="single"
            value={timeframe}
            onValueChange={(value) => value && setTimeframe(value as Timeframe)}
            className="hidden sm:flex"
          >
            {TIMEFRAMES.map((tf) => (
              <ToggleGroupItem
                key={tf.value}
                value={tf.value}
                size="sm"
                className="px-2 text-xs"
              >
                {tf.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* Mobile Timeframe Dropdown */}
          <Popover>
            <PopoverTrigger asChild className="sm:hidden">
              <Button variant="outline" size="sm">
                {timeframe.toUpperCase()}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1">
              {TIMEFRAMES.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setTimeframe(tf.value)}
                >
                  {tf.label}
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Chart Type */}
          <div className="flex items-center border-l border-border pl-2">
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(value) => value && setChartType(value as ChartType)}
            >
              {CHART_TYPES.map((ct) => (
                <ToggleGroupItem
                  key={ct.value}
                  value={ct.value}
                  size="sm"
                  className="px-2"
                  title={ct.label}
                >
                  <ct.icon className="h-4 w-4" />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicators */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Indicators</span>
                {activeIndicatorIds.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                    {activeIndicatorIds.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="space-y-1">
                {INDICATORS.map((ind) => {
                  const isActive = activeIndicatorIds.includes(ind.id);
                  return (
                    <Button
                      key={ind.id}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => {
                        if (isActive) {
                          const indicator = indicators.find((i) => i.type === ind.id);
                          if (indicator) removeIndicator(indicator.id);
                        } else {
                          addIndicator(ind.id);
                        }
                      }}
                    >
                      <span>{ind.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ind.shortName}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Fullscreen */}
          <Button variant="ghost" size="icon" className="hidden sm:flex" aria-label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Main Chart */}
        <div className={cn(
          "flex-1 min-h-0",
          (hasRSI || hasMACD) ? "h-[60%]" : "h-full"
        )}>
          {isLoading ? (
            <ChartSkeleton />
          ) : symbolBars.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <CandlestickChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No data available for {activeSymbol}</p>
                <p className="text-sm">Real-time data will appear when connected</p>
              </div>
            </div>
          ) : (
            <TradingChart className="h-full" />
          )}
        </div>

        {/* RSI Panel */}
        {hasRSI && symbolBars.length > 0 && (
          <div className="border-t border-border">
            <IndicatorPanel type="RSI" height={100} />
          </div>
        )}

        {/* MACD Panel */}
        {hasMACD && symbolBars.length > 0 && (
          <div className="border-t border-border">
            <IndicatorPanel type="MACD" height={120} />
          </div>
        )}
      </div>

      {/* Active Indicators Display */}
      {activeIndicatorIds.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 border-t border-border">
          <span className="text-xs text-muted-foreground">Active:</span>
          {indicators
            .filter((i) => i.visible)
            .map((ind) => (
              <span
                key={ind.id}
                className="text-xs px-1.5 py-0.5 rounded bg-muted"
                style={{ borderLeft: `2px solid ${ind.color}` }}
              >
                {ind.type}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full p-4 space-y-3">
      <div className="flex items-end gap-1 h-[60%]">
        {Array.from({ length: 30 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <Skeleton className="h-[20%]" />
    </div>
  );
}
