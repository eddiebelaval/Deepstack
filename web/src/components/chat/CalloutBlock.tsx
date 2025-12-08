"use client"

import { AlertCircle, Info, Lightbulb, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalloutType = 'note' | 'tip' | 'warning' | 'caution' | 'important';

interface CalloutBlockProps {
    type: CalloutType;
    children: React.ReactNode;
    className?: string;
}

const calloutConfig: Record<CalloutType, {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    titleColor: string;
}> = {
    note: {
        icon: Info,
        title: 'Note',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/40',
        iconColor: 'text-blue-400',
        titleColor: 'text-blue-400',
    },
    tip: {
        icon: Lightbulb,
        title: 'Tip',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/40',
        iconColor: 'text-green-400',
        titleColor: 'text-green-400',
    },
    warning: {
        icon: AlertTriangle,
        title: 'Warning',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/40',
        iconColor: 'text-amber-400',
        titleColor: 'text-amber-400',
    },
    caution: {
        icon: ShieldAlert,
        title: 'Caution',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/40',
        iconColor: 'text-red-400',
        titleColor: 'text-red-400',
    },
    important: {
        icon: AlertCircle,
        title: 'Important',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/40',
        iconColor: 'text-purple-400',
        titleColor: 'text-purple-400',
    },
};

export function CalloutBlock({ type, children, className }: CalloutBlockProps) {
    const config = calloutConfig[type];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'my-4 rounded-lg border-l-4 p-4',
                config.bgColor,
                config.borderColor,
                className
            )}
        >
            <div className="flex items-start gap-3">
                <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
                <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm mb-1', config.titleColor)}>
                        {config.title}
                    </p>
                    <div className="text-sm text-foreground/80 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function to extract alert type from markdown blockquote content
export function extractAlertType(children: React.ReactNode): { type: CalloutType; content: React.ReactNode } | null {
    // Check if the first child is a paragraph with [!TYPE] pattern
    const childArray = Array.isArray(children) ? children : [children];

    for (let i = 0; i < childArray.length; i++) {
        const child = childArray[i];
        if (child && typeof child === 'object' && 'props' in child) {
            const props = child.props as { children?: React.ReactNode };
            if (props.children) {
                const text = extractTextContent(props.children);
                const match = text.match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*/i);

                if (match) {
                    const alertType = match[1].toLowerCase() as CalloutType;
                    // Return the content after the alert marker
                    const remainingText = text.replace(match[0], '');
                    const remainingChildren = [...childArray];

                    // Replace the first element with the remaining text if there's any
                    if (remainingText) {
                        // Keep the remaining content
                        return {
                            type: alertType,
                            content: childArray.slice(i).map((c, idx) => {
                                if (idx === 0 && c && typeof c === 'object' && 'props' in c) {
                                    // Clone with modified children
                                    const cProps = c.props as { children?: React.ReactNode };
                                    const modifiedText = extractTextContent(cProps.children).replace(match[0], '');
                                    return modifiedText;
                                }
                                return c;
                            }),
                        };
                    }

                    return {
                        type: alertType,
                        content: childArray.slice(i + 1),
                    };
                }
            }
        }

        // Also check for plain text
        if (typeof child === 'string') {
            const match = child.match(/^\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*/i);
            if (match) {
                const alertType = match[1].toLowerCase() as CalloutType;
                return {
                    type: alertType,
                    content: [child.replace(match[0], ''), ...childArray.slice(i + 1)],
                };
            }
        }
    }

    return null;
}

// Helper to extract text content from React nodes
function extractTextContent(node: React.ReactNode): string {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';

    if (Array.isArray(node)) {
        return node.map(extractTextContent).join('');
    }

    if (typeof node === 'object' && 'props' in node) {
        const props = node.props as { children?: React.ReactNode };
        return extractTextContent(props.children);
    }

    return '';
}
