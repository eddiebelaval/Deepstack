"use client"

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Brain, LogIn } from 'lucide-react';
import { PersonaSelector } from './PersonaSelector';
import { ModelSelector } from './ModelSelector';
import { OverflowMenu } from './OverflowMenu';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { CommandPalette } from './CommandPalette';
import { cn } from '@/lib/utils';
import { FirewallStatusDot } from '@/components/emotional-firewall';

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isStreaming, useExtendedThinking, setUseExtendedThinking } = useChatStore();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isMobile } = useIsMobile();

  const handleCommand = useCallback(async (command: string) => {
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

      if (process.env.NODE_ENV === 'development') {
        console.log('Command result:', data);
      }

      // TODO: Display result in chat or a toast
      if (data.status === 'success') {
        // For now, just append to chat input as a system message confirmation
        // In a real app, we'd add a message to the chat store
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }, []);

  const handleSubmit = () => {
    if (!input.trim() || disabled || isStreaming) return;
    onSend(input.trim());
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Shift+Tab opens command palette
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  };

  // Auto-resize textarea (only when there's content to prevent extra height when empty)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Only expand beyond single line when there's actual content
      if (input) {
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  }, [input]);

  // iOS virtual keyboard handling - scroll input into view
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const handleResize = () => {
      // When virtual keyboard opens, visualViewport height decreases
      if (document.activeElement === textareaRef.current) {
        // Scroll the input container into view
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };

    // Use visualViewport API for more accurate keyboard detection
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  return (
    <div ref={containerRef} className={cn("relative", isMobile ? "p-3" : "p-4")}>
      {/* Single unified pill container */}
      <div
        className={cn(
          // Base pill styling
          "flex items-end gap-1 rounded-2xl",
          "bg-background/80 backdrop-blur-sm",
          "border border-border/50",
          "transition-all duration-300",
          // Padding
          isMobile ? "p-2" : "p-2.5"
        )}
      >
        {/* LEFT SECTION: Tool icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Overflow menu (+) */}
          <OverflowMenu
            onOpenCommandPalette={() => setShowCommandPalette(true)}
            disabled={isStreaming}
          />

          {/* Persona selector */}
          <PersonaSelector disabled={isStreaming} />

          {/* Extended thinking toggle - desktop only */}
          {!isMobile && (
            <Button
              onClick={() => setUseExtendedThinking(!useExtendedThinking)}
              variant="ghost"
              size="icon"
              className={cn(
                "h-11 w-11 rounded-xl relative shrink-0",
                useExtendedThinking && "bg-purple-500/10 text-purple-500"
              )}
              title={useExtendedThinking ? 'Extended thinking enabled' : 'Extended thinking disabled'}
              disabled={isStreaming}
            >
              <Brain className="h-4 w-4" />
              {useExtendedThinking && (
                <div className="absolute top-1 right-1 h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
              )}
            </Button>
          )}
        </div>

        {/* CENTER SECTION: Expanding textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Ask anything..." : "Message DeepStack..."}
            disabled={disabled || isStreaming}
            inputMode="text"
            enterKeyHint="send"
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent",
              "border-0 outline-none focus:ring-0",
              "text-foreground placeholder:text-muted-foreground/50",
              "scrollbar-hide whitespace-pre-wrap break-words leading-6",
              isMobile
                ? "min-h-[36px] max-h-[120px] py-2 text-base"
                : "min-h-[44px] max-h-[200px] py-2.5 text-sm"
            )}
          />
        </div>

        {/* RIGHT SECTION: Model selector + Send button */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Model selector */}
          <ModelSelector disabled={isStreaming} />

          {/* Send button */}
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled || isStreaming}
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Footer hint with status dot - desktop only */}
      {!isMobile && (
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-muted-foreground/40">
            Enter to send • Shift+Enter for new line • Shift+Tab for commands
          </span>
          <FirewallStatusDot size="sm" />
        </div>
      )}

      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        onCommand={handleCommand}
      />

      {/* Guest Gate Overlay */}
      {!user && !loading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-2xl glass-surface border border-primary/20">
          <Button
            onClick={() => router.push('/login')}
            className="shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign in to Chat
          </Button>
        </div>
      )}
    </div>
  );
}
