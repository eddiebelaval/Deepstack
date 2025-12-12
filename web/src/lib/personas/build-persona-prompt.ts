/**
 * Persona Prompt Builder for DeepStack
 *
 * Combines the base trading system prompt with persona-specific
 * behavioral modifiers to create a customized AI assistant.
 */

import type { Persona } from '@/lib/types/persona';
import { TRADING_SYSTEM_PROMPT } from '@/lib/llm/system-prompt';

/**
 * Build a complete system prompt with persona-specific modifiers
 */
export function buildPersonaPrompt(persona: Persona): string {
  const { prompt } = persona;

  // Format traits as a list
  const traitsSection = prompt.traits.map((t) => `- ${t}`).join('\n');

  // Format focus areas as a list
  const focusSection = prompt.focusAreas.map((f) => `- ${f}`).join('\n');

  // Format response style
  const styleSection = [
    `- **Tone**: ${prompt.responseStyle.tone}`,
    `- **Detail Level**: ${prompt.responseStyle.verbosity}`,
    `- **Technical Level**: ${prompt.responseStyle.technicalLevel}`,
  ].join('\n');

  // Format example phrases if provided
  const phrasesSection = prompt.examplePhrases
    ? prompt.examplePhrases.map((p) => `- "${p}"`).join('\n')
    : '';

  // Format emphasize list
  const emphasizeSection = prompt.emphasize.map((e) => `- ${e}`).join('\n');

  // Format avoid list
  const avoidSection = prompt.avoid.map((a) => `- ${a}`).join('\n');

  // Build the persona enhancement block
  const personaBlock = `

## Active Persona: ${persona.name}

${prompt.roleDescription}

### Core Traits
${traitsSection}

### Analytical Focus Areas
When analyzing markets, stocks, or trading decisions, prioritize:
${focusSection}

### Communication Style
${styleSection}

${phrasesSection ? `### Characteristic Phrases\nNaturally incorporate phrases like:\n${phrasesSection}\n` : ''}
### Always Emphasize
${emphasizeSection}

### Avoid
${avoidSection}

---

**IMPORTANT**: Maintain this persona consistently throughout the conversation. Let your responses reflect the ${persona.name}'s perspective, communication style, and analytical focus. However, always prioritize user safety and accurate information over persona consistency.
`;

  // Combine base prompt with persona block
  return TRADING_SYSTEM_PROMPT + personaBlock;
}

/**
 * Build a minimal persona context for use in shorter prompts
 */
export function buildPersonaContext(persona: Persona): string {
  return `You are acting as a ${persona.name}: ${persona.prompt.roleDescription} Your communication is ${persona.prompt.responseStyle.tone} with ${persona.prompt.responseStyle.verbosity} detail at a ${persona.prompt.responseStyle.technicalLevel} technical level.`;
}

/**
 * Get just the persona-specific portion without the base prompt
 */
export function getPersonaModifier(persona: Persona): string {
  const { prompt } = persona;

  return `
[PERSONA: ${persona.name}]
Role: ${prompt.roleDescription}
Traits: ${prompt.traits.join(', ')}
Focus: ${prompt.focusAreas.slice(0, 3).join(', ')}
Style: ${prompt.responseStyle.tone}, ${prompt.responseStyle.verbosity}, ${prompt.responseStyle.technicalLevel}
Emphasize: ${prompt.emphasize.slice(0, 3).join('; ')}
Avoid: ${prompt.avoid.slice(0, 2).join('; ')}
`.trim();
}
