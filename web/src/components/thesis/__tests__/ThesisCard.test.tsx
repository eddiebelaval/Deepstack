import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThesisCard } from '../ThesisCard';
import { type ThesisEntry } from '@/lib/stores/thesis-store';

// Mock thesis validation utilities
vi.mock('@/lib/thesis-validation', () => ({
  getScoreColor: (score: number) => ({
    text: score >= 70 ? 'text-green-500' : score >= 40 ? 'text-amber-500' : 'text-red-500',
    bg: score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500',
    border: 'border-green-500',
    ring: 'ring-green-500',
  }),
  getScoreLabel: (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Moderate';
    if (score >= 40) return 'Weak';
    return 'Poor';
  },
  calculateValidationScore: vi.fn(() => ({
    totalScore: 50,
    factors: {},
    breakdown: [],
  })),
}));

const mockThesis: ThesisEntry = {
  id: 'thesis-1',
  title: 'AAPL Bullish Breakout',
  symbol: 'AAPL',
  hypothesis: 'AAPL will break above 200 on strong earnings and AI momentum',
  timeframe: '1-3 Months',
  status: 'active',
  entryTarget: 180,
  exitTarget: 220,
  stopLoss: 170,
  riskRewardRatio: 2.5,
  keyConditions: ['Earnings beat', 'Volume > 50M', 'RSI < 70'],
  validationScore: 75,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('ThesisCard', () => {
  describe('rendering', () => {
    it('renders thesis title and symbol', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText('AAPL Bullish Breakout')).toBeInTheDocument();
      expect(screen.getByText(/AAPL/)).toBeInTheDocument();
    });

    it('renders hypothesis', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText(/AAPL will break above 200/)).toBeInTheDocument();
    });

    it('renders timeframe', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText(/1-3 Months/)).toBeInTheDocument();
    });

    it('renders status badge', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('price targets', () => {
    it('renders entry target', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText('$180.00')).toBeInTheDocument();
    });

    it('renders exit target', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText('$220.00')).toBeInTheDocument();
    });

    it('renders stop loss', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText('$170.00')).toBeInTheDocument();
    });

    it('does not render targets section when no targets set', () => {
      const thesisWithoutTargets = { ...mockThesis, entryTarget: undefined, exitTarget: undefined, stopLoss: undefined };
      const { container } = render(<ThesisCard thesis={thesisWithoutTargets} />);
      expect(container.querySelector('.grid-cols-3')).not.toBeInTheDocument();
    });
  });

  describe('risk/reward ratio', () => {
    it('renders risk/reward ratio', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText('1:2.5')).toBeInTheDocument();
    });

    it('shows favorable badge for R:R >= 2', () => {
      render(<ThesisCard thesis={mockThesis} />);
      const badge = screen.getByText('1:2.5');
      expect(badge.className).not.toContain('secondary');
    });

    it('shows secondary badge for R:R < 2', () => {
      const lowRRThesis = { ...mockThesis, riskRewardRatio: 1.5 };
      render(<ThesisCard thesis={lowRRThesis} />);
      const badge = screen.getByText('1:1.5');
      expect(badge.className).toContain('secondary');
    });

    it('does not render R:R section when not set', () => {
      const thesisWithoutRR = { ...mockThesis, riskRewardRatio: undefined };
      render(<ThesisCard thesis={thesisWithoutRR} />);
      expect(screen.queryByText(/Risk\/Reward/)).not.toBeInTheDocument();
    });
  });

  describe('validation score', () => {
    it('renders validation score for active thesis', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getAllByText('75%')[0]).toBeInTheDocument();
    });

    it('does not render validation score for non-active thesis', () => {
      const draftThesis = { ...mockThesis, status: 'drafting' as const };
      render(<ThesisCard thesis={draftThesis} />);
      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('uses default score of 50 if validation score is undefined', () => {
      const thesisWithoutScore = { ...mockThesis, validationScore: undefined };
      render(<ThesisCard thesis={thesisWithoutScore} />);
      expect(screen.getAllByText('50%')[0]).toBeInTheDocument();
    });

    it('renders validation gauge for active thesis', () => {
      const { container } = render(<ThesisCard thesis={mockThesis} />);
      const gauge = container.querySelector('[style*="width: 75%"]');
      expect(gauge).toBeInTheDocument();
    });
  });

  describe('key conditions', () => {
    it('renders key conditions badges', () => {
      render(<ThesisCard thesis={mockThesis} />);
      expect(screen.getByText('Earnings beat')).toBeInTheDocument();
      expect(screen.getByText('Volume > 50M')).toBeInTheDocument();
      expect(screen.getByText('RSI < 70')).toBeInTheDocument();
    });

    it('limits displayed conditions to 3', () => {
      const thesisWithManyConditions = {
        ...mockThesis,
        keyConditions: ['Condition 1', 'Condition 2', 'Condition 3', 'Condition 4', 'Condition 5'],
      };
      render(<ThesisCard thesis={thesisWithManyConditions} />);
      expect(screen.getByText('Condition 1')).toBeInTheDocument();
      expect(screen.getByText('Condition 2')).toBeInTheDocument();
      expect(screen.getByText('Condition 3')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('does not render conditions section when no conditions', () => {
      const thesisWithoutConditions = { ...mockThesis, keyConditions: [] };
      render(<ThesisCard thesis={thesisWithoutConditions} />);
      expect(screen.queryByText('Key Conditions')).not.toBeInTheDocument();
    });
  });

  describe('status variants', () => {
    it('renders validated status correctly', () => {
      const validatedThesis = { ...mockThesis, status: 'validated' as const };
      render(<ThesisCard thesis={validatedThesis} />);
      expect(screen.getByText('Validated')).toBeInTheDocument();
    });

    it('renders invalidated status correctly', () => {
      const invalidatedThesis = { ...mockThesis, status: 'invalidated' as const };
      render(<ThesisCard thesis={invalidatedThesis} />);
      expect(screen.getByText('Invalidated')).toBeInTheDocument();
    });

    it('renders drafting status correctly', () => {
      const draftingThesis = { ...mockThesis, status: 'drafting' as const };
      render(<ThesisCard thesis={draftingThesis} />);
      expect(screen.getByText('Drafting')).toBeInTheDocument();
    });

    it('renders archived status correctly', () => {
      const archivedThesis = { ...mockThesis, status: 'archived' as const };
      render(<ThesisCard thesis={archivedThesis} />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('renders compact version when compact prop is true', () => {
      const { container } = render(<ThesisCard thesis={mockThesis} compact />);
      expect(container.querySelector('.truncate')).toBeInTheDocument();
    });

    it('renders validation score in compact mode', () => {
      render(<ThesisCard thesis={mockThesis} compact />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('does not render validation score in compact mode for non-active thesis', () => {
      const draftThesis = { ...mockThesis, status: 'drafting' as const };
      render(<ThesisCard thesis={draftThesis} compact />);
      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('applies correct border color for validated thesis', () => {
      const validatedThesis = { ...mockThesis, status: 'validated' as const };
      const { container } = render(<ThesisCard thesis={validatedThesis} compact />);
      expect(container.firstChild).toHaveClass('border-l-green-500');
    });

    it('applies correct border color for invalidated thesis', () => {
      const invalidatedThesis = { ...mockThesis, status: 'invalidated' as const };
      const { container } = render(<ThesisCard thesis={invalidatedThesis} compact />);
      expect(container.firstChild).toHaveClass('border-l-red-500');
    });
  });

  describe('interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<ThesisCard thesis={mockThesis} onClick={onClick} />);

      await user.click(screen.getByText('AAPL Bullish Breakout'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is clickable via keyboard', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { container } = render(<ThesisCard thesis={mockThesis} onClick={onClick} />);

      const card = container.firstChild as HTMLElement;
      card.focus();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });

    it('does not crash when onClick is not provided', async () => {
      const user = userEvent.setup();
      render(<ThesisCard thesis={mockThesis} />);

      await user.click(screen.getByText('AAPL Bullish Breakout'));
      // Should not throw
    });
  });

  describe('edge cases', () => {
    it('handles missing optional fields gracefully', () => {
      const minimalThesis: ThesisEntry = {
        id: 'thesis-minimal',
        title: 'Minimal Thesis',
        symbol: 'SPY',
        hypothesis: 'SPY will go up',
        timeframe: '1W',
        status: 'drafting',
        keyConditions: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      render(<ThesisCard thesis={minimalThesis} />);
      expect(screen.getByText('Minimal Thesis')).toBeInTheDocument();
    });

    it('handles very long hypothesis text', () => {
      const longHypothesis = 'A'.repeat(500);
      const longThesis = { ...mockThesis, hypothesis: longHypothesis };
      const { container } = render(<ThesisCard thesis={longThesis} />);

      expect(container.querySelector('.line-clamp-2')).toBeInTheDocument();
    });

    it('handles very long title in compact mode', () => {
      const longTitle = 'Very Long Thesis Title That Should Be Truncated';
      const longThesis = { ...mockThesis, title: longTitle };
      const { container } = render(<ThesisCard thesis={longThesis} compact />);

      expect(container.querySelector('.truncate')).toBeInTheDocument();
    });
  });
});
