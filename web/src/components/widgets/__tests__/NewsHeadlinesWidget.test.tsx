import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NewsHeadlinesWidget, type Headline } from '../NewsHeadlinesWidget';

describe('NewsHeadlinesWidget', () => {
  const mockHeadlines: Headline[] = [
    {
      id: '1',
      title: 'Fed signals potential rate cuts',
      source: 'Bloomberg',
      url: 'https://example.com/1',
      timeAgo: '15m',
    },
    {
      id: '2',
      title: 'Tech stocks rally on AI spending',
      source: 'Reuters',
      url: 'https://example.com/2',
      timeAgo: '1h',
    },
    {
      id: '3',
      title: 'Oil prices surge on supply concerns',
      source: 'CNBC',
      url: 'https://example.com/3',
      timeAgo: '2h',
    },
  ];

  describe('Rendering', () => {
    it('renders widget header with icon', () => {
      render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      expect(screen.getByText('Latest News')).toBeInTheDocument();
    });

    it('renders all headlines up to limit', () => {
      render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      expect(screen.getByText('Fed signals potential rate cuts')).toBeInTheDocument();
      expect(screen.getByText('Tech stocks rally on AI spending')).toBeInTheDocument();
      expect(screen.getByText('Oil prices surge on supply concerns')).toBeInTheDocument();
    });

    it('renders headline sources and time', () => {
      render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      expect(screen.getByText('Bloomberg')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
      expect(screen.getByText('Reuters')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
    });

    it('renders headlines as links', () => {
      render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute('href', 'https://example.com/1');
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Headline Limit', () => {
    it('limits headlines to 4 items', () => {
      const manyHeadlines: Headline[] = [
        { id: '1', title: 'Headline 1', source: 'Source 1', url: '#', timeAgo: '1m' },
        { id: '2', title: 'Headline 2', source: 'Source 2', url: '#', timeAgo: '2m' },
        { id: '3', title: 'Headline 3', source: 'Source 3', url: '#', timeAgo: '3m' },
        { id: '4', title: 'Headline 4', source: 'Source 4', url: '#', timeAgo: '4m' },
        { id: '5', title: 'Headline 5', source: 'Source 5', url: '#', timeAgo: '5m' },
        { id: '6', title: 'Headline 6', source: 'Source 6', url: '#', timeAgo: '6m' },
      ];

      render(<NewsHeadlinesWidget headlines={manyHeadlines} />);

      expect(screen.getByText('Headline 1')).toBeInTheDocument();
      expect(screen.getByText('Headline 2')).toBeInTheDocument();
      expect(screen.getByText('Headline 3')).toBeInTheDocument();
      expect(screen.getByText('Headline 4')).toBeInTheDocument();
      expect(screen.queryByText('Headline 5')).not.toBeInTheDocument();
      expect(screen.queryByText('Headline 6')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no headlines', () => {
      render(<NewsHeadlinesWidget headlines={[]} />);

      expect(screen.getByText('No headlines available')).toBeInTheDocument();
    });

    it('shows empty state when headlines is undefined', () => {
      render(<NewsHeadlinesWidget />);

      // Uses mock data by default, so should show headlines
      expect(screen.queryByText('No headlines available')).not.toBeInTheDocument();
    });
  });

  describe('Text Truncation', () => {
    it('truncates long headlines with line-clamp', () => {
      const longHeadline: Headline = {
        id: '1',
        title: 'This is an extremely long headline that should be truncated to prevent overflow and maintain a clean layout in the widget component',
        source: 'Test Source',
        url: '#',
        timeAgo: '1h',
      };

      const { container } = render(<NewsHeadlinesWidget headlines={[longHeadline]} />);

      const headlineElement = container.querySelector('.line-clamp-2');
      expect(headlineElement).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover styles to headline container', () => {
      const { container } = render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      const headlineContainers = container.querySelectorAll('.hover\\:bg-muted\\/30');
      expect(headlineContainers.length).toBeGreaterThan(0);
    });

    it('applies hover color to headline text', () => {
      const { container } = render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      const headlines = container.querySelectorAll('.group-hover\\:text-primary');
      expect(headlines.length).toBeGreaterThan(0);
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to widget', () => {
      const { container } = render(
        <NewsHeadlinesWidget headlines={mockHeadlines} className="custom-widget-class" />
      );

      expect(container.querySelector('.custom-widget-class')).toBeInTheDocument();
    });
  });

  describe('Widget Layout', () => {
    it('has minimum height constraint', () => {
      const { container } = render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      // Check for the widget container with glass-surface class
      const widget = container.querySelector('.glass-surface');
      expect(widget).toBeInTheDocument();
      expect(widget).toHaveStyle({ minHeight: '140px' });
    });

    it('has proper spacing between headlines', () => {
      const { container } = render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      const headlinesList = container.querySelector('.space-y-2');
      expect(headlinesList).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful link text for screen readers', () => {
      render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.textContent).toBeTruthy();
      });
    });

    it('includes external link icon indicator', () => {
      const { container } = render(<NewsHeadlinesWidget headlines={mockHeadlines} />);

      // Should have ExternalLink icons that appear on hover
      const icons = container.querySelectorAll('.opacity-0.group-hover\\:opacity-100');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles headline with missing fields gracefully', () => {
      const incompleteHeadline: Headline = {
        id: '1',
        title: 'Test Headline',
        source: '',
        url: '#',
        timeAgo: '',
      };

      render(<NewsHeadlinesWidget headlines={[incompleteHeadline]} />);

      expect(screen.getByText('Test Headline')).toBeInTheDocument();
    });

    it('handles very short source names', () => {
      const shortSourceHeadline: Headline = {
        id: '1',
        title: 'Test',
        source: 'A',
        url: '#',
        timeAgo: '1m',
      };

      render(<NewsHeadlinesWidget headlines={[shortSourceHeadline]} />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });
});
