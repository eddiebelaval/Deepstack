'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { useChatStore } from '@/lib/stores/chat-store';
import { useNewsStore } from '@/lib/stores/news-store';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils/format-time';
import {
  MessageSquare,
  Plus,
  Clock,
  Newspaper,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Search,
  Settings,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Eye,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '@/lib/stores/ui-store';
import { FloatingToolbar } from './FloatingToolbar';
import { usePredictionMarkets, type FeedType } from '@/hooks/usePredictionMarkets';
import { BetsCarouselCard } from '@/components/prediction-markets/BetsCarouselCard';
import { PlatformBadge } from '@/components/prediction-markets/PlatformBadge';
import { ProbabilityBar } from '@/components/prediction-markets/ProbabilityBar';
import type { PredictionMarket } from '@/lib/types/prediction-markets';
import { MobileMarketWatcher } from '@/components/mobile/MobileMarketWatcher';

// ============================================================
// Chat History Page (swipe index 0)
// ============================================================

interface ChatHistoryPageProps {
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export function ChatHistoryPage({ onSelectConversation, onNewChat }: ChatHistoryPageProps) {
  const { conversations, currentConversationId, setCurrentConversation } = useChatStore();
  const { toggleSettings } = useUIStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNewChat = () => {
    setCurrentConversation(null);
    onNewChat?.();
  };

  const handleForward = () => {
    // Navigate to chat page (swipe right effect)
    (window as any).__mobileSwipeNav?.navigateTo(1);
  };

  const handleConversationClick = (id: string) => {
    setCurrentConversation(id);
    onSelectConversation?.(id);
  };

  // Group conversations by date
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groupedConversations = {
    today: conversations.filter(c => c.created_at && new Date(c.created_at) >= todayStart),
    yesterday: conversations.filter(c => c.created_at && new Date(c.created_at) >= yesterdayStart && new Date(c.created_at) < todayStart),
    thisWeek: conversations.filter(c => c.created_at && new Date(c.created_at) >= weekStart && new Date(c.created_at) < yesterdayStart),
    older: conversations.filter(c => !c.created_at || new Date(c.created_at) < weekStart),
  };

  const renderGroup = (title: string, convs: typeof conversations) => {
    if (convs.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
          {title}
        </h3>
        <div className="space-y-1">
          {convs.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleConversationClick(conv.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all tap-target",
                "hover:bg-muted/50 active:scale-[0.98]",
                currentConversationId === conv.id && "bg-primary/10 border border-primary/20"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                currentConversationId === conv.id ? "bg-primary/20" : "bg-muted/50"
              )}>
                <MessageSquare className={cn(
                  "h-4 w-4",
                  currentConversationId === conv.id ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {conv.title || "Untitled Chat"}
                </p>
                {conv.created_at && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(conv.created_at)}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Top Header Bar */}
      <div className="flex-shrink-0 px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          {/* Settings Button - Left */}
          <button
            onClick={toggleSettings}
            className="p-2 -ml-2 rounded-xl hover:bg-muted/50 transition-colors tap-target"
            aria-label="Settings"
          >
            <Settings className="h-6 w-6 text-muted-foreground" />
          </button>

          {/* Title - Center */}
          <h1 className="text-lg font-semibold">Threads</h1>

          {/* Right Actions: New Chat + Forward */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="p-2 rounded-xl hover:bg-muted/50 transition-colors tap-target"
              aria-label="New Chat"
            >
              <Plus className="h-6 w-6 text-primary" />
            </button>
            <button
              onClick={handleForward}
              className="p-2 -mr-2 rounded-xl hover:bg-muted/50 transition-colors tap-target"
              aria-label="Go to Chat"
            >
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search threads..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full px-4" viewportRef={scrollRef}>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tap + to start a new chat</p>
            </div>
          ) : (
            <>
              {renderGroup("Today", groupedConversations.today)}
              {renderGroup("Yesterday", groupedConversations.yesterday)}
              {renderGroup("This Week", groupedConversations.thisWeek)}
              {renderGroup("Older", groupedConversations.older)}
            </>
          )}
          {/* Bottom padding for floating toolbar */}
          <div className="h-24" />
        </ScrollArea>
        <DotScrollIndicator
          scrollRef={scrollRef}
          maxDots={5}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        />
      </div>

      {/* Floating Toolbar - only on Threads page */}
      <FloatingToolbar />
    </div>
  );
}

// ============================================================
// Chat Page Wrapper (swipe index 1 - HOME)
// ============================================================

interface ChatPageProps {
  children: React.ReactNode;
}

export function ChatPage({ children }: ChatPageProps) {
  return (
    <div className="h-full w-full flex flex-col">
      {/* Mobile Market Watcher - Pull-down panel */}
      <MobileMarketWatcher />

      {/* Main chat content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ============================================================
// Discover Page (swipe index 2 - News/Discover)
// ============================================================

export function DiscoverPage() {
  const {
    articles,
    isLoading,
    error,
    filterSymbol,
    fetchNews,
    clearFilter,
  } = useNewsStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch news on mount
  React.useEffect(() => {
    if (articles.length === 0) {
      fetchNews(undefined, true);
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-8 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Discover</h1>
        </div>
        <p className="text-sm text-muted-foreground">Market news & insights</p>
      </div>

      {/* Category Pills */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['For You', 'Top Stories', 'Tech', 'Finance', 'Crypto'].map((cat, i) => (
            <button
              key={cat}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filter indicator */}
      {filterSymbol && (
        <div className="px-4 pb-2">
          <button
            onClick={clearFilter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
          >
            Filtered: {filterSymbol}
            <span className="text-primary/70">×</span>
          </button>
        </div>
      )}

      {/* News Feed */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-4" viewportRef={scrollRef}>
          {isLoading && articles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Newspaper className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No news found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// Simple news card for discover page
function NewsCard({ article }: { article: any }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors"
    >
      <div className="flex gap-3">
        {article.imageUrl && (
          <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
            <img src={article.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">
            {article.headline}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {article.summary}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{article.source}</span>
            <span>•</span>
            <span>{formatTimeAgo(article.publishedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ============================================================
// Prediction Markets Page (swipe index 3)
// ============================================================

export function PredictionMarketsPage() {
  const {
    markets,
    isLoading,
    isLoadingMore,
    error,
    isUnavailable,
    feedType,
    hasMore,
    loadMarkets,
    loadMoreMarkets,
    setFeedType,
    toggleWatchlist,
    isInWatchlist,
  } = usePredictionMarkets();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedMarket, setSelectedMarket] = React.useState<PredictionMarket | null>(null);

  // Load markets on mount
  React.useEffect(() => {
    if (markets.length === 0) {
      loadMarkets('trending');
    }
  }, []);

  const handleFeedChange = (feed: FeedType) => {
    setFeedType(feed);
    loadMarkets(feed);
  };

  const handleRefresh = () => {
    loadMarkets(feedType);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Predictions</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors tap-target"
            aria-label="Refresh markets"
          >
            <RefreshCw className={cn("h-5 w-5 text-muted-foreground", isLoading && "animate-spin")} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {isUnavailable ? 'Service temporarily unavailable' : 'Kalshi & Polymarket trends'}
        </p>
      </div>

      {/* Feed Type Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleFeedChange('trending')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              feedType === 'trending'
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Trending
          </button>
          <button
            onClick={() => handleFeedChange('new')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              feedType === 'new'
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Sparkles className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

      {/* Markets List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-4" viewportRef={scrollRef}>
          {isLoading && markets.length === 0 ? (
            // Loading state
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading markets...</span>
              </div>
            </div>
          ) : error ? (
            // Error state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-xl bg-muted/50 text-sm font-medium hover:bg-muted transition-colors"
              >
                Retry
              </button>
            </div>
          ) : markets.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No markets found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Pull to refresh or check back later
              </p>
            </div>
          ) : (
            // Markets grid
            <div className="space-y-3 pb-6">
              {markets.map((market) => (
                <MobileMarketCard
                  key={`${market.platform}-${market.id}`}
                  market={market}
                  isWatched={isInWatchlist(market.platform, market.id)}
                  onToggleWatch={() => toggleWatchlist(market)}
                  onClick={() => setSelectedMarket(market)}
                />
              ))}

              {/* Load more indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!hasMore && markets.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  All markets loaded ({markets.length} total)
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Market Detail Sheet */}
      {selectedMarket && (
        <MarketDetailSheet
          market={selectedMarket}
          isWatched={isInWatchlist(selectedMarket.platform, selectedMarket.id)}
          onToggleWatch={() => toggleWatchlist(selectedMarket)}
          onClose={() => setSelectedMarket(null)}
        />
      )}
    </div>
  );
}

// Mobile-optimized market card
function MobileMarketCard({
  market,
  isWatched,
  onToggleWatch,
  onClick,
}: {
  market: PredictionMarket;
  isWatched: boolean;
  onToggleWatch: () => void;
  onClick: () => void;
}) {
  const probability = Math.round(market.yesPrice * 100);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all active:scale-[0.98] tap-target"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PlatformBadge platform={market.platform} />
            {market.category && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {market.category}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {market.title}
          </h3>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={cn(
            "text-2xl font-bold",
            probability >= 70 ? "text-green-500" :
              probability <= 30 ? "text-red-500" : "text-amber-500"
          )}>
            {probability}%
          </div>
          <span className="text-[10px] text-muted-foreground">YES</span>
        </div>
      </div>

      <ProbabilityBar yesPrice={market.yesPrice} compact />

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>${formatVolume(market.volume)} vol</span>
        {market.endDate && (
          <span>Ends {new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
    </button>
  );
}

// Market detail bottom sheet - uses portal to escape transform containment
function MarketDetailSheet({
  market,
  isWatched,
  onToggleWatch,
  onClose,
}: {
  market: PredictionMarket;
  isWatched: boolean;
  onToggleWatch: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const probability = Math.round(market.yesPrice * 100);

  // Need to wait for client-side mount for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[80vh] overflow-auto safe-area-bottom">
        {/* Handle */}
        <div className="sticky top-0 bg-card pt-3 pb-2 px-4">
          <div className="w-12 h-1.5 rounded-full bg-muted mx-auto" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <PlatformBadge platform={market.platform} />
            {market.category && (
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                {market.category}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold leading-tight">{market.title}</h2>

          {/* Probability display */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={cn(
                "text-4xl font-bold",
                probability >= 70 ? "text-green-500" :
                  probability <= 30 ? "text-red-500" : "text-amber-500"
              )}>
                {probability}%
              </div>
              <span className="text-sm text-muted-foreground">YES</span>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-muted-foreground">
                {100 - probability}%
              </div>
              <span className="text-sm text-muted-foreground">NO</span>
            </div>
          </div>

          <ProbabilityBar yesPrice={market.yesPrice} />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">Total Volume</div>
              <div className="font-semibold">${formatVolume(market.volume)}</div>
            </div>
            {market.volume24h && (
              <div className="bg-muted/50 rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">24h Volume</div>
                <div className="font-semibold">${formatVolume(market.volume24h)}</div>
              </div>
            )}
            {market.endDate && (
              <div className="bg-muted/50 rounded-xl p-3 col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Ends</div>
                <div className="font-semibold">
                  {new Date(market.endDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {market.description && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{market.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => window.open(market.url, '_blank')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Trade on {market.platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatch();
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium border transition-colors",
                isWatched
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/50 border-border text-foreground"
              )}
            >
              <Eye className="h-4 w-4" />
              {isWatched ? 'Watching' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Volume formatter helper
function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}
