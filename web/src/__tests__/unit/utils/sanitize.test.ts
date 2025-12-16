/**
 * Tests for HTML Sanitization Utilities
 *
 * Tests XSS attack prevention and safe HTML handling with DOMPurify.
 */

import { sanitizeHtml, stripHtml } from '@/lib/utils/sanitize';

describe('sanitizeHtml', () => {
  describe('handles null/undefined/empty input', () => {
    it('returns empty string for null', () => {
      expect(sanitizeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitizeHtml(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('allows safe HTML elements', () => {
    it('preserves paragraph tags', () => {
      const input = '<p>Hello World</p>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves formatting tags', () => {
      const input = '<strong>Bold</strong> and <em>italic</em>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves heading tags', () => {
      const input = '<h1>Title</h1><h2>Subtitle</h2>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves list elements', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves links with href', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Link');
    });

    it('preserves code blocks', () => {
      const input = '<pre><code>const x = 1;</code></pre>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('preserves table elements', () => {
      const input = '<table><tr><td>Cell</td></tr></table>';
      expect(sanitizeHtml(input)).toContain('<table>');
      expect(sanitizeHtml(input)).toContain('<td>');
    });
  });

  describe('blocks dangerous XSS payloads', () => {
    it('removes script tags', () => {
      const input = '<script>alert("xss")</script>';
      expect(sanitizeHtml(input)).toBe('');
    });

    it('removes script tags with content', () => {
      const input = '<p>Hello</p><script>document.cookie</script><p>World</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('script');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });

    it('removes onerror event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });

    it('removes onclick event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('removes onload event handlers', () => {
      const input = '<body onload="alert(1)">Content</body>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onload');
    });

    it('removes onmouseover event handlers', () => {
      const input = '<div onmouseover="alert(1)">Hover</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onmouseover');
    });

    it('removes style tags', () => {
      const input = '<style>body { display: none; }</style>';
      expect(sanitizeHtml(input)).toBe('');
    });

    it('removes iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      expect(sanitizeHtml(input)).toBe('');
    });

    it('removes form elements', () => {
      const input = '<form action="https://evil.com"><input type="text"><button>Submit</button></form>';
      const result = sanitizeHtml(input);
      // form tag is removed, action attribute is blocked
      expect(result).not.toContain('<form');
      expect(result).not.toContain('action=');
    });

    it('removes object data attribute', () => {
      const input = '<object data="malware.swf"></object>';
      const result = sanitizeHtml(input);
      // data attribute should be stripped (not in ALLOWED_ATTR)
      expect(result).not.toContain('data=');
      expect(result).not.toContain('malware.swf');
    });

    it('removes style attributes', () => {
      const input = '<div style="background:url(javascript:alert(1))">Text</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('style');
      expect(result).toContain('Text');
    });

    it('blocks javascript: protocol in href', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);
      // DOMPurify removes dangerous hrefs
      expect(result).not.toContain('javascript:');
    });

    it('blocks data: protocol in src', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('data:text/html');
    });
  });

  describe('handles encoded XSS attempts', () => {
    it('handles HTML entity encoded script', () => {
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = sanitizeHtml(input);
      // Entities should be preserved as text, not executed
      expect(result).not.toContain('<script>');
    });

    it('handles mixed case script tags', () => {
      const input = '<ScRiPt>alert(1)</ScRiPt>';
      expect(sanitizeHtml(input)).toBe('');
    });

    it('handles null bytes in tags', () => {
      const input = '<scr\0ipt>alert(1)</script>';
      const result = sanitizeHtml(input);
      // DOMPurify handles malformed tags - script should be removed
      expect(result).not.toContain('<script');
    });
  });

  describe('preserves safe attributes', () => {
    it('preserves class attribute', () => {
      const input = '<div class="my-class">Content</div>';
      expect(sanitizeHtml(input)).toContain('class="my-class"');
    });

    it('preserves id attribute', () => {
      const input = '<div id="my-id">Content</div>';
      expect(sanitizeHtml(input)).toContain('id="my-id"');
    });

    it('preserves colspan and rowspan on table cells', () => {
      // Table cells need proper table context
      const input = '<table><tr><td colspan="2" rowspan="3">Cell</td></tr></table>';
      const result = sanitizeHtml(input);
      expect(result).toContain('colspan="2"');
      expect(result).toContain('rowspan="3"');
    });
  });
});

describe('stripHtml', () => {
  it('returns empty string for null', () => {
    expect(stripHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(stripHtml(undefined)).toBe('');
  });

  it('preserves plain text', () => {
    const input = 'Hello World';
    expect(stripHtml(input)).toBe('Hello World');
  });

  it('removes XSS attempts completely', () => {
    const input = '<script>alert(1)</script>Hello';
    expect(stripHtml(input)).toBe('Hello');
  });

  it('strips dangerous content', () => {
    const input = '<div onclick="alert(1)">Text</div>';
    const result = stripHtml(input);
    expect(result).not.toContain('onclick');
    // Content is preserved
    expect(result).toContain('Text');
  });
});
