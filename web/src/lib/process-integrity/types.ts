/**
 * Process Integrity Engine Types
 *
 * Core types for the expanded Emotional Firewall that tracks:
 * - Research Quality
 * - Time-in-Thesis
 * - Conviction Integrity
 */

// ============================================
// FRICTION TYPES
// ============================================

export type FrictionLevel = 'none' | 'soft' | 'medium' | 'hard';

export type FrictionDimension =
  | 'research_quality'
  | 'time_in_thesis'
  | 'conviction_integrity'
  | 'emotional_firewall'
  | 'combined';

export interface FrictionDecision {
  level: FrictionLevel;
  dimension: FrictionDimension;
  message: string;
  suggestedAction: string;
  canOverride: boolean;
  overrideWarning?: string;
}

// ============================================
// RESEARCH QUALITY TYPES
// ============================================

export interface ToolUsageRecord {
  tool: string;
  count: number;
  symbols?: string[];
  timestamp?: string;
}

export interface ResearchSession {
  id: string;
  userId: string;
  thesisId: string | null;
  conversationId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  toolUsage: ToolUsageRecord[];
  toolsUsedCount: number;
  uniqueToolsUsed: number;
  devilsAdvocateEngaged: boolean;
  assumptionsDocumented: number;
}

export interface ResearchQualityBreakdown {
  toolUsage: number;      // 0-40 points
  devilsAdvocate: number; // 0-25 points
  assumptions: number;    // 0-20 points
  timeSpent: number;      // 0-15 points
}

export interface ResearchQualityResult {
  score: number;          // 0-100
  breakdown: ResearchQualityBreakdown;
  recommendations: string[];
}

// ============================================
// TIME-IN-THESIS TYPES
// ============================================

export type MaturityLevel = 'nascent' | 'developing' | 'mature';

export interface TimeMetrics {
  firstMentionedAt: Date | null;
  explicitCreatedAt: Date | null;
  hoursInDevelopment: number;
  evolutionEventCount: number;
  isRushed: boolean;
  maturityLevel: MaturityLevel;
}

export type ThesisEvolutionEventType =
  | 'implicit_mention'
  | 'explicit_creation'
  | 'hypothesis_refined'
  | 'targets_updated'
  | 'conditions_added'
  | 'status_changed'
  | 'conviction_recorded';

export interface ThesisEvolutionEvent {
  id: string;
  userId: string;
  thesisId: string;
  eventType: ThesisEvolutionEventType;
  previousValue: string | null;
  newValue: string | null;
  messageId: string | null;
  confidenceDelta: number | null;
  createdAt: Date;
}

// ============================================
// CONVICTION INTEGRITY TYPES
// ============================================

export type ConvictionSourceType = 'chat' | 'thesis_hypothesis' | 'journal';

export interface ConvictionAnalysisRecord {
  id: string;
  userId: string;
  thesisId: string;
  statementText: string;
  sourceType: ConvictionSourceType;
  sourceId: string | null;
  convictionScore: number;
  certaintyIndicators: string[];
  hedgingIndicators: string[];
  analyzedAt: Date;
}

export interface ConvictionResult {
  score: number;                   // 0-100
  certaintyIndicators: string[];
  hedgingIndicators: string[];
  trend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  previousScore: number | null;
  swing: number;                   // Absolute change from previous
}

// ============================================
// PROCESS OVERRIDE TYPES
// ============================================

export interface ProcessOverride {
  id: string;
  userId: string;
  thesisId: string | null;
  frictionLevel: FrictionLevel;
  frictionReason: string;
  dimension: FrictionDimension;
  scoresSnapshot: {
    researchQuality: number;
    timeInThesisHours: number;
    conviction: number;
  };
  overrideConfirmed: boolean;
  userReasoning: string | null;
  actionAttempted: string | null;
  symbol: string | null;
  conversationId: string | null;
  createdAt: Date;
}

// ============================================
// PROCESS INTEGRITY CHECK TYPES
// ============================================

export interface ProcessIntegrityCheckRequest {
  symbol: string;
  action: 'BUY' | 'SELL';
  thesisId?: string;
  userId: string;
}

export interface ProcessIntegrityCheckResponse {
  researchQuality: ResearchQualityResult;
  timeInThesis: TimeMetrics;
  convictionIntegrity: ConvictionResult;
  friction: FrictionDecision;
  canProceed: boolean;
  overrideRequired: boolean;
}

// ============================================
// THESIS WITH PROCESS INTEGRITY
// ============================================

export interface ThesisWithIntegrity {
  id: string;
  userId: string;
  symbol: string;
  title: string;
  status: 'drafting' | 'active' | 'validated' | 'invalidated' | 'archived';
  hypothesis: string;

  // Process integrity fields
  firstMentionedAt: Date | null;
  researchQualityScore: number;
  convictionScore: number;
  isImplicitDraft: boolean;
  promotedToExplicitAt: Date | null;

  // Computed fields
  hoursInDevelopment?: number;
  maturityLevel?: MaturityLevel;
}

// ============================================
// THRESHOLDS CONFIGURATION
// ============================================

export const FRICTION_THRESHOLDS = {
  researchQuality: {
    hard: 20,   // Below 20: hard friction
    medium: 40, // 20-40: medium friction
    soft: 60,   // 40-60: soft friction
  },
  timeInThesis: {
    hard: 1,    // Under 1 hour: hard friction
    medium: 4,  // 1-4 hours: medium friction
    soft: 8,    // 4-8 hours: soft friction
  },
  convictionIntegrity: {
    overconfident: 95,  // Flag extremely high conviction
    volatileSwing: 30,  // >30 point change in session
  },
} as const;

export const RESEARCH_QUALITY_WEIGHTS = {
  toolUsage: 40,        // 40 points max
  devilsAdvocate: 25,   // 25 points max
  assumptions: 20,      // 20 points max
  timeSpent: 15,        // 15 points max
} as const;

export const MATURITY_THRESHOLDS = {
  nascent: 0,      // < 4 hours
  developing: 4,   // 4-24 hours
  mature: 24,      // > 24 hours
} as const;
