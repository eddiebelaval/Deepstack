import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard, MetricGrid, InlineMetric } from '../MetricCard';

describe('MetricCard', () => {
  describe('Rendering', () => {
    it('renders label and value', () => {
      render(<MetricCard label="Portfolio Value" value={12345.67} />);

      expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
      expect(screen.getByText('12,345.67')).toBeInTheDocument();
    });

    it('renders string value', () => {
      render(<MetricCard label="Status" value="Active" />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders numeric value with formatting', () => {
      render(<MetricCard label="Price" value={1234.5678} />);

      expect(screen.getByText('1,234.57')).toBeInTheDocument();
    });

    it('renders with prefix', () => {
      render(<MetricCard label="Price" value={150.25} prefix="$" />);

      expect(screen.getByText(/\$150.25/)).toBeInTheDocument();
    });

    it('renders with suffix', () => {
      render(<MetricCard label="Change" value={5.2} suffix="%" />);

      expect(screen.getByText(/5.20%/)).toBeInTheDocument();
    });

    it('renders with both prefix and suffix', () => {
      render(<MetricCard label="Fee" value={10} prefix="$" suffix=" USD" />);

      expect(screen.getByText(/\$10.00 USD/)).toBeInTheDocument();
    });
  });

  describe('Change indicators', () => {
    it('renders positive change with green color', () => {
      const { container } = render(<MetricCard label="Value" value={100} change={5.5} />);

      // The green color class is on the parent flex container, not the text itself
      const changeContainer = container.querySelector('.text-green-500');
      expect(changeContainer).toBeInTheDocument();
      expect(screen.getByText(/\+5.50/)).toBeInTheDocument();
    });

    it('renders negative change with red color', () => {
      const { container } = render(<MetricCard label="Value" value={100} change={-3.2} />);

      // The red color class is on the parent flex container, not the text itself
      const changeContainer = container.querySelector('.text-red-500');
      expect(changeContainer).toBeInTheDocument();
      expect(screen.getByText(/-3.20/)).toBeInTheDocument();
    });

    it('renders zero change with muted color', () => {
      const { container } = render(<MetricCard label="Value" value={100} change={0} />);

      const changeElement = container.querySelector('.text-muted-foreground');
      expect(changeElement).toBeInTheDocument();
    });

    it('renders positive change percentage', () => {
      // Note: isPositive is based on change value, not changePercent
      // When only changePercent is provided without change, isPositive is false (change is undefined)
      render(<MetricCard label="Value" value={100} changePercent={12.5} />);

      expect(screen.getByText(/12.50%/)).toBeInTheDocument();
    });

    it('renders negative change percentage', () => {
      render(<MetricCard label="Value" value={100} changePercent={-8.3} />);

      expect(screen.getByText(/-8.30%/)).toBeInTheDocument();
    });

    it('renders both change amount and percentage', () => {
      const { container } = render(<MetricCard label="Value" value={100} change={5} changePercent={5.0} />);

      // Both change amount and percentage are rendered (both match +5.00 pattern)
      const changeElements = screen.getAllByText(/\+5.00/);
      expect(changeElements.length).toBeGreaterThanOrEqual(2);
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('shows TrendingUp icon for positive change', () => {
      const { container } = render(<MetricCard label="Value" value={100} change={5} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('shows TrendingDown icon for negative change', () => {
      const { container } = render(<MetricCard label="Value" value={100} change={-5} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('shows Minus icon for neutral/zero change', () => {
      const { container } = render(<MetricCard label="Value" value={100} change={0} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(
        <MetricCard label="Value" value={100} size="sm" />
      );

      const card = container.querySelector('.p-3');
      expect(card).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      const { container } = render(<MetricCard label="Value" value={100} size="md" />);

      const card = container.querySelector('.p-4');
      expect(card).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<MetricCard label="Value" value={100} size="lg" />);

      const card = container.querySelector('.p-5');
      expect(card).toBeInTheDocument();
    });

    it('applies correct text sizes for small card', () => {
      const { container } = render(
        <MetricCard label="Value" value={100} size="sm" />
      );

      expect(container.querySelector('.text-xs')).toBeInTheDocument();
      expect(container.querySelector('.text-lg')).toBeInTheDocument();
    });

    it('applies correct text sizes for large card', () => {
      const { container } = render(
        <MetricCard label="Value" value={100} size="lg" />
      );

      expect(container.querySelector('.text-sm')).toBeInTheDocument();
      expect(container.querySelector('.text-3xl')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has card background', () => {
      const { container } = render(<MetricCard label="Value" value={100} />);

      const card = container.querySelector('.bg-card\\/50');
      expect(card).toBeInTheDocument();
    });

    it('has rounded corners', () => {
      const { container } = render(<MetricCard label="Value" value={100} />);

      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();
    });

    it('has border', () => {
      const { container } = render(<MetricCard label="Value" value={100} />);

      const card = container.querySelector('.border');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('border-border/50');
    });

    it('has backdrop blur', () => {
      const { container } = render(<MetricCard label="Value" value={100} />);

      const card = container.querySelector('.backdrop-blur-sm');
      expect(card).toBeInTheDocument();
    });

    it('merges custom className', () => {
      const { container } = render(
        <MetricCard label="Value" value={100} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
      expect(container.firstChild).toHaveClass('rounded-xl');
    });
  });

  describe('Typography', () => {
    it('renders label with muted foreground', () => {
      render(<MetricCard label="Test Label" value={100} />);

      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('text-muted-foreground');
      expect(label).toHaveClass('font-medium');
    });

    it('renders value with bold font', () => {
      const { container } = render(<MetricCard label="Value" value={100} />);

      const value = screen.getByText('100.00');
      expect(value).toHaveClass('font-bold');
      expect(value).toHaveClass('tracking-tight');
    });
  });

  describe('Edge cases', () => {
    it('handles zero value', () => {
      render(<MetricCard label="Value" value={0} />);

      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(<MetricCard label="Value" value={1234567890.12} />);

      expect(screen.getByText('1,234,567,890.12')).toBeInTheDocument();
    });

    it('handles very small numbers', () => {
      render(<MetricCard label="Value" value={0.01} />);

      expect(screen.getByText('0.01')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      render(<MetricCard label="Value" value={-50.25} />);

      expect(screen.getByText('-50.25')).toBeInTheDocument();
    });

    it('handles undefined change', () => {
      render(<MetricCard label="Value" value={100} change={undefined} />);

      // Should not show change indicator
      expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    });
  });
});

describe('MetricGrid', () => {
  describe('Rendering', () => {
    it('renders children', () => {
      render(
        <MetricGrid>
          <MetricCard label="Card 1" value={100} />
          <MetricCard label="Card 2" value={200} />
        </MetricGrid>
      );

      expect(screen.getByText('Card 1')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
    });

    it('has grid layout', () => {
      const { container } = render(
        <MetricGrid>
          <div>Child</div>
        </MetricGrid>
      );

      expect(container.firstChild).toHaveClass('grid');
    });

    it('renders with 2 columns', () => {
      const { container } = render(
        <MetricGrid columns={2}>
          <div>Child</div>
        </MetricGrid>
      );

      expect(container.firstChild).toHaveClass('grid-cols-2');
    });

    it('renders with 3 columns (default)', () => {
      const { container } = render(
        <MetricGrid columns={3}>
          <div>Child</div>
        </MetricGrid>
      );

      expect(container.firstChild).toHaveClass('grid-cols-2');
      expect(container.firstChild).toHaveClass('md:grid-cols-3');
    });

    it('renders with 4 columns', () => {
      const { container } = render(
        <MetricGrid columns={4}>
          <div>Child</div>
        </MetricGrid>
      );

      expect(container.firstChild).toHaveClass('grid-cols-2');
      expect(container.firstChild).toHaveClass('md:grid-cols-4');
    });

    it('has gap between items', () => {
      const { container } = render(
        <MetricGrid>
          <div>Child</div>
        </MetricGrid>
      );

      expect(container.firstChild).toHaveClass('gap-3');
    });

    it('merges custom className', () => {
      const { container } = render(
        <MetricGrid className="custom-grid">
          <div>Child</div>
        </MetricGrid>
      );

      expect(container.firstChild).toHaveClass('custom-grid');
      expect(container.firstChild).toHaveClass('grid');
    });
  });
});

describe('InlineMetric', () => {
  describe('Rendering', () => {
    it('renders value', () => {
      render(<InlineMetric value={100} />);

      expect(screen.getByText('100.00')).toBeInTheDocument();
    });

    it('renders string value', () => {
      render(<InlineMetric value="Active" />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders with prefix', () => {
      const { container } = render(<InlineMetric value={50} prefix="$" />);

      expect(screen.getByText(/\$50.00/)).toBeInTheDocument();
    });

    it('renders with suffix', () => {
      const { container } = render(<InlineMetric value={25} suffix="%" />);

      expect(screen.getByText(/25.00%/)).toBeInTheDocument();
    });

    it('renders change percentage', () => {
      render(<InlineMetric value={100} change={5.5} />);

      expect(screen.getByText(/\(\+5.50%\)/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has inline-flex layout', () => {
      const { container } = render(<InlineMetric value={100} />);

      expect(container.firstChild).toHaveClass('inline-flex');
    });

    it('has monospace font', () => {
      const { container } = render(<InlineMetric value={100} />);

      expect(container.firstChild).toHaveClass('font-mono');
    });

    it('applies positive color for positive change', () => {
      const { container } = render(<InlineMetric value={100} change={5} />);

      expect(container.firstChild).toHaveClass('text-green-500');
    });

    it('applies negative color for negative change', () => {
      const { container } = render(<InlineMetric value={100} change={-5} />);

      expect(container.firstChild).toHaveClass('text-red-500');
    });

    it('has background and padding', () => {
      const { container } = render(<InlineMetric value={100} />);

      expect(container.firstChild).toHaveClass('bg-muted/50');
      expect(container.firstChild).toHaveClass('px-1.5');
      expect(container.firstChild).toHaveClass('py-0.5');
    });

    it('has rounded corners', () => {
      const { container } = render(<InlineMetric value={100} />);

      expect(container.firstChild).toHaveClass('rounded');
    });
  });

  describe('Edge cases', () => {
    it('handles zero change', () => {
      render(<InlineMetric value={100} change={0} />);

      expect(screen.getByText('100.00')).toBeInTheDocument();
      // When change is explicitly 0 (not undefined), the percentage is still shown
      expect(screen.getByText(/0.00%/)).toBeInTheDocument();
    });

    it('handles undefined change', () => {
      render(<InlineMetric value={100} change={undefined} />);

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(<InlineMetric value={9999999.99} />);

      expect(screen.getByText('9,999,999.99')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      render(<InlineMetric value={-25.5} />);

      expect(screen.getByText('-25.50')).toBeInTheDocument();
    });
  });
});
