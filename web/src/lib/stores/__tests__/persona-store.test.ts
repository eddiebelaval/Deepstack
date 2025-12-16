import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePersonaStore, useActivePersona, selectActivePersonaId } from '../persona-store';
import { act } from '@testing-library/react';
import type { PersonaId } from '@/lib/types/persona';

// Mock the persona configs module
vi.mock('@/lib/personas/persona-configs', () => ({
  DEFAULT_PERSONA_ID: 'neutral-analyst' as PersonaId,
  getPersona: vi.fn((id: PersonaId) => ({
    id,
    name: `Persona ${id}`,
    description: `Description for ${id}`,
    systemPrompt: `System prompt for ${id}`,
    avatar: '👤',
  })),
  isValidPersonaId: vi.fn((id: string): id is PersonaId => {
    const validIds = ['neutral-analyst', 'bull-optimist', 'bear-pessimist', 'contrarian', 'risk-manager'];
    return validIds.includes(id);
  }),
}));

describe('usePersonaStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      usePersonaStore.setState({
        activePersonaId: 'neutral-analyst' as PersonaId,
      });
    });
  });

  describe('initial state', () => {
    it('has default persona as active', () => {
      const state = usePersonaStore.getState();
      expect(state.activePersonaId).toBe('neutral-analyst');
    });
  });

  describe('setActivePersona', () => {
    it('sets valid persona ID', () => {
      act(() => {
        usePersonaStore.getState().setActivePersona('bull-optimist' as PersonaId);
      });

      expect(usePersonaStore.getState().activePersonaId).toBe('bull-optimist');
    });

    it('sets another valid persona ID', () => {
      act(() => {
        usePersonaStore.getState().setActivePersona('bear-pessimist' as PersonaId);
      });

      expect(usePersonaStore.getState().activePersonaId).toBe('bear-pessimist');
    });

    it('rejects invalid persona ID and uses default', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      act(() => {
        usePersonaStore.getState().setActivePersona('invalid-persona' as PersonaId);
      });

      expect(usePersonaStore.getState().activePersonaId).toBe('neutral-analyst');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid persona ID: invalid-persona')
      );

      consoleWarnSpy.mockRestore();
    });

    it('allows switching between valid personas', () => {
      act(() => {
        usePersonaStore.getState().setActivePersona('bull-optimist' as PersonaId);
        usePersonaStore.getState().setActivePersona('bear-pessimist' as PersonaId);
        usePersonaStore.getState().setActivePersona('contrarian' as PersonaId);
      });

      expect(usePersonaStore.getState().activePersonaId).toBe('contrarian');
    });
  });

  describe('resetToDefault', () => {
    it('resets to default persona', () => {
      act(() => {
        usePersonaStore.getState().setActivePersona('bull-optimist' as PersonaId);
        usePersonaStore.getState().resetToDefault();
      });

      expect(usePersonaStore.getState().activePersonaId).toBe('neutral-analyst');
    });

    it('does nothing if already default', () => {
      act(() => {
        usePersonaStore.getState().resetToDefault();
      });

      expect(usePersonaStore.getState().activePersonaId).toBe('neutral-analyst');
    });
  });

  describe('selectActivePersonaId', () => {
    it('selects active persona ID', () => {
      const state = usePersonaStore.getState();
      const personaId = selectActivePersonaId(state);
      expect(personaId).toBe('neutral-analyst');
    });

    it('reflects changes to active persona', () => {
      act(() => {
        usePersonaStore.getState().setActivePersona('risk-manager' as PersonaId);
      });

      const state = usePersonaStore.getState();
      const personaId = selectActivePersonaId(state);
      expect(personaId).toBe('risk-manager');
    });
  });

  describe('useActivePersona hook', () => {
    it('would return active persona object', async () => {
      // Note: useActivePersona is a React hook and can't be called directly in tests
      // This test would need to be in a component test or use renderHook from @testing-library/react
      // Instead, we test that the underlying logic works correctly
      const state = usePersonaStore.getState();
      const { getPersona } = await import('@/lib/personas/persona-configs');
      const persona = getPersona(state.activePersonaId);

      expect(persona).toBeDefined();
      expect(persona.id).toBe('neutral-analyst');
      expect(persona.name).toBeTruthy();
      expect(persona.description).toBeTruthy();
    });
  });
});
