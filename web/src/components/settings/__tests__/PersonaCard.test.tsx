import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaCard } from '../PersonaCard';
import type { Persona } from '@/lib/types/persona';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

describe('PersonaCard', () => {
  const mockPersona: Persona = {
    id: 'value-investor',
    name: 'Value Investor',
    description: 'A patient, Buffett-style investor focused on finding undervalued companies.',
    shortDescription: 'Patient, fundamentals-focused investing',
    category: 'trading',
    visual: {
      icon: 'Landmark',
      color: '--ds-value',
      gradient: 'from-emerald-500 to-teal-600',
    },
    prompt: {
      roleDescription: 'Test role description',
      traits: [],
      focusAreas: [],
      responseStyle: { tone: 'patient', verbosity: 'detailed', technicalLevel: 'intermediate' },
      examplePhrases: [],
      emphasize: [],
      avoid: [],
    },
  };

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders persona name', () => {
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);
      expect(screen.getByText('Value Investor')).toBeInTheDocument();
    });

    it('renders short description', () => {
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);
      expect(screen.getByText('Patient, fundamentals-focused investing')).toBeInTheDocument();
    });

    it('renders full description', () => {
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);
      expect(screen.getByText(/A patient, Buffett-style investor/)).toBeInTheDocument();
    });

    it('renders icon', () => {
      const { container } = render(
        <PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />
      );
      const iconContainer = container.querySelector('.w-10.h-10');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('shows unselected state by default', () => {
      const { container } = render(
        <PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('border-border');
      expect(button).not.toHaveClass('border-primary');
    });

    it('shows selected state when isSelected is true', () => {
      const { container } = render(
        <PersonaCard persona={mockPersona} isSelected={true} onSelect={mockOnSelect} />
      );

      const button = container.querySelector('button');
      expect(button).toHaveClass('border-primary');
    });

    it('shows check icon when selected', () => {
      render(<PersonaCard persona={mockPersona} isSelected={true} onSelect={mockOnSelect} />);

      const { container } = render(
        <PersonaCard persona={mockPersona} isSelected={true} onSelect={mockOnSelect} />
      );

      // Check icon should be present
      const checkIcon = container.querySelector('.bg-primary');
      expect(checkIcon).toBeInTheDocument();
    });

    it('does not show check icon when not selected', () => {
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);

      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onSelect when clicked', async () => {
      const user = userEvent.setup();
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('can be selected even when already selected', async () => {
      const user = userEvent.setup();
      render(<PersonaCard persona={mockPersona} isSelected={true} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('handles multiple clicks', async () => {
      const user = userEvent.setup();
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });
  });

  describe('styling', () => {
    it('applies gradient background on selection', () => {
      const { container } = render(
        <PersonaCard persona={mockPersona} isSelected={true} onSelect={mockOnSelect} />
      );

      const gradient = container.querySelector('.from-emerald-500');
      expect(gradient).toBeInTheDocument();
    });

    it('shows icon with proper styling', () => {
      const { container } = render(
        <PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />
      );

      const iconWrapper = container.querySelector('.w-10.h-10.rounded-lg');
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper).toHaveClass('bg-muted');
    });

    it('changes icon background when selected', () => {
      const { container } = render(
        <PersonaCard persona={mockPersona} isSelected={true} onSelect={mockOnSelect} />
      );

      const iconWrapper = container.querySelector('.w-10.h-10.rounded-lg');
      expect(iconWrapper).toHaveClass('bg-primary/20');
    });
  });

  describe('different personas', () => {
    it('renders day-trader persona', () => {
      const dayTraderPersona: Persona = {
        ...mockPersona,
        id: 'day-trader',
        name: 'Day Trader',
        shortDescription: 'Momentum and technical analysis',
        visual: {
          icon: 'Zap',
          color: '--ds-momentum',
          gradient: 'from-amber-500 to-orange-600',
        },
      };

      render(<PersonaCard persona={dayTraderPersona} isSelected={false} onSelect={mockOnSelect} />);
      expect(screen.getByText('Day Trader')).toBeInTheDocument();
      expect(screen.getByText('Momentum and technical analysis')).toBeInTheDocument();
    });

    it('renders mentor persona', () => {
      const mentorPersona: Persona = {
        ...mockPersona,
        id: 'mentor',
        name: 'Trading Mentor',
        shortDescription: 'Patient, educational guidance',
        category: 'coaching',
        visual: {
          icon: 'GraduationCap',
          color: '--ds-mentor',
          gradient: 'from-violet-500 to-purple-600',
        },
      };

      render(<PersonaCard persona={mentorPersona} isSelected={false} onSelect={mockOnSelect} />);
      expect(screen.getByText('Trading Mentor')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('renders as a button', () => {
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('has proper text hierarchy', () => {
      render(<PersonaCard persona={mockPersona} isSelected={false} onSelect={mockOnSelect} />);

      const name = screen.getByText('Value Investor');
      const shortDesc = screen.getByText('Patient, fundamentals-focused investing');
      const fullDesc = screen.getByText(/A patient, Buffett-style investor/);

      expect(name.tagName).toBe('H4');
      expect(shortDesc.tagName).toBe('P');
      expect(fullDesc.tagName).toBe('P');
    });
  });

  describe('edge cases', () => {
    it('handles missing icon gracefully', () => {
      const personaWithInvalidIcon: Persona = {
        ...mockPersona,
        visual: {
          icon: 'NonExistentIcon' as any,
          color: '--ds-value',
          gradient: 'from-emerald-500 to-teal-600',
        },
      };

      expect(() => {
        render(
          <PersonaCard
            persona={personaWithInvalidIcon}
            isSelected={false}
            onSelect={mockOnSelect}
          />
        );
      }).not.toThrow();
    });

    it('handles long description text', () => {
      const longDescPersona: Persona = {
        ...mockPersona,
        description: 'A '.repeat(200) + 'very long description',
      };

      const { container } = render(
        <PersonaCard persona={longDescPersona} isSelected={false} onSelect={mockOnSelect} />
      );

      const description = container.querySelector('.line-clamp-2');
      expect(description).toBeInTheDocument();
    });

    it('handles empty short description', () => {
      const noShortDescPersona: Persona = {
        ...mockPersona,
        shortDescription: '',
      };

      render(
        <PersonaCard persona={noShortDescPersona} isSelected={false} onSelect={mockOnSelect} />
      );

      expect(screen.getByText('Value Investor')).toBeInTheDocument();
    });
  });
});
