"use client";

import { useState, useRef } from "react";
import { useWatchlistSync } from "@/hooks/useWatchlistSync";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DotScrollIndicator } from "@/components/ui/DotScrollIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Loader2,
  Cloud,
  CloudOff,
  Settings,
  StickyNote,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WatchlistManagementDialog } from "./WatchlistManagementDialog";
import { SymbolSearchDialog } from "./SymbolSearchDialog";
import { SymbolNoteDialog } from "./SymbolNoteDialog";

export function WatchlistPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [noteSymbol, setNoteSymbol] = useState<string | null>(null);

  const {
    watchlists,
    activeWatchlistId,
    setActiveWatchlist,
    removeSymbol,
    getActiveWatchlist,
    isLoading,
    isOnline,
    moveSymbol,
  } = useWatchlistSync();

  const { activeSymbol, setActiveSymbol } = useTradingStore();
  const { quotes } = useMarketDataStore();

  const activeWatchlist = getActiveWatchlist();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && activeWatchlistId) {
      const items = activeWatchlist?.items || [];
      const oldIndex = items.findIndex((item) => item.symbol === active.id);
      const newIndex = items.findIndex((item) => item.symbol === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        moveSymbol(activeWatchlistId, oldIndex, newIndex);
      }
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex-1 justify-between font-semibold"
                >
                  {activeWatchlist?.name || "Watchlist"}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {watchlists.map((wl) => (
                  <DropdownMenuItem
                    key={wl.id}
                    onClick={() => setActiveWatchlist(wl.id)}
                    className={cn(
                      activeWatchlistId === wl.id && "bg-accent"
                    )}
                  >
                    {wl.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {wl.items.length}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowManagement(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Watchlists
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {isOnline ? (
                      <Cloud className="h-3 w-3 text-green-500" />
                    ) : (
                      <CloudOff className="h-3 w-3 text-yellow-500" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {isOnline ? "Synced with cloud" : "Using local storage"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Symbol List */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full" viewportRef={scrollRef} hideScrollbar>
            <div className="p-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={
                    activeWatchlist?.items.map((item) => item.symbol) || []
                  }
                  strategy={verticalListSortingStrategy}
                >
                  {activeWatchlist?.items.map((item) => (
                    <SortableSymbolRow
                      key={item.symbol}
                      item={item}
                      isActive={item.symbol === activeSymbol}
                      quote={quotes[item.symbol]}
                      onSelect={() => setActiveSymbol(item.symbol)}
                      onRemove={() => {
                        if (activeWatchlistId) {
                          removeSymbol(activeWatchlistId, item.symbol);
                        }
                      }}
                      onAddNote={() => setNoteSymbol(item.symbol)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add Symbol Button */}
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground mt-1"
                onClick={() => setShowSearch(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Symbol
              </Button>
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

      {/* Dialogs */}
      <WatchlistManagementDialog
        open={showManagement}
        onOpenChange={setShowManagement}
      />
      <SymbolSearchDialog open={showSearch} onOpenChange={setShowSearch} />
      <SymbolNoteDialog
        open={!!noteSymbol}
        onOpenChange={(open) => !open && setNoteSymbol(null)}
        symbol={noteSymbol}
        watchlistId={activeWatchlistId}
      />
    </>
  );
}

type SortableSymbolRowProps = {
  item: { symbol: string; notes?: string };
  isActive: boolean;
  quote?: any;
  onSelect: () => void;
  onRemove: () => void;
  onAddNote: () => void;
};

function SortableSymbolRow({
  item,
  isActive,
  quote,
  onSelect,
  onRemove,
  onAddNote,
}: SortableSymbolRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.symbol });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const changePercent = quote?.changePercent ?? 0;
  const isPositive = changePercent >= 0;
  const isSignificantChange = Math.abs(changePercent) > 5;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={onSelect}
          className={cn(
            "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
            isActive ? "bg-accent" : "hover:bg-muted",
            isSignificantChange && "ring-1 ring-amber-500/50"
          )}
        >
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm">{item.symbol}</span>
              {item.notes && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <StickyNote className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      <p className="text-xs">{item.notes}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {isSignificantChange && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Significant price movement</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {quote ? `$${quote.last?.toFixed(2) ?? "—"}` : "Loading..."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {quote && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
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
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onSelect}>View Chart</ContextMenuItem>
        <ContextMenuItem onClick={onAddNote}>
          <StickyNote className="h-4 w-4 mr-2" />
          {item.notes ? "Edit Note" : "Add Note"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRemove} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Remove from Watchlist
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
