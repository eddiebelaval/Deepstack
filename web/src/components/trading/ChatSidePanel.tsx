"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useTradingStore } from "@/lib/stores/trading-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ProviderSelector } from "@/components/chat/ProviderSelector";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LLMProvider } from "@/lib/llm/providers";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export function ChatSidePanel() {
  const { activeProvider, setActiveProvider, setIsStreaming } = useChatStore();
  const { activeSymbol, toggleChatPanel } = useTradingStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          provider: activeProvider,
          context: {
            activeSymbol,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = crypto.randomUUID();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantContent += chunk;

          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantId);
            if (existing) {
              return prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: assistantContent }
                  : m
              );
            } else {
              return [
                ...prev,
                {
                  id: assistantId,
                  role: "assistant" as const,
                  content: assistantContent,
                  createdAt: new Date(),
                },
              ];
            }
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, there was an error. Please try again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [input, messages, activeProvider, activeSymbol, isLoading, setIsStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick prompts based on context
  const quickPrompts = [
    `Analyze ${activeSymbol} price action`,
    `What's the technical outlook for ${activeSymbol}?`,
    `Should I buy ${activeSymbol} at this price?`,
    `What are the key support/resistance levels?`,
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <ProviderSelector
            value={activeProvider}
            onChange={(provider: LLMProvider) => setActiveProvider(provider)}
          />
          <Button variant="ghost" size="icon" onClick={toggleChatPanel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">AI Trading Assistant</p>
              <p className="text-sm">
                Ask about {activeSymbol} or any trading question
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-1">Quick actions:</p>
              {quickPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => {
                    setInput(prompt);
                  }}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                  {isLoading &&
                    message.role === "assistant" &&
                    message.id === messages[messages.length - 1]?.id && (
                      <span className="inline-block w-1 h-4 ml-0.5 bg-foreground animate-pulse" />
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${activeSymbol}...`}
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
