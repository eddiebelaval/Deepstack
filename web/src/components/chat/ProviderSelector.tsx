"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { providerConfig, type LLMProvider } from '@/lib/llm/providers';

type ProviderSelectorProps = {
  value: LLMProvider;
  onChange: (provider: LLMProvider) => void;
  disabled?: boolean;
};

export function ProviderSelector({ value, onChange, disabled }: ProviderSelectorProps) {
  const current = providerConfig[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="min-w-[140px] justify-between"
        >
          <span className="flex items-center gap-2">
            <span>{current.icon}</span>
            <span>{current.name}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {(Object.keys(providerConfig) as LLMProvider[]).map((provider) => {
          const config = providerConfig[provider];
          return (
            <DropdownMenuItem
              key={provider}
              onClick={() => onChange(provider)}
              className="flex flex-col items-start gap-1 py-3"
            >
              <div className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span className="font-medium">{config.name}</span>
                {provider === value && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
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
