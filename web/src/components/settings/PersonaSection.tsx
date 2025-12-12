'use client';

import React from 'react';
import { TrendingUp, GraduationCap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { PersonaCard } from './PersonaCard';
import { usePersonaStore } from '@/lib/stores/persona-store';
import { getPersonasByCategory } from '@/lib/personas/persona-configs';

/**
 * PersonaSection Component
 * Settings section for selecting AI assistant persona
 */
export function PersonaSection() {
  const { activePersonaId, setActivePersona } = usePersonaStore();

  const tradingPersonas = getPersonasByCategory('trading');
  const coachingPersonas = getPersonasByCategory('coaching');

  return (
    <div className="space-y-6">
      {/* Trading Style */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Trading Style</Label>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {tradingPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isSelected={activePersonaId === persona.id}
              onSelect={() => setActivePersona(persona.id)}
            />
          ))}
        </div>
      </div>

      {/* Coaching Style */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Coaching Style</Label>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {coachingPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isSelected={activePersonaId === persona.id}
              onSelect={() => setActivePersona(persona.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
