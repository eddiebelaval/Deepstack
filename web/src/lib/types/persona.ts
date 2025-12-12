/**
 * AI Persona Types for DeepStack
 *
 * Defines the type system for AI personas that modify the assistant's
 * behavior, communication style, and analytical focus.
 */

export type PersonaCategory = 'trading' | 'coaching';

export type PersonaId =
  | 'value-investor'
  | 'day-trader'
  | 'risk-manager'
  | 'research-analyst'
  | 'mentor'
  | 'coach'
  | 'analyst';

export interface PersonaVisualConfig {
  /** Lucide icon name */
  icon: string;
  /** CSS variable name for primary color */
  color: string;
  /** Optional Tailwind gradient classes */
  gradient?: string;
}

export interface PersonaResponseStyle {
  /** Communication tone (e.g., 'patient', 'direct', 'analytical') */
  tone: string;
  /** Response length preference */
  verbosity: 'concise' | 'moderate' | 'detailed';
  /** Technical complexity level */
  technicalLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface PersonaPromptConfig {
  /** Detailed description of the persona's role (2-3 sentences) */
  roleDescription: string;
  /** Core personality traits (4 traits) */
  traits: string[];
  /** Areas of analytical focus (6 areas) */
  focusAreas: string[];
  /** Communication style settings */
  responseStyle: PersonaResponseStyle;
  /** Example phrases this persona might use */
  examplePhrases?: string[];
  /** Topics and approaches to emphasize (5 items) */
  emphasize: string[];
  /** Topics and approaches to avoid (4 items) */
  avoid: string[];
}

export interface Persona {
  /** Unique identifier */
  id: PersonaId;
  /** Display name */
  name: string;
  /** Full description for selection UI */
  description: string;
  /** Brief tagline for compact displays */
  shortDescription: string;
  /** Category grouping */
  category: PersonaCategory;
  /** Visual styling configuration */
  visual: PersonaVisualConfig;
  /** Prompt generation configuration */
  prompt: PersonaPromptConfig;
}
