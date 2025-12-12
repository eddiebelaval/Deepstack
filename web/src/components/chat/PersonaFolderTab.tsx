"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonaStore, useActivePersona } from '@/lib/stores/persona-store';
import { getPersonasByCategory } from '@/lib/personas/persona-configs';
import type { PersonaId, Persona } from '@/lib/types/persona';
import { cn } from '@/lib/utils';
import {
  Landmark,
  Zap,
  Shield,
  FileSearch,
  GraduationCap,
  Target,
  LineChart,
  Check,
  ChevronDown,
} from 'lucide-react';

// Map persona icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Landmark,
  Zap,
  Shield,
  FileSearch,
  GraduationCap,
  Target,
  LineChart,
};

function PersonaIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = iconMap[iconName] || FileSearch;
  return <Icon className={className} />;
}

type PersonaFolderTabProps = {
  disabled?: boolean;
};

export function PersonaFolderTab({ disabled }: PersonaFolderTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePersona = useActivePersona();
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);

  const tradingPersonas = getPersonasByCategory('trading');
  const coachingPersonas = getPersonasByCategory('coaching');

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelectPersona = (id: PersonaId) => {
    setActivePersona(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute -top-3 left-4 z-[60]">
      {/* Manila Folder Tab */}
      <motion.button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg",
          "bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/80 dark:to-amber-800/60",
          "border border-b-0 border-amber-300/50 dark:border-amber-600/50",
          "shadow-[0_-2px_8px_rgba(0,0,0,0.1)]",
          "text-amber-900 dark:text-amber-100",
          "text-xs font-medium",
          "transition-all duration-200",
          "hover:from-amber-50 hover:to-amber-100 dark:hover:from-amber-800/80 dark:hover:to-amber-700/60",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "from-amber-50 to-amber-100 dark:from-amber-800/80 dark:to-amber-700/60"
        )}
        whileHover={!disabled ? { y: -1 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
      >
        <PersonaIcon iconName={activePersona.visual.icon} className="h-3.5 w-3.5" />
        <span className="max-w-[80px] truncate">{activePersona.name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-3 w-3 opacity-60" />
        </motion.div>
      </motion.button>

      {/* Slide-up Panel - opens above the tab */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "absolute bottom-full left-0 mb-0 w-72",
              "bg-gradient-to-t from-amber-50/95 to-white/95 dark:from-amber-950/95 dark:to-zinc-900/95",
              "backdrop-blur-xl",
              "border border-amber-300/30 dark:border-amber-700/30",
              "rounded-lg rounded-bl-none",
              "shadow-xl shadow-amber-900/10 dark:shadow-black/30",
              "overflow-hidden"
            )}
          >
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-amber-200/50 dark:border-amber-800/50">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Select Persona
              </h3>
              <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-0.5">
                Choose your AI assistant&apos;s personality
              </p>
            </div>

            {/* Persona Categories */}
            <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
              {/* Trading Style */}
              <PersonaCategory
                title="Trading Style"
                personas={tradingPersonas}
                activeId={activePersona.id}
                onSelect={handleSelectPersona}
              />

              {/* Coaching Style */}
              <PersonaCategory
                title="Coaching Style"
                personas={coachingPersonas}
                activeId={activePersona.id}
                onSelect={handleSelectPersona}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type PersonaCategoryProps = {
  title: string;
  personas: Persona[];
  activeId: PersonaId;
  onSelect: (id: PersonaId) => void;
};

function PersonaCategory({ title, personas, activeId, onSelect }: PersonaCategoryProps) {
  return (
    <div className="py-2">
      <div className="px-4 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
          {title}
        </span>
      </div>
      <div className="space-y-0.5 px-2">
        {personas.map((persona) => (
          <PersonaOption
            key={persona.id}
            persona={persona}
            isActive={persona.id === activeId}
            onSelect={() => onSelect(persona.id)}
          />
        ))}
      </div>
    </div>
  );
}

type PersonaOptionProps = {
  persona: Persona;
  isActive: boolean;
  onSelect: () => void;
};

function PersonaOption({ persona, isActive, onSelect }: PersonaOptionProps) {
  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
        "text-left transition-all duration-150",
        isActive
          ? "bg-amber-200/60 dark:bg-amber-800/40 text-amber-950 dark:text-amber-50"
          : "hover:bg-amber-100/50 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"
      )}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon with gradient background */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
          "bg-gradient-to-br",
          persona.visual.gradient || "from-amber-400 to-amber-600",
          "text-white shadow-sm"
        )}
      >
        <PersonaIcon iconName={persona.visual.icon} className="h-4 w-4" />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{persona.name}</span>
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white"
            >
              <Check className="h-2.5 w-2.5" />
            </motion.div>
          )}
        </div>
        <p className="text-[11px] text-amber-700/70 dark:text-amber-300/60 truncate">
          {persona.shortDescription}
        </p>
      </div>
    </motion.button>
  );
}
