import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaSection } from '../PersonaSection';
import { usePersonaStore } from '@/lib/stores/persona-store';
import { act } from '@testing-library/react';

// Mock the persona store
vi.mock('@/lib/stores/persona-store', () => ({
  usePersonaStore: vi.fn(),
}));

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

describe('PersonaSection', () => {
  const mockSetActivePersona = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (usePersonaStore as any).mockReturnValue({
      activePersonaId: 'research-analyst',
      setActivePersona: mockSetActivePersona,
    });
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<PersonaSection />);
      expect(screen.getByText('Trading Style')).toBeInTheDocument();
      expect(screen.getByText('Coaching Style')).toBeInTheDocument();
    });

    it('shows Trading Style section header with icon', () => {
      const { container } = render(<PersonaSection />);

      expect(screen.getByText('Trading Style')).toBeInTheDocument();
      const trendingIcon = container.querySelector('.h-5.w-5.text-primary');
      expect(trendingIcon).toBeInTheDocument();
    });

    it('shows Coaching Style section header with icon', () => {
      const { container } = render(<PersonaSection />);

      expect(screen.getByText('Coaching Style')).toBeInTheDocument();
      const coachIcon = container.querySelector('.h-5.w-5.text-primary');
      expect(coachIcon).toBeInTheDocument();
    });

    it('renders all trading personas', () => {
      render(<PersonaSection />);

      expect(screen.getByText('Value Investor')).toBeInTheDocument();
      expect(screen.getByText('Day Trader')).toBeInTheDocument();
      expect(screen.getByText('Risk Manager')).toBeInTheDocument();
      expect(screen.getByText('Research Analyst')).toBeInTheDocument();
    });

    it('renders all coaching personas', () => {
      render(<PersonaSection />);

      expect(screen.getByText('Trading Mentor')).toBeInTheDocument();
      expect(screen.getByText('Performance Coach')).toBeInTheDocument();
      expect(screen.getByText('Quantitative Analyst')).toBeInTheDocument();
    });
  });

  describe('persona selection', () => {
    it('highlights currently selected persona', () => {
      (usePersonaStore as any).mockReturnValue({
        activePersonaId: 'value-investor',
        setActivePersona: mockSetActivePersona,
      });

      const { container } = render(<PersonaSection />);

      // The selected persona should have border-primary
      const valueInvestorCard = screen.getByText('Value Investor').closest('button');
      expect(valueInvestorCard).toHaveClass('border-primary');
    });

    it('calls setActivePersona when persona is clicked', async () => {
      const user = userEvent.setup();
      render(<PersonaSection />);

      const dayTraderCard = screen.getByText('Day Trader').closest('button');
      await user.click(dayTraderCard!);

      expect(mockSetActivePersona).toHaveBeenCalledWith('day-trader');
    });

    it('can select trading persona', async () => {
      const user = userEvent.setup();
      render(<PersonaSection />);

      const riskManagerCard = screen.getByText('Risk Manager').closest('button');
      await user.click(riskManagerCard!);

      expect(mockSetActivePersona).toHaveBeenCalledWith('risk-manager');
    });

    it('can select coaching persona', async () => {
      const user = userEvent.setup();
      render(<PersonaSection />);

      const mentorCard = screen.getByText('Trading Mentor').closest('button');
      await user.click(mentorCard!);

      expect(mockSetActivePersona).toHaveBeenCalledWith('mentor');
    });

    it('updates selection when different persona is clicked', async () => {
      const user = userEvent.setup();
      render(<PersonaSection />);

      const valueInvestorCard = screen.getByText('Value Investor').closest('button');
      await user.click(valueInvestorCard!);

      const dayTraderCard = screen.getByText('Day Trader').closest('button');
      await user.click(dayTraderCard!);

      expect(mockSetActivePersona).toHaveBeenCalledWith('value-investor');
      expect(mockSetActivePersona).toHaveBeenCalledWith('day-trader');
      expect(mockSetActivePersona).toHaveBeenCalledTimes(2);
    });
  });

  describe('persona categories', () => {
    it('separates trading and coaching personas', () => {
      const { container } = render(<PersonaSection />);

      const sections = container.querySelectorAll('.space-y-4');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('displays trading personas in correct section', () => {
      const { container } = render(<PersonaSection />);

      const tradingSection = screen.getByText('Trading Style').closest('.space-y-4');
      expect(tradingSection).toBeInTheDocument();

      // Check that trading personas are within the trading section
      const valueInvestor = screen.getByText('Value Investor');
      expect(tradingSection).toContainElement(valueInvestor);
    });

    it('displays coaching personas in correct section', () => {
      const { container } = render(<PersonaSection />);

      const coachingSection = screen.getByText('Coaching Style').closest('.space-y-4');
      expect(coachingSection).toBeInTheDocument();

      const mentor = screen.getByText('Trading Mentor');
      expect(coachingSection).toContainElement(mentor);
    });
  });

  describe('persona descriptions', () => {
    it('shows short descriptions for all personas', () => {
      render(<PersonaSection />);

      expect(screen.getByText('Patient, fundamentals-focused investing')).toBeInTheDocument();
      expect(screen.getByText('Momentum and technical analysis')).toBeInTheDocument();
      expect(screen.getByText('Conservative, capital preservation')).toBeInTheDocument();
      expect(screen.getByText('Neutral, data-driven analysis')).toBeInTheDocument();
      expect(screen.getByText('Patient, educational guidance')).toBeInTheDocument();
      expect(screen.getByText('Direct, accountability-focused')).toBeInTheDocument();
      expect(screen.getByText('Data-focused, quantitative')).toBeInTheDocument();
    });
  });

  describe('different active personas', () => {
    it('highlights value-investor when active', () => {
      (usePersonaStore as any).mockReturnValue({
        activePersonaId: 'value-investor',
        setActivePersona: mockSetActivePersona,
      });

      render(<PersonaSection />);

      const valueInvestorCard = screen.getByText('Value Investor').closest('button');
      expect(valueInvestorCard).toHaveClass('border-primary');
    });

    it('highlights day-trader when active', () => {
      (usePersonaStore as any).mockReturnValue({
        activePersonaId: 'day-trader',
        setActivePersona: mockSetActivePersona,
      });

      render(<PersonaSection />);

      const dayTraderCard = screen.getByText('Day Trader').closest('button');
      expect(dayTraderCard).toHaveClass('border-primary');
    });

    it('highlights mentor when active', () => {
      (usePersonaStore as any).mockReturnValue({
        activePersonaId: 'mentor',
        setActivePersona: mockSetActivePersona,
      });

      render(<PersonaSection />);

      const mentorCard = screen.getByText('Trading Mentor').closest('button');
      expect(mentorCard).toHaveClass('border-primary');
    });

    it('highlights coach when active', () => {
      (usePersonaStore as any).mockReturnValue({
        activePersonaId: 'coach',
        setActivePersona: mockSetActivePersona,
      });

      render(<PersonaSection />);

      const coachCard = screen.getByText('Performance Coach').closest('button');
      expect(coachCard).toHaveClass('border-primary');
    });

    it('highlights analyst when active', () => {
      (usePersonaStore as any).mockReturnValue({
        activePersonaId: 'analyst',
        setActivePersona: mockSetActivePersona,
      });

      render(<PersonaSection />);

      const analystCard = screen.getByText('Quantitative Analyst').closest('button');
      expect(analystCard).toHaveClass('border-primary');
    });
  });

  describe('layout', () => {
    it('uses grid layout for persona cards', () => {
      const { container } = render(<PersonaSection />);

      const gridContainers = container.querySelectorAll('.grid.grid-cols-1');
      expect(gridContainers.length).toBeGreaterThan(0);
    });

    it('has proper spacing between sections', () => {
      const { container } = render(<PersonaSection />);

      const mainContainer = container.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('renders persona cards as buttons', () => {
      render(<PersonaSection />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(7); // All 7 personas should be buttons
    });

    it('has proper heading structure', () => {
      render(<PersonaSection />);

      const tradingStyleLabel = screen.getByText('Trading Style');
      const coachingStyleLabel = screen.getByText('Coaching Style');

      expect(tradingStyleLabel.tagName).toBe('LABEL');
      expect(coachingStyleLabel.tagName).toBe('LABEL');
    });
  });

  describe('edge cases', () => {
    it('handles rapid persona switching', async () => {
      const user = userEvent.setup();
      render(<PersonaSection />);

      const valueInvestor = screen.getByText('Value Investor').closest('button');
      const dayTrader = screen.getByText('Day Trader').closest('button');
      const riskManager = screen.getByText('Risk Manager').closest('button');

      await user.click(valueInvestor!);
      await user.click(dayTrader!);
      await user.click(riskManager!);

      expect(mockSetActivePersona).toHaveBeenCalledTimes(3);
    });

    it('handles selecting same persona twice', async () => {
      const user = userEvent.setup();
      (usePersonaStore as any).mockReturnValue({
        activePersonaId: 'value-investor',
        setActivePersona: mockSetActivePersona,
      });

      render(<PersonaSection />);

      const valueInvestor = screen.getByText('Value Investor').closest('button');
      await user.click(valueInvestor!);
      await user.click(valueInvestor!);

      expect(mockSetActivePersona).toHaveBeenCalledTimes(2);
      expect(mockSetActivePersona).toHaveBeenCalledWith('value-investor');
    });
  });
});
