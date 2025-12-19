'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePatternStore, type PatternInsight, type UserPattern } from '@/lib/stores/pattern-store';
import { useJournalStore } from '@/lib/stores/journal-store';
import { useInsightsData, type PersonalizedRecommendation } from '@/hooks/useInsightsData';
import { toast } from 'sonner';
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
    Target,
    Activity,
    Calendar,
    Clock,
    Flame,
    Timer,
    CheckCircle2,
    XCircle,
    Zap,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ChatTip } from '@/components/ui/chat-tip';

const PATTERN_ICONS = {
    emotion: Heart,
    symbol: BarChart3,
    timing: RefreshCw,
    behavior: Brain,
};

const RECOMMENDATION_ICONS = {
    emotion: Heart,
    timing: Calendar,
    behavior: Brain,
    thesis: Target,
    streak: Flame,
};

const PRIORITY_COLORS = {
    high: 'border-l-red-500 bg-red-500/5',
    medium: 'border-l-amber-500 bg-amber-500/5',
    low: 'border-l-green-500 bg-green-500/5',
};

const PRIORITY_BADGE_COLORS = {
    high: 'bg-red-500/20 text-red-500',
    medium: 'bg-amber-500/20 text-amber-500',
    low: 'bg-green-500/20 text-green-500',
};

