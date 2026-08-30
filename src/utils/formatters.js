/**
 * Robust Name Normalization according to SNCF Campaign guidelines:
 * - Capitalize the first letter of each word.
 * - Normalize multiple spaces.
 * - Append " Ji" automatically if not present.
 * - Never append " Ji" twice (e.g., "Rahul Kumar Ji" -> "Rahul Kumar Ji").
 * - Preserve legitimate multi-word names.
 */
export function formatName(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // 1. Trim and collapse whitespace
  const cleaned = input.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return '';
  }

  // 2. Title Case each word
  const words = cleaned.split(' ').map((word) => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  let result = words.join(' ');

  // 3. Check if ending with "Ji" (case insensitive)
  const endsWithJi = /\bji$/i.test(result);
  if (endsWithJi) {
    // Standardize casing of "Ji"
    result = result.replace(/\bji$/i, 'Ji');
  } else {
    // Append " Ji"
    result = `${result} Ji`;
  }

  return result;
}

/**
 * Indian WhatsApp Number Validation & Normalization:
 * - Accepts: 9876543210, +919876543210, 919876543210, 09876543210
 * - Normalizes to: +919876543210
 * - Validates 10-digit Indian mobile number (starts with 6, 7, 8, or 9)
 */
export function validateAndNormalizePhone(input) {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      normalized: '',
      message: 'WhatsApp phone number is required.'
    };
  }

  // Strip all whitespace, hyphens, and brackets
  let raw = input.trim().replace(/[\s\-\(\)]/g, '');

  // Strip leading + if present
  if (raw.startsWith('+')) {
    raw = raw.slice(1);
  }

  // Handle +91 or 91 country code
  if (raw.startsWith('91') && raw.length === 12) {
    raw = raw.slice(2);
  } else if (raw.startsWith('0') && raw.length === 11) {
    raw = raw.slice(1);
  }

  // Check if raw is exactly 10 digits starting with 6-9
  if (/^[6-9]\d{9}$/.test(raw)) {
    return {
      valid: true,
      normalized: `+91${raw}`,
      digits: raw,
      message: ''
    };
  }

  return {
    valid: false,
    normalized: '',
    message: 'Please enter a valid 10-digit Indian WhatsApp number (e.g. 9876543210).'
  };
}

/**
 * Clean UI date formatter
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return String(dateString);
  }
}
