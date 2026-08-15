/**
 * Date helpers. We store dates as `YYYY-MM-DD` strings (a "day", not a timestamp),
 * so streaks compare calendar days without timezone surprises.
 * Owner: jaikanth (backend).
 */

/** Format a Date as a local `YYYY-MM-DD` day string. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as a `YYYY-MM-DD` string. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse a `YYYY-MM-DD` string to a Date at local noon (avoids DST edge cases). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Weekday of a day string: 0=Sunday .. 6=Saturday. */
export function weekdayOf(iso: string): number {
  return fromISODate(iso).getDay();
}

/** A new day string `n` days after the given one (n may be negative). */
export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** All day strings strictly between `a` and `b` (exclusive on both ends). */
export function daysStrictlyBetween(a: string, b: string): string[] {
  const out: string[] = [];
  let cur = addDays(a, 1);
  while (cur < b) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}
