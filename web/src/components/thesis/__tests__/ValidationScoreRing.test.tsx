import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationScoreRing } from '../ValidationScoreRing';

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

describe('ValidationScoreRing', () => {
  describe('rendering', () => {
    it('renders score percentage', () => {
      render(<ValidationScoreRing score={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('renders SVG element', () => {
      const { container } = render(<ValidationScoreRing score={50} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders two circles (background and progress)', () => {
      const { container } = render(<ValidationScoreRing score={50} />);
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(2);
    });
  });

  describe('score display', () => {
    it('displays score of 0', () => {
      render(<ValidationScoreRing score={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('displays score of 100', () => {
      render(<ValidationScoreRing score={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('displays intermediate score', () => {
      render(<ValidationScoreRing score={42} />);
      expect(screen.getByText('42%')).toBeInTheDocument();
    });
  });

  describe('label display', () => {
    it('does not show label by default', () => {
      render(<ValidationScoreRing score={75} />);
      expect(screen.queryByText('Strong')).not.toBeInTheDocument();
    });

    it('shows label when showLabel is true', () => {
      render(<ValidationScoreRing score={75} showLabel />);
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('shows correct label for excellent score', () => {
      render(<ValidationScoreRing score={85} showLabel />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('shows correct label for poor score', () => {
      render(<ValidationScoreRing score={25} showLabel />);
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });

    it('shows correct label for moderate score', () => {
      render(<ValidationScoreRing score={55} showLabel />);
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('renders small size', () => {
      const { container } = render(<ValidationScoreRing score={50} size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-16', 'h-16');
    });

    it('renders medium size by default', () => {
      const { container } = render(<ValidationScoreRing score={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-32', 'h-32');
    });

    it('renders large size', () => {
      const { container } = render(<ValidationScoreRing score={50} size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-40', 'h-40');
    });
  });

  describe('progress circle', () => {
    it('calculates correct stroke-dashoffset for 0%', () => {
      const { container } = render(<ValidationScoreRing score={0} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      const dashArray = progressCircle.getAttribute('stroke-dasharray');
      const dashOffset = progressCircle.getAttribute('stroke-dashoffset');
      expect(dashOffset).toBe(dashArray); // Full offset = no progress
    });

    it('calculates correct stroke-dashoffset for 50%', () => {
      const { container } = render(<ValidationScoreRing score={50} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      const dashArray = parseFloat(progressCircle.getAttribute('stroke-dasharray') || '0');
      const dashOffset = parseFloat(progressCircle.getAttribute('stroke-dashoffset') || '0');
      expect(dashOffset).toBeCloseTo(dashArray * 0.5, 1);
    });

    it('calculates correct stroke-dashoffset for 100%', () => {
      const { container } = render(<ValidationScoreRing score={100} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      const dashOffset = progressCircle.getAttribute('stroke-dashoffset');
      expect(dashOffset).toBe('0'); // No offset = full progress
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(<ValidationScoreRing score={50} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies transition class to progress circle', () => {
      const { container } = render(<ValidationScoreRing score={50} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.className.baseVal).toContain('transition-all');
    });

    it('has rounded line caps', () => {
      const { container } = render(<ValidationScoreRing score={50} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.getAttribute('stroke-linecap')).toBe('round');
    });
  });

  describe('accessibility', () => {
    it('uses semantic SVG structure', () => {
      const { container } = render(<ValidationScoreRing score={75} />);
      const svg = container.querySelector('svg');
      expect(svg?.tagName).toBe('svg');
    });

    it('has text centered in ring', () => {
      const { container } = render(<ValidationScoreRing score={75} />);
      const centerDiv = container.querySelector('.absolute.inset-0');
      expect(centerDiv).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('edge cases', () => {
    it('handles negative scores (treated as 0)', () => {
      render(<ValidationScoreRing score={-10} />);
      // Should still render without crashing
      expect(screen.getByText('-10%')).toBeInTheDocument();
    });

    it('handles scores over 100', () => {
      render(<ValidationScoreRing score={150} />);
      // Should still render without crashing
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('handles decimal scores', () => {
      render(<ValidationScoreRing score={75.5} />);
      expect(screen.getByText('75.5%')).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('applies correct color for high score', () => {
      const { container } = render(<ValidationScoreRing score={85} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.className.baseVal).toContain('text-green-500');
    });

    it('applies correct color for medium score', () => {
      const { container } = render(<ValidationScoreRing score={55} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.className.baseVal).toContain('text-amber-500');
    });

    it('applies correct color for low score', () => {
      const { container } = render(<ValidationScoreRing score={25} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle.className.baseVal).toContain('text-red-500');
    });
  });
});
