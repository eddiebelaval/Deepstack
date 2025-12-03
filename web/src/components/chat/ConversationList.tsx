"use client"

import { useRef } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ConversationList() {
  const { conversations, currentConversationId, setCurrentConversation, addConversation, removeConversation } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNewConversation = () => {
    const newConv = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      provider: 'claude' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addConversation(newConv);
    setCurrentConversation(newConv.id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      removeConversation(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Button
          onClick={handleNewConversation}
          className="w-full"
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full" viewportRef={scrollRef} hideScrollbar>
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-4">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv.id)}
                  className={`
                    group flex items-center gap-2 p-3 rounded-lg cursor-pointer
                    hover:bg-muted transition-colors
                    ${currentConversationId === conv.id ? 'bg-muted' : ''}
                  `}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {conv.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(conv.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
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
