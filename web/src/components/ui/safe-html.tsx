'use client';

/**
 * SafeHtml Component
 *
 * Renders HTML content safely by sanitizing it with DOMPurify.
 * Use this instead of directly rendering user-generated HTML.
 */

import type { JSX } from 'react';
import { sanitizeHtml } from '@/lib/utils/sanitize';

interface SafeHtmlProps {
  html: string | null | undefined;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Safely renders HTML content after sanitizing it with DOMPurify.
 * Prevents XSS attacks from user-generated content like rich text editors.
 *
 * @param html - The HTML string to render (will be sanitized)
 * @param className - Optional CSS classes
 * @param as - The HTML element to render as (default: 'div')
 */
export function SafeHtml({ html, className, as: Component = 'div' }: SafeHtmlProps) {
  if (!html) {
    return null;
  }

  const sanitized = sanitizeHtml(html);

  return (
    <Component
      className={className}
      // Content is sanitized via DOMPurify - safe to render
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

export default SafeHtml;
