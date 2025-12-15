# ToolContentRenderer Component

A centralized, reusable component for rendering tool content across the DeepStack application.

## Overview

The `ToolContentRenderer` component consolidates all tool rendering logic into a single, maintainable location. It supports all tool types from `ActiveContentType` plus a special `'history'` type for parent-controlled rendering.

## Features

- **Centralized Logic**: Single source of truth for tool rendering
- **Performance Optimized**: Lazy loads heavy components (Options, Screeners, etc.)
- **Flexible Variants**: Supports `default`, `fullscreen`, and `embedded` modes
- **Type Safe**: Full TypeScript support with exported types
- **Accessible**: Includes loading states and fallbacks

## Usage

### Basic Usage

```tsx
import { ToolContentRenderer } from '@/components/shared';

// Simple usage with active content from store
<ToolContentRenderer contentType={activeContent} />
```

### In ConversationView (Default Variant)

```tsx
// Replace the existing renderActiveContent() function with:
const renderActiveContent = () => {
  return <ToolContentRenderer contentType={activeContent} variant="default" />;
};
```

### In Tools Hub (Fullscreen Variant)

```tsx
// Fullscreen mode for dedicated tool pages
<ToolContentRenderer
  contentType="portfolio"
  variant="fullscreen"
  className="h-screen w-full"
/>
```

### Embedded in Cards

```tsx
// Embedded in a dashboard card
<div className="rounded-lg shadow-lg overflow-hidden">
  <ToolContentRenderer
    contentType="chart"
    variant="embedded"
    className="h-96"
  />
</div>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `contentType` | `ToolContentType` | Required | The tool to render (`'chart'`, `'portfolio'`, etc.) |
| `variant` | `'default' \| 'fullscreen' \| 'embedded'` | `'default'` | Display mode for the tool |
| `className` | `string` | `undefined` | Additional CSS classes for the wrapper |

## Supported Tool Types

### Always Available
- `chart` - Full TradingView-style chart with indicators
- `portfolio` - Portfolio positions list
- `positions` - Positions management panel
- `news` - Market news feed
- `thesis` - Thesis list and management
- `journal` - Trade journal entries
- `none` - Returns null (no content)
- `history` - Returns null (parent handles rendering)

### Lazy Loaded (Performance)
- `deep-value` - Deep value screening tool
- `hedged-positions` - Hedged positions analyzer
- `options-screener` - Options screening panel
- `options-builder` - Options strategy builder
- `screener` - Stock screener
- `alerts` - Price alerts management
- `calendar` - Market calendar
- `prediction-markets` - Prediction markets dashboard
- `insights` - AI insights panel

### Future Implementation
- `analysis` - Shows placeholder (coming soon)

## Variants

### Default
Standard variant used in ConversationView. Includes top border and fills parent container:
```tsx
<ToolContentRenderer contentType="chart" variant="default" />
// Renders: h-full border-t border-border/50
```

### Fullscreen
For dedicated tool pages that need full viewport:
```tsx
<ToolContentRenderer contentType="portfolio" variant="fullscreen" />
// Renders: h-full w-full
```

### Embedded
For dashboard cards and embedded contexts with rounded borders:
```tsx
<ToolContentRenderer contentType="screener" variant="embedded" />
// Renders: rounded-lg border border-border/50
```

## Migration Guide

### Migrating ConversationView

**Before:**
```tsx
const renderActiveContent = () => {
  if (activeContent === 'chart') {
    return (
      <div className="h-full overflow-hidden bg-card">
        <ChartPanel />
      </div>
    );
  }
  if (activeContent === 'portfolio') {
    return (
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden bg-card border border-border/50">
        <PositionsList />
      </div>
    );
  }
  // ... 15+ more cases
  return null;
};
```

**After:**
```tsx
import { ToolContentRenderer } from '@/components/shared';

