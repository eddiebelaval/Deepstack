/**
 * Persona Module Exports
 *
 * Central export point for all persona-related functionality.
 */

// Types
export type {
  Persona,
  PersonaId,
  PersonaCategory,
  PersonaVisualConfig,
  PersonaPromptConfig,
  PersonaResponseStyle,
} from '@/lib/types/persona';

// Configurations
export {
  PERSONAS,
  DEFAULT_PERSONA_ID,
  getPersona,
  getPersonasByCategory,
  getAllPersonas,
  getTradingPersonas,
  getCoachingPersonas,
  isValidPersonaId,
} from './persona-configs';

// Prompt Builder
export {
  buildPersonaPrompt,
  buildPersonaContext,
  getPersonaModifier,
} from './build-persona-prompt';
