"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Brain, Zap, FlaskConical, Search, Check } from 'lucide-react';
import { providerConfig, type LLMProvider } from '@/lib/llm/providers';

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain: Brain,
  Zap: Zap,
  FlaskConical: FlaskConical,
  Search: Search,
};

type ProviderSelectorProps = {
  value: LLMProvider;
  onChange: (provider: LLMProvider) => void;
  disabled?: boolean;
};

export function ProviderSelector({ value, onChange, disabled }: ProviderSelectorProps) {
  const current = providerConfig[value];
  const CurrentIcon = iconMap[current.icon];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="min-w-[140px] justify-between rounded-xl"
        >
          <span className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            <span>{current.name}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px] rounded-xl">
        {(Object.keys(providerConfig) as LLMProvider[]).map((provider) => {
          const config = providerConfig[provider];
          const IconComponent = iconMap[config.icon];
          return (
            <DropdownMenuItem
              key={provider}
              onClick={() => onChange(provider)}
              className="flex flex-col items-start gap-1 py-3"
            >
              <div className="flex items-center gap-2 w-full">
                <IconComponent className="h-4 w-4" />
                <span className="font-medium">{config.name}</span>
                {provider === value && (
                  <Check className="ml-auto h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {config.description}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
