"use client"

import { useEffect, useRef, useMemo } from 'react';
type Message = any; // import { Message } from '@ai-sdk/react';
import { MessageBubble } from './MessageBubble';
import { Loader2, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { detectContextualPrompts } from './ContextualPromptCard';

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

  // Check if the last message has tool invocations in progress
  const lastMessage = messages[messages.length - 1];
  const hasActiveTools = lastMessage?.toolInvocations?.some(
    (t: any) => t.state === 'call' || t.state === 'partial-call'
  );

  // Determine streaming status message
  const getStreamingMessage = () => {
    if (hasActiveTools) {
      return 'Executing tools...';
    }
    return 'Thinking...';
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-6">
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState subtitle="What would you like to analyze?" size="md" />
        </div>
      </div>
    );
  }

  // Count contextual prompts shown so far (to limit per conversation)
  const promptCountByIndex = useMemo(() => {
    let count = 0;
    return messages.map((msg, idx) => {
      const prevCount = count;
      if (msg.role === 'assistant') {
        const prompts = detectContextualPrompts(msg.content || '', idx, prevCount);
        count += prompts.length;
      }
      return prevCount;
    });
  }, [messages]);

  return (
    <div className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            messageIndex={index}
            conversationPromptCount={promptCountByIndex[index]}
          />
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground mb-6 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="relative">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <Sparkles className="h-2 w-2 absolute -top-0.5 -right-0.5 text-primary animate-pulse" />
            </div>
            <span className="text-sm font-medium">{getStreamingMessage()}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
