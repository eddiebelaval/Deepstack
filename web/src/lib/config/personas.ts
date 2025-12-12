/**
 * Persona Configurations - Re-export from personas module
 *
 * This file re-exports from the centralized personas module for backward compatibility.
 * The canonical source is now @/lib/personas/persona-configs.ts
 */

// Re-export everything from the personas module
export {
  PERSONAS,
  DEFAULT_PERSONA_ID,
  getPersona,
  getPersonasByCategory,
  getAllPersonas,
  getTradingPersonas,
  getCoachingPersonas,
  isValidPersonaId,
} from '@/lib/personas/persona-configs';

export {
  buildPersonaPrompt,
  buildPersonaContext,
  getPersonaModifier,
} from '@/lib/personas/build-persona-prompt';

// Legacy function name for backward compatibility
export { getAllPersonas as getAllPersonaIds } from '@/lib/personas/persona-configs';

/**
 * @deprecated Use buildPersonaPrompt from @/lib/personas instead
 * Generate system prompt addition for a given persona
 */
export { buildPersonaPrompt as generatePersonaSystemPrompt } from '@/lib/personas/build-persona-prompt';
