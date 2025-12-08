# Prediction Markets Widget

A compact dashboard widget for displaying trending prediction markets from Kalshi and Polymarket.

## Components

### PredictionMarketsWidget

Main widget component that displays top 5 trending prediction markets.

**Features:**
- Auto-refreshes every 60 seconds
- Shows platform badges (Kalshi/Polymarket)
- Displays probability bars for Yes/No outcomes
- Shows market volume and category
- Watchlist count indicator
- Skeleton loading state
- Error state with retry button
- Link to full prediction markets page

**Usage:**
```tsx
import { PredictionMarketsWidget } from '@/components/prediction-markets/PredictionMarketsWidget';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PredictionMarketsWidget />
    </div>
  );
}
```

### ProbabilityBar

Visual probability split component showing Yes/No percentages.

**Props:**
- `yesPrice: number` - Probability value (0-1)
- `compact?: boolean` - Compact mode (default: false)
- `showLabels?: boolean` - Show Yes/No labels (default: false)
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { ProbabilityBar } from '@/components/prediction-markets/ProbabilityBar';

// Standard with label
<ProbabilityBar yesPrice={0.65} showLabels />

// Compact mode
<ProbabilityBar yesPrice={0.42} compact />
```

### PlatformBadge

Colored badge component for platform identification.

**Props:**
- `platform: 'kalshi' | 'polymarket'` - Platform type
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { PlatformBadge } from '@/components/prediction-markets/PlatformBadge';

<PlatformBadge platform="kalshi" />
<PlatformBadge platform="polymarket" />
```

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui Card components
- Dark mode optimized color scheme
- Responsive design (mobile-first)

**Platform Colors:**
- Kalshi: Blue (`bg-blue-500/10`, `text-blue-400`)
- Polymarket: Purple (`bg-purple-500/10`, `text-purple-400`)

## State Management

The widget integrates with the prediction markets Zustand store:
- Uses `usePredictionMarketsStore` for watchlist data
- Fetches markets via `fetchTrendingMarkets` API function
- Local state for loading/error handling

## Performance Optimizations

1. **Auto-refresh:** Markets refresh every 60 seconds (configurable)
2. **Lazy loading:** Widget loads independently from other dashboard components
3. **Memoization:** Subcomponents can be memoized if needed
4. **Skeleton states:** Prevents layout shift during loading

## Accessibility Checklist

- [x] Semantic HTML structure
- [x] Proper heading hierarchy (CardTitle)
- [x] Keyboard navigation support (via Button component)
- [x] Focus visible states (button focus rings)
- [x] Color contrast meets WCAG AA standards
- [x] Loading states announced (skeleton with animate-pulse)
- [x] Error states are clear and actionable
- [ ] Screen reader labels (could add aria-label to market items)
- [ ] ARIA live regions for auto-updates (could announce new data)
- [ ] Reduced motion support (could use prefers-reduced-motion)

### Accessibility Improvements Needed

```tsx
// Add aria-label to market items
<div
  role="article"
  aria-label={`${market.title}, ${yesPercent}% chance, ${market.category}`}
  className="rounded-lg border..."
>

// Add live region for updates
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {markets.length} markets loaded
</div>

// Respect prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
}
```

## Testing

### Manual Testing Checklist

- [ ] Widget loads without errors
- [ ] Skeleton state displays during loading
- [ ] Markets display correctly with truncated titles
- [ ] Probability bars show correct percentages
- [ ] Platform badges show correct colors
- [ ] Volume formatting works (K, M suffixes)
- [ ] Error state displays with retry button
- [ ] Retry button works after error
- [ ] Auto-refresh updates data every 60 seconds
- [ ] Watchlist count displays when items exist
- [ ] "View All" button navigates correctly
- [ ] Responsive layout works on mobile
- [ ] Widget integrates properly in dashboard grid

### Unit Test Structure

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { PredictionMarketsWidget } from './PredictionMarketsWidget';

describe('PredictionMarketsWidget', () => {
  it('shows loading state initially', () => {
    render(<PredictionMarketsWidget />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(5);
  });

  it('displays markets after loading', async () => {
    render(<PredictionMarketsWidget />);
    await waitFor(() => {
      expect(screen.getByText(/Bitcoin/i)).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    // Mock failed API call
    // Verify error message and retry button
  });

  it('formats volume correctly', () => {
    // Test formatVolume function
    expect(formatVolume(1500000)).toBe('1.5M');
    expect(formatVolume(50000)).toBe('50.0K');
  });
});
```

## File Structure

```
src/components/prediction-markets/
├── PredictionMarketsWidget.tsx  # Main widget component
├── ProbabilityBar.tsx           # Probability visualization
├── PlatformBadge.tsx            # Platform badge
├── index.tsx                     # Barrel exports
└── README.md                     # Documentation
```

## Dependencies

- `react` - Component framework
- `next` - Next.js (for Link component)
- `zustand` - State management
- `lucide-react` - Icons
- `@/components/ui/*` - shadcn/ui components
- `@/lib/api/prediction-markets` - API functions
- `@/lib/stores/prediction-markets-store` - Zustand store
- `@/lib/types/prediction-markets` - TypeScript types

## Integration Example

```tsx
// /src/app/dashboard/page.tsx
'use client';

import { PredictionMarketsWidget } from '@/components/prediction-markets/PredictionMarketsWidget';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Account Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* ... account stats ... */}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PredictionMarketsWidget />
        {/* Add more widgets here */}
      </div>
    </div>
  );
}
```

## Performance Budget

- **Target load time:** < 500ms for widget render
- **Target refresh time:** < 1s for market data fetch
- **Bundle size:** < 15KB (gzipped, including dependencies)
- **LCP:** Skeleton visible within 200ms
- **CLS:** 0 (prevented by skeleton states)

## Future Enhancements

1. **Click-through to details:** Make each market clickable to open detail modal
2. **Mini charts:** Add sparkline charts showing price history
3. **Custom filters:** Allow users to filter by category/platform
4. **Notifications:** Alert users when watched market hits threshold
5. **Comparison mode:** Compare multiple markets side-by-side
6. **Portfolio integration:** Show user's positions in markets
7. **AI insights:** Display AI-generated market analysis
8. **Export data:** Allow CSV export of market data
