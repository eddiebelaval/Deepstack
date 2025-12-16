import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalloutBlock, extractAlertType, CalloutType } from '../CalloutBlock';
import React from 'react';

describe('CalloutBlock', () => {
  describe('Rendering', () => {
    it('renders children content', () => {
      render(<CalloutBlock type="note">Test content</CalloutBlock>);

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CalloutBlock type="note" className="custom-class">
          Content
        </CalloutBlock>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Note Type', () => {
    it('renders Note title', () => {
      render(<CalloutBlock type="note">Content</CalloutBlock>);

      expect(screen.getByText('Note')).toBeInTheDocument();
    });

    it('renders Info icon', () => {
      render(<CalloutBlock type="note">Content</CalloutBlock>);

      expect(document.querySelector('.lucide-info')).toBeInTheDocument();
    });

    it('applies blue styling', () => {
      const { container } = render(<CalloutBlock type="note">Content</CalloutBlock>);

      expect(container.querySelector('.bg-blue-500\\/10')).toBeInTheDocument();
    });
  });

  describe('Tip Type', () => {
    it('renders Tip title', () => {
      render(<CalloutBlock type="tip">Content</CalloutBlock>);

      expect(screen.getByText('Tip')).toBeInTheDocument();
    });

    it('renders Lightbulb icon', () => {
      render(<CalloutBlock type="tip">Content</CalloutBlock>);

      expect(document.querySelector('.lucide-lightbulb')).toBeInTheDocument();
    });

    it('applies green styling', () => {
      const { container } = render(<CalloutBlock type="tip">Content</CalloutBlock>);

      expect(container.querySelector('.bg-green-500\\/10')).toBeInTheDocument();
    });
  });

  describe('Warning Type', () => {
    it('renders Warning title', () => {
      render(<CalloutBlock type="warning">Content</CalloutBlock>);

      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('renders AlertTriangle icon', () => {
      render(<CalloutBlock type="warning">Content</CalloutBlock>);

      expect(document.querySelector('.lucide-triangle-alert')).toBeInTheDocument();
    });

    it('applies amber styling', () => {
      const { container } = render(<CalloutBlock type="warning">Content</CalloutBlock>);

      expect(container.querySelector('.bg-amber-500\\/10')).toBeInTheDocument();
    });
  });

  describe('Caution Type', () => {
    it('renders Caution title', () => {
      render(<CalloutBlock type="caution">Content</CalloutBlock>);

      expect(screen.getByText('Caution')).toBeInTheDocument();
    });

    it('renders ShieldAlert icon', () => {
      render(<CalloutBlock type="caution">Content</CalloutBlock>);

      expect(document.querySelector('.lucide-shield-alert')).toBeInTheDocument();
    });

    it('applies red styling', () => {
      const { container } = render(<CalloutBlock type="caution">Content</CalloutBlock>);

      expect(container.querySelector('.bg-red-500\\/10')).toBeInTheDocument();
    });
  });

  describe('Important Type', () => {
    it('renders Important title', () => {
      render(<CalloutBlock type="important">Content</CalloutBlock>);

      expect(screen.getByText('Important')).toBeInTheDocument();
    });

    it('renders AlertCircle icon', () => {
      render(<CalloutBlock type="important">Content</CalloutBlock>);

      expect(document.querySelector('.lucide-circle-alert')).toBeInTheDocument();
    });

    it('applies purple styling', () => {
      const { container } = render(<CalloutBlock type="important">Content</CalloutBlock>);

      expect(container.querySelector('.bg-purple-500\\/10')).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('renders border-l-4', () => {
      const { container } = render(<CalloutBlock type="note">Content</CalloutBlock>);

      expect(container.querySelector('.border-l-4')).toBeInTheDocument();
    });

    it('renders rounded-lg', () => {
      const { container } = render(<CalloutBlock type="note">Content</CalloutBlock>);

      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });
  });
});

describe('extractAlertType', () => {
  it('returns null for non-alert content', () => {
    const result = extractAlertType('Regular content');
    expect(result).toBeNull();
  });

  it('extracts NOTE type from string', () => {
    const result = extractAlertType('[!NOTE] This is a note');
    expect(result?.type).toBe('note');
    expect(result?.content).toContain('This is a note');
  });

  it('extracts TIP type from string', () => {
    const result = extractAlertType('[!TIP] This is a tip');
    expect(result?.type).toBe('tip');
  });

  it('extracts WARNING type from string', () => {
    const result = extractAlertType('[!WARNING] This is a warning');
    expect(result?.type).toBe('warning');
  });

  it('extracts CAUTION type from string', () => {
    const result = extractAlertType('[!CAUTION] This is a caution');
    expect(result?.type).toBe('caution');
  });

  it('extracts IMPORTANT type from string', () => {
    const result = extractAlertType('[!IMPORTANT] This is important');
    expect(result?.type).toBe('important');
  });

  it('handles case insensitivity', () => {
    const result = extractAlertType('[!note] lowercase note');
    expect(result?.type).toBe('note');
  });

  it('handles array children', () => {
    const result = extractAlertType(['[!TIP] ', 'Content']);
    expect(result?.type).toBe('tip');
  });

  it('returns null for empty content', () => {
    const result = extractAlertType('');
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    const result = extractAlertType(null);
    expect(result).toBeNull();
  });
});
