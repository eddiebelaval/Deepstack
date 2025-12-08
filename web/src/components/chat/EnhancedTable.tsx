"use client"

import { cn } from '@/lib/utils';

interface EnhancedTableProps {
    children: React.ReactNode;
    className?: string;
}

export function EnhancedTable({ children, className }: EnhancedTableProps) {
    return (
        <div className={cn(
            "my-6 w-full overflow-x-auto rounded-lg border border-border/50 shadow-sm",
            className
        )}>
            <table className="w-full text-sm border-collapse">
                {children}
            </table>
        </div>
    );
}

interface EnhancedTableHeadProps {
    children: React.ReactNode;
    className?: string;
}

export function EnhancedTableHead({ children, className }: EnhancedTableHeadProps) {
    return (
        <thead className={cn(
            "bg-muted/70 text-muted-foreground sticky top-0 backdrop-blur-sm",
            className
        )}>
            {children}
        </thead>
    );
}

interface EnhancedTableHeaderProps {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

export function EnhancedTableHeader({ children, className, align = 'left' }: EnhancedTableHeaderProps) {
    return (
        <th className={cn(
            "px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b border-border/50",
            {
                'text-left': align === 'left',
                'text-center': align === 'center',
                'text-right': align === 'right',
            },
            className
        )}>
            {children}
        </th>
    );
}

interface EnhancedTableBodyProps {
    children: React.ReactNode;
    className?: string;
}

export function EnhancedTableBody({ children, className }: EnhancedTableBodyProps) {
    return (
        <tbody className={cn(
            "[&>tr:nth-child(even)]:bg-muted/30 [&>tr:hover]:bg-muted/50 transition-colors",
            className
        )}>
            {children}
        </tbody>
    );
}

interface EnhancedTableRowProps {
    children: React.ReactNode;
    className?: string;
    highlight?: boolean;
}

export function EnhancedTableRow({ children, className, highlight }: EnhancedTableRowProps) {
    return (
        <tr className={cn(
            "border-b border-border/30 last:border-0 transition-colors",
            highlight && "bg-primary/5",
            className
        )}>
            {children}
        </tr>
    );
}

interface EnhancedTableCellProps {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
    numeric?: boolean;
    positive?: boolean;
    negative?: boolean;
}

export function EnhancedTableCell({
    children,
    className,
    align = 'left',
    numeric,
    positive,
    negative,
}: EnhancedTableCellProps) {
    return (
        <td className={cn(
            "px-4 py-3",
            {
                'text-left': align === 'left',
                'text-center': align === 'center',
                'text-right': align === 'right',
                'font-mono tabular-nums': numeric,
                'text-green-500': positive,
                'text-red-500': negative,
            },
            className
        )}>
            {children}
        </td>
    );
}

// Utility to detect if a value looks like a number for auto-formatting
export function formatTableValue(value: string): { formatted: string; isNumeric: boolean; isPositive?: boolean; isNegative?: boolean } {
    // Check for percentage patterns
    const percentMatch = value.match(/^([+-]?\d+\.?\d*)%$/);
    if (percentMatch) {
        const num = parseFloat(percentMatch[1]);
        return {
            formatted: value,
            isNumeric: true,
            isPositive: num > 0,
            isNegative: num < 0,
        };
    }

    // Check for currency patterns
    const currencyMatch = value.match(/^[+-]?\$?(\d{1,3}(,\d{3})*|\d+)(\.\d+)?$/);
    if (currencyMatch) {
        const isNegative = value.startsWith('-');
        const isPositive = value.startsWith('+');
        return {
            formatted: value,
            isNumeric: true,
            isPositive,
            isNegative,
        };
    }

    // Check for plain numbers
    const numMatch = value.match(/^[+-]?\d+\.?\d*$/);
    if (numMatch) {
        const num = parseFloat(value);
        return {
            formatted: value,
            isNumeric: true,
            isPositive: num > 0 && value.startsWith('+'),
            isNegative: num < 0,
        };
    }

    return { formatted: value, isNumeric: false };
}
