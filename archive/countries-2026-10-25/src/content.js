// Day files store each country name once; this expands them into the
// per-question lists the game and the content tools work with.

const dayName = (day) => `day-${String(day).padStart(4, '0')}.json`;
export const DAY_PATH = (day) => `content/days/${dayName(day)}`;
/** Unapproved drafts, for local playtesting only (?draft). */
export const DRAFT_PATH = (day) => `content-pipeline/02_drafts/${dayName(day)}`;

/**
 * @returns the day with every question carrying
 *   answers:  [{ id, name, aliases, value }]          countries that count
 *   excluded: [{ name, aliases, reason, retry }]      recognized, but not valid here (outside the
 *             group, no data, not a country, ambiguous). The player is told why and keeps
 *             guessing on the same clock, so nothing recognized ever scores 0.
 */
export function hydrateDay(raw) {
  const { countries, extras = [] } = raw;
  const questions = raw.questions.map((q) => {
    const counted = new Set(q.answers.map((a) => a.id));
    const noData = new Set(q.noData ?? []);
    const answers = q.answers.map((a) => ({ id: a.id, value: a.value, ...countries[a.id] }));
    const excluded = [];
    for (const [id, c] of Object.entries(countries)) {
      if (counted.has(id)) continue;
      if (noData.has(id)) {
        excluded.push({ ...c, reason: `There's no figure for ${c.name} in the source data.`, retry: true });
      } else {
        excluded.push({ ...c, reason: q.reasons?.[id] ?? `${c.name} isn't ${q.groupLabel}.`, retry: true });
      }
    }
    for (const e of extras) excluded.push(e);
    return { ...q, answers, excluded };
  });
  return { ...raw, questions };
}

export async function loadDay(day, { draft = false, fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl(draft ? DRAFT_PATH(day) : DAY_PATH(day), { cache: 'no-cache' });
    if (!res.ok) return null;
    return hydrateDay(await res.json());
  } catch {
    return null;
  }
}
