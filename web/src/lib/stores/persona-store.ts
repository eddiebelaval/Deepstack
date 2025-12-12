/**
 * Persona Store for DeepStack
 *
 * Zustand store managing the active AI persona with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonaId } from '@/lib/types/persona';
import { DEFAULT_PERSONA_ID, getPersona, isValidPersonaId } from '@/lib/personas/persona-configs';

interface PersonaState {
  /** Currently active persona ID */
  activePersonaId: PersonaId;

  /** Set the active persona */
  setActivePersona: (id: PersonaId) => void;

  /** Reset to the default persona */
  resetToDefault: () => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      activePersonaId: DEFAULT_PERSONA_ID,

      setActivePersona: (id) => {
        // Validate the persona ID before setting
        if (isValidPersonaId(id)) {
          set({ activePersonaId: id });
        } else {
          console.warn(`Invalid persona ID: ${id}. Using default.`);
          set({ activePersonaId: DEFAULT_PERSONA_ID });
        }
      },

      resetToDefault: () => set({ activePersonaId: DEFAULT_PERSONA_ID }),
    }),
    {
      name: 'deepstack-persona-storage',
      // Only persist the activePersonaId
      partialize: (state) => ({ activePersonaId: state.activePersonaId }),
      // Handle potential invalid stored values
      onRehydrateStorage: () => (state) => {
        if (state && !isValidPersonaId(state.activePersonaId)) {
          state.activePersonaId = DEFAULT_PERSONA_ID;
        }
      },
    }
  )
);

/**
 * Hook to get the currently active persona object
 */
export function useActivePersona() {
  const activePersonaId = usePersonaStore((state) => state.activePersonaId);
  return getPersona(activePersonaId);
}

/**
 * Selector for the active persona ID
 */
export const selectActivePersonaId = (state: PersonaState) => state.activePersonaId;
