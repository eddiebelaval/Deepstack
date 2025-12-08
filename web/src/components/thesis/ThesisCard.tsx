'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type ThesisEntry } from '@/lib/stores/thesis-store';
import { Lightbulb, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationScoreRing } from './ValidationScoreRing';
import { getScoreColor } from '@/lib/thesis-validation';

interface ThesisCardProps {
    thesis: ThesisEntry;
    onClick?: () => void;
    compact?: boolean;
}

const STATUS_CONFIG = {
    drafting: { label: 'Drafting', icon: Clock, color: 'bg-slate-500' },
    active: { label: 'Active', icon: Target, color: 'bg-blue-500' },
    validated: { label: 'Validated', icon: CheckCircle, color: 'bg-green-500' },
    invalidated: { label: 'Invalidated', icon: XCircle, color: 'bg-red-500' },
    archived: { label: 'Archived', icon: AlertTriangle, color: 'bg-gray-500' },
};

export function ThesisCard({ thesis, onClick, compact = false }: ThesisCardProps) {
    const statusConfig = STATUS_CONFIG[thesis.status];
    const StatusIcon = statusConfig.icon;
    const validationScore = thesis.validationScore ?? 50;
    const scoreColors = getScoreColor(validationScore);

    if (compact) {
        return (
            <Card
                className={cn(
                    "p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-4",
                    thesis.status === 'validated' && "border-l-green-500",
                    thesis.status === 'invalidated' && "border-l-red-500",
                    thesis.status === 'active' && "border-l-blue-500",
                    thesis.status === 'drafting' && "border-l-slate-500",
                )}
                onClick={onClick}
            >
                <div className="flex items-center gap-3">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{thesis.title}</div>
                        <div className="text-xs text-muted-foreground">{thesis.symbol} · {thesis.timeframe}</div>
                    </div>
                    {thesis.status === 'active' && (
                        <div className="flex items-center gap-1 shrink-0">
                            <div className={cn("h-2 w-2 rounded-full", scoreColors.bg)} />
                            <span className={cn("text-xs font-medium", scoreColors.text)}>
                                {validationScore}%
                            </span>
                        </div>
                    )}
                    <Badge variant="outline" className="text-xs shrink-0">
                        {statusConfig.label}
                    </Badge>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={onClick}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{thesis.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">{thesis.symbol}</span>
                            <span>·</span>
                            <span>{thesis.timeframe}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {thesis.status === 'active' && (
                        <div className="flex flex-col items-center">
                            <ValidationScoreRing score={validationScore} size="sm" />
                        </div>
                    )}
                    <Badge className={cn("text-white", statusConfig.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                    </Badge>
                </div>
            </div>

            {/* Hypothesis */}
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {thesis.hypothesis}
            </p>

            {/* Targets Grid */}
            {(thesis.entryTarget || thesis.exitTarget || thesis.stopLoss) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {thesis.entryTarget && (
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                            <div className="text-xs text-muted-foreground mb-1">Entry</div>
                            <div className="font-semibold">${thesis.entryTarget.toFixed(2)}</div>
                        </div>
                    )}
                    {thesis.exitTarget && (
                        <div className="bg-green-500/10 rounded-lg p-2 text-center">
                            <div className="text-xs text-green-500 mb-1">Target</div>
                            <div className="font-semibold text-green-500">${thesis.exitTarget.toFixed(2)}</div>
                        </div>
                    )}
                    {thesis.stopLoss && (
                        <div className="bg-red-500/10 rounded-lg p-2 text-center">
                            <div className="text-xs text-red-500 mb-1">Stop Loss</div>
                            <div className="font-semibold text-red-500">${thesis.stopLoss.toFixed(2)}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Risk/Reward */}
            {thesis.riskRewardRatio && (
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <span className="text-muted-foreground">Risk/Reward:</span>
                    <Badge variant={thesis.riskRewardRatio >= 2 ? "default" : "secondary"}>
                        1:{thesis.riskRewardRatio.toFixed(1)}
                    </Badge>
                </div>
            )}

            {/* Validation Gauge */}
            {thesis.status === 'active' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Thesis Validation</span>
                        <span className={cn("font-medium", scoreColors.text)}>
                            {validationScore}%
                        </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500", scoreColors.bg)}
                            style={{ width: `${validationScore}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Key Conditions */}
            {thesis.keyConditions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Key Conditions</div>
                    <div className="flex flex-wrap gap-2">
                        {thesis.keyConditions.slice(0, 3).map((condition, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                                {condition}
                            </Badge>
                        ))}
                        {thesis.keyConditions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{thesis.keyConditions.length - 3} more
                            </Badge>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}
