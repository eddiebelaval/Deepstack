'use client';

import React, { useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { useChatStore } from '@/lib/stores/chat-store';
import { useNewsStore } from '@/lib/stores/news-store';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Plus,
  Clock,
  Newspaper,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Search,
} from 'lucide-react';

// ============================================================
// Chat History Page (swipe index 0)
// ============================================================

interface ChatHistoryPageProps {
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export function ChatHistoryPage({ onSelectConversation, onNewChat }: ChatHistoryPageProps) {
  const { conversations, currentConversationId, setCurrentConversation } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNewChat = () => {
    setCurrentConversation(null);
    onNewChat?.();
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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold mb-1">Threads</h1>
        <p className="text-sm text-muted-foreground">Your conversation history</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search threads..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 pb-4">
        <Button
          onClick={handleNewChat}
          className="w-full h-12 rounded-xl gap-2 text-base"
        >
          <Plus className="h-5 w-5" />
          New Chat
        </Button>
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
              <p className="text-xs text-muted-foreground/70 mt-1">Start a new chat to begin</p>
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
    <div className="h-full w-full">
      {children}
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
          {/* Bottom padding for floating toolbar */}
          <div className="h-24" />
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
// Markets Page (swipe index 3 - Prediction Markets)
// ============================================================

export function MarketsPage() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-8 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Markets</h1>
        </div>
        <p className="text-sm text-muted-foreground">Prediction markets & trends</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Trending
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors">
            <Sparkles className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

      {/* Markets List - placeholder for now */}
      <div className="flex-1 min-h-0 px-4">
        <ScrollArea className="h-full">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Coming soon</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Swipe to explore prediction markets
            </p>
          </div>
          {/* Bottom padding for floating toolbar */}
          <div className="h-24" />
        </ScrollArea>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}
