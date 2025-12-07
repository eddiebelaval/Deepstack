'use client';

import { useCallback, useState, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useSearchPaletteStore } from '@/hooks/useKeyboardShortcuts';
import { useTradingStore } from '@/lib/stores/trading-store';
import { TrendingUp, Star, Clock, BarChart3, DollarSign } from 'lucide-react';

// Popular symbols for quick access
const POPULAR_SYMBOLS = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Stock' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'Stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'Stock' },
];

// Crypto symbols
const CRYPTO_SYMBOLS = [
  { symbol: 'BTCUSD', name: 'Bitcoin', type: 'Crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum', type: 'Crypto' },
];

interface SymbolResult {
  symbol: string;
  name: string;
  type: string;
}

export function SymbolSearchDialog() {
  const { isSearchOpen, setSearchOpen, searchQuery, setSearchQuery } = useSearchPaletteStore();
  const { setActiveSymbol } = useTradingStore();
  const [recentSymbols, setRecentSymbols] = useState<SymbolResult[]>([]);

  // Filter symbols based on query
  const filteredPopular = useMemo(() => {
    if (!searchQuery) return POPULAR_SYMBOLS;
    const query = searchQuery.toLowerCase();
    return POPULAR_SYMBOLS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredCrypto = useMemo(() => {
    if (!searchQuery) return CRYPTO_SYMBOLS;
    const query = searchQuery.toLowerCase();
    return CRYPTO_SYMBOLS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = useCallback((symbol: string, name: string, type: string) => {
    setActiveSymbol(symbol);
    setSearchOpen(false);

    // Add to recent
    setRecentSymbols((prev) => {
      const filtered = prev.filter((s) => s.symbol !== symbol);
      return [{ symbol, name, type }, ...filtered].slice(0, 5);
    });
  }, [setActiveSymbol, setSearchOpen]);

  // Check if query looks like a valid symbol to offer direct search
  const canSearchDirectly = searchQuery.length >= 1 && searchQuery.length <= 6 && /^[A-Za-z.]+$/.test(searchQuery);

  return (
    <CommandDialog
      open={isSearchOpen}
      onOpenChange={setSearchOpen}
      title="Symbol Search"
      description="Search for stocks, ETFs, and crypto to trade"
    >
      <CommandInput
        placeholder="Search symbols... (e.g., AAPL, SPY)"
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {canSearchDirectly ? (
            <button
              onClick={() => handleSelect(searchQuery.toUpperCase(), 'Custom Symbol', 'Stock')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Open chart for <strong>{searchQuery.toUpperCase()}</strong></span>
            </button>
          ) : (
            'No symbols found. Try a different search.'
          )}
        </CommandEmpty>

        {recentSymbols.length > 0 && !searchQuery && (
          <CommandGroup heading="Recent">
            {recentSymbols.map((item) => (
              <CommandItem
                key={item.symbol}
                value={item.symbol}
                onSelect={() => handleSelect(item.symbol, item.name, item.type)}
              >
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">{item.symbol}</span>
                <span className="ml-2 text-muted-foreground text-xs truncate">{item.name}</span>
                <CommandShortcut>{item.type}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredPopular.length > 0 && (
          <CommandGroup heading="Popular Stocks & ETFs">
            {filteredPopular.map((item) => (
              <CommandItem
                key={item.symbol}
                value={item.symbol}
                onSelect={() => handleSelect(item.symbol, item.name, item.type)}
              >
                {item.type === 'ETF' ? (
                  <Star className="h-4 w-4 mr-2 text-yellow-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                )}
                <span className="font-medium">{item.symbol}</span>
                <span className="ml-2 text-muted-foreground text-xs truncate">{item.name}</span>
                <CommandShortcut>{item.type}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredCrypto.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Crypto">
              {filteredCrypto.map((item) => (
                <CommandItem
                  key={item.symbol}
                  value={item.symbol}
                  onSelect={() => handleSelect(item.symbol, item.name, item.type)}
                >
                  <DollarSign className="h-4 w-4 mr-2 text-orange-500" />
                  <span className="font-medium">{item.symbol}</span>
                  <span className="ml-2 text-muted-foreground text-xs truncate">{item.name}</span>
                  <CommandShortcut>{item.type}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Keyboard Shortcuts">
          <CommandItem disabled className="opacity-60">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              <span className="text-xs">⌘</span>K
            </kbd>
            <span className="ml-2">Open search</span>
          </CommandItem>
          <CommandItem disabled className="opacity-60">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              ESC
            </kbd>
            <span className="ml-2">Close</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default SymbolSearchDialog;
