"use client"

type Message = any; // import { Message } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolUseCard } from './ToolUseCard';

type MessageBubbleProps = {
  message: Message;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="message-user">
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="message-assistant">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Tool calls */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mt-4 space-y-2">
            {message.toolInvocations.map((tool: any, idx: number) => (
              <ToolUseCard key={idx} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
