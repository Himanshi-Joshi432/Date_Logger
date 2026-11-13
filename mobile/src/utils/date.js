/**
 * Formats a Date as YYYY-MM-DD in the device's local timezone.
 * (toISOString() uses UTC, which saves the previous day for dates logged
 * shortly after midnight in timezones ahead of UTC, such as India.)
 */
export function toLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
