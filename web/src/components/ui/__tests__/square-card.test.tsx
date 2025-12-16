import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  SquareCard,
  SquareCardHeader,
  SquareCardContent,
  SquareCardFooter,
  SquareCardTitle,
  SquareCardActionButton,
} from '../square-card';

describe('SquareCard', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<SquareCard>Card Content</SquareCard>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should have aspect-square class', () => {
      const { container } = render(<SquareCard>Content</SquareCard>);
      expect(container.firstChild).toHaveClass('aspect-square');
    });

    it('should apply custom className', () => {
      const { container } = render(<SquareCard className="custom-class">Content</SquareCard>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Interactive States', () => {
    it('should apply highlighted styles', () => {
      const { container } = render(<SquareCard isHighlighted>Content</SquareCard>);
      expect(container.firstChild).toHaveClass('ring-2');
    });

    it('should apply selected styles', () => {
      const { container } = render(<SquareCard isSelected>Content</SquareCard>);
      expect(container.firstChild).toHaveClass('border-primary');
    });

    it('should handle click events', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<SquareCard onClick={onClick}>Click Me</SquareCard>);

      await user.click(screen.getByText('Click Me'));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Render Variants', () => {
    it('should render as div by default', () => {
      const { container } = render(<SquareCard>Content</SquareCard>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('should render as anchor with href', () => {
      const { container } = render(<SquareCard href="https://example.com">Content</SquareCard>);
      expect(container.firstChild?.nodeName).toBe('A');
      expect(container.firstChild).toHaveAttribute('href', 'https://example.com');
    });

    it('should render as button when as="button"', () => {
      const { container } = render(<SquareCard as="button">Content</SquareCard>);
      expect(container.firstChild?.nodeName).toBe('BUTTON');
    });
  });

  describe('Hover Gradient', () => {
    it('should render hover gradient overlay', () => {
      const { container } = render(
        <SquareCard hoverGradient="from-blue-500 to-purple-500">Content</SquareCard>
      );
      expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
    });
  });
});

describe('SquareCardHeader', () => {
  it('should render children', () => {
    render(<SquareCardHeader>Header Content</SquareCardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SquareCardHeader className="custom-header">Header</SquareCardHeader>
    );
    expect(container.firstChild).toHaveClass('custom-header');
  });
});

describe('SquareCardContent', () => {
  it('should render children', () => {
    render(<SquareCardContent>Main Content</SquareCardContent>);
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('should have flex-1 class', () => {
    const { container } = render(<SquareCardContent>Content</SquareCardContent>);
    expect(container.firstChild).toHaveClass('flex-1');
  });
});

describe('SquareCardFooter', () => {
  it('should render children', () => {
    render(<SquareCardFooter>Footer Content</SquareCardFooter>);
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('should have mt-auto class', () => {
    const { container } = render(<SquareCardFooter>Footer</SquareCardFooter>);
    expect(container.firstChild).toHaveClass('mt-auto');
  });
});

describe('SquareCardTitle', () => {
  it('should render children', () => {
    render(<SquareCardTitle>Card Title</SquareCardTitle>);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('should render as h3', () => {
    render(<SquareCardTitle>Title</SquareCardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('should apply line-clamp-2 by default', () => {
    const { container } = render(<SquareCardTitle>Title</SquareCardTitle>);
    expect(container.firstChild).toHaveClass('line-clamp-2');
  });

  it('should apply line-clamp-3 when lines=3', () => {
    const { container } = render(<SquareCardTitle lines={3}>Title</SquareCardTitle>);
    expect(container.firstChild).toHaveClass('line-clamp-3');
  });

  it('should have title attribute for string children', () => {
    render(<SquareCardTitle>Hover for full title</SquareCardTitle>);
    expect(screen.getByText('Hover for full title')).toHaveAttribute('title', 'Hover for full title');
  });
});

describe('SquareCardActionButton', () => {
  it('should render children', () => {
    render(<SquareCardActionButton>★</SquareCardActionButton>);
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('should handle click with event propagation stopped', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <SquareCardActionButton onClick={onClick}>Click</SquareCardActionButton>
      </div>
    );

    await user.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('should apply active styles when isActive', () => {
    const { container } = render(
      <SquareCardActionButton isActive>★</SquareCardActionButton>
    );
    expect(container.firstChild).toHaveClass('text-yellow-500');
  });

  it('should apply custom active className', () => {
    const { container } = render(
      <SquareCardActionButton isActive activeClassName="text-red-500">★</SquareCardActionButton>
    );
    expect(container.firstChild).toHaveClass('text-red-500');
  });

  it('should render with title attribute', () => {
    render(<SquareCardActionButton title="Add to watchlist">★</SquareCardActionButton>);
    expect(screen.getByTitle('Add to watchlist')).toBeInTheDocument();
  });
});
