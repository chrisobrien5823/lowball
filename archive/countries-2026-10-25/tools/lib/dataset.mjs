// Shared loading for the content tools: dataset snapshots, names and groups.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATASETS = path.join(ROOT, 'content-pipeline', '01_datasets');
export const DRAFTS = path.join(ROOT, 'content-pipeline', '02_drafts');
export const REPORTS = path.join(ROOT, 'content-pipeline', '03_reports');
export const PUBLISHED = path.join(ROOT, 'content', 'days');

export const FIELD_FORMAT = {
  population: { unit: 'people', format: 'int' },
  area_km2: { unit: 'km²', format: 'int' },
  gdp_usd: { unit: 'US$', format: 'usd-big' },
  gdp_per_capita_usd: { unit: 'US$', format: 'usd' },
  life_expectancy: { unit: 'years', format: 'dec1' },
};

export const dayFile = (day) => `day-${String(day).padStart(4, '0')}.json`;

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/** Load a dataset snapshot and check it still matches its recorded fingerprint. */
export async function loadDataset(id) {
  const meta = await readJson(path.join(DATASETS, `${id}.meta.json`));
  const csv = await readFile(path.join(DATASETS, `${id}.csv`), 'utf8');
  const sha256 = createHash('sha256').update(csv).digest('hex');
  if (sha256 !== meta.sha256) {
    throw new Error(`${id}.csv does not match the fingerprint in ${id}.meta.json (was the snapshot edited by hand?)`);
  }
  const rows = new Map();
  for (const r of parseCsv(csv)) {
    const row = { ...r };
    for (const field of Object.keys(meta.fields)) row[field] = r[field] === '' ? null : Number(r[field]);
    rows.set(r[meta.key], row);
  }
  return { meta, rows };
}

export async function loadCountries() {
  return readJson(path.join(DATASETS, 'countries.json'));
}

export async function loadGroups() {
  return readJson(path.join(DATASETS, 'groups.json'));
}

export function displayName(countries, row) {
  return countries.names[row.iso3]?.name ?? row.wb_name;
}

export function aliasesFor(countries, row) {
  const own = countries.names[row.iso3]?.aliases ?? [];
  const name = displayName(countries, row);
  // The World Bank's own name is always accepted too.
  return [...new Set([...own, row.wb_name])].filter((a) => a !== name);
}

/** Set of iso3 codes in a group, always limited to UN member states. */
export function groupMembers(groups, countries, rows, groupId) {
  const g = groups[groupId];
  if (!g) throw new Error(`Unknown group "${groupId}"`);
  const sovereign = [...rows.keys()].filter((k) => !countries.notSovereign[k]);
  let members;
  if (groupId === 'sovereign') members = sovereign;
  else if (g.members) members = g.members;
  else throw new Error(`Group "${groupId}" needs an explicit member list`);
  for (const m of members) {
    if (!rows.has(m)) throw new Error(`Group "${groupId}" lists ${m}, which is not in the dataset`);
  }
  return new Set(members.filter((m) => !countries.notSovereign[m]));
}

export function sourceLabel(meta, field) {
  const f = meta.fields[field];
  return `${meta.publisher}, ${f.label.replace(/ \(.*\)$/, '')} (${f.code}), ${meta.year}`;
}
