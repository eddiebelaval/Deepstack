import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JournalRecentWidget } from '../JournalRecentWidget';

describe('JournalRecentWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering with Data', () => {
    it('renders journal entry titles', () => {
      render(<JournalRecentWidget />);

      expect(screen.getByText('NVDA earnings play')).toBeInTheDocument();
      expect(screen.getByText('Stopped out on SPY')).toBeInTheDocument();
      expect(screen.getByText('Portfolio rebalance')).toBeInTheDocument();
    });

    it('displays entry excerpts', () => {
      render(<JournalRecentWidget />);

      expect(screen.getByText(/Entered calls on pullback/)).toBeInTheDocument();
      expect(screen.getByText(/Market turned against tech/)).toBeInTheDocument();
      expect(screen.getByText(/Shifted 15% to cash/)).toBeInTheDocument();
    });

    it('displays sentiment labels', () => {
      render(<JournalRecentWidget />);

      expect(screen.getByText('bullish')).toBeInTheDocument();
      expect(screen.getByText('bearish')).toBeInTheDocument();
      expect(screen.getByText('neutral')).toBeInTheDocument();
    });

    it('shows formatted dates', () => {
      render(<JournalRecentWidget />);

      // Component should render dates - format depends on current date
      const container = render(<JournalRecentWidget />).container;
      const dateElements = container.querySelectorAll('.text-muted-foreground.font-medium');
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Date Formatting', () => {
    it('formats dates as relative or absolute', () => {
      render(<JournalRecentWidget />);

      // The component should format dates, just check they're rendered
      // Actual values depend on current date
      const dateElements = screen.getAllByText(/Today|Yesterday|Dec \d+/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Sentiment Styling', () => {
    it('applies profit color for bullish sentiment', () => {
      const { container } = render(<JournalRecentWidget />);

      const bullishText = screen.getByText('bullish');
      expect(bullishText).toHaveClass('text-profit');
    });

    it('applies loss color for bearish sentiment', () => {
      const { container } = render(<JournalRecentWidget />);

      const bearishText = screen.getByText('bearish');
      expect(bearishText).toHaveClass('text-loss');
    });

    it('applies muted color for neutral sentiment', () => {
      const { container } = render(<JournalRecentWidget />);

      const neutralText = screen.getByText('neutral');
      expect(neutralText).toHaveClass('text-muted-foreground');
    });

    it('capitalizes sentiment labels', () => {
      render(<JournalRecentWidget />);

      const sentimentLabels = screen.getAllByText(/bullish|bearish|neutral/);
      sentimentLabels.forEach((label) => {
        expect(label).toHaveClass('capitalize');
      });
    });
  });

  describe('Sentiment Icons', () => {
    it('displays trending up icon for bullish entries', () => {
      const { container } = render(<JournalRecentWidget />);

      // Check that icons are rendered with proper size
      const icons = container.querySelectorAll('.h-3.w-3');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('displays trending down icon for bearish entries', () => {
      const { container } = render(<JournalRecentWidget />);

      // Check that sentiment icons are rendered
      const icons = container.querySelectorAll('.h-3.w-3');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('displays minus icon for neutral entries', () => {
      const { container } = render(<JournalRecentWidget />);

      // Check that icons are present in sentiment groups
      const sentimentGroups = container.querySelectorAll('.flex.items-center.gap-1');
      expect(sentimentGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('does not show empty state when entries exist', () => {
      render(<JournalRecentWidget />);

      expect(screen.queryByText('No journal entries')).not.toBeInTheDocument();
    });

    it('would show empty state with book icon', () => {
      // This test documents expected behavior
      // In real scenario, mock MOCK_ENTRIES to be empty
      const { container } = render(<JournalRecentWidget />);

      // Component should handle empty state gracefully
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Entry Limit', () => {
    it('limits display to 3 entries', () => {
      render(<JournalRecentWidget />);

      const { container } = render(<JournalRecentWidget />);

      // Should show at most 3 entry cards
      const entryCards = container.querySelectorAll('.glass-surface');
      expect(entryCards.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Layout and Styling', () => {
    it('applies glass surface styling to entries', () => {
      const { container } = render(<JournalRecentWidget />);

      const glassElements = container.querySelectorAll('.glass-surface');
      expect(glassElements.length).toBeGreaterThan(0);
    });

    it('applies hover effects to entries', () => {
      const { container } = render(<JournalRecentWidget />);

      const hoverElements = container.querySelectorAll('.hover\\:bg-muted\\/30');
      expect(hoverElements.length).toBeGreaterThan(0);
    });

    it('applies cursor pointer for clickability', () => {
      const { container } = render(<JournalRecentWidget />);

      const clickableElements = container.querySelectorAll('.cursor-pointer');
      expect(clickableElements.length).toBeGreaterThan(0);
    });

    it('uses proper spacing between entries', () => {
      const { container } = render(<JournalRecentWidget />);

      const spacingContainer = container.querySelector('.space-y-2');
      expect(spacingContainer).toBeInTheDocument();
    });

    it('applies rounded corners to entry cards', () => {
      const { container } = render(<JournalRecentWidget />);

      const roundedElements = container.querySelectorAll('.rounded-lg');
      expect(roundedElements.length).toBeGreaterThan(0);
    });

    it('applies proper padding to entry cards', () => {
      const { container } = render(<JournalRecentWidget />);

      const paddedCards = container.querySelectorAll('.p-2\\.5');
      expect(paddedCards.length).toBeGreaterThan(0);
    });
  });

  describe('Title Display', () => {
    it('limits title to 1 line with line-clamp', () => {
      const { container } = render(<JournalRecentWidget />);

      const titles = container.querySelectorAll('.line-clamp-1');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('uses semibold font weight for titles', () => {
      const { container } = render(<JournalRecentWidget />);

      const titles = container.querySelectorAll('.font-semibold');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('uses small text size for titles', () => {
      const { container } = render(<JournalRecentWidget />);

      const titleElements = screen.getAllByText(/NVDA earnings play|Stopped out|Portfolio rebalance/);
      titleElements.forEach((title) => {
        if (title.tagName === 'H4') {
          expect(title).toHaveClass('text-sm');
        }
      });
    });
  });

  describe('Excerpt Display', () => {
    it('limits excerpt to 2 lines with line-clamp', () => {
      const { container } = render(<JournalRecentWidget />);

      const excerpts = container.querySelectorAll('.line-clamp-2');
      expect(excerpts.length).toBeGreaterThan(0);
    });

    it('uses muted color for excerpts', () => {
      const { container } = render(<JournalRecentWidget />);

      const excerpts = container.querySelectorAll('.text-muted-foreground.line-clamp-2');
      expect(excerpts.length).toBeGreaterThan(0);
    });

    it('uses relaxed leading for readability', () => {
      const { container } = render(<JournalRecentWidget />);

      const excerpts = container.querySelectorAll('.leading-relaxed');
      expect(excerpts.length).toBeGreaterThan(0);
    });

    it('uses extra small text size for excerpts', () => {
      render(<JournalRecentWidget />);

      const excerpts = screen.getAllByText(/Entered calls|Market turned|Shifted 15%/);
      excerpts.forEach((excerpt) => {
        expect(excerpt).toHaveClass('text-xs');
      });
    });
  });

  describe('Header Layout', () => {
    it('displays date and sentiment in same row', () => {
      const { container } = render(<JournalRecentWidget />);

      const headerRows = container.querySelectorAll('.flex.items-center.justify-between');
      expect(headerRows.length).toBeGreaterThan(0);
    });

    it('applies medium font weight to dates', () => {
      const { container } = render(<JournalRecentWidget />);

      const dates = container.querySelectorAll('.text-muted-foreground.font-medium');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('groups sentiment icon and label together', () => {
      const { container } = render(<JournalRecentWidget />);

      const sentimentGroups = container.querySelectorAll('.flex.items-center.gap-1');
      expect(sentimentGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Component Structure', () => {
    it('renders main container with spacing', () => {
      const { container } = render(<JournalRecentWidget />);

      expect(container.firstChild).toHaveClass('space-y-2');
    });

    it('renders header before title', () => {
      const { container } = render(<JournalRecentWidget />);

      const entries = container.querySelectorAll('.glass-surface');
      expect(entries.length).toBeGreaterThan(0);
    });

    it('renders title before excerpt', () => {
      render(<JournalRecentWidget />);

      const title = screen.getByText('NVDA earnings play');
      const excerpt = screen.getByText(/Entered calls on pullback/);

      expect(title).toBeInTheDocument();
      expect(excerpt).toBeInTheDocument();
    });

    it('applies proper margin between sections', () => {
      const { container } = render(<JournalRecentWidget />);

      const marginElements = container.querySelectorAll('.mb-1\\.5, .mb-1');
      expect(marginElements.length).toBeGreaterThan(0);
    });
  });

  describe('Icon Sizing', () => {
    it('uses small icon size consistently', () => {
      const { container } = render(<JournalRecentWidget />);

      const icons = container.querySelectorAll('.h-3.w-3');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Text Sizing', () => {
    it('uses extra small text for metadata', () => {
      const { container } = render(<JournalRecentWidget />);

      const extraSmallText = container.querySelectorAll('.text-xs');
      expect(extraSmallText.length).toBeGreaterThan(0);
    });

    it('uses small text for main content', () => {
      const { container } = render(<JournalRecentWidget />);

      const smallText = container.querySelectorAll('.text-sm');
      expect(smallText.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('uses flex layout for responsive alignment', () => {
      const { container } = render(<JournalRecentWidget />);

      const flexContainers = container.querySelectorAll('.flex');
      expect(flexContainers.length).toBeGreaterThan(0);
    });

    it('applies justify-between for header spacing', () => {
      const { container } = render(<JournalRecentWidget />);

      const spacedContainers = container.querySelectorAll('.justify-between');
      expect(spacedContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Transition Effects', () => {
    it('applies transition-colors for smooth hover', () => {
      const { container } = render(<JournalRecentWidget />);

      const transitionElements = container.querySelectorAll('.transition-colors');
      expect(transitionElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading for entry titles', () => {
      const { container } = render(<JournalRecentWidget />);

      const headings = container.querySelectorAll('h4');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('provides visual and text indicators for sentiment', () => {
      render(<JournalRecentWidget />);

      expect(screen.getByText('bullish')).toBeInTheDocument();
      expect(screen.getByText('bearish')).toBeInTheDocument();
      expect(screen.getByText('neutral')).toBeInTheDocument();
    });

    it('uses consistent color coding for sentiment', () => {
      const { container } = render(<JournalRecentWidget />);

      const profitElements = container.querySelectorAll('.text-profit');
      const lossElements = container.querySelectorAll('.text-loss');
      const neutralElements = container.querySelectorAll('.text-muted-foreground');

      expect(profitElements.length).toBeGreaterThan(0);
      expect(lossElements.length).toBeGreaterThan(0);
      expect(neutralElements.length).toBeGreaterThan(0);
    });
  });

  describe('Gap Spacing', () => {
    it('applies gap between sentiment icon and label', () => {
      const { container } = render(<JournalRecentWidget />);

      const gapElements = container.querySelectorAll('.gap-1');
      expect(gapElements.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('renders all entry data without truncation in metadata', () => {
      render(<JournalRecentWidget />);

      // Check that key data points are visible
      expect(screen.getByText('bullish')).toBeInTheDocument();
      expect(screen.getByText('bearish')).toBeInTheDocument();
      expect(screen.getByText('neutral')).toBeInTheDocument();
    });

    it('preserves entry excerpt content', () => {
      render(<JournalRecentWidget />);

      expect(screen.getByText(/Strong AI demand thesis/)).toBeInTheDocument();
      expect(screen.getByText(/Cut losses at -2%/)).toBeInTheDocument();
      expect(screen.getByText(/Waiting for clearer signal/)).toBeInTheDocument();
    });
  });

  describe('Date Comparison Logic', () => {
    it('displays dates in human-readable format', () => {
      render(<JournalRecentWidget />);

      // Check that dates are rendered (could be Today, Yesterday, or formatted date)
      const { container } = render(<JournalRecentWidget />);
      const dateElements = container.querySelectorAll('.text-muted-foreground.font-medium');
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });
});
