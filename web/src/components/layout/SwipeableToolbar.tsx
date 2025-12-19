'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ActiveContentType } from '@/lib/stores/ui-store';
import { useHaptics } from '@/hooks/useHaptics';
import {
  MessageSquare,
  LineChart,
  Briefcase,
  Newspaper,
  Calendar,
  BarChart3,
  Bell,
  Diamond,
  Shield,
  Filter,
  Calculator,
  Sparkles,
  ChevronUp,
  Plus,
  X,
  BookOpen,
  Target,
  Brain,
} from 'lucide-react';

export type ToolHubContentType = 'history' | ActiveContentType;

interface ToolItem {
  id: ToolHubContentType;
  icon: React.ElementType;
  label: string;
  color: string;
}

// All tools with history first (default)
const TOOLS: ToolItem[] = [
  { id: 'history', icon: MessageSquare, label: 'History', color: 'text-slate-400' },
  { id: 'chart', icon: LineChart, label: 'Chart', color: 'text-blue-400' },
  { id: 'portfolio', icon: Briefcase, label: 'Portfolio', color: 'text-green-400' },
  { id: 'journal', icon: BookOpen, label: 'Journal', color: 'text-rose-400' },
  { id: 'thesis', icon: Target, label: 'Thesis', color: 'text-emerald-400' },
  { id: 'insights', icon: Brain, label: 'Insights', color: 'text-violet-400' },
  { id: 'news', icon: Newspaper, label: 'News', color: 'text-amber-400' },
  { id: 'calendar', icon: Calendar, label: 'Calendar', color: 'text-purple-400' },
  { id: 'screener', icon: BarChart3, label: 'Screener', color: 'text-cyan-400' },
  { id: 'alerts', icon: Bell, label: 'Alerts', color: 'text-red-400' },
  { id: 'deep-value', icon: Diamond, label: 'Deep Value', color: 'text-pink-400' },
  { id: 'hedged-positions', icon: Shield, label: 'Hedged', color: 'text-teal-400' },
  { id: 'options-screener', icon: Filter, label: 'Options', color: 'text-orange-400' },
  { id: 'options-builder', icon: Calculator, label: 'Builder', color: 'text-indigo-400' },
  { id: 'prediction-markets', icon: Sparkles, label: 'Predictions', color: 'text-yellow-400' },
];

interface SwipeableToolbarProps {
  activeToolId: ToolHubContentType;
  onToolSelect: (toolId: ToolHubContentType) => void;
  onNewChat: () => void;
  className?: string;
}

/**
 * Swipeable Toolbar
 *
 * Perplexity-style swipeable toolbar for the Tools Hub mobile view.
 * Features horizontal scrolling of tool icons, expand to grid modal, and new chat action.
 *
 * Usage:
 * ```tsx
 * <SwipeableToolbar
 *   activeToolId="history"
 *   onToolSelect={(id) => console.log('Selected:', id)}
 *   onNewChat={() => router.push('/chat')}
 * />
 * ```
 */
export function SwipeableToolbar({
  activeToolId,
  onToolSelect,
  onNewChat,
  className,
}: SwipeableToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { light, selection } = useHaptics();
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  // Calculate drag constraints based on content width
  const maxScroll = TOOLS.length * 56 - (containerRef.current?.offsetWidth || 300) + 120; // 56px per icon + padding
  const dragConstraints = { left: -Math.max(maxScroll, 0), right: 0 };

  const handleToolClick = (toolId: ToolHubContentType) => {
    selection();
    onToolSelect(toolId);
  };

  const handleExpandClick = () => {
    light();
    setIsExpanded(true);
  };

  const handleCollapseClick = () => {
    light();
    setIsExpanded(false);
  };

  const handleNewChatClick = () => {
    selection();
    onNewChat();
  };

  const isActive = (id: ToolHubContentType) => activeToolId === id;

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={handleCollapseClick}
          />
        )}
      </AnimatePresence>

      {/* Toolbar Container */}
      <motion.div
        className={cn(
          'absolute bottom-6 left-1/2 -translate-x-1/2 z-50 safe-area-bottom',
          className
        )}
        layout
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            /* Expanded State - Grid Modal */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-sidebar/95 backdrop-blur-xl border border-sidebar-border rounded-3xl p-4 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-medium text-muted-foreground">All Tools</span>
                <button
                  onClick={handleCollapseClick}
                  className="p-1.5 rounded-full hover:bg-muted/50 transition-colors tap-target"
                  aria-label="Close tools grid"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Tool Grid */}
              <div className="grid grid-cols-4 gap-2 min-w-[280px]">
                {TOOLS.map((tool) => (
                  <motion.button
                    key={tool.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      handleToolClick(tool.id);
                      handleCollapseClick();
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors tap-target',
                      isActive(tool.id)
                        ? 'bg-primary/20 ring-1 ring-primary/50'
                        : 'hover:bg-muted/50'
                    )}
                    aria-label={`Select ${tool.label} tool`}
                    aria-pressed={isActive(tool.id)}
                  >
                    <tool.icon
                      className={cn(
                        'h-5 w-5',
                        isActive(tool.id) ? 'text-primary' : tool.color
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-medium',
                        isActive(tool.id) ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {tool.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Collapsed State - Swipeable Pill */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex items-center gap-2 bg-sidebar/95 backdrop-blur-xl border border-sidebar-border rounded-full px-2 py-2 shadow-2xl overflow-hidden"
              ref={containerRef}
            >
              {/* Swipeable Tools Container */}
              <motion.div
                drag="x"
                dragConstraints={dragConstraints}
                dragElastic={0.1}
                dragMomentum={false}
                style={{ x }}
                className="flex items-center gap-1"
              >
                {TOOLS.map((tool) => (
                  <motion.button
                    key={tool.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToolClick(tool.id)}
                    className={cn(
                      'flex-shrink-0 p-2.5 rounded-full transition-all tap-target',
                      isActive(tool.id)
                        ? 'bg-primary/20 ring-2 ring-primary/50 scale-110'
                        : 'hover:bg-muted/50'
                    )}
                    aria-label={`Select ${tool.label} tool`}
                    aria-pressed={isActive(tool.id)}
                  >
                    <tool.icon
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isActive(tool.id) ? 'text-primary' : tool.color
                      )}
                    />
                  </motion.button>
                ))}
              </motion.div>

              {/* Divider */}
              <div className="w-px h-6 bg-sidebar-border flex-shrink-0" />

              {/* Expand Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleExpandClick}
                className="flex-shrink-0 p-2.5 rounded-full hover:bg-muted/50 transition-colors tap-target"
                aria-label="Expand all tools"
              >
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </motion.button>

              {/* Divider */}
              <div className="w-px h-6 bg-sidebar-border flex-shrink-0" />

              {/* New Chat Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleNewChatClick}
                className="flex-shrink-0 p-2.5 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors tap-target"
                aria-label="Start new chat"
              >
                <Plus className="h-5 w-5 text-primary" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
