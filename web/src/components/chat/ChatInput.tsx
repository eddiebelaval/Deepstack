"use client"

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DotScrollIndicator } from '@/components/ui/DotScrollIndicator';
import { Send, Loader2, Brain, LogIn } from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { PersonaFolderTab } from './PersonaFolderTab';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { CommandPalette } from './CommandPalette';
import { cn } from '@/lib/utils';
import { FirewallStatusDot, useFirewallGlow } from '@/components/emotional-firewall';

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isStreaming, activeProvider, setActiveProvider, useExtendedThinking, setUseExtendedThinking } = useChatStore();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isMobile } = useIsMobile();
  const { glowClass } = useFirewallGlow();

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
    <div ref={containerRef} className={cn(
      "glass-input relative",
      isMobile ? "p-3" : "p-4",
      // Tab sticks out above - add class for bridge pseudo-element
      !isMobile && "glass-input-with-tab"
    )}>
      {/* Lifted Folder Tab - sticks out above the pill container */}
      {!isMobile && <PersonaFolderTab disabled={isStreaming} />}

      <div className={cn("flex items-end", isMobile ? "gap-2" : "gap-3")}>
        {/* Hide provider selector on mobile to save space */}
        {!isMobile && (
          <ProviderSelector
            value={activeProvider}
            onChange={setActiveProvider}
            disabled={isStreaming}
          />
        )}

        {/* Hide extended thinking button on mobile */}
        {!isMobile && (
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
        )}

        <div className={cn("flex-1 relative rounded-xl transition-shadow duration-500", glowClass)}>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Ask anything..." : "Message DeepStack..."}
            disabled={disabled || isStreaming}
            inputMode="text"
            enterKeyHint="send"
            className={cn(
              "resize-none rounded-xl bg-primary/8 border border-primary/20 pr-8 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground/50 caret-primary scrollbar-hide whitespace-pre-wrap break-all",
              isMobile
                ? "min-h-[40px] max-h-[120px] px-3 py-2 text-base"
                : "min-h-[44px] max-h-[200px] px-4 py-3"
            )}
            rows={1}
          />
          {!isMobile && (
            <DotScrollIndicator
              scrollRef={textareaRef}
              maxDots={5}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            />
          )}
        </div>

        {/* Firewall Status Dot - subtle indicator */}
        {isMobile && (
          <FirewallStatusDot size="sm" className="shrink-0" />
        )}

        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled || isStreaming}
          size="icon"
          className={cn(
            "rounded-xl shrink-0",
            isMobile ? "h-10 w-10" : "h-10 w-10"
          )}
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Simplified footer on mobile */}
      {!isMobile && (
        <div className="text-xs text-muted-foreground/60 text-center mt-3">
          Press Enter to send, Shift+Enter for new line • Shift+Tab for Tools
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
