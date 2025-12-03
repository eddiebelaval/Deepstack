"use client"

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
    language: string;
    value: string;
    className?: string;
}

export function CodeBlock({ language, value, className }: CodeBlockProps) {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className={cn("relative group rounded-md overflow-hidden my-4 border border-border/50", className)}>
            <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border/50 text-xs text-muted-foreground select-none">
                <span className="font-mono font-medium">{language || 'text'}</span>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors focus:outline-none"
                    aria-label="Copy code"
                >
                    {isCopied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <div className="relative">
                <SyntaxHighlighter
                    language={language || 'text'}
                    style={oneDark}
                    customStyle={{
                        margin: 0,
                        padding: '1.5rem',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        backgroundColor: 'var(--background-secondary)', // Fallback or custom variable
                    }}
                    showLineNumbers={true}
                    wrapLines={true}
                    lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6b7280', textAlign: 'right' }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
