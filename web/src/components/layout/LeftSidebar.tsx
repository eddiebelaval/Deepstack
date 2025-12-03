'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { MessageSquare, Plus, PanelLeftClose, PanelLeftOpen, History } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function LeftSidebar() {
    const { leftSidebarOpen, toggleLeftSidebar } = useUIStore();
    const { conversations, currentConversationId, setCurrentConversation, addConversation } = useChatStore();

    const handleNewChat = () => {
        // Logic to start a new chat would go here
        // For now, we just clear the current conversation selection
        setCurrentConversation(null);
    };

    return (
        <aside
            className={cn(
                "flex flex-col border-r bg-background transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-30",
                leftSidebarOpen ? "w-64" : "w-16"
            )}
        >
            {/* Header / Toggle */}
            <div className="flex items-center justify-between p-4 h-14 border-b">
                {leftSidebarOpen && <span className="font-semibold truncate">DeepStack</span>}
                <Button variant="ghost" size="icon" onClick={toggleLeftSidebar} className="ml-auto">
                    {leftSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </Button>
            </div>

            {/* New Chat Button */}
            <div className="p-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={leftSidebarOpen ? "default" : "ghost"}
                                className={cn("w-full justify-start", !leftSidebarOpen && "justify-center px-2")}
                                onClick={handleNewChat}
                            >
                                <Plus className="h-4 w-4" />
                                {leftSidebarOpen && <span className="ml-2">New Chat</span>}
                            </Button>
                        </TooltipTrigger>
                        {!leftSidebarOpen && <TooltipContent side="right">New Chat</TooltipContent>}
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {conversations.length === 0 && leftSidebarOpen && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            No history
                        </div>
                    )}

                    {conversations.map((conv) => (
                        <TooltipProvider key={conv.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={currentConversationId === conv.id ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start text-sm font-normal",
                                            !leftSidebarOpen && "justify-center px-2"
                                        )}
                                        onClick={() => setCurrentConversation(conv.id)}
                                    >
                                        <MessageSquare className="h-4 w-4 shrink-0" />
                                        {leftSidebarOpen && (
                                            <span className="ml-2 truncate">{conv.title || "Untitled Chat"}</span>
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                {!leftSidebarOpen && (
                                    <TooltipContent side="right">
                                        {conv.title || "Untitled Chat"}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer (Settings/Profile placeholder) */}
            <div className="p-4 border-t mt-auto">
                {/* Placeholder for user settings */}
            </div>
        </aside>
    );
}
