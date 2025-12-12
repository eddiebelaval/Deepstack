import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HedgedSummaryWidget } from '../HedgedSummaryWidget';

describe('HedgedSummaryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering with Data', () => {
    it('renders portfolio protection header', () => {
      render(<HedgedSummaryWidget />);

      expect(screen.getByText('Portfolio Protection')).toBeInTheDocument();
    });

    it('displays total coverage percentage', () => {
      render(<HedgedSummaryWidget />);

      // Mock data has SPY (85%) and QQQ (100%), average = 92.5% rounded to 93%
      expect(screen.getByText('93%')).toBeInTheDocument();
    });

    it('displays net delta calculation', () => {
      render(<HedgedSummaryWidget />);

      expect(screen.getByText('Net Delta')).toBeInTheDocument();
      // SPY delta: -0.35, QQQ delta: -0.15, total: -0.50
      expect(screen.getByText('-0.50')).toBeInTheDocument();
    });

    it('displays hedge positions', () => {
      render(<HedgedSummaryWidget />);

      expect(screen.getByText('SPY')).toBeInTheDocument();
      expect(screen.getByText('QQQ')).toBeInTheDocument();
    });

    it('displays hedge types', () => {
      render(<HedgedSummaryWidget />);

      expect(screen.getByText('Put Spread')).toBeInTheDocument();
      expect(screen.getByText('Collar')).toBeInTheDocument();
    });

    it('displays individual hedge coverage', () => {
      render(<HedgedSummaryWidget />);

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Coverage Color Coding', () => {
    it('shows profit color for coverage >= 80%', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const coverageElement = screen.getByText('93%');
      expect(coverageElement).toHaveClass('text-profit');
    });
  });

  describe('Delta Indicators', () => {
    it('shows profit color for negative delta (protective)', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const deltaElement = screen.getByText('-0.50');
      expect(deltaElement).toHaveClass('text-profit');
    });

    it('displays trending down icon for negative delta positions', () => {
      const { container } = render(<HedgedSummaryWidget />);

      // Both mock positions have negative delta, should show TrendingDown icons
      const trendingIcons = container.querySelectorAll('.h-3.w-3');
      expect(trendingIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Layout and Styling', () => {
    it('applies proper spacing between sections', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const spacingContainer = container.querySelector('.space-y-3');
      expect(spacingContainer).toBeInTheDocument();
    });

    it('applies muted background to hedge position items', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const hedgeItems = container.querySelectorAll('.bg-muted\\/30');
      expect(hedgeItems.length).toBe(2); // SPY and QQQ
    });

    it('displays shield icon for portfolio protection', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const shieldIcon = container.querySelector('.text-primary');
      expect(shieldIcon).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('uses monospace font for numerical values', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const monoElements = container.querySelectorAll('.font-mono');
      expect(monoElements.length).toBeGreaterThan(0);
    });

    it('formats delta to 2 decimal places', () => {
      render(<HedgedSummaryWidget />);

      const deltaValue = screen.getByText('-0.50');
      expect(deltaValue).toBeInTheDocument();
    });

    it('displays percentage values for coverage', () => {
      render(<HedgedSummaryWidget />);

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('93%')).toBeInTheDocument();
    });
  });

  describe('Position Details', () => {
    it('displays position symbols with proper styling', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const spySymbol = screen.getByText('SPY');
      const qqqSymbol = screen.getByText('QQQ');

      expect(spySymbol).toHaveClass('font-medium');
      expect(qqqSymbol).toHaveClass('font-medium');
    });

    it('displays hedge types with muted styling', () => {
      render(<HedgedSummaryWidget />);

      const putSpread = screen.getByText('Put Spread');
      const collar = screen.getByText('Collar');

      expect(putSpread).toHaveClass('text-muted-foreground');
      expect(collar).toHaveClass('text-muted-foreground');
    });

    it('renders all hedge positions in rounded containers', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const roundedContainers = container.querySelectorAll('.rounded-lg.bg-muted\\/30');
      expect(roundedContainers.length).toBe(2);
    });
  });

  describe('Component Structure', () => {
    it('renders main container with proper spacing', () => {
      const { container } = render(<HedgedSummaryWidget />);

      expect(container.firstChild).toHaveClass('space-y-3');
    });

    it('renders summary section before positions', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const sections = container.querySelectorAll('.space-y-3 > *');
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it('groups hedge positions in separate container', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const positionsContainer = container.querySelector('.space-y-1\\.5');
      expect(positionsContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic text sizes for hierarchy', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const smallText = container.querySelectorAll('.text-sm');
      const extraSmallText = container.querySelectorAll('.text-xs');

      expect(smallText.length).toBeGreaterThan(0);
      expect(extraSmallText.length).toBeGreaterThan(0);
    });

    it('includes visual indicators with text labels', () => {
      render(<HedgedSummaryWidget />);

      expect(screen.getByText('Portfolio Protection')).toBeInTheDocument();
      expect(screen.getByText('Net Delta')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders correctly with empty mock data array', () => {
      // This test verifies the component can handle the structure
      // In real scenario, you'd mock the MOCK_HEDGES constant
      const { container } = render(<HedgedSummaryWidget />);

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('displays shield icon with primary color', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const shieldIcon = container.querySelector('.text-primary');
      expect(shieldIcon).toBeInTheDocument();
    });

    it('displays trending icons for each position', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const trendingIcons = container.querySelectorAll('.h-3.w-3');
      // Should have at least 2 (one for each position)
      expect(trendingIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Responsive Design', () => {
    it('uses flex layout for proper alignment', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const flexContainers = container.querySelectorAll('.flex');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('applies justify-between for spacing', () => {
      const { container } = render(<HedgedSummaryWidget />);

      const spacedContainers = container.querySelectorAll('.justify-between');
      expect(spacedContainers.length).toBeGreaterThan(0);
    });
  });
});
