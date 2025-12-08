"use client"

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    label: string;
    value: string | number;
    change?: number;
    changePercent?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function MetricCard({
    label,
    value,
    change,
    changePercent,
    prefix = '',
    suffix = '',
    className,
    size = 'md',
}: MetricCardProps) {
    const isPositive = (change ?? 0) > 0;
    const isNegative = (change ?? 0) < 0;
    const isNeutral = change === 0 || change === undefined;

    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    const sizeClasses = {
        sm: {
            card: 'p-3',
            label: 'text-xs',
            value: 'text-lg',
            change: 'text-xs',
        },
        md: {
            card: 'p-4',
            label: 'text-xs',
            value: 'text-2xl',
            change: 'text-sm',
        },
        lg: {
            card: 'p-5',
            label: 'text-sm',
            value: 'text-3xl',
            change: 'text-sm',
        },
    };

    const sizes = sizeClasses[size];

    // Format the display value
    const displayValue = typeof value === 'number'
        ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : value;

    return (
        <div
            className={cn(
                'rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm',
                sizes.card,
                className
            )}
        >
            <p className={cn('text-muted-foreground font-medium mb-1', sizes.label)}>
                {label}
            </p>

            <div className="flex items-baseline gap-2">
                <span className={cn('font-bold tracking-tight text-foreground', sizes.value)}>
                    {prefix}{displayValue}{suffix}
                </span>

                {(change !== undefined || changePercent !== undefined) && (
                    <div className={cn(
                        'flex items-center gap-1',
                        sizes.change,
                        {
                            'text-green-500': isPositive,
                            'text-red-500': isNegative,
                            'text-muted-foreground': isNeutral,
                        }
                    )}>
                        <TrendIcon className="h-3.5 w-3.5" />
                        {change !== undefined && (
                            <span className="font-medium">
                                {isPositive ? '+' : ''}{change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        )}
                        {changePercent !== undefined && (
                            <span className="font-medium">
                                ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

interface MetricGridProps {
    children: React.ReactNode;
    columns?: 2 | 3 | 4;
    className?: string;
}

export function MetricGrid({ children, columns = 3, className }: MetricGridProps) {
    return (
        <div className={cn(
            'grid gap-3 my-4',
            {
                'grid-cols-2': columns === 2,
                'grid-cols-2 md:grid-cols-3': columns === 3,
                'grid-cols-2 md:grid-cols-4': columns === 4,
            },
            className
        )}>
            {children}
        </div>
    );
}

// Compact inline metric for use within text
interface InlineMetricProps {
    value: string | number;
    change?: number;
    prefix?: string;
    suffix?: string;
}

export function InlineMetric({ value, change, prefix = '', suffix = '' }: InlineMetricProps) {
    const isPositive = (change ?? 0) > 0;
    const isNegative = (change ?? 0) < 0;

    const displayValue = typeof value === 'number'
        ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : value;

    return (
        <span className={cn(
            'inline-flex items-center gap-1 font-mono font-medium px-1.5 py-0.5 rounded bg-muted/50',
            {
                'text-green-500': isPositive,
                'text-red-500': isNegative,
            }
        )}>
            {prefix}{displayValue}{suffix}
            {change !== undefined && (
                <span className="text-xs">
                    ({isPositive ? '+' : ''}{change.toFixed(2)}%)
                </span>
            )}
        </span>
    );
}
