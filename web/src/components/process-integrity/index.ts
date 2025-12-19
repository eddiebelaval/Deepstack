/**
 * Process Integrity UI Components
 *
 * Components for displaying and interacting with the Process Integrity Engine:
 * - FrictionModal: Modal shown when friction is triggered before a trade
 * - ProcessIntegrityPanel: Dashboard showing all three dimensions
 * - ResearchQualityBadge: Small badge for thesis list items
 * - MaturityBadge: Shows thesis development time
 * - ConvictionBadge: Shows conviction score with trend
 */

export { FrictionModal } from './FrictionModal';
export type { FrictionData, IntegrityScores } from './FrictionModal';

export { ProcessIntegrityPanel } from './ProcessIntegrityPanel';

export {
  ResearchQualityBadge,
  MaturityBadge,
  ConvictionBadge,
} from './ResearchQualityBadge';
