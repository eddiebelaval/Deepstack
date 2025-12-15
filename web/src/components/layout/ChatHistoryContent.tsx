'use client';

import React, { useRef, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { useChatStore } from '@/lib/stores/chat-store';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils/format-time';
import {
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';

/**
 * ChatHistoryContent Component
 *
 * Reusable component that displays the chat history list with search and grouping.
 * Extracted from ChatHistoryPage for use in Tools Hub and other contexts.
 *
 * Features:
 * - Date-grouped conversation list (Today, Yesterday, This Week, Older)
 * - Search bar for filtering threads
 * - Empty state when no conversations exist
 * - Active conversation highlighting
 * - Smooth scroll with dot indicators
 *
 * Usage:
 * ```tsx
 * <ChatHistoryContent
 *   onSelectConversation={(id) => navigate(id)}
 *   onNewChat={() => createNewChat()}
 *   className="my-custom-class"
 * />
 * ```
 */

interface ChatHistoryContentProps {
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
  className?: string;
}

export function ChatHistoryContent({
  onSelectConversation,
  onNewChat,
  className
}: ChatHistoryContentProps) {
  const { conversations, currentConversationId, setCurrentConversation } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleConversationClick = (id: string) => {
    setCurrentConversation(id);
    onSelectConversation?.(id);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(conv => {
      const title = (conv.title || 'Untitled Chat').toLowerCase();
      return title.includes(query);
    });
  }, [conversations, searchQuery]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      today: filteredConversations.filter(c => c.created_at && new Date(c.created_at) >= todayStart),
      yesterday: filteredConversations.filter(c => c.created_at && new Date(c.created_at) >= yesterdayStart && new Date(c.created_at) < todayStart),
      thisWeek: filteredConversations.filter(c => c.created_at && new Date(c.created_at) >= weekStart && new Date(c.created_at) < yesterdayStart),
      older: filteredConversations.filter(c => !c.created_at || new Date(c.created_at) < weekStart),
    };
  }, [filteredConversations]);

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
    <div className={cn("h-full flex flex-col", className)}>
      {/* Search Bar */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads..."
            className="w-full h-10 pl-10 pr-10 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search conversations"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full px-4" viewportRef={scrollRef}>
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              {searchQuery ? (
                <>
                  <p className="text-muted-foreground">No matches found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Tap + to start a new chat</p>
                </>
              )}
            </div>
          ) : (
            <>
              {renderGroup("Today", groupedConversations.today)}
              {renderGroup("Yesterday", groupedConversations.yesterday)}
              {renderGroup("This Week", groupedConversations.thisWeek)}
              {renderGroup("Older", groupedConversations.older)}
            </>
          )}
          {/* Bottom padding for floating elements */}
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
