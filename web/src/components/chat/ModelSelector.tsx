"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '@/lib/stores/chat-store';
import { providerConfig, type LLMProvider } from '@/lib/llm/providers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Brain, Zap, FlaskConical, Search, Check } from 'lucide-react';

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Zap,
  FlaskConical,
  Search,
};

// Get short letter codes for each provider
const providerLetters: Record<LLMProvider, string> = {
  claude: 'S',
  claude_opus: 'O',
  claude_haiku: 'H',
  grok: 'G',
  sonar_reasoning: 'R',
  perplexity: 'P',
};

// Group providers for the UI
const providerGroups = {
  claude: ['claude', 'claude_opus', 'claude_haiku'] as LLMProvider[],
  other: ['grok', 'sonar_reasoning', 'perplexity'] as LLMProvider[],
};

type ModelSelectorProps = {
  disabled?: boolean;
};

export function ModelSelector({ disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activeProvider, setActiveProvider } = useChatStore();

  const current = providerConfig[activeProvider];
  const CurrentIcon = iconMap[current.icon];
  const letter = providerLetters[activeProvider];

  const handleSelect = (provider: LLMProvider) => {
    setActiveProvider(provider);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-11 w-11 rounded-xl shrink-0"
          title={`Model: ${current.name}`}
        >
          {/* Letter badge */}
          <div
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg",
              "bg-primary/10 text-primary font-semibold text-sm"
            )}
          >
            {letter}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        className="w-72 p-0 rounded-xl"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Select Model</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose the AI model for your chat
          </p>
        </div>

        {/* Model list */}
        <div className="p-2">
          {/* Claude models */}
          <div className="py-1">
            <div className="px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Claude
              </span>
            </div>
            <div className="space-y-0.5">
              {providerGroups.claude.map((provider) => (
                <ModelOption
                  key={provider}
                  provider={provider}
                  isActive={provider === activeProvider}
                  onSelect={() => handleSelect(provider)}
                />
              ))}
            </div>
          </div>

          {/* Other models */}
          <div className="py-1">
            <div className="px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Other Models
              </span>
            </div>
            <div className="space-y-0.5">
              {providerGroups.other.map((provider) => (
                <ModelOption
                  key={provider}
                  provider={provider}
                  isActive={provider === activeProvider}
                  onSelect={() => handleSelect(provider)}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ModelOptionProps = {
  provider: LLMProvider;
  isActive: boolean;
  onSelect: () => void;
};

function ModelOption({ provider, isActive, onSelect }: ModelOptionProps) {
  const config = providerConfig[provider];
  const Icon = iconMap[config.icon];
  const letter = providerLetters[provider];

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
        "transition-colors duration-150",
        isActive
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50"
      )}
    >
      {/* Letter badge */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <span className="font-semibold text-sm">{letter}</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{config.name}</span>
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground ml-auto"
            >
              <Check className="h-2.5 w-2.5" />
            </motion.div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {config.description}
        </p>
      </div>
    </button>
  );
}
