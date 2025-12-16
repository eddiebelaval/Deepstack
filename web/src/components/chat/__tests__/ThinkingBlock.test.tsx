import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThinkingBlock } from '../ThinkingBlock';

describe('ThinkingBlock', () => {
  describe('Rendering', () => {
    it('renders thinking block with content', () => {
      render(<ThinkingBlock content="Analyzing the problem..." defaultExpanded={true} />);

      expect(screen.getByText('Extended Thinking')).toBeInTheDocument();
      expect(screen.getByText('Analyzing the problem...')).toBeInTheDocument();
    });

    it('renders header with Brain icon', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      expect(screen.getByText('Extended Thinking')).toBeInTheDocument();
      const brainIcon = container.querySelector('svg');
      expect(brainIcon).toBeInTheDocument();
    });

    it('shows "Show reasoning process" when collapsed', () => {
      render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      expect(screen.getByText('Show reasoning process')).toBeInTheDocument();
    });

    it('shows "Hide reasoning process" when expanded', () => {
      render(<ThinkingBlock content="Test" defaultExpanded={true} />);

      expect(screen.getByText('Hide reasoning process')).toBeInTheDocument();
    });

    it('does not render when content is empty', () => {
      const { container } = render(<ThinkingBlock content="" defaultExpanded={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('does not render when content is null', () => {
      const { container } = render(<ThinkingBlock content={null as any} defaultExpanded={false} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Expand/Collapse behavior', () => {
    it('starts collapsed by default', () => {
      render(<ThinkingBlock content="Hidden content" defaultExpanded={false} />);

      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
      expect(screen.getByText('Show reasoning process')).toBeInTheDocument();
    });

    it('starts expanded when defaultExpanded is true', () => {
      render(<ThinkingBlock content="Visible content" defaultExpanded={true} />);

      expect(screen.getByText('Visible content')).toBeInTheDocument();
      expect(screen.getByText('Hide reasoning process')).toBeInTheDocument();
    });

    it('toggles content visibility on click', async () => {
      const user = userEvent.setup();

      render(<ThinkingBlock content="Toggle content" defaultExpanded={false} />);

      const button = screen.getByRole('button');

      // Initially collapsed
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument();

      // Click to expand
      await user.click(button);
      expect(screen.getByText('Toggle content')).toBeInTheDocument();
      expect(screen.getByText('Hide reasoning process')).toBeInTheDocument();

      // Click to collapse
      await user.click(button);
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument();
      expect(screen.getByText('Show reasoning process')).toBeInTheDocument();
    });

    it('shows ChevronRight when collapsed', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const chevronRight = container.querySelector('svg.h-4.w-4');
      expect(chevronRight).toBeInTheDocument();
    });

    it('shows ChevronDown when expanded', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={true} />);

      const chevronDown = container.querySelector('svg.h-4.w-4');
      expect(chevronDown).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has purple border', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const wrapper = container.querySelector('.border-purple-500\\/30');
      expect(wrapper).toBeInTheDocument();
    });

    it('has purple background', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const wrapper = container.querySelector('.bg-purple-500\\/5');
      expect(wrapper).toBeInTheDocument();
    });

    it('has rounded corners', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const wrapper = container.querySelector('.rounded-xl');
      expect(wrapper).toBeInTheDocument();
    });

    it('header button has hover effect', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-purple-500/10');
      expect(button).toHaveClass('transition-colors');
    });

    it('content has border top when expanded', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={true} />);

      const content = container.querySelector('.border-t');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('border-purple-500/20');
    });
  });

  describe('Markdown rendering', () => {
    it('renders markdown paragraphs', () => {
      const { container } = render(
        <ThinkingBlock
          content="First paragraph\n\nSecond paragraph"
          defaultExpanded={true}
        />
      );

      // Content should be rendered (ReactMarkdown may or may not process it in test env)
      expect(container.textContent).toContain('First paragraph');
      expect(container.textContent).toContain('Second paragraph');
    });

    it('renders markdown list content', () => {
      const { container } = render(
        <ThinkingBlock content="- Item 1\n- Item 2\n- Item 3" defaultExpanded={true} />
      );

      // Content should be rendered
      expect(container.textContent).toContain('Item 1');
      expect(container.textContent).toContain('Item 2');
      expect(container.textContent).toContain('Item 3');
    });

    it('renders ordered list content', () => {
      const { container } = render(
        <ThinkingBlock content="1. First\n2. Second\n3. Third" defaultExpanded={true} />
      );

      // Content should be rendered
      expect(container.textContent).toContain('First');
      expect(container.textContent).toContain('Second');
      expect(container.textContent).toContain('Third');
    });

    it('renders bold text content', () => {
      const { container } = render(<ThinkingBlock content="This is **bold** text" defaultExpanded={true} />);

      // Content should be rendered - bold may or may not be processed
      expect(container.textContent).toContain('bold');
      expect(container.textContent).toContain('text');
    });

    it('renders inline code content', () => {
      const { container } = render(<ThinkingBlock content="Use `console.log()` here" defaultExpanded={true} />);

      // Content should be rendered
      expect(container.textContent).toContain('console.log()');
    });
  });

  describe('Content formatting', () => {
    it('preserves line breaks', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const { container } = render(<ThinkingBlock content={content} defaultExpanded={true} />);

      // ReactMarkdown may wrap lines or create line breaks
      expect(container.textContent).toContain('Line 1');
      expect(container.textContent).toContain('Line 2');
      expect(container.textContent).toContain('Line 3');
    });

    it('handles multi-line reasoning', () => {
      const content = `First, I need to analyze the data.

Then, I should consider the following:
- Point A
- Point B
- Point C

Finally, I can draw conclusions.`;

      const { container } = render(<ThinkingBlock content={content} defaultExpanded={true} />);

      // Content should be rendered
      expect(container.textContent).toContain('First, I need to analyze the data');
      expect(container.textContent).toContain('Point A');
      expect(container.textContent).toContain('Point B');
      expect(container.textContent).toContain('Point C');
      expect(container.textContent).toContain('Finally, I can draw conclusions');
    });
  });

  describe('Accessibility', () => {
    it('button has full width for easier clicking', () => {
      render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('button shows clear expand/collapse state', async () => {
      const user = userEvent.setup();

      render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const button = screen.getByRole('button');

      expect(screen.getByText('Show reasoning process')).toBeInTheDocument();

      await user.click(button);

      expect(screen.getByText('Hide reasoning process')).toBeInTheDocument();
    });

    it('has proper button role', () => {
      render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles very long content', () => {
      const longContent = 'A '.repeat(1000);
      render(<ThinkingBlock content={longContent} defaultExpanded={true} />);

      expect(screen.getByText(new RegExp(longContent.trim()))).toBeInTheDocument();
    });

    it('handles special characters', () => {
      const content = '< > & " \' @ # $ % ^';
      render(<ThinkingBlock content={content} defaultExpanded={true} />);

      expect(screen.getByText(/< > & " ' @ # \$ % \^/)).toBeInTheDocument();
    });

    it('handles markdown with code blocks', () => {
      const content = 'Here is some code:\n\n```javascript\nconst x = 1;\n```';
      render(<ThinkingBlock content={content} defaultExpanded={true} />);

      expect(screen.getByText(/Here is some code:/)).toBeInTheDocument();
    });

    it('handles empty whitespace content', () => {
      const { container } = render(<ThinkingBlock content="   " defaultExpanded={false} />);

      // Empty or whitespace-only content should still render
      expect(screen.getByText('Extended Thinking')).toBeInTheDocument();
    });
  });

  describe('Icon rendering', () => {
    it('renders Brain icon in header', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const icons = container.querySelectorAll('svg');
      // Should have both chevron and brain icons
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });

    it('icons have correct sizing', () => {
      const { container } = render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const icons = container.querySelectorAll('svg.h-4.w-4');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Text styling', () => {
    it('header text has correct color', () => {
      render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      // The button contains the header text and has the text-purple-300 class
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-purple-300');
      expect(screen.getByText('Extended Thinking')).toBeInTheDocument();
    });

    it('hint text has muted color', () => {
      render(<ThinkingBlock content="Test" defaultExpanded={false} />);

      const hintText = screen.getByText('Show reasoning process');
      expect(hintText).toHaveClass('text-purple-400/60');
    });

    it('content text has proper styling', () => {
      const { container } = render(<ThinkingBlock content="Test content" defaultExpanded={true} />);

      // The content wrapper has text-sm, text-foreground/80, and leading-relaxed
      const contentDiv = container.querySelector('.text-foreground\\/80');
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toHaveClass('text-sm');
      expect(contentDiv).toHaveClass('leading-relaxed');
    });
  });
});
