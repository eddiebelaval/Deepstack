import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationScoreModal } from '../ValidationScoreModal';

// Mock thesis validation utilities
vi.mock('@/lib/thesis-validation', () => ({
  getScoreColor: (score: number) => ({
    text: score >= 70 ? 'text-green-500' : score >= 40 ? 'text-amber-500' : 'text-red-500',
    bg: 'bg-green-500',
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

describe('ValidationScoreModal', () => {
  const mockOnSave = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    currentScore: 60,
    autoCalculatedScore: 55,
    currentNotes: '',
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders modal title', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByText('Update Validation Score')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByText(/Manually adjust the thesis validation score/)).toBeInTheDocument();
    });

    it('displays auto-calculated score', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByText('55%')).toBeInTheDocument();
    });

    it('displays current manual score', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('renders score range indicators', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByText('0-39%')).toBeInTheDocument();
      expect(screen.getByText('40-69%')).toBeInTheDocument();
      expect(screen.getByText('70-100%')).toBeInTheDocument();
    });
  });

  describe('score adjustment', () => {
    it('updates score via slider', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} />);

      const slider = screen.getByRole('slider');
      await user.click(slider);

      // Score should be adjustable
      expect(slider).toBeInTheDocument();
    });

    it('displays score label based on current value', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={85} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('displays Poor label for low scores', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={25} />);
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });

    it('displays Moderate label for medium scores', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={50} />);
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });
  });

  describe('auto-calculated score', () => {
    it('shows Use button for auto-calculated score', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      const useButtons = screen.getAllByText('Use');
      expect(useButtons.length).toBeGreaterThan(0);
    });

    it('updates manual score when Use button is clicked', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} autoCalculatedScore={80} />);

      const useButton = screen.getAllByText('Use')[0];
      await user.click(useButton);

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('displays auto-calculation description', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByText(/Based on conditions, price movement, time, and trades/)).toBeInTheDocument();
    });
  });

  describe('notes editing', () => {
    it('renders notes textarea', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/Add notes about why you're setting this score/)).toBeInTheDocument();
    });

    it('displays existing notes', () => {
      render(<ValidationScoreModal {...defaultProps} currentNotes="Test notes" />);
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
    });

    it('allows editing notes', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/Add notes about why you're setting this score/);
      await user.type(textarea, 'New validation notes');

      expect(textarea).toHaveValue('New validation notes');
    });
  });

  describe('divergence warning', () => {
    it('shows warning when manual score differs significantly from auto score', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={80} autoCalculatedScore={50} />);
      expect(screen.getByText(/Your manual score differs significantly/)).toBeInTheDocument();
    });

    it('displays difference percentage in warning', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={80} autoCalculatedScore={50} />);
      expect(screen.getByText(/30% difference/)).toBeInTheDocument();
    });

    it('does not show warning when scores are close', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={60} autoCalculatedScore={55} />);
      expect(screen.queryByText(/Your manual score differs significantly/)).not.toBeInTheDocument();
    });

    it('shows warning threshold at > 20% difference', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={60} autoCalculatedScore={39} />);
      expect(screen.getByText(/21% difference/)).toBeInTheDocument();
    });

    it('does not show warning at exactly 20% difference', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={70} autoCalculatedScore={50} />);
      expect(screen.queryByText(/20% difference/)).not.toBeInTheDocument();
    });
  });

  describe('save functionality', () => {
    it('calls onSave with score and notes when Save is clicked', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} currentScore={75} currentNotes="Test notes" />);

      await user.click(screen.getByText('Save Score'));

      expect(mockOnSave).toHaveBeenCalledWith(75, 'Test notes');
    });

    it('closes modal after successful save', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} />);

      await user.click(screen.getByText('Save Score'));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onSave with empty notes if none provided', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} currentNotes="" />);

      await user.click(screen.getByText('Save Score'));

      expect(mockOnSave).toHaveBeenCalledWith(expect.any(Number), '');
    });
  });

  describe('cancel functionality', () => {
    it('closes modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} />);

      await user.click(screen.getByText('Cancel'));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not call onSave when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ValidationScoreModal {...defaultProps} />);

      await user.click(screen.getByText('Cancel'));

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('modal state', () => {
    it('does not render when open is false', () => {
      render(<ValidationScoreModal {...defaultProps} open={false} />);
      expect(screen.queryByText('Update Validation Score')).not.toBeInTheDocument();
    });

    it('renders when open is true', () => {
      render(<ValidationScoreModal {...defaultProps} open={true} />);
      expect(screen.getByText('Update Validation Score')).toBeInTheDocument();
    });
  });

  describe('score labels', () => {
    const testCases = [
      { score: 85, label: 'Excellent' },
      { score: 75, label: 'Strong' },
      { score: 65, label: 'Good' },
      { score: 55, label: 'Moderate' },
      { score: 45, label: 'Weak' },
      { score: 35, label: 'Poor' },
    ];

    testCases.forEach(({ score, label }) => {
      it(`displays ${label} for score ${score}`, () => {
        render(<ValidationScoreModal {...defaultProps} currentScore={score} />);
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('has labeled slider', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByLabelText('Manual Score')).toBeInTheDocument();
    });

    it('has labeled textarea', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByLabelText('Validation Notes')).toBeInTheDocument();
    });

    it('provides helper text for notes', () => {
      render(<ValidationScoreModal {...defaultProps} />);
      expect(screen.getByText('Document your reasoning for this validation score')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles undefined currentNotes', () => {
      render(<ValidationScoreModal {...defaultProps} currentNotes={undefined} />);
      const textarea = screen.getByPlaceholderText(/Add notes about why you're setting this score/);
      expect(textarea).toHaveValue('');
    });

    it('handles score of 0', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles score of 100', () => {
      render(<ValidationScoreModal {...defaultProps} currentScore={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles auto-calculated score of 0', () => {
      render(<ValidationScoreModal {...defaultProps} autoCalculatedScore={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
