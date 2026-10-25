// Stage 3 bookkeeping for the verify-day skill. Agents gather evidence;
// the rules below (not the agents) decide whether a question is clear.
//
//   node tools/report.mjs init <day...>      write 03_reports/day-NNNN.evidence.json to fill in
//   node tools/report.mjs needs <day...>     list what each fact-checker must look up (work/needs.json)
//   node tools/report.mjs merge <day...>     copy work/source-<field>.json and work/adversarial.json into evidence
//   node tools/report.mjs finalize <day...>  turn evidence into 03_reports/day-NNNN.json
//   node tools/report.mjs bundle             write 03_reports/review-bundle.json for the dashboard

import { readdir, writeFile, access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DRAFTS, REPORTS, readJson, dayFile } from './lib/dataset.mjs';
import { hydrateDay } from '../src/content.js';
import { bestAnswer, isOnSide, pointsFor } from '../src/score.js';

export const TOLERANCE = {
  agree: 0.02, // within 2% of the second source: agree
  nearLine: 0.15, // answers within 15% of the limit get checked
  perSide: 3, // plus the closest few on each side
};

const evidenceFile = (day) => path.join(REPORTS, dayFile(day).replace('.json', '.evidence.json'));
const reportFile = (day) => path.join(REPORTS, dayFile(day));

/** The answers whose values could change a player's result: closest to the line on both sides. */
export function answersToCheck(q) {
  const byDistance = [...q.answers].sort((a, b) => Math.abs(a.value - q.limit) - Math.abs(b.value - q.limit));
  const on = byDistance.filter((a) => isOnSide(q.direction, q.limit, a.value));
  const off = byDistance.filter((a) => !isOnSide(q.direction, q.limit, a.value));
  const near = byDistance.filter((a) => Math.abs(a.value - q.limit) / q.limit <= TOLERANCE.nearLine);
  const picked = new Map();
  for (const a of [...on.slice(0, TOLERANCE.perSide), ...off.slice(0, TOLERANCE.perSide), ...near.slice(0, 8)]) picked.set(a.id, a);
  return [...picked.values()];
}

/** Deterministic verdict for one value check. */
export function judgeCheck(q, best, check) {
  const second = check.secondSource?.value;
  if (typeof second !== 'number' || !check.secondSource?.url) {
    return { agreement: 'unverified', blocking: true, why: 'No independent source was found.' };
  }
  const diff = Math.abs(second - check.value) / Math.max(Math.abs(check.value), 1e-9);
  const flipsSide = isOnSide(q.direction, q.limit, second) !== isOnSide(q.direction, q.limit, check.value);
  if (flipsSide) return { agreement: 'disagree', blocking: true, why: 'The second source puts this answer on the other side of the line.' };
  if (check.id === best.id && diff > TOLERANCE.agree) {
    // Could another answer be the true best? Only blocking when the order near the top changes.
    const secondPoints = pointsFor(q.direction, q.limit, second);
    const rival = q.answers.find((a) => a.id !== best.id && isOnSide(q.direction, q.limit, a.value) && pointsFor(q.direction, q.limit, a.value) > secondPoints);
    if (rival) return { agreement: 'disagree', blocking: true, why: `With the second source's figure, ${rival.name} would be the best answer.` };
  }
  if (diff > TOLERANCE.agree) return { agreement: 'minor', blocking: false, why: `Sources differ by ${(diff * 100).toFixed(1)}%, without changing the result.` };
  return { agreement: 'agree', blocking: false, why: '' };
}

async function loadDraft(day) {
  return hydrateDay(await readJson(path.join(DRAFTS, dayFile(day))));
}

