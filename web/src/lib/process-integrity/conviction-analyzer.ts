/**
 * Conviction Integrity Analyzer
 *
 * Analyzes user statements to determine conviction level:
 * - Detects certainty language (high conviction)
 * - Detects hedging language (low conviction)
 * - Tracks conviction changes over time
 * - Flags volatile swings
 */

import {
  ConvictionResult,
  ConvictionAnalysisRecord,
  FRICTION_THRESHOLDS,
} from './types';

// ============================================
// LANGUAGE PATTERNS
// ============================================

/**
 * Certainty indicators - suggest high conviction
 * Each pattern has a weight (higher = stronger certainty signal)
 */
const CERTAINTY_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  // Strong certainty
  { pattern: /\bwill\s+definitely\b/i, weight: 20 },
  { pattern: /\bguaranteed\b/i, weight: 20 },
  { pattern: /\bno\s+doubt\b/i, weight: 18 },
  { pattern: /\babsolutely\s+(certain|sure|convinced)\b/i, weight: 18 },
  { pattern: /\bwithout\s+(question|a\s+doubt)\b/i, weight: 18 },

  // Moderate certainty
  { pattern: /\bi('m|\s+am)\s+(certain|confident|sure|convinced)\b/i, weight: 15 },
  { pattern: /\bi\s+know\s+(that|this)\b/i, weight: 12 },
  { pattern: /\bclearly\b/i, weight: 10 },
  { pattern: /\bobviously\b/i, weight: 10 },
  { pattern: /\bundoubtedly\b/i, weight: 12 },

  // Mild certainty
  { pattern: /\bi\s+believe\s+(strongly|firmly)\b/i, weight: 10 },
  { pattern: /\bhigh\s+conviction\b/i, weight: 15 },
  { pattern: /\bvery\s+(bullish|bearish)\b/i, weight: 8 },
  { pattern: /\bwill\s+(go|rise|fall|drop|surge|tank)\b/i, weight: 8 },
];

/**
 * Hedging indicators - suggest low conviction
 * Each pattern has a weight (higher = stronger hedging signal)
 */
const HEDGING_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  // Strong hedging
  { pattern: /\bi('m|\s+am)\s+not\s+sure\b/i, weight: 15 },
  { pattern: /\bno\s+idea\b/i, weight: 15 },
  { pattern: /\bi\s+don('t|t)\s+know\b/i, weight: 12 },

  // Moderate hedging
  { pattern: /\bmight\b/i, weight: 8 },
  { pattern: /\bmaybe\b/i, weight: 8 },
  { pattern: /\bperhaps\b/i, weight: 8 },
  { pattern: /\bcould\s+be\b/i, weight: 7 },
  { pattern: /\bpossibly\b/i, weight: 7 },
  { pattern: /\bprobably\b/i, weight: 5 },

  // Mild hedging (lower weight - these are common in careful analysis)
  { pattern: /\bi\s+think\b/i, weight: 3 },
  { pattern: /\bit\s+seems\b/i, weight: 4 },
  { pattern: /\bif\s+.{1,30}\s+then\b/i, weight: 3 }, // Conditional statements
  { pattern: /\bwe('ll|'ll)\s+see\b/i, weight: 5 },
  { pattern: /\btime\s+will\s+tell\b/i, weight: 5 },

  // Risk acknowledgment (not necessarily bad, but indicates uncertainty)
  { pattern: /\brisks?\s+include\b/i, weight: 2 },
  { pattern: /\bcould\s+go\s+(wrong|either\s+way)\b/i, weight: 5 },
];

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze a statement for conviction indicators
 */
export function analyzeConviction(statement: string): {
  convictionScore: number;
  certaintyIndicators: string[];
  hedgingIndicators: string[];
} {
  const certaintyMatches: string[] = [];
  const hedgingMatches: string[] = [];
  let certaintyWeight = 0;
  let hedgingWeight = 0;

  // Find certainty indicators
  for (const { pattern, weight } of CERTAINTY_PATTERNS) {
    const match = statement.match(pattern);
    if (match) {
      certaintyMatches.push(match[0]);
      certaintyWeight += weight;
    }
  }

  // Find hedging indicators
  for (const { pattern, weight } of HEDGING_PATTERNS) {
    const match = statement.match(pattern);
    if (match) {
      hedgingMatches.push(match[0]);
      hedgingWeight += weight;
    }
  }

  // Calculate score starting from neutral (50)
  // Certainty pushes up, hedging pushes down
  let score = 50 + certaintyWeight - hedgingWeight;

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score));

  return {
    convictionScore: Math.round(score),
    certaintyIndicators: certaintyMatches,
    hedgingIndicators: hedgingMatches,
  };
}

/**
 * Analyze multiple statements and aggregate
 */
export function analyzeConvictionAggregate(statements: string[]): {
  convictionScore: number;
  certaintyIndicators: string[];
  hedgingIndicators: string[];
} {
  if (statements.length === 0) {
    return {
      convictionScore: 50, // Neutral
      certaintyIndicators: [],
      hedgingIndicators: [],
    };
  }

  const allCertainty: string[] = [];
  const allHedging: string[] = [];
  let totalScore = 0;

  for (const statement of statements) {
    const result = analyzeConviction(statement);
    totalScore += result.convictionScore;
    allCertainty.push(...result.certaintyIndicators);
    allHedging.push(...result.hedgingIndicators);
  }

  // Deduplicate indicators
  const uniqueCertainty = [...new Set(allCertainty)];
  const uniqueHedging = [...new Set(allHedging)];

  return {
    convictionScore: Math.round(totalScore / statements.length),
    certaintyIndicators: uniqueCertainty,
    hedgingIndicators: uniqueHedging,
  };
}

// ============================================
// TREND ANALYSIS
// ============================================

type ConvictionTrend = 'stable' | 'increasing' | 'decreasing' | 'volatile';

/**
 * Determine conviction trend from history
 */
export function analyzeConvictionTrend(
  history: ConvictionAnalysisRecord[]
): ConvictionTrend {
  if (history.length < 2) {
    return 'stable';
  }

  // Sort by date ascending
  const sorted = [...history].sort(
    (a, b) => a.analyzedAt.getTime() - b.analyzedAt.getTime()
  );

  // Calculate deltas
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    deltas.push(sorted[i].convictionScore - sorted[i - 1].convictionScore);
  }

  // Check for volatility (large swings in both directions)
  const hasLargePositive = deltas.some((d) => d > 15);
  const hasLargeNegative = deltas.some((d) => d < -15);
  if (hasLargePositive && hasLargeNegative) {
    return 'volatile';
  }

  // Check overall direction
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

  if (avgDelta > 5) {
    return 'increasing';
  }
  if (avgDelta < -5) {
    return 'decreasing';
  }

  return 'stable';
}

/**
 * Calculate swing from previous score
 */
export function calculateSwing(
  currentScore: number,
  previousScore: number | null
): number {
  if (previousScore === null) {
    return 0;
  }
  return Math.abs(currentScore - previousScore);
}

// ============================================
// FULL CONVICTION RESULT
// ============================================

/**
 * Generate complete conviction result with trend analysis
 */
export function generateConvictionResult(
  statement: string,
  history: ConvictionAnalysisRecord[]
): ConvictionResult {
  const analysis = analyzeConviction(statement);
  const trend = analyzeConvictionTrend(history);

  // Get previous score for swing calculation
  const previousScore =
    history.length > 0
      ? history[history.length - 1].convictionScore
      : null;

  const swing = calculateSwing(analysis.convictionScore, previousScore);

  return {
    score: analysis.convictionScore,
    certaintyIndicators: analysis.certaintyIndicators,
    hedgingIndicators: analysis.hedgingIndicators,
    trend,
    previousScore,
    swing,
  };
}

// ============================================
// FRICTION HELPERS
// ============================================

/**
 * Check if conviction is volatile (triggering friction)
 */
export function isConvictionVolatile(swing: number): boolean {
  return swing > FRICTION_THRESHOLDS.convictionIntegrity.volatileSwing;
}

/**
 * Check if conviction is overconfident
 */
export function isOverconfident(score: number): boolean {
  return score >= FRICTION_THRESHOLDS.convictionIntegrity.overconfident;
}

/**
 * Get conviction-based friction message
 */
export function getConvictionFrictionMessage(
  result: ConvictionResult
): string | null {
  if (isConvictionVolatile(result.swing)) {
    return `Your conviction has swung ${result.swing} points. That's a sign of uncertainty—take a moment to write down what changed your mind.`;
  }

  if (isOverconfident(result.score)) {
    return `Extremely high conviction (${result.score}%) can be a warning sign. Have you stress-tested this thesis?`;
  }

  if (result.trend === 'volatile') {
    return `Your conviction has been volatile on this thesis. This pattern often precedes poor decisions.`;
  }

  return null;
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get conviction level label
 */
export function getConvictionLabel(score: number): string {
  if (score >= 80) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

/**
 * Get conviction color for display
 */
export function getConvictionColor(
  score: number
): 'red' | 'yellow' | 'green' | 'orange' {
  // Very high conviction might indicate overconfidence
  if (score >= 90) return 'orange';
  if (score >= 60) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

/**
 * Get trend display info
 */
export function getTrendDisplay(trend: ConvictionTrend): {
  icon: string;
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} {
  switch (trend) {
    case 'increasing':
      return { icon: '↑', label: 'Increasing', color: 'green' };
    case 'decreasing':
      return { icon: '↓', label: 'Decreasing', color: 'yellow' };
    case 'volatile':
      return { icon: '↕', label: 'Volatile', color: 'red' };
    case 'stable':
      return { icon: '→', label: 'Stable', color: 'gray' };
  }
}
