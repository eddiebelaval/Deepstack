"use client"

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ThinkingBlockProps = {
    content: string;
    defaultExpanded?: boolean;
};

export function ThinkingBlock({ content, defaultExpanded = false }: ThinkingBlockProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (!content) return null;

    return (
        <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-purple-300 hover:bg-purple-500/10 transition-colors"
            >
                {isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                <Brain className="h-4 w-4 flex-shrink-0" />
                <span>Extended Thinking</span>
                <span className="text-xs text-purple-400/60 ml-auto">
                    {isExpanded ? 'Hide' : 'Show'} reasoning process
                </span>
            </button>

            {isExpanded && (
                <div className="px-4 py-3 border-t border-purple-500/20 text-sm text-foreground/80 leading-relaxed">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p({ children }) {
                                return <p className="mb-3 leading-[1.7]">{children}</p>;
                            },
                            ul({ children }) {
                                return <ul className="my-3 ml-4 space-y-1.5 list-disc">{children}</ul>;
                            },
                            ol({ children }) {
                                return <ol className="my-3 ml-4 space-y-1.5 list-decimal">{children}</ol>;
                            },
                            li({ children }) {
                                return <li className="leading-[1.6] pl-1">{children}</li>;
                            },
                            strong({ children }) {
                                return <strong className="font-semibold text-foreground">{children}</strong>;
                            },
                            code({ node, inline, className, children, ...props }: any) {
                                return (
                                    <code className={cn("bg-purple-500/10 px-1.5 py-0.5 rounded font-mono text-xs", className)} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
}