async function init(day) {
  const d = await loadDraft(day);
  const file = evidenceFile(day);
  if (await access(file).then(() => true, () => false)) {
    console.log(`${path.basename(file)} already exists; leaving it alone`);
    return;
  }
  const evidence = {
    day,
    theme: d.theme,
    instructions: 'Fill secondSource for every check, and add adversarial findings. See .claude/skills/verify-day/SKILL.md.',
    questions: d.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      field: q.field,
      unit: q.unit,
      source: q.source,
      checks: answersToCheck(q).map((a) => ({ id: a.id, name: a.name, value: a.value, secondSource: { value: null, url: '', title: '', year: null } })),
      adversarial: [],
    })),
  };
  await writeFile(file, JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Wrote ${path.relative(process.cwd(), file)} (${evidence.questions.reduce((n, q) => n + q.checks.length, 0)} checks)`);
}

const WORK = path.join(REPORTS, 'work');

async function needs(days) {
  const byField = {};
  for (const day of days) {
    const evidence = await readJson(evidenceFile(day));
    for (const q of evidence.questions) {
      const f = (byField[q.field] ??= { field: q.field, unit: q.unit, ourSource: q.source, countries: {} });
      for (const c of q.checks) f.countries[c.id] = c.name;
    }
  }
  await mkdir(WORK, { recursive: true });
  await writeFile(path.join(WORK, 'needs.json'), JSON.stringify(byField, null, 2) + '\n');
  for (const f of Object.values(byField)) console.log(`${f.field}: ${Object.keys(f.countries).length} countries`);
}

async function readOptional(file) {
  return readJson(file).catch(() => null);
}

async function merge(days) {
  const adversarial = (await readOptional(path.join(WORK, 'adversarial.json'))) ?? {};
  for (const day of days) {
    const evidence = await readJson(evidenceFile(day));
    let filled = 0;
    let total = 0;
    for (const q of evidence.questions) {
      const src = await readOptional(path.join(WORK, `source-${q.field}.json`));
      for (const c of q.checks) {
        total++;
        const hit = src?.values?.[c.id];
        if (hit && typeof hit.value === 'number') {
          c.secondSource = { value: hit.value, url: hit.url || src.source.url, title: src.source.title, year: src.source.year };
          filled++;
        }
      }
      if (adversarial[q.id]) q.adversarial = adversarial[q.id];
    }
    await writeFile(evidenceFile(day), JSON.stringify(evidence, null, 2) + '\n');
    console.log(`${dayFile(day)}: ${filled}/${total} checks have a second source`);
  }
}

async function finalize(day) {
  const d = await loadDraft(day);
  const evidence = await readJson(evidenceFile(day));
  const resolutions = (await readOptional(path.join(WORK, 'resolutions.json'))) ?? {};
  const questions = d.questions.map((q) => {
    const ev = evidence.questions.find((e) => e.id === q.id);
    if (!ev) throw new Error(`Evidence is missing question ${q.id}`);
    const best = bestAnswer(q);
    const checks = ev.checks.map((c) => {
      const answer = q.answers.find((a) => a.id === c.id);
      if (!answer || answer.value !== c.value) throw new Error(`${q.id}: evidence for ${c.name} does not match the draft (rebuilt since init?)`);
      return { ...c, side: isOnSide(q.direction, q.limit, c.value) ? 'scores' : 'bust', ...judgeCheck(q, best, c) };
    });
    // A finding fixed in the content (work/resolutions.json, keyed "qid#index") no longer blocks.
    const adversarial = (ev.adversarial ?? []).map((f, i) => {
      const resolution = resolutions[`${q.id}#${i}`] ?? '';
      return { kind: f.kind, text: f.text, suggestion: f.suggestion ?? '', blocking: Boolean(f.blocking) && !resolution, resolution };
    });
    const flags = [...checks.filter((c) => c.blocking).map((c) => `${c.name}: ${c.why}`), ...adversarial.filter((f) => f.blocking).map((f) => f.text)];
    return {
      id: q.id,
      prompt: q.prompt,
      direction: q.direction,
      limit: q.limit,
      unit: q.unit,
      format: q.format,
      source: q.source,
      groupLabel: q.groupLabel,
      best: { name: best.name, value: best.value, score: pointsFor(q.direction, q.limit, best.value) },
      checks,
      adversarial,
      flags,
      status: flags.length ? 'flagged' : 'clear',
    };
  });
  const report = {
    day,
    date: d.date,
    theme: d.theme,
    emoji: d.emoji,
    finalizedAt: new Date().toISOString(),
    status: questions.some((q) => q.status === 'flagged') ? 'flagged' : 'clear',
    questions,
  };
  await writeFile(reportFile(day), JSON.stringify(report, null, 2) + '\n');
  console.log(`${dayFile(day)}: ${report.status} (${questions.filter((q) => q.status === 'flagged').length} flagged)`);
}

async function bundle() {
  const files = (await readdir(REPORTS)).filter((f) => /^day-\d{4}\.json$/.test(f)).sort();
  const days = [];
  for (const f of files) days.push(await readJson(path.join(REPORTS, f)));
  const out = path.join(REPORTS, 'review-bundle.json');
  await writeFile(out, JSON.stringify({ generatedAt: new Date().toISOString(), days }) + '\n');
  console.log(`Wrote ${path.relative(process.cwd(), out)} (${days.length} days)`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const days = args.map(Number);
  if (cmd === 'init') for (const d of days) await init(d);
  else if (cmd === 'needs') await needs(days);
  else if (cmd === 'merge') await merge(days);
  else if (cmd === 'finalize') for (const d of days) await finalize(d);
  else if (cmd === 'bundle') await bundle();
  else {
    console.error('usage: node tools/report.mjs init|finalize <day...> | bundle');
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('report.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
