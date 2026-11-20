/**
 * Formats a local date string (YYYY-MM-DD) into a long format like "Jan 28, 2026".
 * Avoids UTC timezone conversion shifts.
 *
 * @param {string} isoDateStr
 * @returns {string}
 */
export function formatDateLong(isoDateStr) {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateObj);
}
