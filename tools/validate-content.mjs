// Stage 2: free, deterministic checks on every day file.
//
//   node tools/validate-content.mjs              drafts and published days
//   node tools/validate-content.mjs <dir|file>   just these

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { DRAFTS, PUBLISHED, readJson, loadDataset, loadGroups, resolveGroup, poolRows, entityId, fieldFormat } from './lib/dataset.mjs';
import { hydrateDay } from '../src/content.js';
import { normalize } from '../src/match.js';
import { bestAnswer, pointsFor, pointsForCloseness, isOnSide, QUESTIONS_PER_DAY } from '../src/score.js';
import { dateForDay } from '../src/date.js';

export const RULES = {
  minOnSide: 3, // enough ways to score
  minOffSide: 2, // a bust is possible
  minBestScore: Math.round(pointsForCloseness(0.85)), // some answer lands within 15% of the line
  minAnswers: 5,
  maxAnswers: 700,
};

const datasets = new Map();
async function dataset(id) {
  if (!datasets.has(id)) datasets.set(id, await loadDataset(id));
  return datasets.get(id);
}

/** @returns {{ errors: string[], summary: string[] }} */
export async function validateDay(raw, { groups }) {
  const errors = [];
  const summary = [];
  const err = (msg) => errors.push(msg);

  if (!Number.isInteger(raw.day) || raw.day < 1) err('day must be a positive integer');
  if (raw.date !== dateForDay(raw.day)) err(`date ${raw.date} should be ${dateForDay(raw.day)} for day ${raw.day}`);
  if (!raw.theme) err('missing theme');
  if (!Array.isArray(raw.questions) || raw.questions.length !== QUESTIONS_PER_DAY) {
    err(`needs exactly ${QUESTIONS_PER_DAY} questions`);
    return { errors, summary };
  }

  const day = hydrateDay(raw);
  for (const [qi, q] of day.questions.entries()) {
    const at = (msg) => err(`Q${qi + 1}: ${msg}`);
    for (const k of ['id', 'prompt', 'direction', 'limit', 'unit', 'format', 'source', 'dataset', 'field', 'group', 'groupLabel']) {
      if (q[k] === undefined || q[k] === '') at(`missing ${k}`);
    }
    if (!['under', 'over'].includes(q.direction)) at(`direction must be "under" or "over"`);
    if (!(q.limit > 0)) at('limit must be a positive number');

    // Every value must match its dataset row exactly, and the answer list must be the whole group.
    let ds;
    let pool;
    try {
      ds = await dataset(q.dataset);
      pool = resolveGroup(groups, q.group);
      if (pool.dataset !== q.dataset) at(`group ${q.group} reads ${pool.dataset}, not ${q.dataset}`);
      if (pool.label !== q.groupLabel) at(`group label "${q.groupLabel}" should be "${pool.label}"`);
    } catch (e) {
      at(e.message);
      continue;
    }
    const fmt = ds.meta.fields[q.field] ? fieldFormat(ds.meta, q.field) : null;
    if (!fmt) at(`unknown field ${q.field}`);
    else if (fmt.format !== q.format || fmt.unit !== q.unit) at(`unit and format should be ${fmt.unit} / ${fmt.format}`);
    const members = new Map(poolRows(pool, ds).map((row) => [entityId(ds.meta, row), row]));
    const listed = new Set(q.answers.map((a) => a.id));
    for (const a of q.answers) {
      const row = members.get(a.id);
      if (!row) at(`${a.name} (${a.id}) is not in group ${q.group}`);
      else if (row[q.field] !== a.value) at(`${a.name}: value ${a.value} does not match dataset value ${row[q.field]}`);
    }
    for (const [id, row] of members) {
      if (!listed.has(id) && row[q.field] !== null) at(`${day.entities[id]?.name ?? id} is in ${q.group} but missing from the answers`);
      if (!day.entities[id]) at(`${id} is in ${q.group} but has no name`);
    }

    // The line should be well placed.
    const onSide = q.answers.filter((a) => isOnSide(q.direction, q.limit, a.value));
    const offSide = q.answers.length - onSide.length;
    const best = bestAnswer(q);
    const bestScore = best ? pointsFor(q.direction, q.limit, best.value) : 0;
    if (q.answers.length < RULES.minAnswers || q.answers.length > RULES.maxAnswers) at(`${q.answers.length} answers (want ${RULES.minAnswers}–${RULES.maxAnswers})`);
    if (onSide.length < RULES.minOnSide) at(`only ${onSide.length} answers score (want ≥ ${RULES.minOnSide})`);
    if (offSide < RULES.minOffSide) at(`only ${offSide} answers bust (want ≥ ${RULES.minOffSide})`);
    if (bestScore < RULES.minBestScore) at(`best answer only scores ${bestScore} (want ≥ ${RULES.minBestScore})`);

    // Every name and alias must lead back to its own entry. This is the matcher's exact stage (spacing and
    // punctuation ignored), done through an index because a day can hold thousands of names.
    const all = [...q.answers, ...q.excluded];
    const owners = new Map();
    for (const entry of all) {
      for (const n of new Set([entry.name, ...(entry.aliases ?? [])])) {
        const key = normalize(n).replace(/ /g, '');
        owners.set(key, [...(owners.get(key) ?? []), entry]);
      }
    }
    for (const [key, entries] of owners) {
      if (new Set(entries).size > 1) at(`"${key}" is claimed by ${entries.map((e) => e.name).join(' and ')}`);
    }

    summary.push(`Q${qi + 1} ${q.direction} ${q.limit}: ${onSide.length} score, ${offSide} bust, best ${best?.name ?? '-'} (${bestScore})`);
  }
  return { errors, summary };
}

async function filesIn(target) {
  const s = await stat(target).catch(() => null);
  if (!s) return [];
  if (s.isFile()) return [target];
  return (await readdir(target)).filter((f) => /^day-\d{4}\.json$/.test(f)).sort().map((f) => path.join(target, f));
}

async function main() {
  const targets = process.argv.slice(2);
  const dirs = targets.length ? targets : [DRAFTS, PUBLISHED];
  const ctx = { groups: await loadGroups() };
  let failed = 0;
  let checked = 0;
  for (const dir of dirs) {
    const files = await filesIn(dir);
    let prevDay = null;
    for (const file of files) {
      const raw = await readJson(file);
      const { errors, summary } = await validateDay(raw, ctx);
      if (prevDay !== null && raw.day !== prevDay + 1) errors.push(`day ${raw.day} follows day ${prevDay}: days must run in sequence`);
      prevDay = raw.day;
      checked++;
      const name = path.relative(process.cwd(), file);
      if (errors.length) {
        failed++;
        console.log(`✗ ${name}`);
        for (const e of errors) console.log(`    ${e}`);
      } else {
        console.log(`✓ ${name}  ${raw.theme}`);
        for (const s of summary) console.log(`    ${s}`);
      }
    }
  }
  console.log(`\n${checked - failed}/${checked} day files passed`);
  if (failed) process.exit(1);
}

if (process.argv[1]?.endsWith('validate-content.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
