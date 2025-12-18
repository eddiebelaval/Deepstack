import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NewsHeadlinesWidget, type Headline } from '../NewsHeadlinesWidget';

// Mock headlines data
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

// Mock the useNewsHeadlines hook
vi.mock('@/hooks/useNewsHeadlines', () => ({
  useNewsHeadlines: vi.fn(() => ({
    headlines: mockHeadlines,
    isLoading: false,
    error: null,
  })),
}));

describe('NewsHeadlinesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders widget header with icon', () => {
      render(<NewsHeadlinesWidget />);
      expect(screen.getByText('Latest News')).toBeInTheDocument();
    });

    it('renders all headlines up to limit', () => {
      render(<NewsHeadlinesWidget />);
      expect(screen.getByText('Fed signals potential rate cuts')).toBeInTheDocument();
      expect(screen.getByText('Tech stocks rally on AI spending')).toBeInTheDocument();
      expect(screen.getByText('Oil prices surge on supply concerns')).toBeInTheDocument();
    });

    it('renders headline sources and time', () => {
      render(<NewsHeadlinesWidget />);
      expect(screen.getByText('Bloomberg')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
      expect(screen.getByText('Reuters')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
    });

    it('renders headlines as links', () => {
      render(<NewsHeadlinesWidget />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute('href', 'https://example.com/1');
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<NewsHeadlinesWidget className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has glass surface styling', () => {
      const { container } = render(<NewsHeadlinesWidget />);
      const glassElement = container.querySelector('.glass-surface');
      expect(glassElement).toBeInTheDocument();
    });
  });
});
