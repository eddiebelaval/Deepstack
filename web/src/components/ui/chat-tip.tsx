'use client';

import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatTipProps {
  /** Example phrase user can say in chat */
  example: string;
  /** Optional additional examples */
  moreExamples?: string[];
  /** Optional className for styling */
  className?: string;
}

/**
 * ChatTip - A subtle hint showing users they can use chat for this feature
 *
 * Displays a small, elegant tip with an example phrase users can say in chat.
 * Designed to be unobtrusive but discoverable.
 */
export function ChatTip({ example, moreExamples, className }: ChatTipProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-[11px] text-muted-foreground/60',
        'hover:text-muted-foreground/80 transition-colors',
        className
      )}
    >
      <MessageSquare className="h-3 w-3 shrink-0" />
      <span>
        Try in chat:{' '}
        <span className="text-muted-foreground/80 italic">&ldquo;{example}&rdquo;</span>
        {moreExamples && moreExamples.length > 0 && (
          <span className="text-muted-foreground/50"> +{moreExamples.length} more</span>
        )}
      </span>
    </div>
  );
}
