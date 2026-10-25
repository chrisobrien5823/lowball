// Player stats derived from saved progress. Nothing here is stored separately,
// so stats can never drift from the games actually played.

import { dailyTotal } from './score.js';

export const HISTOGRAM_BUCKETS = ['0–99', '100–199', '200–299', '300–399', '400–500'];

export function computeStats(days, today) {
  const completed = Object.entries(days)
    .filter(([, p]) => p && p.done)
    .map(([day, p]) => ({ day: Number(day), total: dailyTotal(p.results), results: p.results }))
    .sort((a, b) => a.day - b.day);

  const histogram = HISTOGRAM_BUCKETS.map(() => 0);
  let bullseyes = 0;
  let sum = 0;
  let best = 0;
  for (const g of completed) {
    sum += g.total;
    best = Math.max(best, g.total);
    histogram[Math.min(4, Math.floor(g.total / 100))]++;
    bullseyes += g.results.filter((r) => r.outcome === 'scored' && r.score >= 95).length;
  }

  let maxStreak = 0;
  let run = 0;
  let prev = null;
  for (const g of completed) {
    run = prev !== null && g.day === prev + 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    prev = g.day;
  }
  // The streak is still alive if the last game was today or yesterday.
  const last = completed.at(-1);
  const streak = last && today - last.day <= 1 ? run : 0;

  return {
    played: completed.length,
    average: completed.length ? Math.round(sum / completed.length) : 0,
    best,
    bullseyes,
    streak,
    maxStreak,
    histogram,
  };
}
