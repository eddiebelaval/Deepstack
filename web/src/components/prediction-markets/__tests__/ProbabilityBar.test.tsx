import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProbabilityBar } from '../ProbabilityBar';

describe('ProbabilityBar', () => {
  describe('Rendering', () => {
    it('renders probability bar with correct percentages', () => {
      const { container } = render(<ProbabilityBar yesPrice={0.65} />);

      // Check that the bar is rendered
      const bar = container.querySelector('.flex.w-full');
      expect(bar).toBeInTheDocument();
    });

    it('renders with showLabels prop', () => {
      render(<ProbabilityBar yesPrice={0.65} showLabels />);

      expect(screen.getByText('Yes 65%')).toBeInTheDocument();
      expect(screen.getByText('No 35%')).toBeInTheDocument();
    });

    it('renders without labels by default', () => {
      render(<ProbabilityBar yesPrice={0.65} />);

      // Should show percentage in center instead of labels
      expect(screen.getByText('65% Yes')).toBeInTheDocument();
    });

    it('renders compact version', () => {
      const { container } = render(<ProbabilityBar yesPrice={0.5} compact />);

      const bar = container.querySelector('.h-1\\.5');
      expect(bar).toBeInTheDocument();
    });

    it('renders normal height by default', () => {
      const { container } = render(<ProbabilityBar yesPrice={0.5} />);

      const bar = container.querySelector('.h-2');
      expect(bar).toBeInTheDocument();
    });
  });

  describe('Probability Calculations', () => {
    it('handles 50/50 probability', () => {
      render(<ProbabilityBar yesPrice={0.5} showLabels />);

      expect(screen.getByText('Yes 50%')).toBeInTheDocument();
      expect(screen.getByText('No 50%')).toBeInTheDocument();
    });

    it('handles very high yes probability', () => {
      render(<ProbabilityBar yesPrice={0.95} showLabels />);

      expect(screen.getByText('Yes 95%')).toBeInTheDocument();
      expect(screen.getByText('No 5%')).toBeInTheDocument();
    });

    it('handles very low yes probability', () => {
      render(<ProbabilityBar yesPrice={0.05} showLabels />);

      expect(screen.getByText('Yes 5%')).toBeInTheDocument();
      expect(screen.getByText('No 95%')).toBeInTheDocument();
    });

    it('rounds to nearest percent', () => {
      render(<ProbabilityBar yesPrice={0.654} showLabels />);

      expect(screen.getByText('Yes 65%')).toBeInTheDocument();
      expect(screen.getByText('No 35%')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ProbabilityBar yesPrice={0.5} className="custom-class" />
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('has green color for yes section', () => {
      const { container } = render(<ProbabilityBar yesPrice={0.6} />);

      const yesSection = container.querySelector('.bg-green-500');
      expect(yesSection).toBeInTheDocument();
    });

    it('has red color for no section', () => {
      const { container } = render(<ProbabilityBar yesPrice={0.6} />);

      const noSection = container.querySelector('.bg-red-500');
      expect(noSection).toBeInTheDocument();
    });

    it('has transition animation', () => {
      const { container } = render(<ProbabilityBar yesPrice={0.6} />);

      const sections = container.querySelectorAll('.transition-all');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Display Modes', () => {
    it('shows labels when showLabels is true', () => {
      render(<ProbabilityBar yesPrice={0.7} showLabels />);

      expect(screen.getByText('Yes 70%')).toBeInTheDocument();
      expect(screen.getByText('No 30%')).toBeInTheDocument();
    });

    it('shows center label when not compact and no showLabels', () => {
      render(<ProbabilityBar yesPrice={0.7} />);

      expect(screen.getByText('70% Yes')).toBeInTheDocument();
    });

    it('hides center label when compact and no showLabels', () => {
      render(<ProbabilityBar yesPrice={0.7} compact />);

      expect(screen.queryByText('70% Yes')).not.toBeInTheDocument();
    });

    it('hides center label when showLabels is true', () => {
      render(<ProbabilityBar yesPrice={0.7} showLabels />);

      expect(screen.queryByText('70% Yes')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles 0% yes price', () => {
      render(<ProbabilityBar yesPrice={0} showLabels />);

      expect(screen.getByText('Yes 0%')).toBeInTheDocument();
      expect(screen.getByText('No 100%')).toBeInTheDocument();
    });

    it('handles 100% yes price', () => {
      render(<ProbabilityBar yesPrice={1} showLabels />);

      expect(screen.getByText('Yes 100%')).toBeInTheDocument();
      expect(screen.getByText('No 0%')).toBeInTheDocument();
    });

    it('handles decimal probabilities', () => {
      render(<ProbabilityBar yesPrice={0.333} showLabels />);

      expect(screen.getByText('Yes 33%')).toBeInTheDocument();
      expect(screen.getByText('No 67%')).toBeInTheDocument();
    });
  });
});
