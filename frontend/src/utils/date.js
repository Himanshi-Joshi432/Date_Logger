/**
 * Formats a Date as YYYY-MM-DD in the user's local timezone.
 * (toISOString() uses UTC, which shifts the day for anyone ahead of/behind UTC near midnight.)
 */
export function toLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
