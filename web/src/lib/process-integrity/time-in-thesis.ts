/**
 * Time-in-Thesis Calculator
 *
 * Tracks how long a thesis has been developing:
 * - First mention timestamp (implicit or explicit)
 * - Evolution events (refinements, updates)
 * - Maturity level (nascent, developing, mature)
 */

import {
  TimeMetrics,
  MaturityLevel,
  ThesisEvolutionEvent,
  ThesisWithIntegrity,
  MATURITY_THRESHOLDS,
} from './types';

// ============================================
// MATURITY CALCULATION
// ============================================

/**
 * Determine maturity level based on hours in development
 */
export function getMaturityLevel(hoursInDevelopment: number): MaturityLevel {
  if (hoursInDevelopment >= MATURITY_THRESHOLDS.mature) {
    return 'mature';
  }
  if (hoursInDevelopment >= MATURITY_THRESHOLDS.developing) {
    return 'developing';
  }
  return 'nascent';
}

/**
 * Check if a thesis is being rushed
 * Rushed = less than 1 hour AND fewer than 3 evolution events
 */
export function isRushed(
  hoursInDevelopment: number,
  evolutionEventCount: number
): boolean {
  return hoursInDevelopment < 1 && evolutionEventCount < 3;
}

// ============================================
// TIME CALCULATION
// ============================================

/**
 * Calculate hours between two dates
 */
function hoursBetween(start: Date, end: Date = new Date()): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Get the effective start time for a thesis
 * Uses first_mentioned_at if available, otherwise created_at
 */
export function getEffectiveStartTime(thesis: ThesisWithIntegrity): Date {
  return thesis.firstMentionedAt
    ? new Date(thesis.firstMentionedAt)
    : new Date();
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate all time metrics for a thesis
 */
export function calculateTimeMetrics(
  thesis: ThesisWithIntegrity,
  evolutionEvents: ThesisEvolutionEvent[]
): TimeMetrics {
  const firstMention = thesis.firstMentionedAt
    ? new Date(thesis.firstMentionedAt)
    : null;

  const explicitCreation = thesis.promotedToExplicitAt
    ? new Date(thesis.promotedToExplicitAt)
    : null;

  // Calculate hours from the earliest known timestamp
  const startTime =
    firstMention || (thesis.id ? new Date() : new Date());
  const hoursInDevelopment = hoursBetween(startTime);

  const maturityLevel = getMaturityLevel(hoursInDevelopment);
  const rushed = isRushed(hoursInDevelopment, evolutionEvents.length);

  return {
    firstMentionedAt: firstMention,
    explicitCreatedAt: explicitCreation,
    hoursInDevelopment,
    evolutionEventCount: evolutionEvents.length,
    isRushed: rushed,
    maturityLevel,
  };
}

/**
 * Calculate time metrics from raw database values
 */
export function calculateTimeMetricsFromDb(
  firstMentionedAt: string | null,
  promotedToExplicitAt: string | null,
  createdAt: string,
  evolutionEventCount: number
): TimeMetrics {
  const firstMention = firstMentionedAt
    ? new Date(firstMentionedAt)
    : null;

  const explicitCreation = promotedToExplicitAt
    ? new Date(promotedToExplicitAt)
    : null;

  // Use first mention, or creation date
  const startTime = firstMention || new Date(createdAt);
  const hoursInDevelopment = hoursBetween(startTime);

  const maturityLevel = getMaturityLevel(hoursInDevelopment);
  const rushed = isRushed(hoursInDevelopment, evolutionEventCount);

  return {
    firstMentionedAt: firstMention,
    explicitCreatedAt: explicitCreation,
    hoursInDevelopment,
    evolutionEventCount,
    isRushed: rushed,
    maturityLevel,
  };
}

// ============================================
// EVOLUTION EVENT HELPERS
// ============================================

/**
 * Group evolution events by type
 */
export function groupEventsByType(
  events: ThesisEvolutionEvent[]
): Record<string, ThesisEvolutionEvent[]> {
  return events.reduce(
    (acc, event) => {
      if (!acc[event.eventType]) {
        acc[event.eventType] = [];
      }
      acc[event.eventType].push(event);
      return acc;
    },
    {} as Record<string, ThesisEvolutionEvent[]>
  );
}

/**
 * Count refinements (hypothesis or target changes)
 */
export function countRefinements(events: ThesisEvolutionEvent[]): number {
  return events.filter(
    (e) =>
      e.eventType === 'hypothesis_refined' ||
      e.eventType === 'targets_updated' ||
      e.eventType === 'conditions_added'
  ).length;
}

/**
 * Get time since last evolution event
 */
export function getTimeSinceLastEvent(
  events: ThesisEvolutionEvent[]
): number | null {
  if (events.length === 0) {
    return null;
  }

  // Sort by date descending
  const sorted = [...events].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return hoursBetween(sorted[0].createdAt);
}

// ============================================
// FRICTION HELPERS
// ============================================

/**
 * Get time-based friction message
 */
export function getTimeFrictionMessage(metrics: TimeMetrics): string | null {
  if (metrics.hoursInDevelopment < 1) {
    return `This thesis is very new (${Math.round(metrics.hoursInDevelopment * 60)} minutes). Give yourself time to think before acting.`;
  }

  if (metrics.hoursInDevelopment < 4) {
    return `You've been developing this thesis for ${metrics.hoursInDevelopment.toFixed(1)} hours. Consider waiting until you've had more time to refine it.`;
  }

  if (metrics.isRushed) {
    return `This thesis has very few refinements. Take time to stress-test your assumptions.`;
  }

  return null;
}

/**
 * Get suggested wait time based on current development time
 */
export function getSuggestedWaitTime(hoursInDevelopment: number): {
  hours: number;
  message: string;
} {
  if (hoursInDevelopment < 1) {
    return {
      hours: 4,
      message: 'Consider waiting 4 hours before acting on this thesis.',
    };
  }

  if (hoursInDevelopment < 4) {
    return {
      hours: 24 - hoursInDevelopment,
      message: 'Let this idea mature for a full day before executing.',
    };
  }

  return {
    hours: 0,
    message: 'Your thesis has had reasonable development time.',
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Format hours into human-readable string
 */
export function formatDevelopmentTime(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  if (hours < 24) {
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded} hour${rounded === 1 ? '' : 's'}`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Get maturity level display info
 */
export function getMaturityDisplay(level: MaturityLevel): {
  label: string;
  color: 'red' | 'yellow' | 'green';
  description: string;
} {
  switch (level) {
    case 'nascent':
      return {
        label: 'Nascent',
        color: 'red',
        description: 'Very new idea, needs more development time',
      };
    case 'developing':
      return {
        label: 'Developing',
        color: 'yellow',
        description: 'Thesis is maturing but could use more time',
      };
    case 'mature':
      return {
        label: 'Mature',
        color: 'green',
        description: 'Well-developed thesis with adequate thinking time',
      };
  }
}
