import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketCard } from '../MarketCard';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

// Mock child card components
vi.mock('../BetsCarouselCard', () => ({
  BetsCarouselCard: ({ market, isWatched, onToggleWatch, onClick, className }: any) => (
    <div data-testid="binary-card" className={className}>
      <span>{market.title}</span>
      <button onClick={onClick}>View</button>
      {onToggleWatch && <button onClick={onToggleWatch}>Toggle Watch</button>}
      {isWatched && <span data-testid="watched">Watched</span>}
    </div>
  ),
}));

vi.mock('../MultiOutcomeCard', () => ({
  MultiOutcomeCard: ({ market, isWatched, onToggleWatch, onClick, className }: any) => (
    <div data-testid="multi-card" className={className}>
      <span>{market.title}</span>
      <button onClick={onClick}>View</button>
      {onToggleWatch && <button onClick={onToggleWatch}>Toggle Watch</button>}
      {isWatched && <span data-testid="watched">Watched</span>}
    </div>
  ),
}));

vi.mock('../ScalarMarketCard', () => ({
  ScalarMarketCard: ({ market, isWatched, onToggleWatch, onClick, className }: any) => (
    <div data-testid="scalar-card" className={className}>
      <span>{market.title}</span>
      <button onClick={onClick}>View</button>
      {onToggleWatch && <button onClick={onToggleWatch}>Toggle Watch</button>}
      {isWatched && <span data-testid="watched">Watched</span>}
    </div>
  ),
}));

describe('MarketCard', () => {
  const baseBinaryMarket: PredictionMarket = {
    id: '1',
    platform: 'polymarket',
    title: 'Will BTC reach $100k by EOY?',
    category: 'Crypto',
    yesPrice: 0.65,
    noPrice: 0.35,
    volume: 500000,
    status: 'active',
    url: 'https://example.com/market/1',
  };

  describe('Binary Markets', () => {
    it('renders BetsCarouselCard for binary market with explicit type', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        marketType: 'binary',
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('binary-card')).toBeInTheDocument();
      expect(screen.getByText('Will BTC reach $100k by EOY?')).toBeInTheDocument();
    });

    it('renders BetsCarouselCard for market with Yes/No outcomes', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        outcomes: [
          { name: 'Yes', price: 0.65 },
          { name: 'No', price: 0.35 },
        ],
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('binary-card')).toBeInTheDocument();
    });

    it('defaults to binary when no type specified', () => {
      render(<MarketCard market={baseBinaryMarket} />);

      expect(screen.getByTestId('binary-card')).toBeInTheDocument();
    });
  });

  describe('Scalar Markets', () => {
    it('renders ScalarMarketCard for scalar market with explicit type', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        marketType: 'scalar',
        title: 'BTC price on Dec 31',
        scalarBounds: {
          lower: 80000,
          upper: 120000,
          formatType: 'number',
        },
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('scalar-card')).toBeInTheDocument();
      expect(screen.getByText('BTC price on Dec 31')).toBeInTheDocument();
    });

    it('infers scalar type from scalarBounds presence', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        scalarBounds: {
          lower: 0,
          upper: 100,
        },
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('scalar-card')).toBeInTheDocument();
    });

    it('infers scalar for Long/Short outcomes', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        outcomes: [
          { name: 'Long', price: 0.6 },
          { name: 'Short', price: 0.4 },
        ],
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('scalar-card')).toBeInTheDocument();
    });
  });

  describe('Multi-Outcome Markets', () => {
    it('renders MultiOutcomeCard for multi market with explicit type', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        marketType: 'multi',
        title: 'Who will win the election?',
        outcomes: [
          { name: 'Candidate A', price: 0.45 },
          { name: 'Candidate B', price: 0.35 },
          { name: 'Candidate C', price: 0.20 },
        ],
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('multi-card')).toBeInTheDocument();
      expect(screen.getByText('Who will win the election?')).toBeInTheDocument();
    });

    it('infers multi type from 3+ outcomes', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        outcomes: [
          { name: 'Option A', price: 0.4 },
          { name: 'Option B', price: 0.3 },
          { name: 'Option C', price: 0.3 },
        ],
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('multi-card')).toBeInTheDocument();
    });

    it('infers multi for 2 non-binary outcomes', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        outcomes: [
          { name: 'Team A', price: 0.6 },
          { name: 'Team B', price: 0.4 },
        ],
      };

      render(<MarketCard market={market} />);

      expect(screen.getByTestId('multi-card')).toBeInTheDocument();
    });
  });

  describe('Props Forwarding', () => {
    it('forwards isWatched prop to child card', () => {
      render(<MarketCard market={baseBinaryMarket} isWatched={true} />);

      expect(screen.getByTestId('watched')).toBeInTheDocument();
    });

    it('forwards onToggleWatch callback to child card', () => {
      const onToggleWatch = vi.fn();
      render(<MarketCard market={baseBinaryMarket} onToggleWatch={onToggleWatch} />);

      screen.getByText('Toggle Watch').click();

      expect(onToggleWatch).toHaveBeenCalledTimes(1);
    });

    it('forwards onClick callback to child card', () => {
      const onClick = vi.fn();
      render(<MarketCard market={baseBinaryMarket} onClick={onClick} />);

      screen.getByText('View').click();

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('forwards className to child card', () => {
      render(<MarketCard market={baseBinaryMarket} className="custom-class" />);

      const card = screen.getByTestId('binary-card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles market with empty outcomes array', () => {
      const market: PredictionMarket = {
        ...baseBinaryMarket,
        outcomes: [],
      };

      render(<MarketCard market={market} />);

      // Should default to binary
      expect(screen.getByTestId('binary-card')).toBeInTheDocument();
    });

    it('handles market with missing optional fields', () => {
      const minimalMarket: PredictionMarket = {
        id: '1',
        platform: 'kalshi',
        title: 'Minimal Market',
        category: 'Test',
        yesPrice: 0.5,
        noPrice: 0.5,
        volume: 0,
        status: 'active',
        url: 'https://example.com',
      };

      render(<MarketCard market={minimalMarket} />);

      expect(screen.getByText('Minimal Market')).toBeInTheDocument();
    });
  });
});
