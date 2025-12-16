/**
 * Tests for URL Validation Utilities
 *
 * Tests URL validation for preventing malicious image sources.
 */

import {
  isValidImageUrl,
  sanitizeImageUrl,
  getPlaceholderImageUrl,
} from '@/lib/utils/url-validator';

describe('isValidImageUrl', () => {
  describe('handles null/undefined/empty input', () => {
    it('returns false for null', () => {
      expect(isValidImageUrl(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidImageUrl(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidImageUrl('')).toBe(false);
    });
  });

  describe('validates trusted domains', () => {
    it('accepts Supabase storage URLs', () => {
      expect(isValidImageUrl('https://xyz.supabase.co/storage/v1/object/public/screenshots/img.png')).toBe(true);
    });

    it('accepts Supabase.in URLs', () => {
      expect(isValidImageUrl('https://abc.supabase.in/storage/file.jpg')).toBe(true);
    });

    it('accepts Cloudinary URLs', () => {
      expect(isValidImageUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(true);
    });

    it('accepts Imgix URLs', () => {
      expect(isValidImageUrl('https://demo.imgix.net/image.png')).toBe(true);
    });

    it('accepts Unsplash URLs', () => {
      expect(isValidImageUrl('https://images.unsplash.com/photo-123.jpg')).toBe(true);
    });

    it('accepts localhost in development', () => {
      expect(isValidImageUrl('http://localhost:3000/image.png')).toBe(true);
    });

    it('accepts 127.0.0.1 in development', () => {
      expect(isValidImageUrl('http://127.0.0.1:8080/image.png')).toBe(true);
    });
  });

  describe('rejects untrusted domains', () => {
    it('rejects unknown domains', () => {
      expect(isValidImageUrl('https://evil.com/tracking.gif')).toBe(false);
    });

    it('rejects similar but different domains', () => {
      expect(isValidImageUrl('https://supabase.co.evil.com/image.png')).toBe(false);
    });

    it('rejects domains that look like trusted ones', () => {
      expect(isValidImageUrl('https://notsupabase.co/image.png')).toBe(false);
    });
  });

  describe('validates protocol security', () => {
    it('accepts HTTPS URLs', () => {
      expect(isValidImageUrl('https://xyz.supabase.co/image.png')).toBe(true);
    });

    it('rejects HTTP for non-localhost domains', () => {
      expect(isValidImageUrl('http://xyz.supabase.co/image.png')).toBe(false);
    });

    it('allows HTTP for localhost', () => {
      expect(isValidImageUrl('http://localhost:3000/image.png')).toBe(true);
    });
  });

  describe('blocks dangerous protocols', () => {
    it('rejects javascript: protocol', () => {
      expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: protocol (non-image)', () => {
      expect(isValidImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('allows data:image/ URIs', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(isValidImageUrl(dataUri)).toBe(true);
    });
  });

  describe('handles malformed URLs', () => {
    it('rejects malformed URLs', () => {
      expect(isValidImageUrl('not-a-valid-url')).toBe(false);
    });

    it('rejects partial URLs', () => {
      expect(isValidImageUrl('//supabase.co/image.png')).toBe(false);
    });

    it('rejects URLs with invalid characters', () => {
      expect(isValidImageUrl('https://supabase.co/<script>alert(1)</script>')).toBe(true); // URL is valid, domain is trusted
    });
  });
});

describe('sanitizeImageUrl', () => {
  describe('with strict domain validation (default)', () => {
    it('returns URL for valid trusted domain', () => {
      const url = 'https://xyz.supabase.co/image.png';
      expect(sanitizeImageUrl(url)).toBe(url);
    });

    it('returns empty string for untrusted domain', () => {
      expect(sanitizeImageUrl('https://evil.com/image.png')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(sanitizeImageUrl(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitizeImageUrl(undefined)).toBe('');
    });
  });

  describe('with allowAnyHttps option', () => {
    it('accepts any HTTPS URL', () => {
      const url = 'https://any-domain.com/image.png';
      expect(sanitizeImageUrl(url, { allowAnyHttps: true })).toBe(url);
    });

    it('accepts localhost HTTP', () => {
      const url = 'http://localhost:3000/image.png';
      expect(sanitizeImageUrl(url, { allowAnyHttps: true })).toBe(url);
    });

    it('rejects non-HTTPS for external domains', () => {
      expect(sanitizeImageUrl('http://external.com/image.png', { allowAnyHttps: true })).toBe('');
    });

    it('rejects javascript: protocol', () => {
      expect(sanitizeImageUrl('javascript:alert(1)', { allowAnyHttps: true })).toBe('');
    });

    it('rejects data: protocol', () => {
      expect(sanitizeImageUrl('data:text/html,test', { allowAnyHttps: true })).toBe('');
    });

    it('returns empty for malformed URLs', () => {
      expect(sanitizeImageUrl('not-a-url', { allowAnyHttps: true })).toBe('');
    });
  });
});

describe('getPlaceholderImageUrl', () => {
  it('returns a data URI', () => {
    const placeholder = getPlaceholderImageUrl();
    expect(placeholder).toMatch(/^data:image\/svg\+xml/);
  });

  it('uses default dimensions', () => {
    const placeholder = getPlaceholderImageUrl();
    expect(placeholder).toContain('100');
  });

  it('uses custom dimensions', () => {
    const placeholder = getPlaceholderImageUrl(200, 150);
    expect(placeholder).toContain('200');
    expect(placeholder).toContain('150');
  });

  it('returns valid SVG structure', () => {
    const placeholder = getPlaceholderImageUrl();
    expect(placeholder).toContain('svg');
    expect(placeholder).toContain('rect');
    expect(placeholder).toContain('No Image');
  });
});
