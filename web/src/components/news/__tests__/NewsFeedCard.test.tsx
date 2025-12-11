import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewsFeedCard } from '../NewsFeedCard';
import type { NewsArticle } from '@/lib/stores/news-store';

// Mock square-card components
vi.mock('@/components/ui/square-card', () => ({
  SquareCard: ({ children, onClick, isHighlighted, className }: any) => (
    <div
      className={className}
      onClick={onClick}
      data-highlighted={isHighlighted}
      data-testid="square-card"
    >
      {children}
    </div>
  ),
  SquareCardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  SquareCardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  SquareCardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
  SquareCardActionButton: ({ children, onClick, isActive, title }: any) => (
    <button onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }} data-active={isActive} title={title}>
      {children}
    </button>
  ),
}));

describe('NewsFeedCard', () => {
  const baseArticle: NewsArticle = {
    id: '1',
    headline: 'Fed signals potential rate cuts in Q2',
    summary: 'The Federal Reserve indicated potential rate cuts in the second quarter as inflation shows signs of cooling.',
    source: 'Bloomberg',
    url: 'https://example.com/article',
    publishedAt: new Date().toISOString(),
    symbols: ['SPY', 'TLT'],
    sentiment: 'neutral',
  };

  describe('Rendering', () => {
    it('renders article headline', () => {
      render(<NewsFeedCard article={baseArticle} />);

      expect(screen.getByText('Fed signals potential rate cuts in Q2')).toBeInTheDocument();
    });

    it('renders source badge', () => {
      render(<NewsFeedCard article={baseArticle} />);

      // Bloomberg should show as "Bloomb" (first 6 chars) or similar
      const badge = screen.getByTitle('Bloomberg');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toMatch(/Bloomb|BLM/i);
    });

    it('renders time ago', () => {
      const recentArticle = {
        ...baseArticle,
        publishedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      };

      render(<NewsFeedCard article={recentArticle} />);

      expect(screen.getByText('15m')).toBeInTheDocument();
    });

    it('renders symbol tags', () => {
      render(<NewsFeedCard article={baseArticle} />);

      expect(screen.getByText('$SPY')).toBeInTheDocument();
      expect(screen.getByText('$TLT')).toBeInTheDocument();
    });

    it('limits symbols to 3 with overflow indicator', () => {
      const articleWithManySymbols: NewsArticle = {
        ...baseArticle,
        symbols: ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA'],
      };

      render(<NewsFeedCard article={articleWithManySymbols} />);

      expect(screen.getByText('$SPY')).toBeInTheDocument();
      expect(screen.getByText('$QQQ')).toBeInTheDocument();
      expect(screen.getByText('$AAPL')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.queryByText('$NVDA')).not.toBeInTheDocument();
    });

    it('renders without symbols', () => {
      const articleWithoutSymbols: NewsArticle = {
        ...baseArticle,
        symbols: [],
      };

      render(<NewsFeedCard article={articleWithoutSymbols} />);

      expect(screen.queryByText(/\$[A-Z]+/)).not.toBeInTheDocument();
    });
  });

  describe('Sentiment Display', () => {
    it('displays positive sentiment icon', () => {
      const positiveArticle: NewsArticle = {
        ...baseArticle,
        sentiment: 'positive',
      };

      const { container } = render(<NewsFeedCard article={positiveArticle} />);

      const icon = container.querySelector('.text-green-500');
      expect(icon).toBeInTheDocument();
    });

    it('displays negative sentiment icon', () => {
      const negativeArticle: NewsArticle = {
        ...baseArticle,
        sentiment: 'negative',
      };

      const { container } = render(<NewsFeedCard article={negativeArticle} />);

      const icon = container.querySelector('.text-red-500');
      expect(icon).toBeInTheDocument();
    });

    it('displays neutral sentiment icon', () => {
      const neutralArticle: NewsArticle = {
        ...baseArticle,
        sentiment: 'neutral',
      };

      const { container } = render(<NewsFeedCard article={neutralArticle} />);

      const icon = container.querySelector('.text-muted-foreground');
      expect(icon).toBeInTheDocument();
    });

    it('defaults to neutral when sentiment is missing', () => {
      const articleWithoutSentiment = {
        ...baseArticle,
        sentiment: undefined,
      } as NewsArticle;

      const { container } = render(<NewsFeedCard article={articleWithoutSentiment} />);

      const icon = container.querySelector('.text-muted-foreground');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Bookmark Functionality', () => {
    it('shows bookmark button when onToggleBookmark is provided', () => {
      const onToggleBookmark = vi.fn();
      render(<NewsFeedCard article={baseArticle} onToggleBookmark={onToggleBookmark} />);

      const bookmarkButton = screen.getByTitle('Bookmark article');
      expect(bookmarkButton).toBeInTheDocument();
    });

    it('does not show bookmark button when onToggleBookmark is not provided', () => {
      render(<NewsFeedCard article={baseArticle} />);

      expect(screen.queryByTitle('Bookmark article')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Remove bookmark')).not.toBeInTheDocument();
    });

    it('calls onToggleBookmark when bookmark button is clicked', () => {
      const onToggleBookmark = vi.fn();
      render(<NewsFeedCard article={baseArticle} onToggleBookmark={onToggleBookmark} />);

      const bookmarkButton = screen.getByTitle('Bookmark article');
      fireEvent.click(bookmarkButton);

      expect(onToggleBookmark).toHaveBeenCalledTimes(1);
    });

    it('shows active bookmark when isBookmarked is true', () => {
      const onToggleBookmark = vi.fn();
      render(
        <NewsFeedCard
          article={baseArticle}
          isBookmarked={true}
          onToggleBookmark={onToggleBookmark}
        />
      );

      expect(screen.getByTitle('Remove bookmark')).toBeInTheDocument();
    });

    it('highlights card when bookmarked', () => {
      render(<NewsFeedCard article={baseArticle} isBookmarked={true} />);

      const card = screen.getByTestId('square-card');
      expect(card).toHaveAttribute('data-highlighted', 'true');
    });
  });

  describe('Symbol Click Handling', () => {
    it('calls onSymbolClick when symbol is clicked', () => {
      const onSymbolClick = vi.fn();
      render(<NewsFeedCard article={baseArticle} onSymbolClick={onSymbolClick} />);

      fireEvent.click(screen.getByText('$SPY'));

      expect(onSymbolClick).toHaveBeenCalledWith('SPY');
    });

    it('prevents event propagation when clicking symbol', () => {
      const onSymbolClick = vi.fn();
      render(
        <NewsFeedCard article={baseArticle} onSymbolClick={onSymbolClick} />
      );

      const symbolButton = screen.getByText('$SPY');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      symbolButton.dispatchEvent(clickEvent);

      expect(onSymbolClick).toHaveBeenCalledWith('SPY');
    });
  });

  describe('Time Formatting', () => {
    it('displays minutes for recent articles', () => {
      const article: NewsArticle = {
        ...baseArticle,
        publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      };

      render(<NewsFeedCard article={article} />);

      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('displays hours for articles from today', () => {
      const article: NewsArticle = {
        ...baseArticle,
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      };

      render(<NewsFeedCard article={article} />);

      expect(screen.getByText('3h')).toBeInTheDocument();
    });

    it('displays days for older articles', () => {
      const article: NewsArticle = {
        ...baseArticle,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      };

      render(<NewsFeedCard article={article} />);

      expect(screen.getByText('2d')).toBeInTheDocument();
    });
  });

  describe('Source Badge Styling', () => {
    it('applies Bloomberg styling', () => {
      const article: NewsArticle = { ...baseArticle, source: 'Bloomberg' };
      const { container } = render(<NewsFeedCard article={article} />);

      const badge = container.querySelector('.bg-orange-500\\/20');
      expect(badge).toBeInTheDocument();
    });

    it('applies Reuters styling', () => {
      const article: NewsArticle = { ...baseArticle, source: 'Reuters' };
      const { container } = render(<NewsFeedCard article={article} />);

      const badge = container.querySelector('.bg-blue-500\\/20');
      expect(badge).toBeInTheDocument();
    });

    it('applies default styling for unknown sources', () => {
      const article: NewsArticle = { ...baseArticle, source: 'Unknown Source' };
      const { container } = render(<NewsFeedCard article={article} />);

      const badge = container.querySelector('.bg-muted\\/50');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to card', () => {
      const { container } = render(
        <NewsFeedCard article={baseArticle} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long headlines with truncation', () => {
      const longHeadline = 'A'.repeat(200);
      const article: NewsArticle = {
        ...baseArticle,
        headline: longHeadline,
      };

      const { container } = render(<NewsFeedCard article={article} />);

      const headline = container.querySelector('.line-clamp-3');
      expect(headline).toBeInTheDocument();
    });

    it('handles article with no symbols', () => {
      const article: NewsArticle = {
        ...baseArticle,
        symbols: undefined,
      } as NewsArticle;

      render(<NewsFeedCard article={article} />);

      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });
});
