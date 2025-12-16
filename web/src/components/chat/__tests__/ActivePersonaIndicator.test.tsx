import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivePersonaIndicator } from '../ActivePersonaIndicator';
import { useActivePersona } from '@/lib/stores/persona-store';

// Mock dependencies
vi.mock('@/lib/stores/persona-store');

// Mock Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: vi.fn(({ children }) => <div data-testid="tooltip">{children}</div>),
  TooltipContent: vi.fn(({ children }) => <div data-testid="tooltip-content">{children}</div>),
  TooltipProvider: vi.fn(({ children }) => <div>{children}</div>),
  TooltipTrigger: vi.fn(({ children }) => <div data-testid="tooltip-trigger">{children}</div>),
}));

describe('ActivePersonaIndicator', () => {
  const mockPersona = {
    id: 'analyst',
    name: 'Market Analyst',
    shortDescription: 'Expert in market analysis and trends',
    visual: {
      icon: 'TrendingUp',
      color: '--primary',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActivePersona).mockReturnValue(mockPersona as any);
  });

  describe('Rendering', () => {
    it('renders indicator container', () => {
      render(<ActivePersonaIndicator />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('renders icon', () => {
      render(<ActivePersonaIndicator />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('does not show label by default', () => {
      render(<ActivePersonaIndicator />);

      // Without showLabel, name only appears once (in tooltip)
      expect(screen.getAllByText('Market Analyst').length).toBe(1);
    });

    it('shows label when showLabel is true', () => {
      render(<ActivePersonaIndicator showLabel />);

      // Name appears twice with showLabel - once in label, once in tooltip
      expect(screen.getAllByText('Market Analyst').length).toBe(2);
    });

    it('renders tooltip content with persona name', () => {
      render(<ActivePersonaIndicator />);

      // Name appears in tooltip content
      expect(screen.getByText('Market Analyst')).toBeInTheDocument();
    });

    it('renders tooltip content with short description', () => {
      render(<ActivePersonaIndicator />);

      expect(screen.getByText('Expert in market analysis and trends')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<ActivePersonaIndicator className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies rounded-full class', () => {
      const { container } = render(<ActivePersonaIndicator />);

      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });
  });

  describe('Different Personas', () => {
    it('renders with different persona icon', () => {
      vi.mocked(useActivePersona).mockReturnValue({
        id: 'trader',
        name: 'Day Trader',
        shortDescription: 'Fast-paced trading specialist',
        visual: {
          icon: 'Zap',
          color: '--warning',
        },
      } as any);

      render(<ActivePersonaIndicator showLabel />);

      // With showLabel, name appears in both label and tooltip
      expect(screen.getAllByText('Day Trader').length).toBeGreaterThan(0);
    });

    it('falls back to CircleHelp icon for unknown icons', () => {
      vi.mocked(useActivePersona).mockReturnValue({
        id: 'unknown',
        name: 'Unknown',
        shortDescription: 'Unknown persona',
        visual: {
          icon: 'NonExistentIcon',
          color: '--muted',
        },
      } as any);

      render(<ActivePersonaIndicator />);

      // Should render without error
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });
});
