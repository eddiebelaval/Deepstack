import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className utility)', () => {
  describe('basic functionality', () => {
    it('merges single class name', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('merges multiple class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles empty strings', () => {
      expect(cn('')).toBe('');
      expect(cn('', '')).toBe('');
    });

    it('filters out falsy values', () => {
      expect(cn('foo', false, 'bar', null, 'baz', undefined)).toBe('foo bar baz');
    });
  });

  describe('conditional classes', () => {
    it('handles conditional classes with boolean', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional');
      expect(cn('base', false && 'conditional')).toBe('base');
    });

    it('handles object syntax', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('handles mixed conditional and static classes', () => {
      const isActive = true;
      expect(cn('base', isActive && 'active')).toBe('base active');
    });
  });

  describe('tailwind merge functionality', () => {
    it('merges conflicting tailwind classes (last wins)', () => {
      // tailwind-merge should resolve conflicts - last class wins
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('merges different property classes', () => {
      expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
    });

    it('handles complex tailwind conflicts', () => {
      expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    });

    it('preserves non-conflicting classes', () => {
      expect(cn('flex', 'items-center', 'justify-between')).toBe('flex items-center justify-between');
    });
  });

  describe('array inputs', () => {
    it('handles arrays of class names', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('handles nested arrays', () => {
      expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
    });

    it('handles arrays with conditionals', () => {
      expect(cn(['foo', false && 'bar', 'baz'])).toBe('foo baz');
    });
  });

  describe('edge cases', () => {
    it('handles undefined input', () => {
      expect(cn(undefined)).toBe('');
    });

    it('handles null input', () => {
      expect(cn(null)).toBe('');
    });

    it('handles no arguments', () => {
      expect(cn()).toBe('');
    });

    it('handles whitespace', () => {
      expect(cn('  foo  ', '  bar  ')).toBe('foo bar');
    });

    it('handles duplicate non-tailwind classes', () => {
      // Note: cn doesn't dedupe arbitrary class names, only Tailwind utilities
      // This is expected behavior - 'foo' is not a known Tailwind class
      expect(cn('foo', 'foo')).toBe('foo foo');
    });
  });

  describe('real-world usage patterns', () => {
    it('handles typical component pattern', () => {
      const variant = 'primary';
      const size = 'lg';
      const isDisabled = true;

      const result = cn(
        'button',
        variant === 'primary' && 'bg-blue-500',
        size === 'lg' && 'px-6 py-3',
        isDisabled && 'opacity-50 cursor-not-allowed'
      );

      expect(result).toBe('button bg-blue-500 px-6 py-3 opacity-50 cursor-not-allowed');
    });

    it('handles className override pattern', () => {
      const baseStyles = 'px-4 py-2 rounded';
      const customStyles = 'px-8'; // Should override px-4

      expect(cn(baseStyles, customStyles)).toBe('py-2 rounded px-8');
    });

    it('handles responsive classes', () => {
      expect(cn('text-sm', 'md:text-base', 'lg:text-lg')).toBe('text-sm md:text-base lg:text-lg');
    });

    it('handles state variants', () => {
      expect(cn('bg-blue-500', 'hover:bg-blue-600', 'active:bg-blue-700')).toBe(
        'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
      );
    });
  });
});
