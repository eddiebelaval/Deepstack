/**
 * Process Integrity Engine
 *
 * Expands the Emotional Firewall to track:
 * - Research Quality: Did you do the work?
 * - Time-in-Thesis: How long has this idea been developing?
 * - Conviction Integrity: How strongly stated was your thesis?
 *
 * Provides graduated friction (soft → medium → hard) before trade execution.
 */

// Types
export * from './types';

// Research Quality
export {
  calculateResearchQuality,
  calculateAggregatedResearchQuality,
  isDevilsAdvocateTool,
  isResearchTool,
  getToolCategory,
} from './research-quality';

// Time-in-Thesis
export {
  calculateTimeMetrics,
  calculateTimeMetricsFromDb,
  getMaturityLevel,
  isRushed,
  getEffectiveStartTime,
  groupEventsByType,
  countRefinements,
  getTimeSinceLastEvent,
  getTimeFrictionMessage,
  getSuggestedWaitTime,
  formatDevelopmentTime,
  getMaturityDisplay,
} from './time-in-thesis';

// Conviction Analyzer
export {
  analyzeConviction,
  analyzeConvictionAggregate,
  analyzeConvictionTrend,
  calculateSwing,
  generateConvictionResult,
  isConvictionVolatile,
  isOverconfident,
  getConvictionFrictionMessage,
  getConvictionLabel,
  getConvictionColor,
  getTrendDisplay,
} from './conviction-analyzer';

// Friction Engine
export {
  determineFriction,
  checkProcessIntegrity,
  validateOverride,
  getFrictionDisplay,
  getDimensionDisplayName,
  createScoresSnapshot,
} from './friction-engine';
