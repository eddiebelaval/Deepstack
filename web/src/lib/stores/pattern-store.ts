import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useJournalStore, type JournalEntry, type EmotionType } from './journal-store';

export interface UserPattern {
    id: string;
    type: 'emotion' | 'timing' | 'symbol' | 'behavior';
    title: string;
    description: string;
    confidence: number; // 0-100
    occurrences: number;
    impact: 'positive' | 'negative' | 'neutral';
    createdAt: string;
    lastUpdated: string;
}

export interface PatternInsight {
    id: string;
    pattern: UserPattern;
    suggestion: string;
    dismissed: boolean;
}

interface PatternStore {
    patterns: UserPattern[];
    insights: PatternInsight[];
    lastAnalyzed: string | null;
    privacyConsent: boolean;

    // Actions
    analyzeJournalPatterns: () => void;
    clearPatterns: () => void;
    setPrivacyConsent: (consent: boolean) => void;
    dismissInsight: (id: string) => void;
    getActiveInsights: () => PatternInsight[];
}

export const usePatternStore = create<PatternStore>()(
    persist(
        (set, get) => ({
            patterns: [],
            insights: [],
            lastAnalyzed: null,
            privacyConsent: false,

            analyzeJournalPatterns: () => {
                if (!get().privacyConsent) return;

                const journalEntries = useJournalStore.getState().entries;
                if (journalEntries.length < 3) return; // Need minimum data

                const newPatterns: UserPattern[] = [];
                const now = new Date().toISOString();

                // === EMOTION PATTERN ANALYSIS ===
                const emotionStats: Record<EmotionType, { wins: number; losses: number; total: number }> = {} as any;

                journalEntries.forEach(entry => {
                    const emotion = entry.emotionAtEntry;
                    if (!emotionStats[emotion]) {
                        emotionStats[emotion] = { wins: 0, losses: 0, total: 0 };
                    }
                    emotionStats[emotion].total++;
                    if (entry.pnl && entry.pnl > 0) emotionStats[emotion].wins++;
                    if (entry.pnl && entry.pnl < 0) emotionStats[emotion].losses++;
                });

                // Find problematic emotions
                Object.entries(emotionStats).forEach(([emotion, stats]) => {
                    if (stats.total >= 2) {
                        const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
                        const lossRate = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0;

                        if (lossRate > 60) {
                            newPatterns.push({
                                id: `emotion-loss-${emotion}`,
                                type: 'emotion',
                                title: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} trading tends to lose`,
                                description: `When entering trades feeling ${emotion}, you have a ${lossRate.toFixed(0)}% loss rate (${stats.losses}/${stats.total} trades).`,
                                confidence: Math.min(95, 50 + stats.total * 10),
                                occurrences: stats.total,
                                impact: 'negative',
                                createdAt: now,
                                lastUpdated: now,
                            });
                        }

                        if (winRate > 70 && stats.total >= 3) {
                            newPatterns.push({
                                id: `emotion-win-${emotion}`,
                                type: 'emotion',
                                title: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} trades perform well`,
                                description: `When entering trades feeling ${emotion}, you have a ${winRate.toFixed(0)}% win rate (${stats.wins}/${stats.total} trades).`,
                                confidence: Math.min(95, 50 + stats.total * 10),
                                occurrences: stats.total,
                                impact: 'positive',
                                createdAt: now,
                                lastUpdated: now,
                            });
                        }
                    }
                });

                // === SYMBOL PATTERN ANALYSIS ===
                const symbolStats: Record<string, { wins: number; losses: number; total: number; totalPnl: number }> = {};

                journalEntries.forEach(entry => {
                    const sym = entry.symbol.toUpperCase();
                    if (!symbolStats[sym]) {
                        symbolStats[sym] = { wins: 0, losses: 0, total: 0, totalPnl: 0 };
                    }
                    symbolStats[sym].total++;
                    symbolStats[sym].totalPnl += entry.pnl || 0;
                    if (entry.pnl && entry.pnl > 0) symbolStats[sym].wins++;
                    if (entry.pnl && entry.pnl < 0) symbolStats[sym].losses++;
                });

                Object.entries(symbolStats).forEach(([symbol, stats]) => {
                    if (stats.total >= 3) {
                        const winRate = (stats.wins / stats.total) * 100;

                        if (winRate > 70) {
                            newPatterns.push({
                                id: `symbol-win-${symbol}`,
                                type: 'symbol',
                                title: `Strong performance on ${symbol}`,
                                description: `You have a ${winRate.toFixed(0)}% win rate on ${symbol} with $${stats.totalPnl.toFixed(2)} total P&L.`,
                                confidence: Math.min(95, 50 + stats.total * 8),
                                occurrences: stats.total,
                                impact: 'positive',
                                createdAt: now,
                                lastUpdated: now,
                            });
                        }

                        if (winRate < 40 && stats.total >= 3) {
                            newPatterns.push({
                                id: `symbol-loss-${symbol}`,
                                type: 'symbol',
                                title: `Struggling with ${symbol}`,
                                description: `You have a ${winRate.toFixed(0)}% win rate on ${symbol}. Consider avoiding or studying this symbol.`,
                                confidence: Math.min(95, 50 + stats.total * 8),
                                occurrences: stats.total,
                                impact: 'negative',
                                createdAt: now,
                                lastUpdated: now,
                            });
                        }
                    }
                });

                // === EXIT EMOTION PATTERNS ===
                const exitEmotionCorrelation: Record<string, { earlyExits: number; total: number }> = {};

                journalEntries.forEach(entry => {
                    if (entry.emotionAtExit) {
                        if (!exitEmotionCorrelation[entry.emotionAtExit]) {
                            exitEmotionCorrelation[entry.emotionAtExit] = { earlyExits: 0, total: 0 };
                        }
                        exitEmotionCorrelation[entry.emotionAtExit].total++;
                        // Consider "fearful" or "anxious" exits as potentially early
                        if (entry.emotionAtExit === 'fearful' || entry.emotionAtExit === 'anxious') {
                            if (entry.pnl && entry.pnl > 0 && entry.pnlPercent && entry.pnlPercent < 3) {
                                exitEmotionCorrelation[entry.emotionAtExit].earlyExits++;
                            }
                        }
                    }
                });

                if (exitEmotionCorrelation['fearful']?.earlyExits >= 2) {
                    newPatterns.push({
                        id: 'behavior-early-exit-fear',
                        type: 'behavior',
                        title: 'Fear may be causing early exits',
                        description: `You've exited ${exitEmotionCorrelation['fearful'].earlyExits} winning trades early due to fear. Consider holding winners longer.`,
                        confidence: 70,
                        occurrences: exitEmotionCorrelation['fearful'].earlyExits,
                        impact: 'negative',
                        createdAt: now,
                        lastUpdated: now,
                    });
                }

                // Generate insights from patterns
                const newInsights: PatternInsight[] = newPatterns
                    .filter(p => p.impact === 'negative')
                    .map(pattern => ({
                        id: `insight-${pattern.id}`,
                        pattern,
                        suggestion: generateSuggestion(pattern),
                        dismissed: false,
                    }));

                set({
                    patterns: newPatterns,
                    insights: newInsights,
                    lastAnalyzed: now,
                });
            },

            clearPatterns: () => set({
                patterns: [],
                insights: [],
                lastAnalyzed: null,
            }),

            setPrivacyConsent: (consent) => set({ privacyConsent: consent }),

            dismissInsight: (id) => set(state => ({
                insights: state.insights.map(i =>
                    i.id === id ? { ...i, dismissed: true } : i
                ),
            })),

            getActiveInsights: () => get().insights.filter(i => !i.dismissed),
        }),
        {
            name: 'deepstack-pattern-storage',
        }
    )
);

function generateSuggestion(pattern: UserPattern): string {
    switch (pattern.type) {
        case 'emotion':
            if (pattern.impact === 'negative') {
                return `Consider pausing before trading when feeling ${pattern.title.split(' ')[0].toLowerCase()}. Use the Emotional Firewall or journal your thoughts first.`;
            }
            return `Continue trading with confidence when feeling this way.`;

        case 'symbol':
            if (pattern.impact === 'negative') {
                return `Consider paper trading ${pattern.title.split(' ').pop()} or studying the chart patterns before your next trade.`;
            }
            return `This is one of your best-performing symbols. Keep doing what works!`;

        case 'behavior':
            return `Awareness is the first step. Try setting profit targets before entering to reduce emotional exits.`;

        default:
            return `Review this pattern and consider how it affects your trading.`;
    }
}
