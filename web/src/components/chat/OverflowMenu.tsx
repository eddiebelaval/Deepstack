"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  Mic,
  Paperclip,
  Command,
  History,
  Settings,
} from 'lucide-react';

type OverflowMenuProps = {
  onOpenCommandPalette?: () => void;
  disabled?: boolean;
};

type MenuItem = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  action: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
};

export function OverflowMenu({ onOpenCommandPalette, disabled }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'voice',
      icon: Mic,
      label: 'Voice Input',
      description: 'Speak your message',
      action: () => {
        // TODO: Implement voice input
        console.log('Voice input - coming soon');
        setIsOpen(false);
      },
      comingSoon: true,
    },
    {
      id: 'attach',
      icon: Paperclip,
      label: 'Attachments',
      description: 'Upload files or images',
      action: () => {
        // TODO: Implement file upload
        console.log('Attachments - coming soon');
        setIsOpen(false);
      },
      comingSoon: true,
    },
    {
      id: 'commands',
      icon: Command,
      label: 'Commands',
      description: 'Open command palette (Shift+Tab)',
      action: () => {
        onOpenCommandPalette?.();
        setIsOpen(false);
      },
    },
    {
      id: 'history',
      icon: History,
      label: 'History',
      description: 'View past conversations',
      action: () => {
        // TODO: Implement history view
        console.log('History - coming soon');
        setIsOpen(false);
      },
      comingSoon: true,
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-11 w-11 rounded-xl shrink-0"
          title="More options"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-64 p-2 rounded-xl"
      >
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
                "transition-colors duration-150",
                "hover:bg-muted/50",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                  "bg-muted text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.comingSoon && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
