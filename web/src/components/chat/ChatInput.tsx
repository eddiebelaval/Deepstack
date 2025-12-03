"use client"

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { useChatStore } from '@/lib/stores/chat-store';

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, activeProvider, setActiveProvider } = useChatStore();

  const handleSubmit = () => {
    if (!input.trim() || disabled || isStreaming) return;
    onSend(input.trim());
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="glass-input p-4">
      <div className="flex items-end gap-3">
        <ProviderSelector
          value={activeProvider}
          onChange={setActiveProvider}
          disabled={isStreaming}
        />

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about stocks, analyze positions, or place trades..."
            disabled={disabled || isStreaming}
            className="min-h-[44px] max-h-[200px] resize-none rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/60"
            rows={1}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled || isStreaming}
          size="icon"
          className="h-10 w-10 rounded-xl"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground/60 text-center mt-3">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
