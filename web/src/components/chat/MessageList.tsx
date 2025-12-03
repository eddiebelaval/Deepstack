"use client"

import { useEffect, useRef } from 'react';
type Message = any; // import { Message } from '@ai-sdk/react';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BarChart3, Briefcase, LineChart, Newspaper } from 'lucide-react';

type MessageListProps = {
  messages: Message[];
  isStreaming?: boolean;
};

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-6">
        <div className="max-w-md space-y-3">
          <span className="text-3xl font-mono font-bold text-primary tracking-tight">
            DEEPSTACK
          </span>
          <p className="text-sm text-muted-foreground">
            What would you like to analyze?
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <div className="p-2.5 bg-muted rounded-lg flex items-center gap-2 hover:bg-secondary/50 transition-colors cursor-pointer group">
              <div className="p-1.5 rounded-md bg-primary/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-xs">Analyze</div>
                <div className="text-xs text-muted-foreground">&quot;Analyze AAPL&quot;</div>
              </div>
            </div>
            <div className="p-2.5 bg-muted rounded-lg flex items-center gap-2 hover:bg-secondary/50 transition-colors cursor-pointer group">
              <div className="p-1.5 rounded-md bg-primary/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-xs">Portfolio</div>
                <div className="text-xs text-muted-foreground">&quot;Show positions&quot;</div>
              </div>
            </div>
            <div className="p-2.5 bg-muted rounded-lg flex items-center gap-2 hover:bg-secondary/50 transition-colors cursor-pointer group">
              <div className="p-1.5 rounded-md bg-primary/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <LineChart className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-xs">Charts</div>
                <div className="text-xs text-muted-foreground">&quot;Chart NVDA&quot;</div>
              </div>
            </div>
            <div className="p-2.5 bg-muted rounded-lg flex items-center gap-2 hover:bg-secondary/50 transition-colors cursor-pointer group">
              <div className="p-1.5 rounded-md bg-primary/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Newspaper className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-xs">News</div>
                <div className="text-xs text-muted-foreground">&quot;Latest news&quot;</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-3">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
