// Stage 1: turn a day spec (02_drafts/day-NNNN.spec.json) into a playable day
// file (02_drafts/day-NNNN.json). Every value is copied from the dataset row.
//
//   node tools/build-day.mjs          build every spec
//   node tools/build-day.mjs 3 4      build days 3 and 4

import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DRAFTS,
  dayFile,
  readJson,
  loadDataset,
  loadGroups,
  resolveGroup,
  poolRows,
  entityId,
  fieldFormat,
  sourceLabel,
  baseNames,
  resolveNames,
} from './lib/dataset.mjs';
import { dateForDay } from '../src/date.js';

/** Players a fan would expect to be recognized even when they are not in a question's group. */
const notable = (c) => c.g >= 1000 || c.p_g >= 400 || c.hof === 1;
const NOTABLE_SEASON = (s) => s.ab >= 400 || s.p_ip >= 120;

/**
 * Builds the compact day file; src/content.js hydrateDay() expands it.
 * @param datasets  Map of dataset id -> { meta, rows }
 */
export function buildDay(spec, { datasets, groups }) {
  const careers = datasets.get('lahman-career');
  const questions = [];
  const wanted = new Map(); // entity id -> { row, dataset }

  spec.questions.forEach((q, i) => {
    const group = resolveGroup(groups, q.group);
    const ds = datasets.get(group.dataset);
    if (!ds) throw new Error(`Day ${spec.day} Q${i + 1}: dataset "${group.dataset}" is not loaded`);
    if (!ds.meta.fields[q.field]) throw new Error(`Day ${spec.day} Q${i + 1}: unknown field "${q.field}" in ${ds.meta.id}`);
    const answers = [];
    const noData = [];
    for (const row of poolRows(group, ds)) {
      const id = entityId(ds.meta, row);
      wanted.set(id, { row, ds });
      if (row[q.field] === null) noData.push(id);
      else answers.push({ id, value: row[q.field] });
    }
    questions.push({
      id: `d${spec.day}q${i + 1}`,
      prompt: q.prompt,
      direction: q.direction,
      limit: q.limit,
      ...fieldFormat(ds.meta, q.field),
      source: sourceLabel(ds.meta, q.field),
      dataset: ds.meta.id,
      field: q.field,
      group: q.group,
      groupLabel: group.label,
      noun: group.noun,
      answers,
      noData,
    });
  });

  // Everyone the player might type: the groups themselves plus the players or teams a fan would expect.
  const nouns = new Set(questions.map((q) => q.noun));
  const people = [];
  const seen = new Set();
  const addPlayer = (id) => {
    if (seen.has(id)) return;
    const c = careers.rows.get(id);
    if (!c) throw new Error(`${id} is not in lahman-career`);
    seen.add(id);
    people.push({ id, name: c.name, tag: String(c.debut_year), tag2: `b. ${c.born}`, ...baseNames(careers.meta, c) });
  };
  const teams = [];
  if (nouns.has('player')) {
    for (const c of careers.rows.values()) if (notable(c)) addPlayer(c.playerID);
    for (const s of datasets.get('lahman-seasons').rows.values()) if (NOTABLE_SEASON(s)) addPlayer(s.playerID);
    for (const [id, { ds }] of wanted) if (ds.meta.entity === 'playerID') addPlayer(id);
  }
  if (nouns.has('team')) {
    // Seasons can differ between questions, but a franchise must keep one name across the day's seasons.
    for (const [id, { row, ds }] of wanted) {
      if (ds.meta.entity !== 'teamID') continue;
      const { name, aliases } = baseNames(ds.meta, row);
      const known = teams.find((t) => t.id === id);
      if (known && known.name !== name) throw new Error(`Day ${spec.day}: ${id} is "${known.name}" in one season and "${name}" in another; pick seasons where it kept one name`);
      if (!known) teams.push({ id, name, tag: String(row.yearID), aliases });
    }
  }
  const { names, extras } = resolveNames([...people, ...teams]);

  return { day: spec.day, date: dateForDay(spec.day), theme: spec.theme, entities: names, extras, questions };
}

async function main() {
  const wanted = process.argv.slice(2).map(Number);
  const datasets = new Map();
  for (const id of ['lahman-career', 'lahman-seasons', 'lahman-teams']) datasets.set(id, await loadDataset(id));
  const ctx = { datasets, groups: await loadGroups() };
  const specs = (await readdir(DRAFTS)).filter((f) => f.endsWith('.spec.json')).sort();
  for (const file of specs) {
    const spec = await readJson(path.join(DRAFTS, file));
    if (wanted.length && !wanted.includes(spec.day)) continue;
    const day = buildDay(spec, ctx);
    await writeFile(path.join(DRAFTS, dayFile(spec.day)), JSON.stringify(day) + '\n');
    console.log(`Built ${dayFile(spec.day)}: ${day.theme}, ${day.questions.map((q) => q.answers.length).join('/')} answers, ${Object.keys(day.entities).length} names`);
  }
}

if (process.argv[1]?.endsWith('build-day.mjs')) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
