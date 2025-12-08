'use client';

import { useMemo } from 'react';
import { useJournalSync } from './useJournalSync';
import { useThesisSync } from './useThesisSync';
import { EmotionType, JournalEntry } from '@/lib/stores/journal-store';

export interface InsightStats {
    winRate: number;
    totalPnL: number;
    totalTrades: number;
    activeTheses: number;
    topSymbols: { symbol: string; count: number; winRate: number }[];
    emotionalEdge: {
        bestEmotion?: { emotion: EmotionType; winRate: number; count: number };
        worstEmotion?: { emotion: EmotionType; winRate: number; count: number };
    };
}

export interface DayOfWeekStats {
    day: string;
    dayIndex: number;
    winRate: number;
    trades: number;
    avgPnL: number;
}

export interface TimeOfDayStats {
    period: string;
    winRate: number;
    trades: number;
    avgPnL: number;
}

export interface EmotionCorrelation {
    emotion: EmotionType;
    winRate: number;
    lossRate: number;
    totalTrades: number;
    avgWinPnL: number;
    avgLossPnL: number;
}

export interface StreakInfo {
    currentStreak: number;
    streakType: 'wins' | 'losses' | 'none';
    longestWinStreak: number;
    longestLossStreak: number;
}

export interface HoldTimeAnalysis {
    avgWinnerHoldDays: number | null;
    avgLoserHoldDays: number | null;
    holdTimeInsight: string | null;
}

export interface PatternAnalysis {
    dayOfWeek: {
        best: DayOfWeekStats | null;
        worst: DayOfWeekStats | null;
        allDays: DayOfWeekStats[];
    };
    timeOfDay: {
        best: TimeOfDayStats | null;
        worst: TimeOfDayStats | null;
        allPeriods: TimeOfDayStats[];
    };
    emotionCorrelations: EmotionCorrelation[];
    streaks: StreakInfo;
    holdTime: HoldTimeAnalysis;
    thesisValidationRate: number | null;
}

