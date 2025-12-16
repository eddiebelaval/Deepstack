/**
 * HTML Sanitization Utilities
 *
 * Provides safe HTML sanitization using DOMPurify to prevent XSS attacks.
 * Used primarily for user-generated rich text content from TipTap editor.
 */

import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify that allows safe TipTap HTML elements
 * while blocking potentially dangerous content like scripts and event handlers.
 */
const SANITIZE_CONFIG = {
  // Allow common formatting tags from TipTap
  ALLOWED_TAGS: [
    // Block elements
    'p', 'div', 'br', 'hr',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Text formatting
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
    'sub', 'sup', 'mark', 'code', 'pre',
    // Lists
    'ul', 'ol', 'li',
    // Links (href will be validated)
    'a',
    // Quotes
    'blockquote',
    // Tables (if TipTap tables extension is used)
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Spans for styling
    'span',
  ],
  // Only allow safe attributes
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'id',
    'colspan', 'rowspan', // For tables
  ],
  // Force all links to open in new tab with security attributes
  ADD_ATTR: ['target', 'rel'],
  // Block dangerous URI schemes
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  // Forbid potentially dangerous tags completely
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  // Forbid event handlers and dangerous attributes
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'style'],
};

/**
 * Sanitizes HTML content to prevent XSS attacks.
 *
 * @param html - The HTML string to sanitize (can be null/undefined)
 * @returns Sanitized HTML string safe for rendering with React's __html prop
 *
 * @example
 * // Blocks XSS attempts
 * sanitizeHtml('<script>alert("xss")</script>') // Returns ''
 * sanitizeHtml('<img src=x onerror=alert(1)>') // Returns '<img src="x">'
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }

  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Strict sanitization that removes all HTML tags.
 * Use when you need plain text only.
 *
 * @param html - The HTML string to strip
 * @returns Plain text with all HTML removed
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }

  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Hook to add target="_blank" and rel="noopener noreferrer" to all links.
 * This runs after sanitization to ensure link security.
 */
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export default sanitizeHtml;