const renderActiveContent = () => {
  return <ToolContentRenderer contentType={activeContent} variant="default" />;
};
```

### Creating Tools Hub Page

```tsx
'use client';

import { ToolContentRenderer } from '@/components/shared';
import { useUIStore } from '@/lib/stores/ui-store';

export function ToolsHubPage() {
  const { activeContent } = useUIStore();

  return (
    <div className="h-screen flex flex-col">
      {/* Tool Navigation */}
      <ToolNav />

      {/* Full-screen tool content */}
      <ToolContentRenderer
        contentType={activeContent}
        variant="fullscreen"
      />
    </div>
  );
}
```

## Performance Considerations

### Lazy Loading Strategy

Heavy components are lazy loaded to reduce initial bundle size:
- Options tools (~200KB)
- Screeners (~150KB)
- Prediction markets (~180KB)
- Deep value/hedged positions (~100KB each)

Lightweight components load immediately:
- Chart (always needed)
- Portfolio/Positions (frequently used)
- News, Journal, Thesis (small size)

### Loading States

All lazy-loaded components show a consistent loading fallback:
```tsx
<LoadingFallback />
// Renders: Centered spinner with "Loading..." text
```

## Type Safety

The component exports its types for use in parent components:

```tsx
import { ToolContentRenderer, type ToolContentType } from '@/components/shared';

// Use in your component props
interface MyComponentProps {
  tool: ToolContentType;
}
```

## Examples

### Conditional Rendering with History

```tsx
// Parent handles 'history' type
{contentType === 'history' ? (
  <HistoryPanel />
) : (
  <ToolContentRenderer contentType={contentType} />
)}
```

### Dynamic Tool Switching

```tsx
const [currentTool, setCurrentTool] = useState<ToolContentType>('portfolio');

return (
  <div className="h-full">
    <ToolSelector onChange={setCurrentTool} />
    <ToolContentRenderer contentType={currentTool} variant="default" />
  </div>
);
```

### Responsive Variants

```tsx
import { useIsMobile } from '@/hooks/useIsMobile';

function ResponsiveTool() {
  const { isMobile } = useIsMobile();

  return (
    <ToolContentRenderer
      contentType="chart"
      variant={isMobile ? 'fullscreen' : 'embedded'}
      className={isMobile ? 'h-screen' : 'h-96'}
    />
  );
}
```

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { ToolContentRenderer } from '@/components/shared';

describe('ToolContentRenderer', () => {
  it('renders chart panel', () => {
    render(<ToolContentRenderer contentType="chart" />);
    expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
  });

  it('returns null for none type', () => {
    const { container } = render(<ToolContentRenderer contentType="none" />);
    expect(container.firstChild).toBeNull();
  });

  it('lazy loads heavy components', async () => {
    render(<ToolContentRenderer contentType="options-screener" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for lazy load
    await screen.findByTestId('options-screener-panel');
  });
});
```

## Architecture Benefits

1. **Single Responsibility**: Each component does one thing well
2. **DRY Principle**: No duplicate tool rendering logic
3. **Easy Maintenance**: Update tool in one place, reflects everywhere
4. **Performance**: Automatic code splitting via lazy loading
5. **Consistency**: Uniform loading states and error handling
6. **Scalability**: Easy to add new tools

## Future Enhancements

- [ ] Error boundaries for graceful error handling
- [ ] Tool-specific loading messages
- [ ] Animation transitions between tools
- [ ] Tool state persistence across navigations
- [ ] Tool-level configuration props
- [ ] Analytics integration (track tool usage)

## Related Components

- `ConversationView` - Primary consumer (chat interface)
- `ToolsHub` - Fullscreen tool viewer (planned)
- Individual tool panels (ChartPanel, PositionsList, etc.)

## File Location

```
/web/src/components/shared/
├── ToolContentRenderer.tsx    # Main component
├── ToolContentRenderer.md     # This documentation
└── index.ts                   # Barrel export
```
