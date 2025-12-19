/**
 * Friction Engine
 *
 * The orchestrator that combines all three dimensions:
 * - Research Quality
 * - Time-in-Thesis
 * - Conviction Integrity
 *
 * Determines the appropriate friction level and generates
 * user-facing messages and suggestions.
 */

import {
  FrictionLevel,
  FrictionDecision,
  FrictionDimension,
  ResearchQualityResult,
  TimeMetrics,
  ConvictionResult,
  ProcessIntegrityCheckResponse,
  FRICTION_THRESHOLDS,
} from './types';

// ============================================
// FRICTION MESSAGES
// ============================================

const FRICTION_MESSAGES = {
  researchQuality: {
    hard: {
      message:
        "I'm not comfortable helping you execute this without more research. Your thesis lacks foundation.",
      suggestedAction:
        "Let's analyze the stock together, explore the bearish case, and document your key assumptions.",
      overrideWarning:
        'Executing with minimal research significantly increases your risk of losses.',
    },
    medium: {
      message: 'Your thesis is thin. Let me help you strengthen it before proceeding.',
      suggestedAction:
        'Try using the analysis tools or asking me to challenge your assumptions.',
      overrideWarning: 'Proceeding without stronger research increases your risk.',
    },
    soft: {
      message: 'Your research could be stronger. Consider deepening your analysis.',
      suggestedAction:
        'Have you looked at the bearish case? What assumptions are you making?',
    },
  },
  timeInThesis: {
    hard: {
      message:
        'This thesis is very new. You\'ve been developing it for less than an hour.',
      suggestedAction:
        'Set an alert and revisit this tomorrow. Good ideas survive the overnight test.',
      overrideWarning:
        'Rushing into positions is one of the most common causes of trading losses.',
    },
    medium: {
      message:
        'This idea is still young. Give yourself more time to think it through.',
      suggestedAction:
        'Consider waiting a few more hours. Use that time to stress-test your thesis.',
      overrideWarning: 'Quick decisions often lead to regret.',
    },
    soft: {
      message: 'Your thesis could use more development time.',
      suggestedAction: 'What would make you more confident in this trade?',
    },
  },
  convictionIntegrity: {
    volatile: {
      message:
        "Your conviction has been swinging. That's a sign you're not sure.",
      suggestedAction:
        'Take a moment to write down what changed your mind. Are you reacting to noise?',
      overrideWarning: 'Volatile conviction often precedes poor decisions.',
    },
    overconfident: {
      message:
        'Your conviction seems extremely high. Have you truly considered what could go wrong?',
      suggestedAction:
        'Ask me to find the bearish case. The best traders are always questioning themselves.',
    },
  },
};

// ============================================
// INDIVIDUAL DIMENSION CHECKS
// ============================================

/**
 * Check research quality dimension
 */
function checkResearchQuality(result: ResearchQualityResult): FrictionDecision | null {
  const score = result.score;

  if (score < FRICTION_THRESHOLDS.researchQuality.hard) {
    return {
      level: 'hard',
      dimension: 'research_quality',
      ...FRICTION_MESSAGES.researchQuality.hard,
      canOverride: true,
    };
  }

  if (score < FRICTION_THRESHOLDS.researchQuality.medium) {
    return {
      level: 'medium',
      dimension: 'research_quality',
      ...FRICTION_MESSAGES.researchQuality.medium,
      canOverride: true,
    };
  }

  if (score < FRICTION_THRESHOLDS.researchQuality.soft) {
    return {
      level: 'soft',
      dimension: 'research_quality',
      ...FRICTION_MESSAGES.researchQuality.soft,
      canOverride: true,
    };
  }

  return null;
}

/**
 * Check time-in-thesis dimension
 */
function checkTimeInThesis(metrics: TimeMetrics): FrictionDecision | null {
  const hours = metrics.hoursInDevelopment;

  if (hours < FRICTION_THRESHOLDS.timeInThesis.hard) {
    return {
      level: 'hard',
      dimension: 'time_in_thesis',
      ...FRICTION_MESSAGES.timeInThesis.hard,
      canOverride: true,
    };
  }

  if (hours < FRICTION_THRESHOLDS.timeInThesis.medium) {
    return {
      level: 'medium',
      dimension: 'time_in_thesis',
      ...FRICTION_MESSAGES.timeInThesis.medium,
      canOverride: true,
    };
  }

  if (hours < FRICTION_THRESHOLDS.timeInThesis.soft) {
    return {
      level: 'soft',
      dimension: 'time_in_thesis',
      ...FRICTION_MESSAGES.timeInThesis.soft,
      canOverride: true,
    };
  }

  return null;
}

/**
 * Check conviction integrity dimension
 */
function checkConvictionIntegrity(result: ConvictionResult): FrictionDecision | null {
  // Check for volatile swings first (more concerning)
  if (result.swing > FRICTION_THRESHOLDS.convictionIntegrity.volatileSwing) {
    return {
      level: 'medium',
      dimension: 'conviction_integrity',
      ...FRICTION_MESSAGES.convictionIntegrity.volatile,
      canOverride: true,
    };
  }

  // Check for overconfidence
  if (result.score >= FRICTION_THRESHOLDS.convictionIntegrity.overconfident) {
    return {
      level: 'soft',
      dimension: 'conviction_integrity',
      ...FRICTION_MESSAGES.convictionIntegrity.overconfident,
      canOverride: true,
    };
  }

  // Check for volatile trend
  if (result.trend === 'volatile') {
    return {
      level: 'soft',
      dimension: 'conviction_integrity',
      ...FRICTION_MESSAGES.convictionIntegrity.volatile,
      canOverride: true,
    };
  }

  return null;
}

