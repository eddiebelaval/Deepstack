/**
 * Research Quality Scoring Engine
 *
 * Calculates a 0-100 score based on:
 * - Tool usage diversity (40 pts)
 * - Devil's advocate engagement (25 pts)
 * - Assumptions documented (20 pts)
 * - Time spent researching (15 pts)
 */

import {
  ResearchSession,
  ResearchQualityResult,
  ResearchQualityBreakdown,
  ToolUsageRecord,
  RESEARCH_QUALITY_WEIGHTS,
} from './types';

// ============================================
// TOOL CATEGORIES
// ============================================

const RESEARCH_TOOLS = {
  // Analysis tools - core research
  analysis: [
    'analyze_stock',
    'search_news',
    'search_knowledge',
    'get_sec_filing',
    'get_earnings_transcript',
    'get_analyst_estimates',
  ],
  // Data tools - market information
  data: [
    'get_quote',
    'get_chart_data',
    'get_positions',
    'get_calendar_events',
    'get_historical_data',
  ],
  // Validation tools - external validation
  validation: [
    'find_markets_for_thesis',
    'compare_market_to_analysis',
    'search_prediction_markets',
    'get_trending_prediction_markets',
  ],
  // Devil's advocate tools
  devilsAdvocate: [
    'challenge_thesis',
    'find_bearish_case',
    'stress_test_thesis',
  ],
};

// All research tools flattened
const ALL_RESEARCH_TOOLS = new Set([
  ...RESEARCH_TOOLS.analysis,
  ...RESEARCH_TOOLS.data,
  ...RESEARCH_TOOLS.validation,
  ...RESEARCH_TOOLS.devilsAdvocate,
]);

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate tool usage score (0-40 points)
 * More diverse tool usage = higher score
 */
function calculateToolUsageScore(toolUsage: ToolUsageRecord[]): number {
  if (!toolUsage || toolUsage.length === 0) {
    return 0;
  }

  // Filter to only research-relevant tools
  const relevantTools = toolUsage.filter((t) =>
    ALL_RESEARCH_TOOLS.has(t.tool)
  );

  if (relevantTools.length === 0) {
    return 0;
  }

  // Count unique tools used
  const uniqueTools = new Set(relevantTools.map((t) => t.tool));

  // Check category coverage
  const categoriesUsed = new Set<string>();
  for (const tool of uniqueTools) {
    for (const [category, tools] of Object.entries(RESEARCH_TOOLS)) {
      if (tools.includes(tool)) {
        categoriesUsed.add(category);
        break;
      }
    }
  }

  // Base score: unique tools (max 8 for full points)
  const uniqueToolScore = Math.min(uniqueTools.size / 8, 1) * 25;

  // Category diversity bonus (max 15 points for all 4 categories)
  const categoryScore = (categoriesUsed.size / 4) * 15;

  return Math.round(uniqueToolScore + categoryScore);
}

/**
 * Calculate devil's advocate score (0-25 points)
 * Full points if engaged, 0 otherwise
 */
function calculateDevilsAdvocateScore(engaged: boolean): number {
  return engaged ? RESEARCH_QUALITY_WEIGHTS.devilsAdvocate : 0;
}

/**
 * Calculate assumptions documented score (0-20 points)
 * 5 points per assumption, max 4 assumptions
 */
function calculateAssumptionsScore(count: number): number {
  return Math.min(count * 5, RESEARCH_QUALITY_WEIGHTS.assumptions);
}

/**
 * Calculate time spent score (0-15 points)
 * Minimum 10 minutes for any credit
 * Max points at 60 minutes
 */
function calculateTimeSpentScore(
  startedAt: Date,
  endedAt: Date | null
): number {
  const endTime = endedAt ? endedAt.getTime() : Date.now();
  const minutesSpent = (endTime - startedAt.getTime()) / (1000 * 60);

  // No credit for less than 10 minutes
  if (minutesSpent < 10) {
    return 0;
  }

  // Linear scale from 10-60 minutes
  const normalizedTime = Math.min((minutesSpent - 10) / 50, 1);
  return Math.round(normalizedTime * RESEARCH_QUALITY_WEIGHTS.timeSpent);
}

/**
 * Generate recommendations based on score breakdown
 */
