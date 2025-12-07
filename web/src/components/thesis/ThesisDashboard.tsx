'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type ThesisEntry } from '@/lib/stores/thesis-store';
import { useThesisStore } from '@/lib/stores/thesis-store';
import {
    ArrowLeft,
    Edit,
    Play,
    Pause,
    CheckCircle,
    XCircle,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThesisDashboardProps {
    thesis: ThesisEntry;
    onBack: () => void;
    onEdit: () => void;
}

export function ThesisDashboard({ thesis, onBack, onEdit }: ThesisDashboardProps) {
    const { updateThesis } = useThesisStore();
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(thesis.status === 'active');
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // Simulated price fetch (would be real API in production)
    const fetchCurrentPrice = async () => {
        try {
            const response = await fetch(`/api/market/quotes?symbols=${thesis.symbol}`);
            if (response.ok) {
                const data = await response.json();
                const quote = data.quotes?.[0];
                if (quote?.price) {
                    setCurrentPrice(quote.price);
                    setLastChecked(new Date());
                }
            }
        } catch (error) {
            console.error('Failed to fetch price', error);
        }
    };

    useEffect(() => {
        if (isMonitoring) {
            fetchCurrentPrice();
            const interval = setInterval(fetchCurrentPrice, 30000); // Every 30s
            return () => clearInterval(interval);
        }
    }, [isMonitoring, thesis.symbol]);

    const handleActivate = () => {
        updateThesis(thesis.id, { status: 'active' });
        setIsMonitoring(true);
    };

    const handlePause = () => {
        updateThesis(thesis.id, { status: 'drafting' });
        setIsMonitoring(false);
    };

    const handleValidate = () => {
        updateThesis(thesis.id, { status: 'validated', validationScore: 100 });
    };

    const handleInvalidate = () => {
        updateThesis(thesis.id, { status: 'invalidated', validationScore: 0 });
    };

    // Calculate validation metrics
    const validationScore = thesis.validationScore ?? 50;
    const gaugeColor = validationScore >= 70 ? 'bg-green-500' : validationScore >= 40 ? 'bg-amber-500' : 'bg-red-500';

    // Price position relative to targets
    const getPricePosition = () => {
        if (!currentPrice || !thesis.entryTarget) return null;

        if (currentPrice >= (thesis.exitTarget || Infinity)) {
            return { status: 'target-hit', message: 'Target reached!', color: 'text-green-500' };
        }
        if (currentPrice <= (thesis.stopLoss || 0)) {
            return { status: 'stop-hit', message: 'Stop loss triggered!', color: 'text-red-500' };
        }
        if (currentPrice > thesis.entryTarget) {
            return { status: 'in-profit', message: 'In profit zone', color: 'text-green-400' };
        }
        if (currentPrice < thesis.entryTarget) {
            return { status: 'in-loss', message: 'Below entry', color: 'text-red-400' };
        }
        return { status: 'at-entry', message: 'At entry level', color: 'text-amber-400' };
    };

    const pricePosition = getPricePosition();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{thesis.title}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">{thesis.symbol}</span>
                            <span>·</span>
                            <span>{thesis.timeframe}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    {thesis.status === 'drafting' && (
                        <Button size="sm" onClick={handleActivate}>
                            <Play className="h-4 w-4 mr-1" /> Activate
                        </Button>
                    )}
                    {thesis.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={handlePause}>
                            <Pause className="h-4 w-4 mr-1" /> Pause
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Thesis Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Hypothesis */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-2">Hypothesis</h3>
                        <p className="text-muted-foreground">{thesis.hypothesis}</p>
                    </Card>

                    {/* Price Targets Visualization */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Price Levels</h3>
                        <div className="relative h-32 bg-gradient-to-b from-green-500/10 via-transparent to-red-500/10 rounded-lg border border-border overflow-hidden">
                            {/* Target Line */}
                            {thesis.exitTarget && (
                                <div
                                    className="absolute left-0 right-0 h-px bg-green-500 flex items-center"
                                    style={{ top: '20%' }}
                                >
                                    <Badge className="absolute -translate-y-1/2 right-2 bg-green-500">
                                        Target: ${thesis.exitTarget.toFixed(2)}
                                    </Badge>
                                </div>
                            )}

                            {/* Entry Line */}
                            {thesis.entryTarget && (
                                <div
                                    className="absolute left-0 right-0 h-px bg-amber-500 flex items-center"
                                    style={{ top: '50%' }}
                                >
                                    <Badge className="absolute -translate-y-1/2 right-2 bg-amber-500">
                                        Entry: ${thesis.entryTarget.toFixed(2)}
                                    </Badge>
                                </div>
                            )}

                            {/* Stop Loss Line */}
                            {thesis.stopLoss && (
                                <div
                                    className="absolute left-0 right-0 h-px bg-red-500 flex items-center"
                                    style={{ top: '80%' }}
                                >
                                    <Badge className="absolute -translate-y-1/2 right-2 bg-red-500">
                                        Stop: ${thesis.stopLoss.toFixed(2)}
                                    </Badge>
                                </div>
                            )}

                            {/* Current Price Indicator */}
                            {currentPrice && (
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                                    <span className="font-bold">${currentPrice.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {pricePosition && (
                            <div className={cn("mt-4 flex items-center gap-2", pricePosition.color)}>
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-medium">{pricePosition.message}</span>
                            </div>
                        )}
                    </Card>

                    {/* Key Conditions */}
                    {thesis.keyConditions.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4">Key Conditions</h3>
                            <div className="space-y-2">
                                {thesis.keyConditions.map((condition, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                            {i + 1}
                                        </div>
                                        <span>{condition}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column - Validation & Actions */}
                <div className="space-y-6">
                    {/* Validation Gauge */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Thesis Validation</h3>

                        {/* Circular Gauge */}
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    className="text-muted"
                                    strokeWidth="8"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="56"
                                    cx="64"
                                    cy="64"
                                />
                                <circle
                                    className={cn(
                                        "transition-all duration-500",
                                        validationScore >= 70 ? "text-green-500" :
                                            validationScore >= 40 ? "text-amber-500" : "text-red-500"
                                    )}
                                    strokeWidth="8"
                                    strokeDasharray={`${(validationScore / 100) * 352} 352`}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="56"
                                    cx="64"
                                    cy="64"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl font-bold">{validationScore}%</span>
                            </div>
                        </div>

                        {lastChecked && (
                            <div className="text-center text-xs text-muted-foreground mb-4">
                                Last checked: {lastChecked.toLocaleTimeString()}
                            </div>
                        )}

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={fetchCurrentPrice}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
                        </Button>
                    </Card>

                    {/* Manual Actions */}
                    {thesis.status === 'active' && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4">Manual Actions</h3>
                            <div className="space-y-2">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={handleValidate}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" /> Mark Validated
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleInvalidate}
                                >
                                    <XCircle className="h-4 w-4 mr-2" /> Mark Invalidated
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Risk/Reward */}
                    {thesis.riskRewardRatio && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-2">Risk/Reward Ratio</h3>
                            <div className="text-3xl font-bold text-center">
                                1 : {thesis.riskRewardRatio.toFixed(1)}
                            </div>
                            <div className={cn(
                                "text-center mt-2 text-sm",
                                thesis.riskRewardRatio >= 2 ? "text-green-500" : "text-amber-500"
                            )}>
                                {thesis.riskRewardRatio >= 2 ? "Favorable" : "Consider improving"}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
