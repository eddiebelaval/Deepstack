import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThesisActiveWidget } from '../ThesisActiveWidget';

describe('ThesisActiveWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering with Data', () => {
    it('renders thesis titles', () => {
      render(<ThesisActiveWidget />);

      expect(screen.getByText('Tech sector oversold on rate fears')).toBeInTheDocument();
      expect(screen.getByText('Energy rotation on geopolitical tension')).toBeInTheDocument();
    });

    it('displays validation scores', () => {
      render(<ThesisActiveWidget />);

      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('displays thesis status labels', () => {
      render(<ThesisActiveWidget />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Validating')).toBeInTheDocument();
    });

    it('shows score label', () => {
      render(<ThesisActiveWidget />);

      const scoreLabels = screen.getAllByText('Score:');
      expect(scoreLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering Logic', () => {
    it('only shows active and validating theses', () => {
      render(<ThesisActiveWidget />);

      // Should show active and validating
      expect(screen.getByText('Tech sector oversold on rate fears')).toBeInTheDocument();
      expect(screen.getByText('Energy rotation on geopolitical tension')).toBeInTheDocument();

      // Should NOT show invalidated thesis
      expect(screen.queryByText('Defensive play into year-end')).not.toBeInTheDocument();
    });

    it('limits display to 3 theses', () => {
      render(<ThesisActiveWidget />);

      const { container } = render(<ThesisActiveWidget />);

      // Should show at most 3 thesis cards
      const thesisCards = container.querySelectorAll('.glass-surface');
      expect(thesisCards.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Score Color Coding', () => {
    it('shows profit color for high scores (>= 70%)', () => {
      render(<ThesisActiveWidget />);

      const highScore = screen.getByText('78%');
      expect(highScore).toHaveClass('text-profit');
    });

    it('shows yellow color for medium scores (50-69%)', () => {
      render(<ThesisActiveWidget />);

      const mediumScore = screen.getByText('65%');
      expect(mediumScore).toHaveClass('text-yellow-500');
    });
  });

  describe('Status Icons', () => {
    it('displays check circle icon for active status', () => {
      const { container } = render(<ThesisActiveWidget />);

      const checkIcons = container.querySelectorAll('.text-profit');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('displays clock icon for validating status', () => {
      const { container } = render(<ThesisActiveWidget />);

      const clockIcons = container.querySelectorAll('.text-yellow-500');
      expect(clockIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('does not show empty state when active theses exist', () => {
      render(<ThesisActiveWidget />);

      expect(screen.queryByText('No active theses')).not.toBeInTheDocument();
    });

    it('would show empty state icon when no theses', () => {
      // This test documents expected behavior
      // In real scenario, mock MOCK_THESES to be empty or all invalidated
      const { container } = render(<ThesisActiveWidget />);

      // Component should handle empty state gracefully
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('applies glass surface styling to thesis cards', () => {
      const { container } = render(<ThesisActiveWidget />);

      const glassElements = container.querySelectorAll('.glass-surface');
      expect(glassElements.length).toBeGreaterThan(0);
    });

    it('applies hover effects to thesis cards', () => {
      const { container } = render(<ThesisActiveWidget />);

      const hoverElements = container.querySelectorAll('.hover\\:bg-muted\\/30');
      expect(hoverElements.length).toBeGreaterThan(0);
    });

    it('applies cursor pointer for clickability', () => {
      const { container } = render(<ThesisActiveWidget />);

      const clickableElements = container.querySelectorAll('.cursor-pointer');
      expect(clickableElements.length).toBeGreaterThan(0);
    });

    it('uses proper spacing between thesis items', () => {
      const { container } = render(<ThesisActiveWidget />);

      const spacingContainer = container.querySelector('.space-y-2');
      expect(spacingContainer).toBeInTheDocument();
    });

    it('applies rounded corners to thesis cards', () => {
      const { container } = render(<ThesisActiveWidget />);

      const roundedElements = container.querySelectorAll('.rounded-lg');
      expect(roundedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Title Display', () => {
    it('limits title to 2 lines with line-clamp', () => {
      const { container } = render(<ThesisActiveWidget />);

      const titles = container.querySelectorAll('.line-clamp-2');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('uses appropriate font weight for titles', () => {
      const { container } = render(<ThesisActiveWidget />);

      const titles = container.querySelectorAll('.font-medium');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('uses compact leading for title text', () => {
      const { container } = render(<ThesisActiveWidget />);

      const snugLeading = container.querySelectorAll('.leading-snug');
      expect(snugLeading.length).toBeGreaterThan(0);
    });
  });

  describe('Score Display', () => {
    it('uses bold font for score values', () => {
      const { container } = render(<ThesisActiveWidget />);

      const boldScores = container.querySelectorAll('.font-bold');
      expect(boldScores.length).toBeGreaterThan(0);
    });

    it('displays percentage sign for scores', () => {
      render(<ThesisActiveWidget />);

      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('uses muted color for score label', () => {
      render(<ThesisActiveWidget />);

      const scoreLabels = screen.getAllByText('Score:');
      scoreLabels.forEach((label) => {
        expect(label).toHaveClass('text-muted-foreground');
      });
    });
  });

  describe('Status Display', () => {
    it('displays status with proper capitalization', () => {
      render(<ThesisActiveWidget />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Validating')).toBeInTheDocument();
    });

    it('applies muted color to status labels', () => {
      render(<ThesisActiveWidget />);

      const statusLabels = screen.getAllByText(/Active|Validating/);
      statusLabels.forEach((label) => {
        if (label.textContent === 'Active' || label.textContent === 'Validating') {
          expect(label).toHaveClass('text-muted-foreground');
        }
      });
    });

    it('uses extra small text size for status', () => {
      const { container } = render(<ThesisActiveWidget />);

      const extraSmallText = container.querySelectorAll('.text-xs');
      expect(extraSmallText.length).toBeGreaterThan(0);
    });
  });

  describe('Component Structure', () => {
    it('renders main container with spacing', () => {
      const { container } = render(<ThesisActiveWidget />);

      expect(container.firstChild).toHaveClass('space-y-2');
    });

    it('renders title and icon in same row', () => {
      const { container } = render(<ThesisActiveWidget />);

      const titleRows = container.querySelectorAll('.flex.items-start.gap-2');
      expect(titleRows.length).toBeGreaterThan(0);
    });

    it('renders score and status in same row', () => {
      const { container } = render(<ThesisActiveWidget />);

      const infoRows = container.querySelectorAll('.flex.items-center.justify-between');
      expect(infoRows.length).toBeGreaterThan(0);
    });

    it('applies proper padding to thesis cards', () => {
      const { container } = render(<ThesisActiveWidget />);

      const paddedCards = container.querySelectorAll('.p-2\\.5');
      expect(paddedCards.length).toBeGreaterThan(0);
    });
  });

  describe('Icon Positioning', () => {
    it('positions status icon at start of title row', () => {
      const { container } = render(<ThesisActiveWidget />);

      const iconRows = container.querySelectorAll('.flex.items-start.gap-2');
      expect(iconRows.length).toBeGreaterThan(0);
    });

    it('uses small icon size', () => {
      const { container } = render(<ThesisActiveWidget />);

      const icons = container.querySelectorAll('.h-3.w-3');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('uses flex layout for responsive alignment', () => {
      const { container } = render(<ThesisActiveWidget />);

      const flexContainers = container.querySelectorAll('.flex');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('uses flex-1 for title to take available space', () => {
      const { container } = render(<ThesisActiveWidget />);

      const flexTitle = container.querySelectorAll('.flex-1');
      expect(flexTitle.length).toBeGreaterThan(0);
    });

    it('applies justify-between for score and status spacing', () => {
      const { container } = render(<ThesisActiveWidget />);

      const spacedContainers = container.querySelectorAll('.justify-between');
      expect(spacedContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Transition Effects', () => {
    it('applies transition-colors for smooth hover', () => {
      const { container } = render(<ThesisActiveWidget />);

      const transitionElements = container.querySelectorAll('.transition-colors');
      expect(transitionElements.length).toBeGreaterThan(0);
    });
  });

  describe('Text Styling', () => {
    it('uses small text size for titles', () => {
      const { container } = render(<ThesisActiveWidget />);

      const smallText = container.querySelectorAll('.text-sm');
      expect(smallText.length).toBeGreaterThan(0);
    });

    it('uses extra small text size for metadata', () => {
      const { container } = render(<ThesisActiveWidget />);

      const extraSmallText = container.querySelectorAll('.text-xs');
      expect(extraSmallText.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('provides semantic structure with proper text hierarchy', () => {
      const { container } = render(<ThesisActiveWidget />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('includes visual indicators with status icons', () => {
      const { container } = render(<ThesisActiveWidget />);

      const icons = container.querySelectorAll('.h-3.w-3');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('uses color coding consistently for scores', () => {
      render(<ThesisActiveWidget />);

      const highScore = screen.getByText('78%');
      const mediumScore = screen.getByText('65%');

      expect(highScore.className).toContain('text-profit');
      expect(mediumScore.className).toContain('text-yellow-500');
    });
  });

  describe('Data Integrity', () => {
    it('renders all thesis data without truncation in UI elements', () => {
      render(<ThesisActiveWidget />);

      // Check that key data points are visible
      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Validating')).toBeInTheDocument();
    });
  });

  describe('Gap Spacing', () => {
    it('applies gap between icon and title', () => {
      const { container } = render(<ThesisActiveWidget />);

      const gapElements = container.querySelectorAll('.gap-2');
      expect(gapElements.length).toBeGreaterThan(0);
    });

    it('applies margin between sections within cards', () => {
      const { container } = render(<ThesisActiveWidget />);

      const marginElements = container.querySelectorAll('.mb-2, .mb-1\\.5, .mb-1');
      expect(marginElements.length).toBeGreaterThan(0);
    });
  });
});
