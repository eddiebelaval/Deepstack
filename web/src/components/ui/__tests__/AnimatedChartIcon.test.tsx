import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnimatedChartIcon, AnimatedChartIconSmall } from '../AnimatedChartIcon';

describe('AnimatedChartIcon', () => {
  describe('Rendering', () => {
    it('should render svg element', () => {
      const { container } = render(<AnimatedChartIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render with default size of 16', () => {
      const { container } = render(<AnimatedChartIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('should render with custom size', () => {
      const { container } = render(<AnimatedChartIcon size={24} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('should apply custom className', () => {
      const { container } = render(<AnimatedChartIcon className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Chart Elements', () => {
    it('should render grid lines', () => {
      const { container } = render(<AnimatedChartIcon />);
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should render chart axes', () => {
      const { container } = render(<AnimatedChartIcon />);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render trend line', () => {
      const { container } = render(<AnimatedChartIcon />);
      // The green trend line
      const greenPaths = Array.from(container.querySelectorAll('path')).filter(
        path => path.getAttribute('stroke') === '#22c55e'
      );
      expect(greenPaths.length).toBeGreaterThan(0);
    });
  });

  describe('Hover Animation', () => {
    it('should show data points on hover', async () => {
      const user = userEvent.setup();
      const { container } = render(<AnimatedChartIcon />);
      const wrapper = container.firstChild as HTMLElement;

      // Before hover, data points should have opacity-0
      const circles = container.querySelectorAll('circle');
      const pointsGroup = circles[0]?.parentElement;
      expect(pointsGroup).toHaveClass('opacity-0');

      // After hover
      await user.hover(wrapper);
      expect(pointsGroup).toHaveClass('opacity-100');
    });

    it('should hide data points on unhover', async () => {
      const user = userEvent.setup();
      const { container } = render(<AnimatedChartIcon />);
      const wrapper = container.firstChild as HTMLElement;

      await user.hover(wrapper);
      await user.unhover(wrapper);

      const circles = container.querySelectorAll('circle');
      const pointsGroup = circles[0]?.parentElement;
      expect(pointsGroup).toHaveClass('opacity-0');
    });
  });
});

describe('AnimatedChartIconSmall', () => {
  it('should render with size 14', () => {
    const { container } = render(<AnimatedChartIconSmall />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '14');
    expect(svg).toHaveAttribute('height', '14');
  });

  it('should apply custom className', () => {
    const { container } = render(<AnimatedChartIconSmall className="small-icon" />);
    expect(container.firstChild).toHaveClass('small-icon');
  });
});
