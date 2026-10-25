// Daily puzzle numbering. The puzzle changes at midnight US Eastern.

export const TIME_ZONE = 'America/New_York';
export const LAUNCH_DATE = '2026-11-01'; // puzzle #1

const DAY_MS = 86_400_000;

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function easternParts(instant) {
  const out = {};
  for (const p of partsFormatter.formatToParts(new Date(instant))) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** "YYYY-MM-DD" for the Eastern calendar date at `instant`. */
export function easternDate(instant = Date.now()) {
  const p = easternParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function utcMidnight(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(dateStr, days) {
  const t = new Date(utcMidnight(dateStr) + days * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Puzzle number for an Eastern date string (launch date is #1). */
export function dayNumberFor(dateStr) {
  return Math.round((utcMidnight(dateStr) - utcMidnight(LAUNCH_DATE)) / DAY_MS) + 1;
}

export function dateForDay(dayNumber) {
  return addDays(LAUNCH_DATE, dayNumber - 1);
}

export function todayNumber(instant = Date.now()) {
  return dayNumberFor(easternDate(instant));
}

/** Offset of Eastern time from UTC at `instant`, in ms (negative in the US). */
function easternOffset(instant) {
  const p = easternParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The instant of the next Eastern midnight after `instant`. */
export function nextReset(instant = Date.now()) {
  const tomorrow = addDays(easternDate(instant), 1);
  const guess = utcMidnight(tomorrow) + 5 * 3_600_000;
  return utcMidnight(tomorrow) - easternOffset(guess);
}
