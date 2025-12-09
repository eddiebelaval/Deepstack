import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('renders with children', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders as span by default', () => {
      render(<Badge>Status</Badge>);
      const badge = screen.getByText('Status');
      expect(badge.tagName).toBe('SPAN');
    });

    it('renders with data-slot attribute', () => {
      render(<Badge>Test</Badge>);
      expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'badge');
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-primary');
      expect(badge).toHaveClass('text-primary-foreground');
    });

    it('renders secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary');
      expect(badge).toHaveClass('text-secondary-foreground');
    });

    it('renders destructive variant', () => {
      render(<Badge variant="destructive">Destructive</Badge>);
      const badge = screen.getByText('Destructive');
      expect(badge).toHaveClass('bg-destructive');
    });

    it('renders outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('text-foreground');
    });
  });

  describe('custom className', () => {
    it('merges custom className with defaults', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      const badge = screen.getByText('Custom');

      expect(badge).toHaveClass('custom-badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('rounded-full');
    });
  });

  describe('asChild', () => {
    it('renders as child element when asChild is true', () => {
      render(
        <Badge asChild>
          <a href="/new">New Feature</a>
        </Badge>
      );

      const link = screen.getByRole('link', { name: 'New Feature' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/new');
      expect(link).toHaveAttribute('data-slot', 'badge');
    });
  });

  describe('styles', () => {
    it('has rounded-full class', () => {
      render(<Badge>Round</Badge>);
      expect(screen.getByText('Round')).toHaveClass('rounded-full');
    });

    it('has inline-flex for layout', () => {
      render(<Badge>Inline</Badge>);
      expect(screen.getByText('Inline')).toHaveClass('inline-flex');
    });

    it('has text-xs for small text', () => {
      render(<Badge>Small</Badge>);
      expect(screen.getByText('Small')).toHaveClass('text-xs');
    });

    it('has font-medium weight', () => {
      render(<Badge>Medium</Badge>);
      expect(screen.getByText('Medium')).toHaveClass('font-medium');
    });
  });

  describe('HTML attributes', () => {
    it('passes through HTML attributes', () => {
      render(
        <Badge data-testid="test-badge" id="my-badge">
          Test
        </Badge>
      );

      const badge = screen.getByTestId('test-badge');
      expect(badge).toHaveAttribute('id', 'my-badge');
    });
  });
});
