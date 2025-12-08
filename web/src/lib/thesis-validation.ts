import { type ThesisEntry } from '@/lib/stores/thesis-store';
import { type JournalEntry } from '@/lib/stores/journal-store';

export interface ValidationFactors {
    conditionsScore: number;
    priceProgressScore: number;
    timeframeScore: number;
    tradesPerformanceScore: number;
}

export interface ValidationCalculationResult {
    totalScore: number;
    factors: ValidationFactors;
    breakdown: string[];
}

/**
 * Calculate auto validation score based on multiple factors
 * @param thesis - The thesis entry to validate
 * @param currentPrice - Current market price of the symbol
 * @param linkedTrades - Journal entries linked to this thesis
 * @returns Calculated score (0-100) and breakdown
 */
export function calculateValidationScore(
    thesis: ThesisEntry,
    currentPrice: number | null,
    linkedTrades: JournalEntry[]
): ValidationCalculationResult {
    const factors: ValidationFactors = {
        conditionsScore: 0,
        priceProgressScore: 0,
        timeframeScore: 0,
        tradesPerformanceScore: 0,
    };

    const breakdown: string[] = [];

    // 1. Key Conditions Score (30 points max)
    // Each condition that can be verified manually contributes equally
    if (thesis.keyConditions.length > 0) {
        // Base assumption: if thesis is active, assume some conditions are met
        // In a full implementation, you'd have checkboxes for each condition
        const assumedMetConditions = Math.min(thesis.keyConditions.length, 3);
        factors.conditionsScore = (assumedMetConditions / thesis.keyConditions.length) * 30;
        breakdown.push(
            `Conditions: ${factors.conditionsScore.toFixed(0)}/30 pts (${assumedMetConditions}/${thesis.keyConditions.length} conditions)`
        );
    } else {
        factors.conditionsScore = 15; // Default if no conditions set
        breakdown.push('Conditions: 15/30 pts (no conditions specified)');
    }

    // 2. Price Progress Score (35 points max)
    // Measures how far price has moved from entry toward exit target
    if (currentPrice && thesis.entryTarget && thesis.exitTarget) {
        const totalRange = thesis.exitTarget - thesis.entryTarget;
        const currentProgress = currentPrice - thesis.entryTarget;
        const progressPercent = totalRange !== 0 ? (currentProgress / totalRange) * 100 : 0;

        // Score based on progress toward target
        if (progressPercent >= 100) {
            factors.priceProgressScore = 35; // Target hit!
            breakdown.push('Price: 35/35 pts (target reached)');
        } else if (progressPercent >= 75) {
            factors.priceProgressScore = 30;
            breakdown.push(`Price: 30/35 pts (${progressPercent.toFixed(0)}% to target)`);
        } else if (progressPercent >= 50) {
            factors.priceProgressScore = 25;
            breakdown.push(`Price: 25/35 pts (${progressPercent.toFixed(0)}% to target)`);
        } else if (progressPercent >= 25) {
            factors.priceProgressScore = 20;
            breakdown.push(`Price: 20/35 pts (${progressPercent.toFixed(0)}% to target)`);
        } else if (progressPercent > 0) {
            factors.priceProgressScore = 15;
            breakdown.push(`Price: 15/35 pts (${progressPercent.toFixed(0)}% to target)`);
        } else {
            // Price moved against thesis
            factors.priceProgressScore = Math.max(0, 10 + progressPercent / 10);
            breakdown.push(`Price: ${factors.priceProgressScore.toFixed(0)}/35 pts (below entry)`);
        }

        // Check if stop loss hit
        if (thesis.stopLoss && currentPrice <= thesis.stopLoss) {
            factors.priceProgressScore = 0;
            breakdown[breakdown.length - 1] = 'Price: 0/35 pts (stop loss hit)';
        }
    } else {
        factors.priceProgressScore = 17.5; // Neutral if no price data
        breakdown.push('Price: 17.5/35 pts (no live price data)');
    }

    // 3. Timeframe Score (20 points max)
    // Penalize if thesis is taking too long relative to timeframe
    const createdDate = new Date(thesis.createdAt);
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    const timeframeMap: Record<string, number> = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
    };

    const expectedDays = timeframeMap[thesis.timeframe] || 30;
    const timeProgress = (daysElapsed / expectedDays) * 100;

    if (timeProgress < 25) {
        factors.timeframeScore = 20; // Early days, thesis still fresh
        breakdown.push(`Time: 20/20 pts (${daysElapsed}d/${expectedDays}d elapsed)`);
    } else if (timeProgress < 50) {
        factors.timeframeScore = 18;
        breakdown.push(`Time: 18/20 pts (${daysElapsed}d/${expectedDays}d elapsed)`);
    } else if (timeProgress < 75) {
        factors.timeframeScore = 15;
        breakdown.push(`Time: 15/20 pts (${daysElapsed}d/${expectedDays}d elapsed)`);
    } else if (timeProgress < 100) {
        factors.timeframeScore = 10;
        breakdown.push(`Time: 10/20 pts (${daysElapsed}d/${expectedDays}d elapsed)`);
    } else {
        factors.timeframeScore = 5; // Overdue
        breakdown.push(`Time: 5/20 pts (overdue: ${daysElapsed}d/${expectedDays}d)`);
    }

    // 4. Trades Performance Score (15 points max)
    // Score based on P&L of linked trades
    if (linkedTrades.length > 0) {
        const totalPnl = linkedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winningTrades = linkedTrades.filter((t) => t.pnl && t.pnl > 0).length;
        const winRate = (winningTrades / linkedTrades.length) * 100;

        if (totalPnl > 0 && winRate >= 60) {
            factors.tradesPerformanceScore = 15;
            breakdown.push(`Trades: 15/15 pts (${linkedTrades.length} trades, ${winRate.toFixed(0)}% win rate)`);
        } else if (totalPnl > 0) {
            factors.tradesPerformanceScore = 12;
            breakdown.push(`Trades: 12/15 pts (profitable, ${winRate.toFixed(0)}% win rate)`);
        } else if (totalPnl === 0 || winRate >= 40) {
            factors.tradesPerformanceScore = 8;
            breakdown.push(`Trades: 8/15 pts (breakeven/mixed results)`);
        } else {
            factors.tradesPerformanceScore = 4;
            breakdown.push(`Trades: 4/15 pts (underperforming)`);
        }
    } else {
        factors.tradesPerformanceScore = 10; // Neutral if no trades yet
        breakdown.push('Trades: 10/15 pts (no trades executed)');
    }

    // Calculate total score
    const totalScore = Math.round(
        factors.conditionsScore +
        factors.priceProgressScore +
        factors.timeframeScore +
        factors.tradesPerformanceScore
    );

    return {
        totalScore: Math.min(100, Math.max(0, totalScore)),
        factors,
        breakdown,
    };
}

/**
 * Get color class based on validation score
 */
export function getScoreColor(score: number): {
    text: string;
    bg: string;
    border: string;
    ring: string;
} {
    if (score >= 70) {
        return {
            text: 'text-green-500',
            bg: 'bg-green-500',
            border: 'border-green-500',
            ring: 'ring-green-500',
        };
    } else if (score >= 40) {
        return {
            text: 'text-amber-500',
            bg: 'bg-amber-500',
            border: 'border-amber-500',
            ring: 'ring-amber-500',
        };
    } else {
        return {
            text: 'text-red-500',
            bg: 'bg-red-500',
            border: 'border-red-500',
            ring: 'ring-red-500',
        };
    }
}

/**
 * Get score label based on value
 */
export function getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Moderate';
    if (score >= 40) return 'Weak';
    return 'Poor';
}
