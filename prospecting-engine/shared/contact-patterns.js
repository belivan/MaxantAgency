/**
 * Contact Extraction Patterns
 *
 * Shared regex patterns and validation utilities for email/phone extraction.
 * Used by dom-scraper.js and business-intelligence-extractor.js.
 */

// Email regex pattern (matches standard email format)
export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone regex pattern (US format with optional country code)
export const PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

// Common false positive email domains to filter out
export const INVALID_EMAIL_DOMAINS = [
  'example.com',
  'domain.com',
  'youremail.com',
  'email.com',
  'test.com',
  'sample.com',
  'placeholder.com',
  'sentry.io',
  'wixpress.com'
];

// Preferred email prefixes (in priority order)
export const PREFERRED_EMAIL_PREFIXES = [
  'info@',
  'contact@',
  'hello@',
  'sales@',
  'support@',
  'office@',
  'admin@'
];

/**
 * Validate an email address
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;

  // Basic format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  // Check for invalid domains
  const domain = email.split('@')[1]?.toLowerCase();
  if (INVALID_EMAIL_DOMAINS.some(d => domain === d || domain?.endsWith('.' + d))) {
    return false;
  }

  return true;
}

/**
 * Validate a phone number
 *
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // US phone numbers should have 10 or 11 digits (with country code)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/**
 * Clean and normalize an email address
 *
 * @param {string} email - Email to clean
 * @returns {string} Cleaned email
 */
export function cleanEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Clean and normalize a phone number
 *
 * @param {string} phone - Phone to clean
 * @returns {string} Cleaned phone
 */
export function cleanPhone(phone) {
  if (!phone) return null;
  return phone.trim();
}

/**
 * Prioritize emails - prefer business-friendly prefixes
 *
 * @param {string[]} emails - Array of email addresses
 * @returns {string|null} Best email or first valid one
 */
export function prioritizeEmails(emails) {
  if (!emails || emails.length === 0) return null;

  // Filter valid emails first
  const validEmails = emails.filter(isValidEmail);
  if (validEmails.length === 0) return null;

  // Find preferred email
  for (const prefix of PREFERRED_EMAIL_PREFIXES) {
    const preferred = validEmails.find(e => e.toLowerCase().startsWith(prefix));
    if (preferred) return cleanEmail(preferred);
  }

  // Return first valid email if no preferred found
  return cleanEmail(validEmails[0]);
}

/**
 * Extract all emails from text
 *
 * @param {string} text - Text to search
 * @returns {string[]} Array of found emails
 */
export function extractEmailsFromText(text) {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.filter(isValidEmail).map(cleanEmail))];
}

/**
 * Extract all phones from text
 *
 * @param {string} text - Text to search
 * @returns {string[]} Array of found phones
 */
export function extractPhonesFromText(text) {
  if (!text) return [];
  const matches = text.match(PHONE_REGEX) || [];
  return [...new Set(matches.filter(isValidPhone).map(cleanPhone))];
}

export default {
  EMAIL_REGEX,
  PHONE_REGEX,
  INVALID_EMAIL_DOMAINS,
  PREFERRED_EMAIL_PREFIXES,
  isValidEmail,
  isValidPhone,
  cleanEmail,
  cleanPhone,
  prioritizeEmails,
  extractEmailsFromText,
  extractPhonesFromText
};
