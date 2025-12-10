'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * PositionEntryForm - Dialog form for adding or editing positions
 *
 * Features:
 * - Add new or edit existing positions
 * - Symbol input with uppercase transform
 * - Side selection (Long/Short)
 * - Shares and average cost inputs
 * - Open date picker (defaults to today)
 * - Optional notes field
 * - Auto-focus on symbol field
 * - Form validation
 * - Pre-fills data when editing
 *
 * Usage:
 * ```tsx
 * <PositionEntryForm
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   editPosition={selectedPosition}
 *   onSave={(position) => handleSave(position)}
 * />
 * ```
 */

export interface Position {
  id: string;
  symbol: string;
  side: 'Long' | 'Short';
  shares: number;
  avgCost: number;
  openDate: string;
  notes?: string;
}

interface PositionEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPosition?: Position;
  onSave: (position: Omit<Position, 'id'>) => void;
}

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export function PositionEntryForm({
  open,
  onOpenChange,
  editPosition,
  onSave,
}: PositionEntryFormProps) {
  const isEditMode = !!editPosition;

  // Form state
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'Long' | 'Short'>('Long');
  const [shares, setShares] = useState<string>('');
  const [avgCost, setAvgCost] = useState<string>('');
  const [openDate, setOpenDate] = useState(getTodayDate());
  const [notes, setNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-focus ref for symbol input
  const symbolInputRef = React.useRef<HTMLInputElement>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (editPosition) {
      setSymbol(editPosition.symbol);
      setSide(editPosition.side);
      setShares(editPosition.shares.toString());
      setAvgCost(editPosition.avgCost.toString());
      setOpenDate(editPosition.openDate);
      setNotes(editPosition.notes || '');
    }
  }, [editPosition]);

  // Auto-focus symbol input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is rendered
      setTimeout(() => {
        symbolInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Clear form when dialog closes
  useEffect(() => {
    if (!open) {
      // Reset form after animation completes
      setTimeout(() => {
        setSymbol('');
        setSide('Long');
        setShares('');
        setAvgCost('');
        setOpenDate(getTodayDate());
        setNotes('');
        setErrors({});
      }, 200);
    }
  }, [open]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    }

    const sharesNum = parseFloat(shares);
    if (!shares || isNaN(sharesNum) || sharesNum <= 0) {
      newErrors.shares = 'Shares must be greater than 0';
    }

    const avgCostNum = parseFloat(avgCost);
    if (!avgCost || isNaN(avgCostNum) || avgCostNum <= 0) {
      newErrors.avgCost = 'Average cost must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const position: Omit<Position, 'id'> = {
      symbol: symbol.toUpperCase().trim(),
      side,
      shares: parseFloat(shares),
      avgCost: parseFloat(avgCost),
      openDate,
      notes: notes.trim() || undefined,
    };

    onSave(position);
  };

  // Handle symbol input change (convert to uppercase)
  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSymbol(value);

    // Clear error when user types
    if (errors.symbol) {
      setErrors((prev) => ({ ...prev, symbol: '' }));
    }
  };

  // Handle number input changes with validation clearing
  const handleNumberChange = (
    value: string,
    setter: (value: string) => void,
    field: string
  ) => {
    setter(value);

    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] glass-surface">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Position' : 'Add Position'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol Input */}
          <div className="space-y-2">
            <Label htmlFor="symbol">
              Symbol <span className="text-destructive">*</span>
            </Label>
            <Input
              id="symbol"
              ref={symbolInputRef}
              value={symbol}
              onChange={handleSymbolChange}
              placeholder="AAPL"
              aria-invalid={!!errors.symbol}
              className="uppercase"
            />
            {errors.symbol && (
              <p className="text-xs text-destructive">{errors.symbol}</p>
            )}
          </div>

          {/* Side Select */}
          <div className="space-y-2">
            <Label htmlFor="side">
              Side <span className="text-destructive">*</span>
            </Label>
            <Select value={side} onValueChange={(value) => setSide(value as 'Long' | 'Short')}>
              <SelectTrigger id="side" className="w-full">
                <SelectValue placeholder="Select side" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Long">Long</SelectItem>
                <SelectItem value="Short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shares and Average Cost - Two Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Shares Input */}
            <div className="space-y-2">
              <Label htmlFor="shares">
                Shares <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shares"
                type="number"
                step="1"
                min="1"
                value={shares}
                onChange={(e) => handleNumberChange(e.target.value, setShares, 'shares')}
                placeholder="100"
                aria-invalid={!!errors.shares}
              />
              {errors.shares && (
                <p className="text-xs text-destructive">{errors.shares}</p>
              )}
            </div>

            {/* Average Cost Input */}
            <div className="space-y-2">
              <Label htmlFor="avgCost">
                Average Cost <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="avgCost"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={avgCost}
                  onChange={(e) => handleNumberChange(e.target.value, setAvgCost, 'avgCost')}
                  placeholder="150.00"
                  aria-invalid={!!errors.avgCost}
                  className="pl-7"
                />
              </div>
              {errors.avgCost && (
                <p className="text-xs text-destructive">{errors.avgCost}</p>
              )}
            </div>
          </div>

          {/* Open Date Input */}
          <div className="space-y-2">
            <Label htmlFor="openDate">Open Date</Label>
            <Input
              id="openDate"
              type="date"
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
              max={getTodayDate()}
            />
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Position rationale, strategy, exit plan..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Form Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditMode ? 'Update Position' : 'Add Position'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PositionEntryForm;
