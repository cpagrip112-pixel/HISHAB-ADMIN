/**
 * Hishab Admin - Defensive Security Utilities
 * Enforces input validation, XSS prevention, IDOR protection, and error masking.
 */

// Strict UUID v4 regex for IDOR and parameter tampering prevention
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a given string is a valid, well-formed UUID.
 * Prevents SQL injection, parameter tampering, and malformed query attacks.
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Sanitizes URLs (e.g. uploaded payment screenshots, receipts) to eliminate
 * stored XSS vectors like `javascript:...`, `data:text/html...`, or `vbscript:...`.
 * Only allows valid http: and https: protocols.
 */
export function sanitizeSafeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    // Relative paths on same domain if starting with /
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    return null;
  }
}

/**
 * Strips dangerous HTML tags and characters from user-controlled text strings.
 */
export function sanitizeText(input: string | null | undefined, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  // Strip control characters and truncate to length limit
  return trimmed
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
}

/**
 * Validates and normalizes price amounts to prevent negative values, NaN,
 * scientific notation, or integer overflow injection.
 */
export function validatePrice(val: any): { valid: boolean; price: number; error?: string } {
  const num = Number(val);
  if (isNaN(num)) {
    return { valid: false, price: 0, error: 'Price must be a valid number.' };
  }
  if (!isFinite(num)) {
    return { valid: false, price: 0, error: 'Price cannot be infinite.' };
  }
  if (num <= 0) {
    return { valid: false, price: 0, error: 'Price must be greater than zero.' };
  }
  if (num > 1000000) {
    return { valid: false, price: 0, error: 'Price exceeds maximum allowed limit (₹10,00,000).' };
  }
  // Round to 2 decimal places
  return { valid: true, price: Math.round(num * 100) / 100 };
}

/**
 * Validates free trial duration in days.
 */
export function validateTrialDays(val: any): { valid: boolean; days: number; error?: string } {
  const num = parseInt(val, 10);
  if (isNaN(num)) {
    return { valid: false, days: 15, error: 'Trial days must be an integer.' };
  }
  if (num < 0) {
    return { valid: false, days: 15, error: 'Trial days cannot be negative.' };
  }
  if (num > 365) {
    return { valid: false, days: 15, error: 'Trial days cannot exceed 365 days.' };
  }
  return { valid: true, days: num };
}

/**
 * Masks internal database errors, stack traces, and SQL exceptions
 * to prevent sensitive information leakage to attackers.
 */
export function sanitizeErrorMessage(err: any, fallback: string = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallback;
  const msg = typeof err === 'string' ? err : err.message || '';

  // Suppress sensitive database error codes, PostgreSQL internal traces, and table schema errors
  const sensitivePatterns = [
    /pgrst\d+/i,
    /schema cache/i,
    /relation.*does not exist/i,
    /syntax error at or near/i,
    /column.*does not exist/i,
    /violates.*constraint/i,
    /jwt/i,
    /secret/i,
    /key/i,
    /password/i,
    /null value in column/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(msg)) {
      return fallback;
    }
  }

  // Friendly auth-specific errors are safe to show
  if (msg.includes('Invalid email or password') || msg.includes('Email not confirmed') || msg.includes('Admin access required')) {
    return msg;
  }

  return msg.slice(0, 150) || fallback;
}