export interface PersonalizedRecommendation {
    id: string;
    type: 'emotion' | 'timing' | 'behavior' | 'thesis' | 'streak';
    priority: 'high' | 'medium' | 'low';
    message: string;
    actionable: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTimeOfDayPeriod(dateString: string): string {
    const date = new Date(dateString);
    const hour = date.getHours();

    if (hour >= 4 && hour < 9) return 'Pre-market (4-9 AM)';
    if (hour >= 9 && hour < 12) return 'Morning (9 AM-12 PM)';
    if (hour >= 12 && hour < 15) return 'Midday (12-3 PM)';
    if (hour >= 15 && hour < 20) return 'Afternoon (3-8 PM)';
    return 'After hours';
}

function calculateHoldDays(entry: JournalEntry): number | null {
    if (!entry.exitPrice || !entry.tradeDate || !entry.updatedAt) return null;

    const entryDate = new Date(entry.tradeDate);
    const exitDate = new Date(entry.updatedAt);
    const diffTime = Math.abs(exitDate.getTime() - entryDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays;
}

export function useInsightsData() {
    const { entries, isLoading: isJournalLoading } = useJournalSync();
    const { theses, getActiveTheses, isLoading: isThesisLoading } = useThesisSync();

    const stats: InsightStats = useMemo(() => {
        const closedTrades = entries.filter(e => e.exitPrice !== undefined);
        const totalTrades = closedTrades.length;

        if (totalTrades === 0) {
            return {
                winRate: 0,
                totalPnL: 0,
                totalTrades: 0,
                activeTheses: getActiveTheses().length,
                topSymbols: [],
                emotionalEdge: {},
            };
        }

        // Calculate Win Rate & PnL
        const wins = closedTrades.filter(e => (e.pnl || 0) > 0).length;
        const winRate = (wins / totalTrades) * 100;
        const totalPnL = closedTrades.reduce((sum, e) => sum + (e.pnl || 0), 0);

        // Symbol Analysis
        const symbolStats: Record<string, { wins: number; total: number }> = {};
        closedTrades.forEach(e => {
            const sym = e.symbol.toUpperCase();
            if (!symbolStats[sym]) symbolStats[sym] = { wins: 0, total: 0 };
            symbolStats[sym].total++;
            if ((e.pnl || 0) > 0) symbolStats[sym].wins++;
        });

        const topSymbols = Object.entries(symbolStats)
            .map(([symbol, stat]) => ({
                symbol,
                count: stat.total,
                winRate: (stat.wins / stat.total) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Emotion Analysis
        const emotionStats: Record<string, { wins: number; total: number }> = {};
        closedTrades.forEach(e => {
            const emotion = e.emotionAtEntry;
            if (!emotionStats[emotion]) emotionStats[emotion] = { wins: 0, total: 0 };
            emotionStats[emotion].total++;
            if ((e.pnl || 0) > 0) emotionStats[emotion].wins++;
        });

        let bestEmotion: { emotion: EmotionType; winRate: number; count: number } | undefined;
        let worstEmotion: { emotion: EmotionType; winRate: number; count: number } | undefined;

        Object.entries(emotionStats).forEach(([emotion, stat]) => {
            if (stat.total >= 2) { // Minimum sample size
                const rate = (stat.wins / stat.total) * 100;
                const data = { emotion: emotion as EmotionType, winRate: rate, count: stat.total };

                if (!bestEmotion || rate > bestEmotion.winRate) bestEmotion = data;
                if (!worstEmotion || rate < worstEmotion.winRate) worstEmotion = data;
            }
        });

        return {
            winRate,
            totalPnL,
            totalTrades,
            activeTheses: getActiveTheses().length,
            topSymbols,
            emotionalEdge: {
                bestEmotion,
                worstEmotion
            }
        };
    }, [entries, getActiveTheses]);

    const patterns: PatternAnalysis = useMemo(() => {
        const closedTrades = entries.filter(e => e.exitPrice !== undefined);

        // Initialize default pattern analysis
        const defaultPatterns: PatternAnalysis = {
            dayOfWeek: { best: null, worst: null, allDays: [] },
            timeOfDay: { best: null, worst: null, allPeriods: [] },
            emotionCorrelations: [],
            streaks: { currentStreak: 0, streakType: 'none', longestWinStreak: 0, longestLossStreak: 0 },
            holdTime: { avgWinnerHoldDays: null, avgLoserHoldDays: null, holdTimeInsight: null },
            thesisValidationRate: null,
        };

        if (closedTrades.length < 2) {
            return defaultPatterns;
        }

        // === DAY OF WEEK ANALYSIS ===
        const dayStats: Record<number, { wins: number; total: number; totalPnL: number }> = {};

        closedTrades.forEach(e => {
            const date = new Date(e.tradeDate);
            const dayIndex = date.getDay();

            if (!dayStats[dayIndex]) {
                dayStats[dayIndex] = { wins: 0, total: 0, totalPnL: 0 };
            }
            dayStats[dayIndex].total++;
            dayStats[dayIndex].totalPnL += e.pnl || 0;
            if ((e.pnl || 0) > 0) dayStats[dayIndex].wins++;
        });

        const allDays: DayOfWeekStats[] = Object.entries(dayStats)
            .filter(([, stat]) => stat.total >= 1)
            .map(([dayIndex, stat]) => ({
                day: DAYS_OF_WEEK[Number(dayIndex)],
                dayIndex: Number(dayIndex),
                winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
                trades: stat.total,
                avgPnL: stat.total > 0 ? stat.totalPnL / stat.total : 0,
            }))
            .sort((a, b) => b.winRate - a.winRate);

        const daysWithEnoughData = allDays.filter(d => d.trades >= 2);
        const bestDay = daysWithEnoughData.length > 0 ? daysWithEnoughData[0] : null;
        const worstDay = daysWithEnoughData.length > 0 ? daysWithEnoughData[daysWithEnoughData.length - 1] : null;

        // === TIME OF DAY ANALYSIS ===
        const timeStats: Record<string, { wins: number; total: number; totalPnL: number }> = {};

        closedTrades.forEach(e => {
            const period = getTimeOfDayPeriod(e.createdAt);

            if (!timeStats[period]) {
                timeStats[period] = { wins: 0, total: 0, totalPnL: 0 };
            }
            timeStats[period].total++;
            timeStats[period].totalPnL += e.pnl || 0;
            if ((e.pnl || 0) > 0) timeStats[period].wins++;
        });

        const allPeriods: TimeOfDayStats[] = Object.entries(timeStats)
            .filter(([, stat]) => stat.total >= 1)
            .map(([period, stat]) => ({
                period,
                winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
                trades: stat.total,
                avgPnL: stat.total > 0 ? stat.totalPnL / stat.total : 0,
            }))
            .sort((a, b) => b.winRate - a.winRate);

        const periodsWithEnoughData = allPeriods.filter(p => p.trades >= 2);
        const bestPeriod = periodsWithEnoughData.length > 0 ? periodsWithEnoughData[0] : null;
        const worstPeriod = periodsWithEnoughData.length > 0 ? periodsWithEnoughData[periodsWithEnoughData.length - 1] : null;

        // === EMOTION CORRELATIONS ===
        const emotionData: Record<EmotionType, { wins: number; losses: number; total: number; winPnL: number; lossPnL: number }> = {} as Record<EmotionType, { wins: number; losses: number; total: number; winPnL: number; lossPnL: number }>;

        closedTrades.forEach(e => {
            const emotion = e.emotionAtEntry;
            if (!emotionData[emotion]) {
                emotionData[emotion] = { wins: 0, losses: 0, total: 0, winPnL: 0, lossPnL: 0 };
            }
            emotionData[emotion].total++;

            if ((e.pnl || 0) > 0) {
                emotionData[emotion].wins++;
                emotionData[emotion].winPnL += e.pnl || 0;
            } else if ((e.pnl || 0) < 0) {
                emotionData[emotion].losses++;
                emotionData[emotion].lossPnL += Math.abs(e.pnl || 0);
            }
        });

        const emotionCorrelations: EmotionCorrelation[] = Object.entries(emotionData)
            .filter(([, data]) => data.total >= 2)
            .map(([emotion, data]) => ({
                emotion: emotion as EmotionType,
                winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
                lossRate: data.total > 0 ? (data.losses / data.total) * 100 : 0,
                totalTrades: data.total,
                avgWinPnL: data.wins > 0 ? data.winPnL / data.wins : 0,
                avgLossPnL: data.losses > 0 ? data.lossPnL / data.losses : 0,
            }))
            .sort((a, b) => b.winRate - a.winRate);

        // === STREAK ANALYSIS ===
        const sortedTrades = [...closedTrades].sort(
            (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
        );

        let currentStreak = 0;
        let streakType: 'wins' | 'losses' | 'none' = 'none';
        let longestWinStreak = 0;
        let longestLossStreak = 0;
        let tempWinStreak = 0;
        let tempLossStreak = 0;

        sortedTrades.forEach(trade => {
            const isWin = (trade.pnl || 0) > 0;

            if (isWin) {
                tempWinStreak++;
                tempLossStreak = 0;
                longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
            } else {
                tempLossStreak++;
                tempWinStreak = 0;
                longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
            }
        });

        // Current streak from most recent trades
        if (sortedTrades.length > 0) {
            const lastTrade = sortedTrades[sortedTrades.length - 1];
            const lastWasWin = (lastTrade.pnl || 0) > 0;
            streakType = lastWasWin ? 'wins' : 'losses';

            for (let i = sortedTrades.length - 1; i >= 0; i--) {
                const isWin = (sortedTrades[i].pnl || 0) > 0;
                if ((lastWasWin && isWin) || (!lastWasWin && !isWin)) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        // === HOLD TIME ANALYSIS ===
        const winnerHoldTimes: number[] = [];
        const loserHoldTimes: number[] = [];

        closedTrades.forEach(e => {
            const holdDays = calculateHoldDays(e);
            if (holdDays !== null) {
                if ((e.pnl || 0) > 0) {
                    winnerHoldTimes.push(holdDays);
                } else if ((e.pnl || 0) < 0) {
                    loserHoldTimes.push(holdDays);
                }
            }
        });

        const avgWinnerHoldDays = winnerHoldTimes.length > 0
            ? winnerHoldTimes.reduce((a, b) => a + b, 0) / winnerHoldTimes.length
            : null;
        const avgLoserHoldDays = loserHoldTimes.length > 0
            ? loserHoldTimes.reduce((a, b) => a + b, 0) / loserHoldTimes.length
            : null;

        let holdTimeInsight: string | null = null;
        if (avgWinnerHoldDays !== null && avgLoserHoldDays !== null) {
            if (avgWinnerHoldDays > avgLoserHoldDays * 1.5) {
                holdTimeInsight = 'You hold winners longer than losers - good discipline!';
            } else if (avgLoserHoldDays > avgWinnerHoldDays * 1.5) {
                holdTimeInsight = 'You tend to hold losers longer than winners - consider cutting losses faster.';
            }
        }

        // === THESIS VALIDATION RATE ===
        const validatedTheses = theses.filter(t => t.status === 'validated').length;
        const invalidatedTheses = theses.filter(t => t.status === 'invalidated').length;
        const totalResolvedTheses = validatedTheses + invalidatedTheses;
        const thesisValidationRate = totalResolvedTheses > 0
            ? (validatedTheses / totalResolvedTheses) * 100
            : null;

        return {
            dayOfWeek: { best: bestDay, worst: worstDay, allDays },
            timeOfDay: { best: bestPeriod, worst: worstPeriod, allPeriods },
            emotionCorrelations,
            streaks: { currentStreak, streakType, longestWinStreak, longestLossStreak },
            holdTime: { avgWinnerHoldDays, avgLoserHoldDays, holdTimeInsight },
            thesisValidationRate,
        };
    }, [entries, theses]);

    const recommendations: PersonalizedRecommendation[] = useMemo(() => {
        const recs: PersonalizedRecommendation[] = [];
        const closedTrades = entries.filter(e => e.exitPrice !== undefined);

        if (closedTrades.length < 3) {
            return recs;
        }

        // Emotion-based recommendations
        if (stats.emotionalEdge.worstEmotion && stats.emotionalEdge.worstEmotion.winRate < 40) {
            const emotion = stats.emotionalEdge.worstEmotion.emotion;
            const winRate = stats.emotionalEdge.worstEmotion.winRate;
            recs.push({
                id: `rec-emotion-${emotion}`,
                type: 'emotion',
                priority: 'high',
                message: `Consider trading less when feeling ${emotion}`,
                actionable: `Your win rate drops to ${winRate.toFixed(0)}% when entering trades feeling ${emotion}. Use the Emotional Firewall or take a break.`,
            });
        }

        if (stats.emotionalEdge.bestEmotion && stats.emotionalEdge.bestEmotion.winRate > 65) {
            const emotion = stats.emotionalEdge.bestEmotion.emotion;
            const winRate = stats.emotionalEdge.bestEmotion.winRate;
            recs.push({
                id: `rec-emotion-best-${emotion}`,
                type: 'emotion',
                priority: 'low',
                message: `You perform best when feeling ${emotion}`,
                actionable: `You win ${winRate.toFixed(0)}% of trades when feeling ${emotion}. Try to cultivate this mindset before trading.`,
            });
        }

        // Day of week recommendations
        if (patterns.dayOfWeek.worst && patterns.dayOfWeek.worst.winRate < 35 && patterns.dayOfWeek.worst.trades >= 3) {
            recs.push({
                id: `rec-day-worst`,
                type: 'timing',
                priority: 'high',
                message: `Your worst day is ${patterns.dayOfWeek.worst.day}`,
                actionable: `You only win ${patterns.dayOfWeek.worst.winRate.toFixed(0)}% on ${patterns.dayOfWeek.worst.day}s. Consider reducing position size or skipping this day.`,
            });
        }

        if (patterns.dayOfWeek.best && patterns.dayOfWeek.best.winRate > 65 && patterns.dayOfWeek.best.trades >= 3) {
            recs.push({
                id: `rec-day-best`,
                type: 'timing',
                priority: 'medium',
                message: `Your best day is ${patterns.dayOfWeek.best.day}`,
                actionable: `You win ${patterns.dayOfWeek.best.winRate.toFixed(0)}% on ${patterns.dayOfWeek.best.day}s. Consider focusing your best setups on this day.`,
            });
        }

        // Streak-based recommendations
        if (patterns.streaks.streakType === 'losses' && patterns.streaks.currentStreak >= 3) {
            recs.push({
                id: `rec-streak-losing`,
                type: 'streak',
                priority: 'high',
                message: `You're on a ${patterns.streaks.currentStreak}-trade losing streak`,
                actionable: `Consider taking a break to reset mentally. Review your recent trades for common mistakes.`,
            });
        }

        if (patterns.streaks.streakType === 'wins' && patterns.streaks.currentStreak >= 3) {
            recs.push({
                id: `rec-streak-winning`,
                type: 'streak',
                priority: 'low',
                message: `Current streak: ${patterns.streaks.currentStreak} wins`,
                actionable: `Great momentum! Stay disciplined and don't let overconfidence lead to oversized positions.`,
            });
        }

        // Hold time recommendations
        if (patterns.holdTime.holdTimeInsight) {
            recs.push({
                id: `rec-hold-time`,
                type: 'behavior',
                priority: patterns.holdTime.avgLoserHoldDays && patterns.holdTime.avgWinnerHoldDays &&
                    patterns.holdTime.avgLoserHoldDays > patterns.holdTime.avgWinnerHoldDays ? 'high' : 'low',
                message: patterns.holdTime.holdTimeInsight,
                actionable: patterns.holdTime.avgLoserHoldDays && patterns.holdTime.avgWinnerHoldDays
                    ? `Avg winner hold: ${patterns.holdTime.avgWinnerHoldDays.toFixed(1)} days. Avg loser hold: ${patterns.holdTime.avgLoserHoldDays.toFixed(1)} days.`
                    : 'Track more trades to see detailed hold time analysis.',
            });
        }

        // Thesis validation recommendations
        if (patterns.thesisValidationRate !== null) {
            if (patterns.thesisValidationRate < 40) {
                recs.push({
                    id: `rec-thesis-low`,
                    type: 'thesis',
                    priority: 'medium',
                    message: `Your thesis validation rate is ${patterns.thesisValidationRate.toFixed(0)}%`,
                    actionable: `Consider refining your thesis criteria or waiting for higher-conviction setups.`,
                });
            } else if (patterns.thesisValidationRate > 70) {
                recs.push({
                    id: `rec-thesis-high`,
                    type: 'thesis',
                    priority: 'low',
                    message: `Your thesis validation rate is ${patterns.thesisValidationRate.toFixed(0)}%`,
                    actionable: `Your theses are consistently validated. Consider increasing position sizes on high-conviction plays.`,
                });
            }
        }

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }, [entries, stats, patterns]);

    return {
        stats,
        patterns,
        recommendations,
        isLoading: isJournalLoading || isThesisLoading,
        hasData: entries.length > 0
    };
}
