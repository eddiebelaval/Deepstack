import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PullToRefresh, PullToRefreshScrollArea } from '../PullToRefresh';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, ...props }: any) => (
      <div {...props} style={style}>{children}</div>
    ),
  },
  useMotionValue: () => ({
    set: vi.fn(),
    get: () => 0,
  }),
  useTransform: () => 0,
  animate: vi.fn().mockResolvedValue(undefined),
}));

// Mock useHaptics
vi.mock('@/hooks/useHaptics', () => ({
  triggerHaptic: vi.fn(),
}));

describe('PullToRefresh', () => {
  const defaultProps = {
    onRefresh: vi.fn().mockResolvedValue(undefined),
    children: <div>Scrollable Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children', () => {
      render(<PullToRefresh {...defaultProps} />);
      expect(screen.getByText('Scrollable Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PullToRefresh {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have touch-pan-y class for native scroll', () => {
      const { container } = render(<PullToRefresh {...defaultProps} />);
      expect(container.firstChild).toHaveClass('touch-pan-y');
    });

    it('should have overflow-hidden class', () => {
      const { container } = render(<PullToRefresh {...defaultProps} />);
      expect(container.firstChild).toHaveClass('overflow-hidden');
    });
  });

  describe('Custom Indicator', () => {
    it('should render custom indicator when provided', () => {
      render(
        <PullToRefresh {...defaultProps} indicator={<span>Custom Indicator</span>} />
      );
      expect(screen.getByText('Custom Indicator')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept threshold prop', () => {
      const { container } = render(
        <PullToRefresh {...defaultProps} threshold={100} />
      );
      expect(container).toBeInTheDocument();
    });

    it('should accept maxPull prop', () => {
      const { container } = render(
        <PullToRefresh {...defaultProps} maxPull={150} />
      );
      expect(container).toBeInTheDocument();
    });

    it('should accept disabled prop', () => {
      const { container } = render(
        <PullToRefresh {...defaultProps} disabled />
      );
      expect(container).toBeInTheDocument();
    });
  });
});

describe('PullToRefreshScrollArea', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <PullToRefreshScrollArea>
          <div>Scroll Content</div>
        </PullToRefreshScrollArea>
      );
      expect(screen.getByText('Scroll Content')).toBeInTheDocument();
    });

    it('should have data-pull-scroll attribute', () => {
      const { container } = render(
        <PullToRefreshScrollArea>Content</PullToRefreshScrollArea>
      );
      expect(container.querySelector('[data-pull-scroll]')).toBeInTheDocument();
    });

    it('should have overflow-y-auto class', () => {
      const { container } = render(
        <PullToRefreshScrollArea>Content</PullToRefreshScrollArea>
      );
      expect(container.firstChild).toHaveClass('overflow-y-auto');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PullToRefreshScrollArea className="custom-scroll">Content</PullToRefreshScrollArea>
      );
      expect(container.firstChild).toHaveClass('custom-scroll');
    });
  });
});
