import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easternDate, dayNumberFor, dateForDay, todayNumber, nextReset, addDays } from '../src/date.js';

test('launch date is puzzle #1', () => {
  assert.equal(dayNumberFor('2026-11-01'), 1);
  assert.equal(dayNumberFor('2026-11-12'), 12);
  assert.equal(dateForDay(12), '2026-11-12');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('day flips at Eastern midnight, not UTC midnight', () => {
  // 2026-11-05 03:59 UTC is 22:59 on Nov 4 in New York (EST, UTC-5).
  assert.equal(easternDate(Date.UTC(2026, 10, 5, 3, 59)), '2026-11-04');
  assert.equal(easternDate(Date.UTC(2026, 10, 5, 5, 0)), '2026-11-05');
  // In summer (EDT, UTC-4) the flip is at 04:00 UTC.
  assert.equal(easternDate(Date.UTC(2027, 6, 1, 3, 59)), '2027-06-30');
  assert.equal(easternDate(Date.UTC(2027, 6, 1, 4, 0)), '2027-07-01');
});

test('todayNumber uses the Eastern date', () => {
  // Nov 1 midnight is still EDT (UTC-4), so the flip is at 04:00 UTC.
  assert.equal(todayNumber(Date.UTC(2026, 10, 1, 3, 59)), 0); // still Oct 31 in NY
  assert.equal(todayNumber(Date.UTC(2026, 10, 1, 4, 0)), 1);
});

test('nextReset lands on Eastern midnight, including around DST changes', () => {
  // DST ends 2026-11-01 at 2am: midnight Nov 1 is still EDT (04:00 UTC).
  assert.equal(nextReset(Date.UTC(2026, 9, 31, 20, 0)), Date.UTC(2026, 10, 1, 4, 0));
  // Midnight Nov 2 is EST (05:00 UTC).
  assert.equal(nextReset(Date.UTC(2026, 10, 1, 12, 0)), Date.UTC(2026, 10, 2, 5, 0));
  // DST starts 2027-03-14: midnight Mar 14 is EST, midnight Mar 15 is EDT.
  assert.equal(nextReset(Date.UTC(2027, 2, 13, 18, 0)), Date.UTC(2027, 2, 14, 5, 0));
  assert.equal(nextReset(Date.UTC(2027, 2, 14, 18, 0)), Date.UTC(2027, 2, 15, 4, 0));
});
