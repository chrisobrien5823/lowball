// Stage 1: turn a day spec (02_drafts/day-NNNN.spec.json) into a playable day
// file (02_drafts/day-NNNN.json). Every value is copied from the dataset row.
//
//   node tools/build-day.mjs          build every spec
//   node tools/build-day.mjs 3 4      build days 3 and 4

import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DRAFTS,
  FIELD_FORMAT,
  dayFile,
  readJson,
  loadDataset,
  loadCountries,
  loadGroups,
  displayName,
  aliasesFor,
  groupMembers,
  sourceLabel,
} from './lib/dataset.mjs';
import { dateForDay } from '../src/date.js';

const DATASET_ID = 'worldbank-2023';

/** Builds the compact day file; src/content.js hydrateDay() expands it. */
export async function buildDay(spec, { dataset, countries, groups }) {
  const { meta, rows } = dataset;

  // Every UN member state, named once for the whole day.
  const names = {};
  for (const row of rows.values()) {
    if (countries.notSovereign[row.iso3]) continue;
    names[row.iso3] = { name: displayName(countries, row), aliases: aliasesFor(countries, row) };
  }
  // Recognized names that are never countries here. The player is told why and can try again.
  const extras = [];
  for (const [iso3, ns] of Object.entries(countries.notSovereign)) {
    const wbName = rows.get(iso3)?.wb_name;
    extras.push({
      name: ns.name,
      aliases: [...new Set([...(ns.aliases ?? []), ...(wbName ? [wbName] : [])])].filter((a) => a !== ns.name),
      reason: `${ns.name} is ${ns.reason}, so it doesn't count as a country here.`,
      retry: true,
    });
  }
  for (const place of [...countries.notInDataset, ...(countries.otherPlaces ?? [])]) {
    extras.push({ name: place.name, aliases: place.aliases ?? [], reason: place.reason, retry: true });
  }

  const questions = spec.questions.map((q, i) => {
    if (!meta.fields[q.field]) throw new Error(`Day ${spec.day} Q${i + 1}: unknown field "${q.field}"`);
    const members = groupMembers(groups, countries, rows, q.group);
    const answers = [];
    const noData = [];
    for (const iso3 of [...members].sort()) {
      const value = rows.get(iso3)[q.field];
      if (value === null) noData.push(iso3);
      else answers.push({ id: iso3, value });
    }
    return {
      id: `d${spec.day}q${i + 1}`,
      prompt: q.prompt,
      direction: q.direction,
      limit: q.limit,
      ...FIELD_FORMAT[q.field],
      source: sourceLabel(meta, q.field),
      dataset: meta.id,
      field: q.field,
      group: q.group,
      groupLabel: groups[q.group].label,
      ...(groups[q.group].reasons ? { reasons: groups[q.group].reasons } : {}),
      answers,
      noData,
    };
  });

  return { day: spec.day, date: dateForDay(spec.day), theme: spec.theme, emoji: spec.emoji, countries: names, extras, questions };
}

async function main() {
  const wanted = process.argv.slice(2).map(Number);
  const ctx = { dataset: await loadDataset(DATASET_ID), countries: await loadCountries(), groups: await loadGroups() };
  const specs = (await readdir(DRAFTS)).filter((f) => f.endsWith('.spec.json')).sort();
  for (const file of specs) {
    const spec = await readJson(path.join(DRAFTS, file));
    if (wanted.length && !wanted.includes(spec.day)) continue;
    const day = await buildDay(spec, ctx);
    await writeFile(path.join(DRAFTS, dayFile(spec.day)), JSON.stringify(day) + '\n');
    console.log(`Built ${dayFile(spec.day)}: ${day.theme}, ${day.questions.map((q) => q.answers.length).join('/')} answers`);
  }
}

if (process.argv[1]?.endsWith('build-day.mjs')) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
