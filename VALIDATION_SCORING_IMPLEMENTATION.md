# Validation Scoring Implementation

## Overview
Added comprehensive validation scoring system to the Thesis Engine that automatically calculates a 0-100% score based on multiple factors and allows manual override with notes.

## Files Created

### 1. `/web/src/lib/thesis-validation.ts`
**Purpose:** Core validation scoring logic and utilities

**Key Functions:**
- `calculateValidationScore()` - Auto-calculates score based on:
  - **Key Conditions (30 pts):** Progress on manually tracked conditions
  - **Price Progress (35 pts):** Movement from entry toward exit target
  - **Timeframe (20 pts):** Days elapsed vs expected timeframe
  - **Trades Performance (15 pts):** P&L and win rate of linked trades

- `getScoreColor()` - Returns color classes for score ranges:
  - 0-39%: Red (Poor)
  - 40-69%: Amber (Moderate)
  - 70-100%: Green (Strong)

- `getScoreLabel()` - Returns human-readable labels (Excellent, Strong, Good, etc.)

**Returns:** Complete breakdown with total score and factor-by-factor analysis

### 2. `/web/src/components/thesis/ValidationScoreRing.tsx`
**Purpose:** Reusable circular progress indicator component

**Features:**
- Three sizes: sm (64px), md (128px), lg (160px)
- SVG-based circular progress ring
- Animated progress transition
- Color-coded based on score
- Optional label badge
- Center text showing percentage

**Usage:**
```tsx
<ValidationScoreRing score={75} size="md" showLabel />
```

### 3. `/web/src/components/thesis/ValidationScoreModal.tsx`
**Purpose:** Modal dialog for manual score override

**Features:**
- Displays auto-calculated score with "Use" button
- Slider control (0-100%, 5% increments)
- Real-time score preview with color coding
- Notes textarea for documentation
- Warning when manual score diverges >20% from auto score
- Visual range indicators (Red/Amber/Green zones)

**Props:**
- `currentScore` - Current manual score
- `autoCalculatedScore` - Auto-calculated score
- `currentNotes` - Existing validation notes
- `onSave(score, notes)` - Save handler

## Files Modified

### 1. `/web/src/components/thesis/ThesisDashboard.tsx`
**Changes:**
- Added imports for validation components and utilities
- Created `autoValidationResult` using `useMemo` to calculate score on every data change
- Added `showScoreModal` state
- Replaced basic gauge SVG with `ValidationScoreRing` component
- Added detailed score breakdown display
- Added "Edit" button in header
- Added "Update Score" button
- Display validation notes if present
- Show both auto-calculated and manual scores when different
- Added `ValidationScoreModal` for score editing

**New UI Elements:**
- Validation Score Ring (circular progress)
- Score breakdown panel showing all 4 factors
- Auto vs Manual score comparison
- Validation notes display
- Edit and Update Score buttons

### 2. `/web/src/components/thesis/ThesisCard.tsx`
**Changes:**
- Added imports for `ValidationScoreRing` and `getScoreColor`
- **Compact view:** Added score badge (dot + percentage) next to status for active theses
- **Full view:** Added small ValidationScoreRing in header for active theses
- Updated progress bar to use new color utility functions
- Replaced hardcoded color logic with `getScoreColor()` utility

## Score Calculation Details

### Factor Weights
1. **Key Conditions (30%)**: Based on number of conditions specified
2. **Price Progress (35%)**: Largest weight - measures actual price movement
3. **Timeframe (20%)**: Penalizes overdue theses
4. **Trades Performance (15%)**: Validates hypothesis through actual trades

### Auto-Calculation Logic

**Price Progress Scoring:**
- Target reached (100%+): 35 pts
- 75-99% to target: 30 pts
- 50-74% to target: 25 pts
- 25-49% to target: 20 pts
- 1-24% to target: 15 pts
- Below entry: Scaled down (0-10 pts)
- Stop loss hit: 0 pts

**Timeframe Scoring:**
- 0-25% elapsed: 20 pts (fresh)
- 25-50% elapsed: 18 pts
- 50-75% elapsed: 15 pts
- 75-100% elapsed: 10 pts
- >100% elapsed: 5 pts (overdue)

**Trades Performance:**
- Profitable + 60%+ win rate: 15 pts
- Profitable: 12 pts
- Breakeven/40%+ win rate: 8 pts
- Underperforming: 4 pts
- No trades: 10 pts (neutral)

## Color Coding

### Score Ranges
- **Poor (0-39%)**: Red - Thesis not validating
- **Moderate (40-69%)**: Amber - Mixed signals
- **Strong (70-100%)**: Green - Thesis validating well

### Visual Indicators
- Progress ring color
- Percentage text color
- Score badge dot color
- Progress bar fill color

## User Workflow

### Auto-Scoring
1. Open thesis dashboard
2. System automatically calculates score based on current data
3. View breakdown to understand which factors contribute
4. Score updates when price refreshes or trades are added

### Manual Override
1. Click "Update Score" or "Edit" button
2. Modal shows auto-calculated score
3. Adjust slider to set manual score
4. Add notes explaining reasoning
5. Warning shows if diverging significantly from auto score
6. Save to apply manual override

### Score Display
- **List view (compact)**: Dot + percentage badge
- **List view (full)**: Small circular ring in header + progress bar
- **Dashboard view**: Large circular ring + full breakdown + notes

## Database Schema
Uses existing fields in thesis table:
- `validation_score` (integer 0-100): Stores manual override or null for auto
- `validation_notes` (text): Stores reasoning for manual score

## Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigable modal
- Clear visual hierarchy
- Color + text labels (not color alone)

## Performance
- Auto-calculation is memoized with `useMemo`
- Only recalculates when thesis, price, or trades change
- No unnecessary re-renders
- Smooth CSS transitions (500ms duration)

## Future Enhancements
- Checkboxes for individual key conditions
- Historical score tracking/chart
- Score change notifications
- Batch score recalculation
- Export score history
