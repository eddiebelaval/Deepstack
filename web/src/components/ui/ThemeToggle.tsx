'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'buttons';
  className?: string;
}

export function ThemeToggle({ variant = 'dropdown', className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={cn('h-9 w-9', className)}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={cn('flex items-center gap-1 rounded-md border p-1', className)}>
        <Button
          variant={theme === 'light' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setTheme('light')}
          className="h-7 px-2"
        >
          <Sun className="h-4 w-4 mr-1" />
          Light
        </Button>
        <Button
          variant={theme === 'dark' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setTheme('dark')}
          className="h-7 px-2"
        >
          <Moon className="h-4 w-4 mr-1" />
          Dark
        </Button>
        <Button
          variant={theme === 'system' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setTheme('system')}
          className="h-7 px-2"
        >
          <Monitor className="h-4 w-4 mr-1" />
          System
        </Button>
      </div>
    );
  }

  // Default: dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('h-9 w-9', className)}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="h-4 w-4 mr-2" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