export function InsightsPanel() {
    const { stats, patterns, recommendations, hasData } = useInsightsData();
    const {
        patterns: aiPatterns,
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
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);

    const handleAnalyze = async () => {
        if (privacyConsent) {
            setIsAnalyzing(true);
            try {
                await analyzeJournalPatterns();
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const handlePrivacyConsentChange = (checked: boolean) => {
        setPrivacyConsent(checked);
        if (checked) {
            toast.success('Privacy preferences saved');
        } else {
            toast.info('AI analysis disabled');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Brain className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Trading Insights</h2>
                                <p className="text-sm text-muted-foreground">Performance analysis and AI pattern recognition</p>
                                <ChatTip
                                    example="What are my trading patterns?"
                                    moreExamples={['Analyze my win rate', 'When do I trade best?']}
                                    className="mt-1"
                                />
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

            {/* Personalized Recommendations */}
            {recommendations.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Personalized Recommendations
                    </h3>
                    <div className="grid gap-3">
                        {recommendations.map(rec => (
                            <RecommendationCard key={rec.id} recommendation={rec} />
                        ))}
                    </div>
                </div>
            )}

            {/* Pattern Analysis Section */}
            {hasData && stats.totalTrades >= 2 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Pattern Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Day of Week Pattern */}
                        <Card className="p-4 bg-card/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-indigo-500" />
                                </div>
                                <span className="text-sm font-medium">Day of Week</span>
                            </div>
                            {patterns.dayOfWeek.best || patterns.dayOfWeek.worst ? (
                                <div className="space-y-2">
                                    {patterns.dayOfWeek.best && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2">
                                                <TrendingUp className="h-3 w-3 text-green-500" />
                                                Best: {patterns.dayOfWeek.best.day}
                                            </span>
                                            <span className="text-green-500 font-medium">
                                                {patterns.dayOfWeek.best.winRate.toFixed(0)}% WR
                                            </span>
                                        </div>
                                    )}
                                    {patterns.dayOfWeek.worst && patterns.dayOfWeek.worst !== patterns.dayOfWeek.best && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2">
                                                <TrendingDown className="h-3 w-3 text-red-500" />
                                                Worst: {patterns.dayOfWeek.worst.day}
                                            </span>
                                            <span className="text-red-500 font-medium">
                                                {patterns.dayOfWeek.worst.winRate.toFixed(0)}% WR
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Need more trades to analyze</p>
                            )}
                        </Card>

                        {/* Time of Day Pattern */}
                        <Card className="p-4 bg-card/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-cyan-500" />
                                </div>
                                <span className="text-sm font-medium">Time of Day</span>
                            </div>
                            {patterns.timeOfDay.best || patterns.timeOfDay.worst ? (
                                <div className="space-y-2">
                                    {patterns.timeOfDay.best && (
                                        <div className="text-sm">
                                            <span className="flex items-center gap-2">
                                                <TrendingUp className="h-3 w-3 text-green-500" />
                                                Best: {patterns.timeOfDay.best.period}
                                            </span>
                                            <span className="text-green-500 font-medium ml-5">
                                                {patterns.timeOfDay.best.winRate.toFixed(0)}% WR
                                            </span>
                                        </div>
                                    )}
                                    {patterns.timeOfDay.worst && patterns.timeOfDay.worst !== patterns.timeOfDay.best && (
                                        <div className="text-sm mt-2">
                                            <span className="flex items-center gap-2">
                                                <TrendingDown className="h-3 w-3 text-red-500" />
                                                Worst: {patterns.timeOfDay.worst.period}
                                            </span>
                                            <span className="text-red-500 font-medium ml-5">
                                                {patterns.timeOfDay.worst.winRate.toFixed(0)}% WR
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Need more trades to analyze</p>
                            )}
                        </Card>

                        {/* Streak Info */}
                        <Card className="p-4 bg-card/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center",
                                    patterns.streaks.streakType === 'wins' ? "bg-green-500/20" :
                                    patterns.streaks.streakType === 'losses' ? "bg-red-500/20" : "bg-slate-500/20"
                                )}>
                                    <Flame className={cn(
                                        "h-4 w-4",
                                        patterns.streaks.streakType === 'wins' ? "text-green-500" :
                                        patterns.streaks.streakType === 'losses' ? "text-red-500" : "text-slate-500"
                                    )} />
                                </div>
                                <span className="text-sm font-medium">Streaks</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Current:</span>
                                    <span className={cn(
                                        "font-medium",
                                        patterns.streaks.streakType === 'wins' ? "text-green-500" :
                                        patterns.streaks.streakType === 'losses' ? "text-red-500" : "text-muted-foreground"
                                    )}>
                                        {patterns.streaks.currentStreak} {patterns.streaks.streakType !== 'none' ? patterns.streaks.streakType : '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Best win streak:</span>
                                    <span>{patterns.streaks.longestWinStreak}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Worst loss streak:</span>
                                    <span>{patterns.streaks.longestLossStreak}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Hold Time Analysis */}
                        <Card className="p-4 bg-card/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                                    <Timer className="h-4 w-4 text-orange-500" />
                                </div>
                                <span className="text-sm font-medium">Hold Time</span>
                            </div>
                            {patterns.holdTime.avgWinnerHoldDays !== null || patterns.holdTime.avgLoserHoldDays !== null ? (
                                <div className="space-y-2">
                                    {patterns.holdTime.avgWinnerHoldDays !== null && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                Winners avg:
                                            </span>
                                            <span className="text-green-500 font-medium">
                                                {patterns.holdTime.avgWinnerHoldDays.toFixed(1)} days
                                            </span>
                                        </div>
                                    )}
                                    {patterns.holdTime.avgLoserHoldDays !== null && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2">
                                                <XCircle className="h-3 w-3 text-red-500" />
                                                Losers avg:
                                            </span>
                                            <span className="text-red-500 font-medium">
                                                {patterns.holdTime.avgLoserHoldDays.toFixed(1)} days
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Need closed trades with exit data</p>
                            )}
                        </Card>

                        {/* Thesis Validation Rate */}
                        <Card className="p-4 bg-card/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                    <Target className="h-4 w-4 text-violet-500" />
                                </div>
                                <span className="text-sm font-medium">Thesis Validation</span>
                            </div>
                            {patterns.thesisValidationRate !== null ? (
                                <div className="space-y-2">
                                    <div className="text-2xl font-bold">
                                        {patterns.thesisValidationRate.toFixed(0)}%
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        of resolved theses validated
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Validate or invalidate theses to see rate</p>
                            )}
                        </Card>

                        {/* Emotion Correlations */}
                        <Card className="p-4 bg-card/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                                    <Heart className="h-4 w-4 text-pink-500" />
                                </div>
                                <span className="text-sm font-medium">Emotion Impact</span>
                            </div>
                            {patterns.emotionCorrelations.length > 0 ? (
                                <div className="space-y-1">
                                    {patterns.emotionCorrelations.slice(0, 3).map(ec => (
                                        <div key={ec.emotion} className="flex items-center justify-between text-sm">
                                            <span className="capitalize">{ec.emotion}</span>
                                            <span className={cn(
                                                "font-medium",
                                                ec.winRate >= 50 ? "text-green-500" : "text-red-500"
                                            )}>
                                                {ec.winRate.toFixed(0)}% ({ec.totalTrades})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Track emotions on more trades</p>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* Privacy Consent */}
            <Card className="p-4">
                <div className="flex items-start gap-4">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">AI Pattern Learning</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Enable AI analysis of your journal to discover deeper patterns. Your data stays private and is <strong>never shared or sold</strong>. See our{' '}
                                    <Link href="/privacy" className="text-primary hover:underline">
                                        Privacy Policy
                                    </Link>
                                    .
                                </p>
                            </div>
                            <Switch
                                checked={privacyConsent}
                                onCheckedChange={handlePrivacyConsentChange}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {!privacyConsent ? (
                <Card className="p-8 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enable AI pattern learning above to get advanced behavioral insights</p>
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAnalyze}
                                disabled={entries.length < 3 || isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                {isAnalyzing ? 'Analyzing...' : (aiPatterns.length > 0 ? 'Re-analyze' : 'Analyze My Journal')}
                            </Button>
                            {aiPatterns.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearPatterns} className="text-destructive" disabled={isAnalyzing}>
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
                                        Add at least 3 journal entries to enable AI pattern analysis.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Loading Skeleton */}
                    {isAnalyzing && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analyzing patterns...
                            </h3>
                            <div className="grid gap-3">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="p-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                                                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-full" />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Insights */}
                    {!isAnalyzing && activeInsights.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                AI-Detected Patterns
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
                    {!isAnalyzing && aiPatterns.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Discovered Patterns
                            </h3>
                            <div className="grid gap-3">
                                {aiPatterns.map(pattern => (
                                    <PatternCard key={pattern.id} pattern={pattern} />
                                ))}
                            </div>
                        </div>
                    )}

                    {!isAnalyzing && aiPatterns.length === 0 && entries.length >= 3 && (
                        <Card className="p-8 text-center text-muted-foreground">
                            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Click &quot;Analyze My Journal&quot; to discover AI-powered patterns in your trading</p>
                        </Card>
                    )}
                </>
            )}
                </div>
            </ScrollArea>
        </div>
    );
}

interface RecommendationCardProps {
    recommendation: PersonalizedRecommendation;
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
    const Icon = RECOMMENDATION_ICONS[recommendation.type];

    return (
        <Card className={cn("p-4 border-l-4", PRIORITY_COLORS[recommendation.priority])}>
            <div className="flex gap-3">
                <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    recommendation.priority === 'high' ? "bg-red-500/20" :
                    recommendation.priority === 'medium' ? "bg-amber-500/20" : "bg-green-500/20"
                )}>
                    <Icon className={cn(
                        "h-4 w-4",
                        recommendation.priority === 'high' ? "text-red-500" :
                        recommendation.priority === 'medium' ? "text-amber-500" : "text-green-500"
                    )} />
                </div>
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="font-medium">{recommendation.message}</p>
                            <p className="text-sm text-muted-foreground mt-1">{recommendation.actionable}</p>
                        </div>
                        <Badge className={cn("shrink-0 text-xs", PRIORITY_BADGE_COLORS[recommendation.priority])}>
                            {recommendation.priority}
                        </Badge>
                    </div>
                </div>
            </div>
        </Card>
    );
}

interface InsightCardProps {
    insight: PatternInsight;
    onDismiss: () => void;
}

function InsightCard({ insight, onDismiss }: InsightCardProps) {
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
