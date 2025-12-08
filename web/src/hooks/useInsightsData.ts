'use client';

import { useMemo } from 'react';
import { useJournalSync } from './useJournalSync';
import { useThesisSync } from './useThesisSync';
import { EmotionType } from '@/lib/stores/journal-store';

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

export function useInsightsData() {
    const { entries, isLoading: isJournalLoading } = useJournalSync();
    const { getActiveTheses, isLoading: isThesisLoading } = useThesisSync();

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

    return {
        stats,
        isLoading: isJournalLoading || isThesisLoading,
        hasData: entries.length > 0
    };
}
