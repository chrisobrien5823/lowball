// Turns what a player typed into one of the question's answers.

export function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

/** Optimal-string-alignment distance (Levenshtein plus adjacent swaps), capped at `max + 1`. */
export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prevPrev = null;
  let prev = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prevPrev && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prevPrev[j - 2] + 1);
      }
      cur.push(d);
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[cols - 1];
}

/** How many typos we forgive for a name of this length. */
export function typoTolerance(length) {
  if (length >= 9) return 2;
  if (length >= 5) return 1;
  return 0;
}

function namesOf(answer) {
  return [answer.name, ...(answer.aliases || [])].map(normalize).filter(Boolean);
}

/**
 * Find the answer a player meant.
 * @returns {{ answer: object, exact: boolean } | null}  null when unrecognized or ambiguous
 */
export function matchAnswer(input, answers) {
  const typed = normalize(input);
  if (!typed) return null;
  const typedCompact = typed.replace(/ /g, '');

  const exact = answers.filter((a) =>
    namesOf(a).some((n) => n === typed || n.replace(/ /g, '') === typedCompact),
  );
  if (exact.length === 1) return { answer: exact[0], exact: true };
  if (exact.length > 1) return null;

  // Tolerance follows the real name's length, so a dropped letter ("Palu") is still forgiven.
  let bestDistance = Infinity;
  let best = [];
  for (const a of answers) {
    let d = Infinity;
    let longer = false;
    for (const n of namesOf(a)) {
      const tol = typoTolerance(n.length);
      if (tol === 0) continue;
      const nd = editDistance(typed, n, tol);
      if (nd <= tol && nd < d) {
        d = nd;
        longer = n.length > typed.length;
      }
    }
    if (d < bestDistance) {
      bestDistance = d;
      best = [{ a, longer }];
    } else if (d === bestDistance && d !== Infinity) {
      best.push({ a, longer });
    }
  }
  if (best.length === 1) return { answer: best[0].a, exact: false };
  // On a tie, a dropped letter is the likelier slip ("Nigera" is Nigeria, not Niger).
  const dropped = best.filter((b) => b.longer);
  if (dropped.length === 1) return { answer: dropped[0].a, exact: false };
  return null;
}
