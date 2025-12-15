/**
 * Time formatting utilities
 *
 * Shared utilities for formatting dates and times across the application.
 */

/**
 * Formats a date string into a human-readable "time ago" format.
 *
 * @param dateStr - ISO date string or any valid Date constructor input
 * @returns Formatted string like "5m ago", "2h ago", "Yesterday", or "3d ago"
 *
 * @example
 * formatTimeAgo(new Date().toISOString()) // "0m ago"
 * formatTimeAgo('2024-01-15T10:30:00Z')   // "2d ago" (if 2 days have passed)
 */
export function formatTimeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older dates, show the actual date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date for display in conversation timestamps.
 *
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatConversationDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (date >= today) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (date >= yesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
