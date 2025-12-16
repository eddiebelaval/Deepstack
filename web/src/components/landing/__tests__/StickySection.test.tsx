import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StickySection, ScrollProgressBar, ParallaxSection, FeatureCard, StepCard, ScrollReveal, ScaleOnScroll, Floating, GradientText } from '../StickySection';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    header: ({ children, className, ...props }: any) => (
      <header className={className} {...props}>{children}</header>
    ),
    h2: ({ children, className, ...props }: any) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>{children}</p>
    ),
  },
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('StickySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with required props', () => {
      render(
        <StickySection id="test-section" title="Test Title">
          <div>Test Content</div>
        </StickySection>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(
        <StickySection id="test" title="Title" subtitle="Test Subtitle">
          <div>Content</div>
        </StickySection>
      );

      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('renders badge when provided', () => {
      render(
        <StickySection id="test" title="Title" badge="New Feature">
          <div>Content</div>
        </StickySection>
      );

      expect(screen.getByText('New Feature')).toBeInTheDocument();
    });

    it('renders badge icon when provided', () => {
      render(
        <StickySection
          id="test"
          title="Title"
          badge="Badge Text"
          badgeIcon={<span data-testid="badge-icon">Icon</span>}
        >
          <div>Content</div>
        </StickySection>
      );

      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    });
  });

  describe('alignment', () => {
    it('renders left-aligned layout by default', () => {
      const { container } = render(
        <StickySection id="test" title="Title">
          <div>Content</div>
        </StickySection>
      );

      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('renders right-aligned layout when align="right"', () => {
      render(
        <StickySection id="test" title="Title" align="right">
          <div>Content</div>
        </StickySection>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('renders centered layout when align="center"', () => {
      render(
        <StickySection id="test" title="Title" align="center">
          <div>Content</div>
        </StickySection>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('handles deprecated centerHeader prop', () => {
      render(
        <StickySection id="test" title="Title" centerHeader={true}>
          <div>Content</div>
        </StickySection>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('title accent', () => {
    it('applies title accent to last word', () => {
      render(
        <StickySection
          id="test"
          title="Test Title Accent"
          titleAccent="text-primary"
        >
          <div>Content</div>
        </StickySection>
      );

      const title = screen.getByText('Accent');
      expect(title).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('applies custom className to section', () => {
      const { container } = render(
        <StickySection id="test" title="Title" className="custom-section">
          <div>Content</div>
        </StickySection>
      );

      const section = container.querySelector('.custom-section');
      expect(section).toBeInTheDocument();
    });

    it('applies custom headerClassName', () => {
      render(
        <StickySection id="test" title="Title" headerClassName="custom-header">
          <div>Content</div>
        </StickySection>
      );

      expect(screen.getByText('Title').closest('header')).toHaveClass('custom-header');
    });

    it('applies custom contentClassName', () => {
      const { container } = render(
        <StickySection id="test" title="Title" contentClassName="custom-content">
          <div>Content</div>
        </StickySection>
      );

      const contentDiv = container.querySelector('.custom-content');
      expect(contentDiv).toBeInTheDocument();
    });

    it('applies custom badgeColor', () => {
      render(
        <StickySection
          id="test"
          title="Title"
          badge="Badge"
          badgeColor="bg-red-500"
        >
          <div>Content</div>
        </StickySection>
      );

      const badge = screen.getByText('Badge').closest('div');
      expect(badge).toHaveClass('bg-red-500');
    });
  });

  describe('scroll height', () => {
    it('applies default scrollHeight', () => {
      const { container } = render(
        <StickySection id="test" title="Title">
          <div>Content</div>
        </StickySection>
      );

      const section = container.querySelector('section');
      expect(section).toHaveClass('min-h-fit');
    });

    it('applies custom scrollHeight', () => {
      const { container } = render(
        <StickySection id="test" title="Title" scrollHeight="min-h-screen">
          <div>Content</div>
        </StickySection>
      );

      const section = container.querySelector('section');
      expect(section).toHaveClass('min-h-screen');
    });
  });
});

describe('ScrollProgressBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<ScrollProgressBar />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('ParallaxSection', () => {
  it('renders children', () => {
    render(
      <ParallaxSection>
        <div>Parallax Content</div>
      </ParallaxSection>
    );

    expect(screen.getByText('Parallax Content')).toBeInTheDocument();
  });

  it('applies left direction by default', () => {
    render(
      <ParallaxSection>
        <div>Content</div>
      </ParallaxSection>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('accepts custom direction', () => {
    render(
      <ParallaxSection direction="right">
        <div>Content</div>
      </ParallaxSection>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('accepts custom speed', () => {
    render(
      <ParallaxSection speed={50}>
        <div>Content</div>
      </ParallaxSection>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('FeatureCard', () => {
  it('renders with required props', () => {
    render(
      <FeatureCard
        icon={<span>Icon</span>}
        title="Feature Title"
        description="Feature description"
      />
    );

    expect(screen.getByText('Feature Title')).toBeInTheDocument();
    expect(screen.getByText('Feature description')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(
      <FeatureCard
        icon={<span data-testid="feature-icon">Icon</span>}
        title="Title"
        description="Description"
      />
    );

    expect(screen.getByTestId('feature-icon')).toBeInTheDocument();
  });

  it('applies custom color', () => {
    const { container } = render(
      <FeatureCard
        icon={<span>Icon</span>}
        title="Title"
        description="Description"
        color="text-red-500"
      />
    );

    const iconWrapper = container.querySelector('.text-red-500');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('applies custom background color', () => {
    const { container } = render(
      <FeatureCard
        icon={<span>Icon</span>}
        title="Title"
        description="Description"
        bgColor="bg-blue-500"
      />
    );

    const iconContainer = container.querySelector('.bg-blue-500');
    expect(iconContainer).toBeInTheDocument();
  });
});

describe('StepCard', () => {
  it('renders with required props', () => {
    render(
      <StepCard
        step={1}
        title="Step Title"
        description="Step description"
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Step Title')).toBeInTheDocument();
    expect(screen.getByText('Step description')).toBeInTheDocument();
  });

  it('renders multiple steps with different numbers', () => {
    render(
      <>
        <StepCard step={1} title="Step 1" description="First step" />
        <StepCard step={2} title="Step 2" description="Second step" />
        <StepCard step={3} title="Step 3" description="Third step" />
      </>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('ScrollReveal', () => {
  it('renders children', () => {
    render(
      <ScrollReveal>
        <div>Revealed Content</div>
      </ScrollReveal>
    );

    expect(screen.getByText('Revealed Content')).toBeInTheDocument();
  });

  it('accepts different directions', () => {
    const { rerender } = render(
      <ScrollReveal direction="up">
        <div>Content</div>
      </ScrollReveal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();

    rerender(
      <ScrollReveal direction="down">
        <div>Content</div>
      </ScrollReveal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();

    rerender(
      <ScrollReveal direction="left">
        <div>Content</div>
      </ScrollReveal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();

    rerender(
      <ScrollReveal direction="right">
        <div>Content</div>
      </ScrollReveal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('ScaleOnScroll', () => {
  it('renders children', () => {
    render(
      <ScaleOnScroll>
        <div>Scaled Content</div>
      </ScaleOnScroll>
    );

    expect(screen.getByText('Scaled Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ScaleOnScroll className="custom-scale">
        <div>Content</div>
      </ScaleOnScroll>
    );

    expect(container.querySelector('.custom-scale')).toBeInTheDocument();
  });
});

describe('Floating', () => {
  it('renders children', () => {
    render(
      <Floating>
        <div>Floating Content</div>
      </Floating>
    );

    expect(screen.getByText('Floating Content')).toBeInTheDocument();
  });

  it('accepts custom duration', () => {
    render(
      <Floating duration={5}>
        <div>Content</div>
      </Floating>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('accepts custom distance', () => {
    render(
      <Floating distance={20}>
        <div>Content</div>
      </Floating>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('GradientText', () => {
  it('renders children', () => {
    render(
      <GradientText>
        Gradient Text
      </GradientText>
    );

    expect(screen.getByText('Gradient Text')).toBeInTheDocument();
  });

  it('applies default gradient classes', () => {
    const { container } = render(
      <GradientText>
        Text
      </GradientText>
    );

    const span = container.querySelector('span');
    expect(span).toHaveClass('from-primary');
  });

  it('applies custom gradient colors', () => {
    const { container } = render(
      <GradientText from="from-blue-500" via="via-purple-500" to="to-pink-500">
        Text
      </GradientText>
    );

    const span = container.querySelector('span');
    expect(span).toHaveClass('from-blue-500', 'via-purple-500', 'to-pink-500');
  });
});
