"use client";

import { useState, useEffect, useCallback } from "react";
import { useWatchlistSync } from "@/hooks/useWatchlistSync";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SymbolSearchDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

// Common symbols for quick access
const POPULAR_SYMBOLS = [
    { symbol: "SPY", name: "S&P 500 ETF" },
    { symbol: "QQQ", name: "Nasdaq-100 ETF" },
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corp." },
    { symbol: "NVDA", name: "NVIDIA Corp." },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "META", name: "Meta Platforms Inc." },
    { symbol: "BTC-USD", name: "Bitcoin" },
    { symbol: "ETH-USD", name: "Ethereum" },
];

export function SymbolSearchDialog({
    open,
    onOpenChange,
}: SymbolSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
    const {
        addSymbol,
        activeWatchlistId,
        getActiveWatchlist
    } = useWatchlistSync();
    const { quotes, subscribe } = useMarketDataStore();

    // Load recent symbols from localStorage
    useEffect(() => {
        const recent = localStorage.getItem("deepstack-recent-symbols");
        if (recent) {
            try {
                setRecentSymbols(JSON.parse(recent));
            } catch (e) {
                console.error("Failed to parse recent symbols:", e);
            }
        }
    }, []);

    const addToRecent = useCallback((symbol: string) => {
        setRecentSymbols((prev) => {
            const updated = [symbol, ...prev.filter((s) => s !== symbol)].slice(
                0,
                10
            );
            localStorage.setItem("deepstack-recent-symbols", JSON.stringify(updated));
            return updated;
        });
    }, []);

    const handleAddSymbol = async (symbol: string) => {
        if (!activeWatchlistId) return;

        await addSymbol(activeWatchlistId, symbol.toUpperCase());
        addToRecent(symbol.toUpperCase());
        subscribe(symbol.toUpperCase());
        setSearchQuery("");
    };

    const activeWatchlist = getActiveWatchlist();
    const existingSymbols = new Set(
        activeWatchlist?.items.map((item) => item.symbol) || []
    );

    // Filter symbols based on search query
    const filteredPopular = POPULAR_SYMBOLS.filter(
        (s) =>
            !existingSymbols.has(s.symbol) &&
            (s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredRecent = recentSymbols.filter(
        (s) =>
            !existingSymbols.has(s) &&
            s.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Check if search query is a direct symbol match
    const isDirectMatch =
        searchQuery.length > 0 &&
        !existingSymbols.has(searchQuery.toUpperCase()) &&
        !filteredPopular.some(
            (s) => s.symbol.toUpperCase() === searchQuery.toUpperCase()
        );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Symbol to Watchlist</DialogTitle>
                    <DialogDescription>
                        Search for a symbol or select from popular stocks
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && searchQuery.trim()) {
                                handleAddSymbol(searchQuery.trim());
                            }
                        }}
                        placeholder="Search symbols (e.g., AAPL, TSLA, BTC-USD)..."
                        className="pl-9"
                        autoFocus
                    />
                </div>

                <ScrollArea className="max-h-[400px]">
                    <div className="space-y-4">
                        {/* Direct match - allow adding any symbol */}
                        {isDirectMatch && (
                            <div>
                                <h4 className="text-sm font-medium mb-2">Add Symbol</h4>
                                <button
                                    onClick={() => handleAddSymbol(searchQuery)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                                >
                                    <div>
                                        <div className="font-medium">
                                            {searchQuery.toUpperCase()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Add this symbol to watchlist
                                        </div>
                                    </div>
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* Recent symbols */}
                        {filteredRecent.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Recently Added
                                </h4>
                                <div className="space-y-1">
                                    {filteredRecent.map((symbol) => (
                                        <SymbolRow
                                            key={symbol}
                                            symbol={symbol}
                                            quote={quotes[symbol]}
                                            onAdd={() => handleAddSymbol(symbol)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Popular symbols */}
                        {filteredPopular.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2">Popular Symbols</h4>
                                <div className="space-y-1">
                                    {filteredPopular.map(({ symbol, name }) => (
                                        <SymbolRow
                                            key={symbol}
                                            symbol={symbol}
                                            name={name}
                                            quote={quotes[symbol]}
                                            onAdd={() => handleAddSymbol(symbol)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {searchQuery &&
                            !isDirectMatch &&
                            filteredPopular.length === 0 &&
                            filteredRecent.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No symbols found. Press Enter to add &quot;{searchQuery.toUpperCase()}&quot;
                                </div>
                            )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

type SymbolRowProps = {
    symbol: string;
    name?: string;
    quote?: any;
    onAdd: () => void;
};

function SymbolRow({ symbol, name, quote, onAdd }: SymbolRowProps) {
    const changePercent = quote?.changePercent ?? 0;
    const isPositive = changePercent >= 0;

    return (
        <button
            onClick={onAdd}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
        >
            <div className="text-left min-w-0 flex-1">
                <div className="font-medium">{symbol}</div>
                {name && (
                    <div className="text-xs text-muted-foreground truncate">{name}</div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {quote && (
                    <div className="text-right">
                        <div className="text-sm font-medium">
                            ${quote.last?.toFixed(2) ?? "—"}
                        </div>
                        <div
                            className={cn(
                                "text-xs flex items-center gap-1",
                                isPositive ? "text-profit" : "text-loss"
                            )}
                        >
                            {isPositive ? (
                                <TrendingUp className="h-3 w-3" />
                            ) : (
                                <TrendingDown className="h-3 w-3" />
                            )}
                            {isPositive ? "+" : ""}
                            {changePercent.toFixed(2)}%
                        </div>
                    </div>
                )}
                <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
        </button>
    );
}
