// Scoring for a single question. Kept in one place so the curve can be tuned
// after playtesting without touching the rest of the game.

export const MAX_PER_QUESTION = 100;
export const QUESTIONS_PER_DAY = 5;
export const MAX_DAILY = MAX_PER_QUESTION * QUESTIONS_PER_DAY;

/** True when `value` is on the scoring side of the line. */
export function isOnSide(direction, limit, value) {
  return direction === 'over' ? value >= limit : value <= limit;
}

/**
 * How the points rise toward the line: points = 100 × closeness^CURVE. Higher
 * is steeper, so the last stretch before the line pays the most.
 */
export const CURVE = 3;

/**
 * How close a value sits to the line, as a ratio: 1 is on the line, smaller is
 * further inside the scoring side, and above 1 has crossed it (a bust).
 */
export function closeness(direction, limit, value) {
  if (direction === 'over') return value > 0 ? limit / value : Infinity;
  return value / limit;
}

/** Points for a closeness ratio on the scoring side (at most 1). */
export function pointsForCloseness(ratio) {
  return MAX_PER_QUESTION * Math.max(0, Math.min(1, ratio)) ** CURVE;
}

/** Points for a value on the scoring side of the line. */
export function pointsFor(direction, limit, value) {
  if (!isOnSide(direction, limit, value)) return 0;
  return Math.round(pointsForCloseness(closeness(direction, limit, value)));
}

/**
 * Evaluate one question.
 * @param question  the question object from the day file
 * @param answer    the matched answer ({ name, value }) or null if unrecognized
 * @param opts      { timedOut: boolean }
 * @returns {{ outcome: 'scored'|'bust'|'invalid'|'timeout', score: number,
 *             value: number|null, distance: number|null }}
 */
export function evaluate(question, answer, { timedOut = false } = {}) {
  if (timedOut) return { outcome: 'timeout', score: 0, value: null, distance: null };
  if (!answer) return { outcome: 'invalid', score: 0, value: null, distance: null };
  const { direction, limit } = question;
  const distance = Math.abs(limit - answer.value);
  if (!isOnSide(direction, limit, answer.value)) {
    return { outcome: 'bust', score: 0, value: answer.value, distance };
  }
  return { outcome: 'scored', score: pointsFor(direction, limit, answer.value), value: answer.value, distance };
}

/** The answer closest to the line on the scoring side. */
export function bestAnswer(question) {
  let best = null;
  let bestPoints = -1;
  for (const a of question.answers) {
    if (!isOnSide(question.direction, question.limit, a.value)) continue;
    const p = pointsFor(question.direction, question.limit, a.value);
    if (p > bestPoints || (p === bestPoints && Math.abs(question.limit - a.value) < Math.abs(question.limit - best.value))) {
      best = a;
      bestPoints = p;
    }
  }
  return best;
}

/** Plain-text mark for a result, as used on the share card: its points, BUST, TIME, or a dash. */
export function markFor(result) {
  if (result.outcome === 'bust') return 'BUST';
  if (result.outcome === 'timeout') return 'TIME';
  if (result.outcome !== 'scored') return '–';
  return String(result.score);
}

/** Short word for a result, so meaning never depends on color alone. */
export function wordFor(result) {
  if (result.outcome === 'bust') return 'Bust';
  if (result.outcome === 'timeout') return 'Time';
  if (result.outcome === 'invalid') return 'Miss';
  if (result.score >= 95) return 'Bullseye';
  if (result.score >= 50) return 'Close';
  return 'Safe';
}

export function dailyTotal(results) {
  return results.reduce((sum, r) => sum + (r ? r.score : 0), 0);
}
