import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaFolderTab } from '../PersonaFolderTab';
import { usePersonaStore, useActivePersona } from '@/lib/stores/persona-store';
import { getPersonasByCategory } from '@/lib/personas/persona-configs';

// Mock dependencies
vi.mock('@/lib/stores/persona-store');
vi.mock('@/lib/personas/persona-configs');
vi.mock('framer-motion', () => ({
  motion: {
    button: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
    div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
  },
  AnimatePresence: vi.fn(({ children }) => <>{children}</>),
}));

describe('PersonaFolderTab', () => {
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
      visual: { icon: 'Landmark', gradient: 'from-blue-400 to-blue-600' },
    },
    {
      id: 'day_trader',
      name: 'Day Trader',
      shortDescription: 'Fast-paced trading',
      visual: { icon: 'Zap', gradient: 'from-yellow-400 to-yellow-600' },
    },
  ];

  const mockCoachingPersonas = [
    {
      id: 'mentor',
      name: 'Trading Mentor',
      shortDescription: 'Educational guidance',
      visual: { icon: 'GraduationCap', gradient: 'from-green-400 to-green-600' },
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
    it('renders trigger button with persona name', () => {
      render(<PersonaFolderTab />);

      expect(screen.getByText('Value Investor')).toBeInTheDocument();
    });

    it('renders persona icon', () => {
      render(<PersonaFolderTab />);

      expect(document.querySelector('svg.lucide')).toBeInTheDocument();
    });

    it('has correct aria-label with persona name', () => {
      render(<PersonaFolderTab />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Persona selector. Currently selected: Value Investor');
    });

    it('has aria-expanded false when closed', () => {
      render(<PersonaFolderTab />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Opening Panel', () => {
    it('opens panel on click', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('sets aria-expanded true when open', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      const button = screen.getByRole('button', { name: /Persona selector/ });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('shows header when open', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Select Persona')).toBeInTheDocument();
    });

    it('shows description when open', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText("Choose your AI assistant's personality")).toBeInTheDocument();
    });
  });

  describe('Category Groups', () => {
    it('shows Trading Style category', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Trading Style')).toBeInTheDocument();
    });

    it('shows Coaching Style category', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Coaching Style')).toBeInTheDocument();
    });
  });

  describe('Persona Options', () => {
    it('shows trading personas', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      // Value Investor appears twice - in trigger and in options
      expect(screen.getAllByText('Value Investor').length).toBeGreaterThan(0);
      expect(screen.getByText('Day Trader')).toBeInTheDocument();
    });

    it('shows coaching personas', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Trading Mentor')).toBeInTheDocument();
    });

    it('shows persona descriptions', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Fast-paced trading')).toBeInTheDocument();
    });

    it('marks active persona with aria-selected', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      const options = screen.getAllByRole('option');
      const activeOption = options.find(opt => opt.getAttribute('aria-selected') === 'true');
      expect(activeOption).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls setActivePersona on persona click', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Day Trader'));

      expect(mockSetActivePersona).toHaveBeenCalledWith('day_trader');
    });

    it('closes panel after selection', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Day Trader'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables button when disabled', () => {
      render(<PersonaFolderTab disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('has opacity class when disabled', () => {
      render(<PersonaFolderTab disabled />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('opacity-50');
    });

    it('does not open when disabled', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab disabled />);

      await user.click(screen.getByRole('button'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('handles ArrowDown key', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Focus moves to first option
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('data-focused', 'true');
    });

    it('handles ArrowUp key', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      fireEvent.keyDown(document, { key: 'ArrowUp' });

      // Focus wraps to last option
      const options = screen.getAllByRole('option');
      expect(options[options.length - 1]).toHaveAttribute('data-focused', 'true');
    });

    it('handles Home key', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'Home' });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('data-focused', 'true');
    });

    it('handles End key', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      fireEvent.keyDown(document, { key: 'End' });

      const options = screen.getAllByRole('option');
      expect(options[options.length - 1]).toHaveAttribute('data-focused', 'true');
    });

    it('selects focused option on Enter', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'ArrowDown' }); // Move to Day Trader
      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockSetActivePersona).toHaveBeenCalledWith('day_trader');
    });
  });

  describe('Click Outside', () => {
    it('closes panel when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <PersonaFolderTab />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Data States', () => {
    it('has data-state closed when closed', () => {
      render(<PersonaFolderTab />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-state', 'closed');
    });

    it('has data-state open when open', async () => {
      const user = userEvent.setup();
      render(<PersonaFolderTab />);

      await user.click(screen.getByRole('button'));

      const button = screen.getByRole('button', { name: /Persona selector/ });
      expect(button).toHaveAttribute('data-state', 'open');
    });
  });
});
