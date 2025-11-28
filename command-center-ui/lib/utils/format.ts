/**
 * Formatting Utilities
 * Helper functions for formatting numbers, currency, dates, etc.
 */

import { format as formatDate, formatDistance, formatRelative, isValid, parseISO } from 'date-fns';

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format number as USD currency
 */
export function formatCurrency(amount: number, options?: {
  showCents?: boolean;
  showSign?: boolean;
}): string {
  const { showCents = true, showSign = false } = options || {};

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);

  if (showSign && amount > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Format number with abbreviations (K, M, B)
 */
export function formatNumber(num: number, options?: {
  decimals?: number;
  abbreviate?: boolean;
}): string {
  const { decimals = 0, abbreviate = false } = options || {};

  if (!abbreviate) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }

  const abbreviations = [
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'K' }
  ];

  for (const { value, symbol } of abbreviations) {
    if (num >= value) {
      return `${(num / value).toFixed(decimals)}${symbol}`;
    }
  }

  return num.toFixed(decimals);
}

// ============================================================================
// PERCENTAGE FORMATTING
// ============================================================================

/**
 * Format number as percentage
 */
export function formatPercent(value: number, options?: {
  decimals?: number;
  showSign?: boolean;
}): string {
  const { decimals = 1, showSign = false } = options || {};

  const formatted = `${value.toFixed(decimals)}%`;

  if (showSign && value > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Calculate and format percentage change
 */
export function formatPercentChange(oldValue: number, newValue: number): string {
  if (oldValue === 0) return 'N/A';

  const change = ((newValue - oldValue) / oldValue) * 100;
  return formatPercent(change, { showSign: true });
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Parse date string safely
 */
function parseDate(date: string | Date): Date {
  if (date instanceof Date) {
    return date;
  }

  const parsed = parseISO(date);
  if (!isValid(parsed)) {
    throw new Error(`Invalid date: ${date}`);
  }

  return parsed;
}

/**
 * Format date in standard format
 */
export function formatDateString(
  date: string | Date,
  formatString: string = 'MMM d, yyyy'
): string {
  try {
    return formatDate(parseDate(date), formatString);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date, options?: {
  relative?: boolean;
}): string {
  if (options?.relative) {
    return formatRelativeTime(date);
  }
  return formatDateString(date, 'MMM d, yyyy h:mm a');
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    return formatDistance(parseDate(date), new Date(), { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date as relative (e.g., "yesterday at 3:00 PM")
 */
export function formatRelativeDate(date: string | Date): string {
  try {
    return formatRelative(parseDate(date), new Date());
  } catch {
    return 'Invalid date';
  }
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert snake_case to Title Case
 */
export function toTitleCase(text: string): string {
  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

// ============================================================================
// PLURALIZATION
// ============================================================================

/**
 * Simple pluralization helper
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format count with pluralized word
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${formatNumber(count)} ${pluralize(count, singular, plural)}`;
}

// ============================================================================
// FILE SIZE FORMATTING
// ============================================================================

/**
 * Format bytes as human-readable size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

// ============================================================================
// DURATION FORMATTING
// ============================================================================

/**
 * Format milliseconds as duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;

  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

// ============================================================================
// ALIASES FOR BACKWARDS COMPATIBILITY
// ============================================================================

export { formatPercent as formatPercentage };
export { formatDateString as formatDate };