// ============================================
// ESCALATION LOGIC
// ============================================

/**
 * Escalate friction level based on override history
 * If user has overridden frequently, increase friction
 */
function escalateFriction(
  decision: FrictionDecision,
  recentOverrides: number
): FrictionDecision {
  // 3+ overrides in 7 days = escalate
  if (recentOverrides >= 3) {
    if (decision.level === 'soft') {
      return {
        ...decision,
        level: 'medium',
        message: `${decision.message} (Escalated: You've overridden friction ${recentOverrides} times recently.)`,
      };
    }
    if (decision.level === 'medium') {
      return {
        ...decision,
        level: 'hard',
        message: `${decision.message} (Escalated: You've overridden friction ${recentOverrides} times recently.)`,
        overrideWarning:
          'Frequent overrides suggest a pattern of rushing past warnings. Consider why these friction points keep triggering.',
      };
    }
  }

  return decision;
}

// ============================================
// MAIN FRICTION DETERMINATION
// ============================================

/**
 * Determine overall friction level from all dimensions
 */
export function determineFriction(
  researchQuality: ResearchQualityResult,
  timeMetrics: TimeMetrics,
  conviction: ConvictionResult,
  recentOverrides: number = 0
): FrictionDecision {
  const decisions: FrictionDecision[] = [];

  // Check each dimension
  const researchDecision = checkResearchQuality(researchQuality);
  if (researchDecision) decisions.push(researchDecision);

  const timeDecision = checkTimeInThesis(timeMetrics);
  if (timeDecision) decisions.push(timeDecision);

  const convictionDecision = checkConvictionIntegrity(conviction);
  if (convictionDecision) decisions.push(convictionDecision);

  // If no friction from any dimension
  if (decisions.length === 0) {
    return {
      level: 'none',
      dimension: 'combined',
      message: 'Your process looks solid. Ready to proceed.',
      suggestedAction: '',
      canOverride: true,
    };
  }

  // Sort by friction level (hard > medium > soft)
  const levelOrder: FrictionLevel[] = ['hard', 'medium', 'soft', 'none'];
  decisions.sort(
    (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
  );

  // Get highest friction decision
  let highestFriction = decisions[0];

  // Apply escalation based on override history
  highestFriction = escalateFriction(highestFriction, recentOverrides);

  // If multiple dimensions have friction, note it
  if (decisions.length > 1) {
    const dimensions = decisions.map((d) => d.dimension).join(', ');
    highestFriction = {
      ...highestFriction,
      dimension: 'combined',
      message: `${highestFriction.message} (Multiple concerns: ${dimensions})`,
    };
  }

  return highestFriction;
}

// ============================================
// FULL PROCESS INTEGRITY CHECK
// ============================================

/**
 * Perform complete process integrity check
 */
export function checkProcessIntegrity(
  researchQuality: ResearchQualityResult,
  timeMetrics: TimeMetrics,
  conviction: ConvictionResult,
  recentOverrides: number = 0
): ProcessIntegrityCheckResponse {
  const friction = determineFriction(
    researchQuality,
    timeMetrics,
    conviction,
    recentOverrides
  );

  const canProceed = friction.level === 'none';
  const overrideRequired = friction.level !== 'none';

  return {
    researchQuality,
    timeInThesis: timeMetrics,
    convictionIntegrity: conviction,
    friction,
    canProceed,
    overrideRequired,
  };
}

// ============================================
// OVERRIDE VALIDATION
// ============================================

/**
 * Validate an override request
 */
export function validateOverride(
  frictionLevel: FrictionLevel,
  userReasoning: string | null
): { valid: boolean; message: string } {
  // Hard friction requires reasoning
  if (frictionLevel === 'hard' && (!userReasoning || userReasoning.length < 10)) {
    return {
      valid: false,
      message:
        'Hard friction requires you to explain why you want to proceed despite the warning.',
    };
  }

  return {
    valid: true,
    message: 'Override accepted. Proceeding with action.',
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get friction level display info
 */
export function getFrictionDisplay(level: FrictionLevel): {
  color: 'green' | 'yellow' | 'orange' | 'red';
  icon: string;
  label: string;
} {
  switch (level) {
    case 'none':
      return { color: 'green', icon: '✓', label: 'Clear to Proceed' };
    case 'soft':
      return { color: 'yellow', icon: '⚠', label: 'Consider' };
    case 'medium':
      return { color: 'orange', icon: '⚠', label: 'Pause' };
    case 'hard':
      return { color: 'red', icon: '✗', label: 'Stop' };
  }
}

/**
 * Get dimension display name
 */
export function getDimensionDisplayName(dimension: FrictionDimension): string {
  switch (dimension) {
    case 'research_quality':
      return 'Research Quality';
    case 'time_in_thesis':
      return 'Time in Thesis';
    case 'conviction_integrity':
      return 'Conviction Integrity';
    case 'emotional_firewall':
      return 'Emotional State';
    case 'combined':
      return 'Multiple Factors';
  }
}

/**
 * Create scores snapshot for override logging
 */
export function createScoresSnapshot(
  researchQuality: ResearchQualityResult,
  timeMetrics: TimeMetrics,
  conviction: ConvictionResult
): { researchQuality: number; timeInThesisHours: number; conviction: number } {
  return {
    researchQuality: researchQuality.score,
    timeInThesisHours: Math.round(timeMetrics.hoursInDevelopment * 10) / 10,
    conviction: conviction.score,
  };
}
