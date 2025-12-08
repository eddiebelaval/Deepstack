'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePatternStore, type PatternInsight, type UserPattern } from '@/lib/stores/pattern-store';
import { useJournalStore } from '@/lib/stores/journal-store';
import { useInsightsData } from '@/hooks/useInsightsData';
import {
    Brain,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Lightbulb,
    X,
    RefreshCw,
    Shield,
    Trash2,
    Heart,
    BarChart3,
    ArrowLeft,
    Target,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PATTERN_ICONS = {
    emotion: Heart,
    symbol: BarChart3,
    timing: RefreshCw,
    behavior: Brain,
};

export function InsightsPanel() {
    const { stats, hasData } = useInsightsData();
    const {
        patterns,
        insights,
        privacyConsent,
        lastAnalyzed,
        analyzeJournalPatterns,
        clearPatterns,
        setPrivacyConsent,
        dismissInsight,
        getActiveInsights
    } = usePatternStore();

    const { entries } = useJournalStore();
    const activeInsights = getActiveInsights();

    const handleAnalyze = () => {
        if (privacyConsent) {
            analyzeJournalPatterns();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = '/'}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Trading Insights</h2>
                        <p className="text-sm text-muted-foreground">Performance analysis and AI pattern recognition</p>
                    </div>
                </div>
            </div>

            {/* Performance Overview */}
            {hasData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 bg-card/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
                        </div>
                        <div className="text-2xl font-bold">
                            {stats.winRate.toFixed(1)}%
                        </div>
                        <div className={cn(
                            "text-xs font-medium mt-1",
                            stats.totalPnL >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)} Net P&L
                        </div>
                    </Card>

                    <Card className="p-4 bg-card/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Top Symbols</span>
                        </div>
                        <div className="space-y-1">
                            {stats.topSymbols.length > 0 ? (
                                stats.topSymbols.map(s => (
                                    <div key={s.symbol} className="flex justify-between text-sm">
                                        <span className="font-medium">{s.symbol}</span>
                                        <span className="text-muted-foreground">
                                            {s.winRate.toFixed(0)}% WR ({s.count})
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground">No data yet</span>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 bg-card/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                                <Heart className="h-4 w-4 text-pink-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Emotional Edge</span>
                        </div>
                        {stats.emotionalEdge.bestEmotion ? (
                            <div>
                                <div className="text-sm">
                                    <span className="font-medium text-green-500">Best:</span>{' '}
                                    <span className="capitalize">{stats.emotionalEdge.bestEmotion.emotion}</span>
                                    <span className="text-muted-foreground ml-1">
                                        ({stats.emotionalEdge.bestEmotion.winRate.toFixed(0)}%)
                                    </span>
                                </div>
                                {stats.emotionalEdge.worstEmotion && (
                                    <div className="text-sm mt-1">
                                        <span className="font-medium text-red-500">Worst:</span>{' '}
                                        <span className="capitalize">{stats.emotionalEdge.worstEmotion.emotion}</span>
                                        <span className="text-muted-foreground ml-1">
                                            ({stats.emotionalEdge.worstEmotion.winRate.toFixed(0)}%)
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground">Track emotions to see data</span>
                        )}
                    </Card>

                    <Card className="p-4 bg-card/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Target className="h-4 w-4 text-amber-500" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Active Theses</span>
                        </div>
                        <div className="text-2xl font-bold">
                            {stats.activeTheses}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Ideas currently in play
                        </div>
                    </Card>
                </div>
            ) : (
                <Card className="p-6 border-dashed">
                    <div className="flex flex-col items-center justify-center text-center">
                        <Activity className="h-8 w-8 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Trading Data Yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-2">
                            Start logging your trades in the Journal and creating Theses to see your performance analytics here.
                        </p>
                    </div>
                </Card>
            )}

            {/* Privacy Consent */}
            <Card className="p-4">
                <div className="flex items-start gap-4">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">Privacy Settings</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Enable AI analysis of your journal to discover patterns. Your data stays private and is <strong>never shared or sold</strong>.
                                </p>
                            </div>
                            <Switch
                                checked={privacyConsent}
                                onCheckedChange={setPrivacyConsent}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {!privacyConsent ? (
                <Card className="p-8 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enable pattern learning above to get personalized insights</p>
                    <p className="text-xs mt-2">Your data stays on your device and is never shared</p>
                </Card>
            ) : (
                <>
                    {/* Analysis Controls */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {lastAnalyzed
                                ? `Last analyzed: ${new Date(lastAnalyzed).toLocaleString()}`
                                : 'Not yet analyzed'
                            }
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={entries.length < 3}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {patterns.length > 0 ? 'Re-analyze' : 'Analyze'}
                            </Button>
                            {patterns.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearPatterns} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {entries.length < 3 && (
                        <Card className="p-4 border-amber-500/30 bg-amber-500/10">
                            <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Need more data</p>
                                    <p className="text-sm text-muted-foreground">
                                        Add at least 3 journal entries to enable pattern analysis.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Active Insights */}
                    {activeInsights.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Actionable Insights
                            </h3>
                            {activeInsights.map(insight => (
                                <InsightCard
                                    key={insight.id}
                                    insight={insight}
                                    onDismiss={() => dismissInsight(insight.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* All Patterns */}
                    {patterns.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Discovered Patterns
                            </h3>
                            <div className="grid gap-3">
                                {patterns.map(pattern => (
                                    <PatternCard key={pattern.id} pattern={pattern} />
                                ))}
                            </div>
                        </div>
                    )}

                    {patterns.length === 0 && entries.length >= 3 && (
                        <Card className="p-8 text-center text-muted-foreground">
                            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Click &quot;Analyze&quot; to discover patterns in your trading</p>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

interface InsightCardProps {
    insight: PatternInsight;
    onDismiss: () => void;
}

function InsightCard({ insight, onDismiss }: InsightCardProps) {
    const Icon = PATTERN_ICONS[insight.pattern.type];

    return (
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5">
            <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="font-medium">{insight.pattern.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{insight.suggestion}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onDismiss} className="shrink-0 h-6 w-6">
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

interface PatternCardProps {
    pattern: UserPattern;
}

function PatternCard({ pattern }: PatternCardProps) {
    const Icon = PATTERN_ICONS[pattern.type];

    return (
        <Card className="p-3">
            <div className="flex items-start gap-3">
                <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    pattern.impact === 'positive' && "bg-green-500/20 text-green-500",
                    pattern.impact === 'negative' && "bg-red-500/20 text-red-500",
                    pattern.impact === 'neutral' && "bg-slate-500/20 text-slate-500"
                )}>
                    {pattern.impact === 'positive' ? (
                        <TrendingUp className="h-4 w-4" />
                    ) : pattern.impact === 'negative' ? (
                        <TrendingDown className="h-4 w-4" />
                    ) : (
                        <Icon className="h-4 w-4" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{pattern.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                            {pattern.confidence}% confident
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {pattern.description}
                    </p>
                </div>
            </div>
        </Card>
    );
}
