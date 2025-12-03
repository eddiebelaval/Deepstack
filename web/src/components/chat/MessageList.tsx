"use client"

import { useEffect, useRef } from 'react';
type Message = any; // import { Message } from '@ai-sdk/react';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

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
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="max-w-md space-y-4">
          <div className="text-4xl mb-4">💹</div>
          <h2 className="text-2xl font-bold">Welcome to DeepStack AI</h2>
          <p className="text-muted-foreground">
            Your AI-powered trading assistant. Ask me to analyze stocks, check your portfolio, or help you make informed trading decisions.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-6 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">📊 Analyze</div>
              <div className="text-xs text-muted-foreground">
                &quot;Analyze AAPL&quot;
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">💼 Portfolio</div>
              <div className="text-xs text-muted-foreground">
                &quot;Show my positions&quot;
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">📈 Charts</div>
              <div className="text-xs text-muted-foreground">
                &quot;Chart NVDA 1 hour&quot;
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">📰 News</div>
              <div className="text-xs text-muted-foreground">
                &quot;Latest tech news&quot;
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="max-w-4xl mx-auto py-6">
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