function generateRecommendations(breakdown: ResearchQualityBreakdown): string[] {
  const recommendations: string[] = [];

  if (breakdown.toolUsage < 20) {
    recommendations.push(
      'Use more research tools: Try analyze_stock, search_news, or get_sec_filing to deepen your analysis.'
    );
  }

  if (breakdown.devilsAdvocate === 0) {
    recommendations.push(
      "Challenge your thesis: Ask me to find the bearish case or stress-test your assumptions."
    );
  }

  if (breakdown.assumptions < 10) {
    recommendations.push(
      'Document your assumptions: Explicitly state what must be true for your thesis to work.'
    );
  }

  if (breakdown.timeSpent < 10) {
    recommendations.push(
      'Spend more time researching: Quality analysis typically takes at least 30 minutes.'
    );
  }

  return recommendations;
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate overall research quality score from a research session
 */
export function calculateResearchQuality(
  session: ResearchSession
): ResearchQualityResult {
  const breakdown: ResearchQualityBreakdown = {
    toolUsage: calculateToolUsageScore(session.toolUsage),
    devilsAdvocate: calculateDevilsAdvocateScore(session.devilsAdvocateEngaged),
    assumptions: calculateAssumptionsScore(session.assumptionsDocumented),
    timeSpent: calculateTimeSpentScore(session.startedAt, session.endedAt),
  };

  const score =
    breakdown.toolUsage +
    breakdown.devilsAdvocate +
    breakdown.assumptions +
    breakdown.timeSpent;

  const recommendations = generateRecommendations(breakdown);

  return {
    score: Math.min(100, Math.round(score)),
    breakdown,
    recommendations,
  };
}

/**
 * Calculate research quality from multiple sessions (aggregated)
 */
export function calculateAggregatedResearchQuality(
  sessions: ResearchSession[]
): ResearchQualityResult {
  if (sessions.length === 0) {
    return {
      score: 0,
      breakdown: {
        toolUsage: 0,
        devilsAdvocate: 0,
        assumptions: 0,
        timeSpent: 0,
      },
      recommendations: [
        'Start your research: Open a conversation and explore your thesis using the available tools.',
      ],
    };
  }

  // Aggregate tool usage across all sessions
  const allToolUsage: ToolUsageRecord[] = [];
  let totalMinutes = 0;
  let devilsAdvocateEngaged = false;
  let totalAssumptions = 0;

  for (const session of sessions) {
    allToolUsage.push(...session.toolUsage);

    if (session.endedAt) {
      totalMinutes +=
        (session.endedAt.getTime() - session.startedAt.getTime()) / (1000 * 60);
    }

    if (session.devilsAdvocateEngaged) {
      devilsAdvocateEngaged = true;
    }

    totalAssumptions += session.assumptionsDocumented;
  }

  // Create synthetic aggregated session
  const aggregatedSession: ResearchSession = {
    id: 'aggregated',
    userId: sessions[0].userId,
    thesisId: sessions[0].thesisId,
    conversationId: null,
    startedAt: new Date(Date.now() - totalMinutes * 60 * 1000),
    endedAt: new Date(),
    toolUsage: allToolUsage,
    toolsUsedCount: allToolUsage.reduce((sum, t) => sum + t.count, 0),
    uniqueToolsUsed: new Set(allToolUsage.map((t) => t.tool)).size,
    devilsAdvocateEngaged,
    assumptionsDocumented: totalAssumptions,
  };

  return calculateResearchQuality(aggregatedSession);
}

/**
 * Check if a tool name is a devil's advocate tool
 */
export function isDevilsAdvocateTool(toolName: string): boolean {
  return RESEARCH_TOOLS.devilsAdvocate.includes(toolName);
}

/**
 * Check if a tool name is a research tool
 */
export function isResearchTool(toolName: string): boolean {
  return ALL_RESEARCH_TOOLS.has(toolName);
}

/**
 * Get the category of a research tool
 */
export function getToolCategory(
  toolName: string
): keyof typeof RESEARCH_TOOLS | null {
  for (const [category, tools] of Object.entries(RESEARCH_TOOLS)) {
    if (tools.includes(toolName)) {
      return category as keyof typeof RESEARCH_TOOLS;
    }
  }
  return null;
}
