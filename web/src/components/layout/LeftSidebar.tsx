'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUIStore } from '@/lib/stores/ui-store';
import { useChatStore } from '@/lib/stores/chat-store';
import {
    MessageSquare,
    Plus,
    PanelLeftClose,
    PanelLeftOpen,
    User,
    Settings,
    ChevronRight
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

export function LeftSidebar() {
    const { leftSidebarOpen, toggleLeftSidebar } = useUIStore();
    const { conversations, currentConversationId, setCurrentConversation } = useChatStore();

    const handleNewChat = () => {
        setCurrentConversation(null);
    };

    // Group conversations by date
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groupedConversations = {
        today: conversations.filter(c => c.created_at && new Date(c.created_at) >= todayStart),
        yesterday: conversations.filter(c => c.created_at && new Date(c.created_at) >= yesterdayStart && new Date(c.created_at) < todayStart),
        thisWeek: conversations.filter(c => c.created_at && new Date(c.created_at) >= weekStart && new Date(c.created_at) < yesterdayStart),
        older: conversations.filter(c => !c.created_at || new Date(c.created_at) < weekStart),
    };

    const renderConversationGroup = (title: string, convs: typeof conversations) => {
        if (convs.length === 0) return null;
        return (
            <div className="mb-4">
                {leftSidebarOpen && (
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {title}
                    </div>
                )}
                <div className="space-y-0.5">
                    {convs.map((conv) => (
                        <TooltipProvider key={conv.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={currentConversationId === conv.id ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start text-sm font-normal rounded-xl h-9",
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
            </div>
        );
    };

    return (
        <TooltipProvider>
            <aside
                className={cn(
                    "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-40",
                    leftSidebarOpen ? "w-64" : "w-14"
                )}
            >
                {/* Header with Logo & Toggle */}
                <div className={cn(
                    "flex items-center h-14 border-b border-sidebar-border px-3",
                    leftSidebarOpen ? "justify-between" : "justify-center"
                )}>
                    {leftSidebarOpen && (
                        <span className="font-semibold text-primary tracking-tight">DeepStack</span>
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleLeftSidebar}
                                className="h-8 w-8 rounded-lg"
                            >
                                {leftSidebarOpen ? (
                                    <PanelLeftClose className="h-4 w-4" />
                                ) : (
                                    <PanelLeftOpen className="h-4 w-4" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {leftSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* New Chat Button */}
                <div className="p-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="default"
                                className={cn(
                                    "w-full rounded-xl",
                                    leftSidebarOpen ? "justify-start" : "justify-center px-0"
                                )}
                                onClick={handleNewChat}
                            >
                                <Plus className="h-4 w-4" />
                                {leftSidebarOpen && <span className="ml-2">New Chat</span>}
                            </Button>
                        </TooltipTrigger>
                        {!leftSidebarOpen && <TooltipContent side="right">New Chat</TooltipContent>}
                    </Tooltip>
                </div>

                {/* Chat History */}
                <ScrollArea className="flex-1 px-2">
                    {conversations.length === 0 ? (
                        leftSidebarOpen && (
                            <div className="text-sm text-muted-foreground text-center py-8">
                                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No conversations yet</p>
                                <p className="text-xs mt-1">Start a new chat to begin</p>
                            </div>
                        )
                    ) : (
                        <>
                            {renderConversationGroup("Today", groupedConversations.today)}
                            {renderConversationGroup("Yesterday", groupedConversations.yesterday)}
                            {renderConversationGroup("This Week", groupedConversations.thisWeek)}
                            {renderConversationGroup("Older", groupedConversations.older)}
                        </>
                    )}
                </ScrollArea>

                {/* Bottom Section - Profile & Settings */}
                <div className="mt-auto border-t border-sidebar-border p-2 space-y-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full rounded-xl h-9",
                                    leftSidebarOpen ? "justify-start" : "justify-center px-0"
                                )}
                            >
                                <User className="h-4 w-4" />
                                {leftSidebarOpen && (
                                    <>
                                        <span className="ml-2 flex-1 text-left">Profile</span>
                                        <ChevronRight className="h-3 w-3 opacity-50" />
                                    </>
                                )}
                            </Button>
                        </TooltipTrigger>
                        {!leftSidebarOpen && <TooltipContent side="right">Profile</TooltipContent>}
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full rounded-xl h-9",
                                    leftSidebarOpen ? "justify-start" : "justify-center px-0"
                                )}
                            >
                                <Settings className="h-4 w-4" />
                                {leftSidebarOpen && (
                                    <>
                                        <span className="ml-2 flex-1 text-left">Settings</span>
                                        <ChevronRight className="h-3 w-3 opacity-50" />
                                    </>
                                )}
                            </Button>
                        </TooltipTrigger>
                        {!leftSidebarOpen && <TooltipContent side="right">Settings</TooltipContent>}
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    );
}
