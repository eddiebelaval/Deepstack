"use client"

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Send, Loader2, Brain } from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { useChatStore } from '@/lib/stores/chat-store';
import { CommandPalette } from './CommandPalette';

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, activeProvider, setActiveProvider, useExtendedThinking, setUseExtendedThinking } = useChatStore();

  const handleCommand = async (command: string) => {
    // Populate input for visual feedback
    setInput(command + " ");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    // Execute command via API
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();
      console.log('Command result:', data);

      // TODO: Display result in chat or a toast
      if (data.status === 'success') {
        // For now, just append to chat input as a system message confirmation
        // In a real app, we'd add a message to the chat store
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  };

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

        <Button
          onClick={() => setUseExtendedThinking(!useExtendedThinking)}
          variant={useExtendedThinking ? 'default' : 'outline'}
          size="icon"
          className="h-10 w-10 rounded-xl relative"
          title={useExtendedThinking ? 'Extended thinking enabled' : 'Extended thinking disabled'}
          disabled={isStreaming}
        >
          <Brain className="h-4 w-4" />
          {useExtendedThinking && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
          )}
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about stocks, analyze positions, or place trades..."
            disabled={disabled || isStreaming}
            className="min-h-[44px] max-h-[200px] resize-none rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 pr-8 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/50 caret-primary shadow-[inset_0_0_12px_rgba(178,120,50,0.15),0_0_8px_rgba(178,120,50,0.1)] scrollbar-hide whitespace-pre-wrap break-all"
            rows={1}
          />
          <DotScrollIndicator
            scrollRef={textareaRef}
            maxDots={5}
            className="absolute right-2 top-1/2 -translate-y-1/2"
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
        Press Enter to send, Shift+Enter for new line • Shift+Tab for Tools
      </div>

      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        onCommand={handleCommand}
      />
    </div>
  );
}
