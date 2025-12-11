"use client";

import { useEffect, useCallback, useMemo } from "react";
import { create } from "zustand";
import { useTradingStore } from "@/lib/stores/trading-store";

type ShortcutHandler = () => void;

type ShortcutConfig = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
};

// Store for search/command palette state
interface SearchPaletteState {
  isSearchOpen: boolean;
  searchQuery: string;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
}

export const useSearchPaletteStore = create<SearchPaletteState>((set) => ({
  isSearchOpen: false,
  searchQuery: "",
  setSearchOpen: (open) => set({ isSearchOpen: open, searchQuery: open ? "" : "" }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSearch: () => set((state) => ({
    isSearchOpen: !state.isSearchOpen,
    searchQuery: "",
  })),
}));

// Global keyboard shortcuts for the trading platform
export function useKeyboardShortcuts() {
  const {
    toggleWatchlist,
    toggleOrderPanel,
    toggleChatPanel,
    setTimeframe,
    setChartType,
  } = useTradingStore();
  const { toggleSearch, setSearchOpen } = useSearchPaletteStore();

  // Memoize shortcuts array to prevent re-creating on every render
  const shortcuts: ShortcutConfig[] = useMemo(() => [
    // Search / Command Palette
    {
      key: "k",
      meta: true,
      handler: toggleSearch,
      description: "Open symbol search",
    },
    {
      key: "k",
      ctrl: true,
      handler: toggleSearch,
      description: "Open symbol search (Windows/Linux)",
    },
    {
      key: "Escape",
      handler: () => setSearchOpen(false),
      description: "Close search",
    },
    // Panel toggles
    {
      key: "j",
      meta: true,
      handler: toggleChatPanel,
      description: "Toggle AI chat panel",
    },
    {
      key: "j",
      ctrl: true,
      handler: toggleChatPanel,
      description: "Toggle AI chat panel (Windows/Linux)",
    },
    {
      key: "w",
      meta: true,
      shift: true,
      handler: toggleWatchlist,
      description: "Toggle watchlist",
    },
    {
      key: "o",
      meta: true,
      shift: true,
      handler: toggleOrderPanel,
      description: "Toggle order panel",
    },

    // Timeframe shortcuts (1-7)
    {
      key: "1",
      handler: () => setTimeframe("1m"),
      description: "1 minute timeframe",
    },
    {
      key: "2",
      handler: () => setTimeframe("5m"),
      description: "5 minute timeframe",
    },
    {
      key: "3",
      handler: () => setTimeframe("15m"),
      description: "15 minute timeframe",
    },
    {
      key: "4",
      handler: () => setTimeframe("1h"),
      description: "1 hour timeframe",
    },
    {
      key: "5",
      handler: () => setTimeframe("4h"),
      description: "4 hour timeframe",
    },
    {
      key: "6",
      handler: () => setTimeframe("1d"),
      description: "1 day timeframe",
    },
    {
      key: "7",
      handler: () => setTimeframe("1w"),
      description: "1 week timeframe",
    },

    // Chart type shortcuts
    {
      key: "c",
      handler: () => setChartType("candlestick"),
      description: "Candlestick chart",
    },
    {
      key: "l",
      handler: () => setChartType("line"),
      description: "Line chart",
    },
    {
      key: "a",
      handler: () => setChartType("area"),
      description: "Area chart",
    },
  ], [toggleSearch, setSearchOpen, toggleChatPanel, toggleWatchlist, toggleOrderPanel, setTimeframe, setChartType]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except Escape and Cmd+K)
      const target = event.target as HTMLElement;
      const isInInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInInput && event.key !== "Escape" && !(event.key === "k" && (event.metaKey || event.ctrlKey))) {
        return;
      }

      for (const shortcut of shortcuts) {
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        // Handle both meta and ctrl for cross-platform support
        const modifiersMatch =
          (shortcut.meta || shortcut.ctrl
            ? (shortcut.meta && event.metaKey) || (shortcut.ctrl && event.ctrlKey)
            : !event.metaKey && !event.ctrlKey) &&
          shiftMatch &&
          altMatch;

        if (event.key.toLowerCase() === shortcut.key.toLowerCase() && modifiersMatch) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

// Hook for individual components to register their own shortcuts
export function useShortcut(
  key: string,
  handler: ShortcutHandler,
  options: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const metaMatch = options.meta ? event.metaKey : true;
      const ctrlMatch = options.ctrl ? event.ctrlKey : true;
      const shiftMatch = options.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = options.alt ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        metaMatch &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault();
        handler();
      }
    },
    [key, handler, options]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
