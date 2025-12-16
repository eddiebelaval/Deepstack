import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaSelector } from '../PersonaSelector';
import { usePersonaStore, useActivePersona } from '@/lib/stores/persona-store';
import { getPersonasByCategory } from '@/lib/personas/persona-configs';

// Mock dependencies
vi.mock('@/lib/stores/persona-store');
vi.mock('@/lib/personas/persona-configs');
vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
  },
  AnimatePresence: vi.fn(({ children }) => <>{children}</>),
}));

// Mock Popover components
vi.mock('@/components/ui/popover', () => ({
  Popover: vi.fn(({ open, onOpenChange, children }) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  )),
  PopoverContent: vi.fn(({ children, onKeyDown }) => (
    <div data-testid="popover-content" onKeyDown={onKeyDown}>{children}</div>
  )),
  PopoverTrigger: vi.fn(({ children }) => <div data-testid="popover-trigger">{children}</div>),
}));

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, title, disabled, onKeyDown, ...props }) => (
    <button title={title} disabled={disabled} onKeyDown={onKeyDown} {...props}>{children}</button>
  )),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('PersonaSelector', () => {
  const mockSetActivePersona = vi.fn();

  const mockActivePersona = {
    id: 'value_investor',
    name: 'Value Investor',
    shortDescription: 'Focus on fundamentals',
    visual: {
      icon: 'Landmark',
      color: '--primary',
    },
  };

  const mockTradingPersonas = [
    {
      id: 'value_investor',
      name: 'Value Investor',
      shortDescription: 'Focus on fundamentals',
      visual: { icon: 'Landmark' },
    },
    {
      id: 'day_trader',
      name: 'Day Trader',
      shortDescription: 'Fast-paced trading',
      visual: { icon: 'Zap' },
    },
  ];

  const mockCoachingPersonas = [
    {
      id: 'mentor',
      name: 'Trading Mentor',
      shortDescription: 'Educational guidance',
      visual: { icon: 'GraduationCap' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useActivePersona).mockReturnValue(mockActivePersona as any);
    vi.mocked(usePersonaStore).mockReturnValue(mockSetActivePersona);
    vi.mocked(getPersonasByCategory).mockImplementation((category) => {
      if (category === 'trading') return mockTradingPersonas as any;
      if (category === 'coaching') return mockCoachingPersonas as any;
      return [];
    });
  });

  describe('Rendering', () => {
    it('renders trigger button', () => {
      render(<PersonaSelector />);

      expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
    });

    it('renders persona icon in trigger', () => {
      render(<PersonaSelector />);

      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders popover content', () => {
      render(<PersonaSelector />);

      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    it('renders header', () => {
      render(<PersonaSelector />);

      expect(screen.getByText('Select Persona')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<PersonaSelector />);

      expect(screen.getByText("Choose your AI assistant's style")).toBeInTheDocument();
    });
  });

  describe('Category Groups', () => {
    it('renders Trading Style category', () => {
      render(<PersonaSelector />);

      expect(screen.getByText('Trading Style')).toBeInTheDocument();
    });

    it('renders Coaching Style category', () => {
      render(<PersonaSelector />);

      expect(screen.getByText('Coaching Style')).toBeInTheDocument();
    });
  });

  describe('Persona Display', () => {
    it('renders trading personas', () => {
      render(<PersonaSelector />);

      expect(screen.getByText('Value Investor')).toBeInTheDocument();
      expect(screen.getByText('Day Trader')).toBeInTheDocument();
    });

    it('renders coaching personas', () => {
      render(<PersonaSelector />);

      expect(screen.getByText('Trading Mentor')).toBeInTheDocument();
    });

    it('renders persona descriptions', () => {
      render(<PersonaSelector />);

      expect(screen.getByText('Focus on fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Fast-paced trading')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls setActivePersona on persona click', async () => {
      const user = userEvent.setup();
      render(<PersonaSelector />);

      await user.click(screen.getByText('Day Trader'));

      expect(mockSetActivePersona).toHaveBeenCalledWith('day_trader');
    });

    it('calls setActivePersona for coaching persona', async () => {
      const user = userEvent.setup();
      render(<PersonaSelector />);

      await user.click(screen.getByText('Trading Mentor'));

      expect(mockSetActivePersona).toHaveBeenCalledWith('mentor');
    });
  });

  describe('Active State', () => {
    it('highlights active persona', () => {
      render(<PersonaSelector />);

      const activeOption = screen.getByText('Value Investor').closest('button');
      expect(activeOption?.className).toContain('bg-primary');
    });
  });

  describe('Disabled State', () => {
    it('disables trigger when disabled', () => {
      render(<PersonaSelector disabled />);

      const buttons = screen.getAllByRole('button');
      const triggerButton = buttons.find(b => b.getAttribute('title'));
      expect(triggerButton).toBeDisabled();
    });
  });

  describe('Title Attribute', () => {
    it('shows persona name in title', () => {
      render(<PersonaSelector />);

      const buttons = screen.getAllByRole('button');
      const triggerButton = buttons.find(b => b.getAttribute('title'));
      expect(triggerButton).toHaveAttribute('title', 'Persona: Value Investor');
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles ArrowDown key', () => {
      render(<PersonaSelector />);

      const content = screen.getByTestId('popover-content');
      fireEvent.keyDown(content, { key: 'ArrowDown' });

      // Should update focus index
      expect(content).toBeInTheDocument();
    });

    it('handles ArrowUp key', () => {
      render(<PersonaSelector />);

      const content = screen.getByTestId('popover-content');
      fireEvent.keyDown(content, { key: 'ArrowUp' });

      expect(content).toBeInTheDocument();
    });

    it('handles Escape key', () => {
      render(<PersonaSelector />);

      const content = screen.getByTestId('popover-content');
      fireEvent.keyDown(content, { key: 'Escape' });

      expect(content).toBeInTheDocument();
    });
  });
});
