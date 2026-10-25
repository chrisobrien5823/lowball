// Shared loading for the content tools: dataset snapshots, pools and names.
//
// A dataset is a CSV snapshot plus a meta file (fingerprint, source, one entry per numeric field).
// A pool (a "group" in a question) is the set of rows that may answer a question, defined by
// plain rules over a dataset's columns. A name is an entity's display name and the aliases a
// player may type for it.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalize } from '../../src/match.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATASETS = path.join(ROOT, 'content-pipeline', '01_datasets');
export const DRAFTS = path.join(ROOT, 'content-pipeline', '02_drafts');
export const REPORTS = path.join(ROOT, 'content-pipeline', '03_reports');
export const PUBLISHED = path.join(ROOT, 'content', 'days');

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
    for (const field of Object.keys(meta.fields)) row[field] = r[field] === '' || r[field] === undefined ? null : Number(r[field]);
    rows.set(r[meta.key], row);
  }
  return { meta, rows };
}

export async function loadGroups() {
  return readJson(path.join(DATASETS, 'groups.json'));
}

/** The unit and number format a field is shown in, from its dataset's meta. */
export function fieldFormat(meta, field) {
  const f = meta.fields[field];
  if (!f) throw new Error(`Unknown field "${field}" in ${meta.id}`);
  return { unit: f.unit, format: f.format };
}

export function sourceLabel(meta, field) {
  const f = meta.fields[field];
  return `${meta.publisher}, ${f.label.replace(/ \(.*\)$/, '')} (${f.code}), ${meta.yearLabel ?? meta.year}`;
}

// ---------------------------------------------------------------- pools

const OPS = {
  '=': (a, b) => a === b,
  '>=': (a, b) => a !== null && a >= b,
  '<=': (a, b) => a !== null && a <= b,
  '<': (a, b) => a !== null && a < b,
  '>': (a, b) => a !== null && a > b,
};

const fill = (value, vars) => (typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : value);

/**
 * Look a group id up in groups.json: a fixed group, or a template such as "hitters-2019"
 * (id "hitters-{year}"). @returns { id, dataset, noun, label, rule, where } with the variables filled in.
 */
export function resolveGroup(groups, id) {
  const fixed = groups.groups?.[id];
  if (fixed) return { id, ...fixed };
  for (const t of groups.templates ?? []) {
    const names = [];
    const pattern = new RegExp(`^${t.id.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, (_, k) => (names.push(k), '(\\d+)'))}$`);
    const m = pattern.exec(id);
    if (!m) continue;
    const vars = Object.fromEntries(names.map((k, i) => [k, Number(m[i + 1])]));
    return {
      id,
      dataset: t.dataset,
      noun: t.noun,
      label: fill(t.label, vars),
      rule: fill(t.rule, vars),
      where: t.where.map((w) => ({ ...w, value: fill(w.value, vars) })),
    };
  }
  throw new Error(`Unknown group "${id}"`);
}

/** The dataset rows that belong to a group, in dataset order. */
export function poolRows(group, dataset) {
  const out = [];
  for (const row of dataset.rows.values()) {
    if (group.where.every((w) => OPS[w.op](row[w.field], Number(w.value)))) out.push(row);
  }
  return out;
}

/** The id the game uses for a row's entity: a player or a team (the same team recurs each season). */
export const entityId = (meta, row) => row[meta.entity];

// ---------------------------------------------------------------- names

const CITIES = ['New York', 'Los Angeles', 'San Francisco', 'San Diego', 'St. Louis', 'Kansas City', 'Tampa Bay'];

/** "Boston Red Sox" -> { city: "Boston", nickname: "Red Sox" }. */
export function splitTeamName(name) {
  const city = CITIES.find((c) => name.startsWith(`${c} `)) ?? name.split(' ')[0];
  return { city, nickname: name.slice(city.length).trim() };
}

/** Lahman's own club names that a fan would not type (the Angels "of Anaheim"). */
const cleanTeamName = (name) => name.replace(/ of Anaheim$/, '');

/** Display name and the aliases that are unambiguous on their own, before the whole day is checked. */
export function baseNames(meta, row) {
  if (meta.entity === 'teamID') {
    const name = cleanTeamName(row.name);
    const { city, nickname } = splitTeamName(name);
    return { name, aliases: [nickname, city, row.abbr].filter((a) => a && a !== name) };
  }
  const parts = row.name.split(' ');
  const surname = parts.slice(1).join(' ').replace(/\s+(Jr\.?|Sr\.?|II|III)$/i, '');
  return { name: row.name, aliases: surname && surname !== row.name ? [surname] : [] };
}

/**
 * Names for every entity in a day, as { id: { name, aliases } }, plus `extras` for names that
 * more than one entity could claim. Two entities with the same display name are told apart by
 * their debut or season ("Chris Young (2004)"); an alias two entities share (a surname, a city)
 * is removed from both and answered with a retry that lists who it could be.
 * @param {{ id: string, name: string, aliases: string[], tag?: string }[]} entities
 */
export function resolveNames(entities) {
  // Matching ignores case, accents, punctuation and spacing, so names are compared the same way here.
  const key = (text) => normalize(text).replace(/ /g, '');
  const byName = new Map();
  for (const e of entities) byName.set(key(e.name), [...(byName.get(key(e.name)) ?? []), e]);
  const named = entities.map((e) => {
    const same = byName.get(key(e.name));
    if (same.length === 1 || !e.tag) return e;
    const tags = same.map((s) => s.tag);
    const tag = tags.filter((t) => t === e.tag).length > 1 && e.tag2 ? e.tag2 : e.tag;
    return { ...e, name: `${e.name} (${tag})`, plain: e.name };
  });

  const owners = new Map();
  for (const e of named) {
    for (const a of new Set([e.plain, ...e.aliases].filter(Boolean))) owners.set(key(a), [...(owners.get(key(a)) ?? []), e]);
  }
  const full = new Set(named.map((e) => key(e.name)));
  const list = (who) => (who.length > 3 ? `${who.slice(0, 3).join(', ')} and ${who.length - 3} more` : who.join(' or '));
  const names = {};
  const extras = [];
  const asked = new Set();
  const ask = (a, who) => {
    if (asked.has(key(a))) return;
    asked.add(key(a));
    const names = list(who.map((s) => s.name));
    extras.push({ name: a, aliases: [], reason: `More than one fits "${a}": ${names}${names.endsWith('.') ? '' : '.'} Type the full name.`, retry: true });
  };
  for (const e of named) {
    const aliases = [];
    for (const a of e.aliases) {
      const shared = owners.get(key(a));
      if (full.has(key(a)) && key(e.name) !== key(a)) continue; // someone's whole name wins over a nickname
      if (shared.length === 1) aliases.push(a);
      else ask(a, shared);
    }
    if (e.plain) ask(e.plain, owners.get(key(e.plain)));
    names[e.id] = { name: e.name, aliases };
  }
  return { names, extras };
}
