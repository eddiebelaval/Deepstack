import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DynamicContentZone } from '../DynamicContentZone';
import { useUIStore } from '@/lib/stores/ui-store';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');

// Mock trading components
vi.mock('@/components/trading/ChartPanel', () => ({
  ChartPanel: vi.fn(() => <div data-testid="chart-panel">Chart Panel</div>),
}));

vi.mock('@/components/trading/PositionsList', () => ({
  PositionsList: vi.fn(() => <div data-testid="positions-list">Positions List</div>),
}));

vi.mock('@/components/lazy', () => ({
  LazyOptionsScreenerPanel: vi.fn(() => <div data-testid="options-screener">Options Screener</div>),
  LazyOptionsStrategyBuilder: vi.fn(() => <div data-testid="options-builder">Options Builder</div>),
}));

describe('DynamicContentZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No Content', () => {
    it('renders nothing when activeContent is none', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'none',
      } as any);

      const { container } = render(<DynamicContentZone />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Chart Content', () => {
    it('renders ChartPanel when activeContent is chart', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'chart',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
    });

    it('does not render other panels when chart is active', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'chart',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.queryByTestId('positions-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('options-screener')).not.toBeInTheDocument();
      expect(screen.queryByTestId('options-builder')).not.toBeInTheDocument();
    });
  });

  describe('Portfolio Content', () => {
    it('renders PositionsList when activeContent is portfolio', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'portfolio',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.getByTestId('positions-list')).toBeInTheDocument();
    });

    it('does not render other panels when portfolio is active', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'portfolio',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.queryByTestId('chart-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('options-screener')).not.toBeInTheDocument();
      expect(screen.queryByTestId('options-builder')).not.toBeInTheDocument();
    });
  });

  describe('Options Screener Content', () => {
    it('renders LazyOptionsScreenerPanel when activeContent is options-screener', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'options-screener',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.getByTestId('options-screener')).toBeInTheDocument();
    });

    it('does not render other panels when options-screener is active', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'options-screener',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.queryByTestId('chart-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('positions-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('options-builder')).not.toBeInTheDocument();
    });
  });

  describe('Options Builder Content', () => {
    it('renders LazyOptionsStrategyBuilder when activeContent is options-builder', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'options-builder',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.getByTestId('options-builder')).toBeInTheDocument();
    });

    it('does not render other panels when options-builder is active', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'options-builder',
      } as any);

      render(<DynamicContentZone />);

      expect(screen.queryByTestId('chart-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('positions-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('options-screener')).not.toBeInTheDocument();
    });
  });

  describe('Container Styling', () => {
    it('applies min-height styling when content is active', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'chart',
      } as any);

      const { container } = render(<DynamicContentZone />);

      expect(container.querySelector('.min-h-\\[400px\\]')).toBeInTheDocument();
    });

    it('applies flex-1 for full height', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'chart',
      } as any);

      const { container } = render(<DynamicContentZone />);

      expect(container.querySelector('.flex-1')).toBeInTheDocument();
    });

    it('applies border and rounded styling to panels', () => {
      vi.mocked(useUIStore).mockReturnValue({
        activeContent: 'chart',
      } as any);

      const { container } = render(<DynamicContentZone />);

      expect(container.querySelector('.border.rounded-lg')).toBeInTheDocument();
    });
  });
});
