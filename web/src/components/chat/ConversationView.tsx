'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { DynamicContentZone } from './DynamicContentZone';
import { ScrollArea } from '@/components/ui/scroll-area';

// Simple message type for our use case (matching ChatContainer)
type SimpleMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: Date;
    toolInvocations?: any[];
};

export function ConversationView() {
    const { activeProvider, setIsStreaming } = useChatStore();
    const { setActiveContent, setActiveSymbol } = useUIStore();
    const [messages, setMessages] = useState<SimpleMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Basic intent detection (mocking the AI "parsing" for now)
    const detectIntent = (content: string) => {
        const lower = content.toLowerCase();
        if (lower.includes('chart') || lower.includes('spy') || lower.includes('aapl')) {
            setActiveContent('chart');
            if (lower.includes('spy')) setActiveSymbol('SPY');
            if (lower.includes('aapl')) setActiveSymbol('AAPL');
        } else if (lower.includes('portfolio') || lower.includes('positions')) {
            setActiveContent('portfolio');
        } else if (lower.includes('buy') || lower.includes('sell') || lower.includes('order')) {
            setActiveContent('orders');
        }
        // If no specific intent, maybe keep current or switch to none?
        // Spec says: "Context switch behavior: Clear current content, render new content."
        // But also "What happened yesterday? -> Summary view / no content change"
        // For now, let's leave it as is if no match, or maybe 'none' if explicitly asked to clear.
    };

    const handleSend = useCallback(async (content: string) => {
        // Detect intent immediately for snappy feel
        detectIntent(content);

        // Add user message
        const userMessage: SimpleMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            createdAt: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setIsStreaming(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    provider: activeProvider,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            const assistantId = crypto.randomUUID();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    assistantContent += chunk;

                    // Update the assistant message
                    setMessages(prev => {
                        const existing = prev.find(m => m.id === assistantId);
                        if (existing) {
                            return prev.map(m =>
                                m.id === assistantId
                                    ? { ...m, content: assistantContent }
                                    : m
                            );
                        } else {
                            return [...prev, {
                                id: assistantId,
                                role: 'assistant' as const,
                                content: assistantContent,
                                createdAt: new Date(),
                            }];
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your message. Please try again.',
                createdAt: new Date(),
            }]);
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    }, [messages, activeProvider, setIsStreaming, setActiveContent, setActiveSymbol]);

    return (
        <div className="flex flex-col h-full">
            {/* Dynamic Content Zone - Top */}
            <div className="flex-shrink-0 border-b bg-muted/10">
                <DynamicContentZone />
            </div>

            {/* Conversation Zone - Middle (Scrollable) */}
            <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto">
                    <MessageList messages={messages as any} isStreaming={isLoading} />
                </div>
            </ScrollArea>

            {/* Input Bar - Bottom (Fixed) */}
            <InputBar onSend={handleSend} isLoading={isLoading} />
        </div>
    );
}
