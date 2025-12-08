# Watchlist Infrastructure - Feature Documentation

## Overview

Enhanced watchlist functionality for DeepStack with offline-first sync, drag-and-drop reordering, symbol search, and comprehensive management features.

## New Features

### 1. Watchlist Management Dialog

Access via the "Manage Watchlists" option in the watchlist dropdown.

**Features:**
- ✅ Create new watchlists with custom names
- ✅ Rename existing watchlists inline
- ✅ Delete watchlists (prevents deleting the last one)
- ✅ Set active watchlist (marked with star icon)
- ✅ View symbol counts for each watchlist
- ✅ Export watchlists to CSV format
- ✅ Import symbols from CSV files

**Usage:**
1. Click the watchlist dropdown in the panel header
2. Select "Manage Watchlists"
3. Use the inline edit, delete, export, and import buttons for each watchlist
4. Click "+ Create New Watchlist" to add a new one

### 2. Symbol Search Dialog

Quickly add symbols with search and suggestions.

**Features:**
- ✅ Search by symbol or company name
- ✅ Popular symbols quick-add (SPY, QQQ, AAPL, NVDA, BTC-USD, etc.)
- ✅ Recently added symbols history (last 10)
- ✅ Real-time price display for known symbols
- ✅ Direct symbol entry (press Enter to add any symbol)
- ✅ Filters out symbols already in the active watchlist

**Usage:**
1. Click "Add Symbol" button in the watchlist panel
2. Type to search or select from popular/recent symbols
3. Click on a symbol or press Enter to add it

### 3. Symbol Notes

Add trading notes and reminders to individual symbols.

**Features:**
- ✅ Add/edit notes for any symbol in the watchlist
- ✅ Notes display as tooltip icon next to symbol
- ✅ Access via right-click context menu

**Usage:**
1. Right-click on any symbol in the watchlist
2. Select "Add Note" or "Edit Note"
3. Enter your trading notes, ideas, or reminders
4. Hover over the note icon to view

### 4. Drag-and-Drop Reordering

Customize the order of symbols in your watchlist.

**Features:**
- ✅ Click and drag symbols to reorder
- ✅ Keyboard navigation support
- ✅ Smooth animations
- ✅ Syncs order to cloud

**Usage:**
- Click and hold on a symbol, then drag to desired position
- Release to drop in new position
- Changes sync automatically

### 5. Enhanced Symbol Display

Better visual indicators for market activity.

**Features:**
- ✅ Real-time price updates
- ✅ Percentage change with trend icons
- ✅ Significant price movement indicator (>5% change)
- ✅ Amber ring highlight for significant movers
- ✅ Note icons for symbols with notes

### 6. Context Menu Actions

Right-click any symbol for quick actions.

**Actions:**
- View Chart (sets as active symbol)
- Add/Edit Note
- Remove from Watchlist

### 7. Import/Export

Backup and transfer watchlists.

**CSV Format:**
```csv
Symbol,Added At,Notes
AAPL,2025-12-08T18:00:00.000Z,"Watching for breakout"
TSLA,2025-12-08T17:30:00.000Z,""
```

**Usage:**
1. Open Watchlist Management Dialog
2. Click download icon to export
3. Click upload icon to import
4. Select CSV file with symbols

## Database Schema

### Watchlists Table

```sql
CREATE TABLE public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,  -- Array of {symbol, addedAt, notes?}
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration

Run migration `009_update_watchlist_schema.sql` to update from old `symbols TEXT[]` to new `items JSONB` structure.

## State Management

### Zustand Store

- **Local Storage**: Persists watchlists offline
- **Immer**: Immutable updates
- **Actions**: CRUD operations for watchlists and symbols

### Sync Hook

- **Offline-First**: Works without network
- **Optimistic Updates**: Instant UI feedback
- **Auto-Sync**: Background sync to Supabase
- **Real-time**: Subscribe to watchlist changes across devices

## Components

### File Structure

```
web/src/components/trading/
├── WatchlistPanel.tsx              # Main panel with drag-drop
├── WatchlistManagementDialog.tsx   # Create/edit/delete watchlists
├── SymbolSearchDialog.tsx          # Search and add symbols
└── SymbolNoteDialog.tsx            # Add notes to symbols
```

### Dependencies

- `@dnd-kit/core` - Drag and drop core
- `@dnd-kit/sortable` - Sortable list utilities
- `@dnd-kit/utilities` - CSS utilities
- shadcn/ui components (Dialog, ContextMenu, AlertDialog, etc.)

## Keyboard Shortcuts

- **Enter** - Add symbol in search dialog
- **Escape** - Close dialogs
- **Right Click** - Open context menu on symbols
- **Arrow Keys** - Navigate symbols during drag
- **Space** - Activate drag with keyboard

## Cloud Sync

- **Status Indicator**: Green cloud = synced, Yellow cloud = offline
- **Auto-Sync**: Changes sync on edit
- **Conflict Resolution**: Last-write-wins
- **Offline Support**: Full functionality without connection

## Best Practices

1. **Organize by Strategy**: Create separate watchlists for different trading strategies
2. **Use Notes**: Document entry/exit ideas and support/resistance levels
3. **Monitor Movers**: Symbols with >5% change show amber indicator
4. **Export Backups**: Regularly export important watchlists
5. **Recent Symbols**: Leverage recent history for quick re-adds

## Future Enhancements

Potential additions:
- Symbol sorting options (alphabetical, % change, price)
- Custom alerts integration
- Watchlist templates
- Symbol groups/categories
- Price target tracking
- Chart pattern annotations
