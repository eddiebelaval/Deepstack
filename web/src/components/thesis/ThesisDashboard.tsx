'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type ThesisEntry } from '@/lib/stores/thesis-store';
import { useThesisStore } from '@/lib/stores/thesis-store';
import { useJournalStore } from '@/lib/stores/journal-store';
import { type Conversation } from '@/lib/stores/chat-store';
import { fetchConversationById } from '@/lib/supabase/conversations';
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
    AlertCircle,
    BookOpen,
    BarChart3,
    Pencil,
    MessageSquare,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationScoreModal } from './ValidationScoreModal';
import { ValidationScoreRing } from './ValidationScoreRing';
import { ThesisRelatedMarkets } from './ThesisRelatedMarkets';
import { calculateValidationScore } from '@/lib/thesis-validation';

interface ThesisDashboardProps {
    thesis: ThesisEntry;
    onBack: () => void;
    onEdit: () => void;
}

export function ThesisDashboard({ thesis, onBack, onEdit }: ThesisDashboardProps) {
    const router = useRouter();
    const { updateThesis } = useThesisStore();
    const journalEntries = useJournalStore((state) => state.entries);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(thesis.status === 'active');
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [showScoreModal, setShowScoreModal] = useState(false);

    // Linked conversation state
    const [linkedConversation, setLinkedConversation] = useState<Conversation | null>(null);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);

    const loadLinkedConversation = useCallback(async () => {
        if (!thesis.conversationId) return;

        setIsLoadingConversation(true);
        try {
            const conversation = await fetchConversationById(thesis.conversationId);
            setLinkedConversation(conversation);
        } catch (error) {
            console.error('Failed to load linked conversation:', error);
        } finally {
            setIsLoadingConversation(false);
        }
    }, [thesis.conversationId]);

    // Load linked conversation if exists
    useEffect(() => {
        if (thesis.conversationId) {
            loadLinkedConversation();
        }
    }, [thesis.conversationId, loadLinkedConversation]);

    // Get journal entries linked to this thesis
    const linkedJournalEntries = useMemo(() => {
        return journalEntries.filter((entry) => entry.thesisId === thesis.id);
    }, [journalEntries, thesis.id]);

    // Calculate P&L from linked trades
    const linkedTradesStats = useMemo(() => {
        const entries = linkedJournalEntries;
        const totalPnl = entries.reduce((sum, e) => sum + (e.pnl || 0), 0);
        const winningTrades = entries.filter((e) => e.pnl && e.pnl > 0).length;
        const losingTrades = entries.filter((e) => e.pnl && e.pnl < 0).length;
        return {
            count: entries.length,
            totalPnl,
            winningTrades,
            losingTrades,
            winRate: entries.length > 0 ? (winningTrades / entries.length) * 100 : 0,
        };
    }, [linkedJournalEntries]);

    // Simulated price fetch (would be real API in production)
    const fetchCurrentPrice = useCallback(async () => {
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
    }, [thesis.symbol]);

    useEffect(() => {
        if (isMonitoring) {
            fetchCurrentPrice();
            const interval = setInterval(fetchCurrentPrice, 30000); // Every 30s
            return () => clearInterval(interval);
        }
    }, [isMonitoring, thesis.symbol, fetchCurrentPrice]);

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

    // Auto-calculate validation score
    const autoValidationResult = useMemo(() => {
        return calculateValidationScore(thesis, currentPrice, linkedJournalEntries);
    }, [thesis, currentPrice, linkedJournalEntries]);

    // Use manual score if set, otherwise use auto-calculated
    const validationScore = thesis.validationScore ?? autoValidationResult.totalScore;

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

    // Handler for saving manual score
    const handleSaveScore = (score: number, notes: string) => {
        updateThesis(thesis.id, {
            validationScore: score,
            validationNotes: notes,
        });
    };

    return (
        <div className="space-y-6">
            {/* Validation Score Modal */}
            <ValidationScoreModal
                open={showScoreModal}
                onOpenChange={setShowScoreModal}
                currentScore={validationScore}
                autoCalculatedScore={autoValidationResult.totalScore}
                currentNotes={thesis.validationNotes}
                onSave={handleSaveScore}
            />

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
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Thesis Validation</h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowScoreModal(true)}
                            >
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                        </div>

                        {/* Validation Score Ring */}
                        <ValidationScoreRing score={validationScore} size="md" showLabel />

                        {/* Score breakdown */}
                        <div className="mt-6 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Auto-calculated:</span>
                                <span className="font-medium">{autoValidationResult.totalScore}%</span>
                            </div>
                            {thesis.validationScore !== undefined && thesis.validationScore !== autoValidationResult.totalScore && (
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Manual override:</span>
                                    <span className="font-medium">{thesis.validationScore}%</span>
                                </div>
                            )}
                        </div>

                        {/* Score breakdown details */}
                        <div className="mt-4 p-3 bg-muted/30 rounded-lg space-y-1.5">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Score Breakdown</span>
                            </div>
                            {autoValidationResult.breakdown.map((item, i) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                    {item}
                                </div>
                            ))}
                        </div>

                        {/* Validation notes */}
                        {thesis.validationNotes && (
                            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                    Validation Notes
                                </div>
                                <p className="text-xs text-muted-foreground">{thesis.validationNotes}</p>
                            </div>
                        )}

                        {lastChecked && (
                            <div className="text-center text-xs text-muted-foreground mt-4">
                                Last checked: {lastChecked.toLocaleTimeString()}
                            </div>
                        )}

                        <div className="mt-4 space-y-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={fetchCurrentPrice}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
                            </Button>
                            <Button
                                className="w-full"
                                onClick={() => setShowScoreModal(true)}
                            >
                                <Pencil className="h-4 w-4 mr-2" /> Update Score
                            </Button>
                        </div>
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

                    {/* Linked AI Conversation */}
                    {(thesis.conversationId || linkedConversation) && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Linked Analysis
                            </h3>
                            {isLoadingConversation ? (
                                <div className="flex items-center justify-center py-6 text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Loading conversation...
                                </div>
                            ) : linkedConversation ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                                        <div className="font-medium truncate">
                                            {linkedConversation.title}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Created {new Date(linkedConversation.created_at).toLocaleDateString()}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {linkedConversation.provider}
                                            </Badge>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={() => router.push(`/chat?conversation=${linkedConversation.id}`)}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open Chat
                                    </Button>

                                    <Button
                                        className="w-full"
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                            await updateThesis(thesis.id, { conversationId: undefined });
                                            setLinkedConversation(null);
                                        }}
                                    >
                                        Unlink Conversation
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    Conversation not found
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Related Prediction Markets */}
                    <ThesisRelatedMarkets
                        thesisId={thesis.id}
                        symbol={thesis.symbol}
                        hypothesis={thesis.hypothesis}
                    />

                    {/* Linked Journal Entries */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Linked Trades
                        </h3>
                        {linkedTradesStats.count === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No trades linked to this thesis yet.
                                <br />
                                <span className="text-xs">Link trades from the Journal.</span>
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {/* Stats Summary */}
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="p-2 bg-muted/50 rounded-lg">
                                        <div className="text-2xl font-bold">{linkedTradesStats.count}</div>
                                        <div className="text-xs text-muted-foreground">Total Trades</div>
                                    </div>
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        linkedTradesStats.totalPnl >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                                    )}>
                                        <div className={cn(
                                            "text-2xl font-bold",
                                            linkedTradesStats.totalPnl >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {linkedTradesStats.totalPnl >= 0 ? '+' : ''}${linkedTradesStats.totalPnl.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Total P&L</div>
                                    </div>
                                </div>

                                {/* Win/Loss breakdown */}
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        <span>{linkedTradesStats.winningTrades} Wins</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        <span>{linkedTradesStats.losingTrades} Losses</span>
                                    </div>
                                </div>

                                {/* Win Rate Bar */}
                                <div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                        <span>Win Rate</span>
                                        <span>{linkedTradesStats.winRate.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all",
                                                linkedTradesStats.winRate >= 50 ? "bg-green-500" : "bg-amber-500"
                                            )}
                                            style={{ width: `${linkedTradesStats.winRate}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Recent Trades List */}
                                <div className="space-y-2 mt-4">
                                    <h4 className="text-xs font-medium text-muted-foreground">Recent Trades</h4>
                                    {linkedJournalEntries.slice(0, 3).map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                {entry.direction === 'long' ? (
                                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                                ) : (
                                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                                )}
                                                <span className="font-medium">{entry.symbol}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(entry.tradeDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {entry.pnl !== undefined && (
                                                <span className={cn(
                                                    "font-medium",
                                                    entry.pnl >= 0 ? "text-green-500" : "text-red-500"
                                                )}>
                                                    {entry.pnl >= 0 ? '+' : ''}${entry.pnl.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {linkedJournalEntries.length > 3 && (
                                        <p className="text-xs text-muted-foreground text-center pt-1">
                                            +{linkedJournalEntries.length - 3} more trades
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
