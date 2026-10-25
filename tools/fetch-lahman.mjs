// Stage 1: snapshot the Lahman Baseball Database (SABR) into content-pipeline/01_datasets/.
// Every number in a day file is copied from these snapshots, never typed by hand.
//
//   node tools/fetch-lahman.mjs                 download the latest release and write the snapshots
//   node tools/fetch-lahman.mjs <dir>           build the snapshots from CSVs already in <dir>
//
// Three compact snapshots come out of the raw tables:
//   lahman-career   one row per player: career totals, Hall of Fame flag, and whether the whole career
//                   sits in the modern AL/NL (debut 1901 or later, no other league), so the totals are complete
//   lahman-seasons  one row per player-season since 2000: that season's totals
//   lahman-teams    one row per team-season since 1969: record, runs, home runs, attendance
// Only the AL and NL are counted; the Negro Leagues rows (licensed to SABR from Seamheads) are left out.

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseCsv } from './lib/dataset.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'content-pipeline', '01_datasets');
const SHARE = 'y1prhc795jk8zvmelfd3jq7tl389y6cd'; // the "comma-delimited version" folder linked from sabr.org/lahman-database
const PAGE = 'https://sabr.org/lahman-database/';
const FILES = ['People', 'Batting', 'Pitching', 'Teams', 'HallOfFame'];

const MODERN = 1901; // career pools only take players who debuted in or after this year
const SEASONS_FROM = 2000;
const TEAMS_FROM = 1969;
const LEAGUES = new Set(['AL', 'NL']);

const BAT = { g: 'G', ab: 'AB', r: 'R', h: 'H', hr: 'HR', rbi: 'RBI', sb: 'SB', bb: 'BB', so: 'SO' };
const PIT = { p_g: 'G', p_w: 'W', p_l: 'L', p_sv: 'SV', p_so: 'SO', p_ipouts: 'IPouts' };

const num = (v) => (v === '' || v === undefined ? 0 : Number(v));

async function download() {
  const res = await fetch(`https://sabr.app.box.com/s/${SHARE}`, { headers: { 'User-Agent': 'lowball-content-pipeline/0.1' } });
  if (!res.ok) throw new Error(`${res.status} on the Lahman download folder`);
  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const html = await res.text();
  const out = {};
  for (const name of FILES) {
    const at = html.indexOf(`"name":"${name}.csv"`);
    const id = at < 0 ? null : html.slice(Math.max(0, at - 500), at + 200).match(/"typedID":"(f_\d+)"/)?.[1];
    if (!id) throw new Error(`${name}.csv is not in the Lahman download folder`);
    const url = `https://sabr.app.box.com/index.php?rm=box_download_shared_file&shared_name=${SHARE}&file_id=${id}`;
    const file = await fetch(url, { headers: { Cookie: cookie, 'User-Agent': 'lowball-content-pipeline/0.1' } });
    if (!file.ok) throw new Error(`${file.status} downloading ${name}.csv`);
    out[name] = await file.text();
  }
  return out;
}

async function fromDir(dir) {
  const out = {};
  for (const name of FILES) out[name] = await readFile(path.join(dir, `${name}.csv`), 'utf8');
  return out;
}

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, rows) => [header.join(','), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';

const add = (into, row, map) => {
  for (const [out, col] of Object.entries(map)) into[out] = (into[out] ?? 0) + num(row[col]);
};

/** Modern-era display name. The two Griffeys, and other pairs, are told apart by hand in NAME_FIXES. */
const NAME_FIXES = {
  griffke01: 'Ken Griffey Sr.',
  griffke02: 'Ken Griffey Jr.',
};

export function build(raw, { retrieved = new Date().toISOString(), urls = {} } = {}) {
  const people = new Map(parseCsv(raw.People.replace(/^﻿/, '')).map((r) => [r.playerID, r]));
  const batting = parseCsv(raw.Batting.replace(/^﻿/, ''));
  const pitching = parseCsv(raw.Pitching.replace(/^﻿/, ''));
  const teams = parseCsv(raw.Teams.replace(/^﻿/, ''));
  const hall = new Set(
    parseCsv(raw.HallOfFame.replace(/^﻿/, ''))
      .filter((r) => r.inducted === 'Y' && r.category === 'Player')
      .map((r) => r.playerID),
  );

  const career = new Map();
  const seasons = new Map();
  const outside = new Set(); // players with any season outside the AL and NL
  const note = (r, map, kind) => {
    if (!LEAGUES.has(r.lgID)) {
      outside.add(r.playerID);
      return;
    }
    const c = career.get(r.playerID) ?? { playerID: r.playerID, first: 9999, last: 0 };
    career.set(r.playerID, c);
    add(c, r, map);
    c.first = Math.min(c.first, Number(r.yearID));
    c.last = Math.max(c.last, Number(r.yearID));
    if (Number(r.yearID) >= SEASONS_FROM) {
      const key = `${r.playerID}:${r.yearID}`;
      const s = seasons.get(key) ?? { pk: key, playerID: r.playerID, yearID: Number(r.yearID) };
      seasons.set(key, s);
      add(s, r, map);
    }
  };
  for (const r of batting) note(r, BAT);
  for (const r of pitching) note(r, PIT);

  const careerRows = [];
  for (const c of career.values()) {
    const p = people.get(c.playerID);
    if (!p) continue;
    const debut = Number(p.debut?.slice(0, 4)) || c.first;
    careerRows.push({
      playerID: c.playerID,
      name: NAME_FIXES[c.playerID] ?? `${p.nameFirst} ${p.nameLast}`.trim(),
      last: p.nameLast,
      born: Number(p.birthYear) || 0,
      debut_year: debut,
      final_year: c.last,
      modern: debut >= MODERN && !outside.has(c.playerID) ? 1 : 0,
      hof: hall.has(c.playerID) ? 1 : 0,
      ...Object.fromEntries([...Object.keys(BAT), ...Object.keys(PIT)].map((k) => [k, c[k] ?? 0])),
      p_ip: Math.round(((c.p_ipouts ?? 0) / 3) * 10) / 10,
    });
  }
  careerRows.sort((a, b) => a.playerID.localeCompare(b.playerID));

  const seasonRows = [...seasons.values()]
    .map((s) => ({
      ...s,
      name: (() => {
        const p = people.get(s.playerID);
        return NAME_FIXES[s.playerID] ?? `${p.nameFirst} ${p.nameLast}`.trim();
      })(),
      last: people.get(s.playerID).nameLast,
      ...Object.fromEntries([...Object.keys(BAT), ...Object.keys(PIT)].map((k) => [k, s[k] ?? 0])),
      p_ip: Math.round(((s.p_ipouts ?? 0) / 3) * 10) / 10,
    }))
    .sort((a, b) => a.pk.localeCompare(b.pk));

  const teamRows = teams
    .filter((t) => LEAGUES.has(t.lgID) && Number(t.yearID) >= TEAMS_FROM)
    .map((t) => ({
      pk: `${t.teamID}:${t.yearID}`,
      teamID: t.teamID,
      yearID: Number(t.yearID),
      name: t.name,
      abbr: t.teamIDBR,
      w: num(t.W),
      l: num(t.L),
      r: num(t.R),
      ra: num(t.RA),
      hr: num(t.HR),
      sb: num(t.SB),
      so: num(t.SO),
      sv: num(t.SV),
      attendance: t.attendance === '' ? null : num(t.attendance),
    }))
    .sort((a, b) => a.pk.localeCompare(b.pk));

  const meta = (id, title, fields, rows, key, entity, header, extra = {}) => ({
    id,
    title,
    publisher: 'SABR Lahman Baseball Database',
    license: 'CC BY-SA 3.0 per earlier Lahman releases; the 2025 download page states none. Check sabr.org/lahman-database before launch.',
    year: 2025,
    yearLabel: '2025 edition',
    retrieved,
    sha256: null,
    key,
    entity,
    fields,
    urls,
    ...extra,
  });

  const f = (code, label, unit, format = 'int') => ({ code, label, unit, format, decimals: 0 });
  const BATTING_FIELDS = (prefix) => ({
    g: f('Batting.G', `${prefix} games played`, 'games'),
    ab: f('Batting.AB', `${prefix} at-bats`, 'at-bats'),
    r: f('Batting.R', `${prefix} runs scored`, 'runs'),
    h: f('Batting.H', `${prefix} hits`, 'hits'),
    hr: f('Batting.HR', `${prefix} home runs`, 'home runs'),
    rbi: f('Batting.RBI', `${prefix} runs batted in`, 'RBI'),
    sb: f('Batting.SB', `${prefix} stolen bases`, 'stolen bases'),
    bb: f('Batting.BB', `${prefix} walks`, 'walks'),
    so: f('Batting.SO', `${prefix} strikeouts as a batter`, 'strikeouts'),
    p_g: f('Pitching.G', `${prefix} games pitched`, 'games'),
    p_w: f('Pitching.W', `${prefix} pitching wins`, 'wins'),
    p_l: f('Pitching.L', `${prefix} pitching losses`, 'losses'),
    p_sv: f('Pitching.SV', `${prefix} saves`, 'saves'),
    p_so: f('Pitching.SO', `${prefix} strikeouts as a pitcher`, 'strikeouts'),
    p_ip: { code: 'Pitching.IPouts', label: `${prefix} innings pitched`, unit: 'innings', format: 'int', decimals: 1 },
  });

  const careerFields = { born: f('People.birthYear', 'Birth year', 'year'), debut_year: f('People.debut', 'Debut year', 'year'), final_year: f('Batting.yearID', 'Final season', 'year'), modern: f('derived', 'Whole career in the AL and NL since 1901', 'flag'), hof: f('HallOfFame.inducted', 'Inducted into the Hall of Fame as a player', 'flag'), ...BATTING_FIELDS('Career') };
  const seasonFields = { yearID: f('Batting.yearID', 'Season', 'year'), ...BATTING_FIELDS('Season') };
  const teamFields = {
    yearID: f('Teams.yearID', 'Season', 'year'),
    w: f('Teams.W', 'Wins', 'wins'),
    l: f('Teams.L', 'Losses', 'losses'),
    r: f('Teams.R', 'Runs scored', 'runs'),
    ra: f('Teams.RA', 'Runs allowed', 'runs'),
    hr: f('Teams.HR', 'Home runs hit', 'home runs'),
    sb: f('Teams.SB', 'Stolen bases', 'stolen bases'),
    so: f('Teams.SO', 'Strikeouts by batters', 'strikeouts'),
    sv: f('Teams.SV', 'Saves', 'saves'),
    attendance: f('Teams.attendance', 'Home attendance', 'fans'),
  };

  const careerHeader = ['playerID', 'name', 'last', ...Object.keys(careerFields)];
  const seasonHeader = ['pk', 'playerID', 'name', 'last', ...Object.keys(seasonFields)];
  const teamHeader = ['pk', 'teamID', 'name', 'abbr', ...Object.keys(teamFields)];

  return [
    { id: 'lahman-career', title: 'Lahman Baseball Database: career totals', rows: careerRows, header: careerHeader, fields: careerFields, key: 'playerID', entity: 'playerID' },
    { id: 'lahman-seasons', title: 'Lahman Baseball Database: player seasons since 2000', rows: seasonRows, header: seasonHeader, fields: seasonFields, key: 'pk', entity: 'playerID' },
    { id: 'lahman-teams', title: 'Lahman Baseball Database: team seasons since 1969', rows: teamRows, header: teamHeader, fields: teamFields, key: 'pk', entity: 'teamID' },
  ].map((d) => ({ ...d, csv: toCsv(d.header, d.rows), meta: meta(d.id, d.title, d.fields, d.rows, d.key, d.entity, d.header, {}) }));
}

async function main() {
  const dir = process.argv[2];
  const raw = dir ? await fromDir(dir) : await download();
  const urls = dir ? {} : { page: PAGE, folder: `https://sabr.box.com/s/${SHARE}` };
  await mkdir(OUT_DIR, { recursive: true });
  for (const d of build(raw, { urls })) {
    d.meta.sha256 = createHash('sha256').update(d.csv).digest('hex');
    await writeFile(path.join(OUT_DIR, `${d.id}.csv`), d.csv);
    await writeFile(path.join(OUT_DIR, `${d.id}.meta.json`), JSON.stringify(d.meta, null, 2) + '\n');
    console.log(`Wrote ${d.id}.csv (${d.rows.length} rows)`);
  }
}

if (process.argv[1]?.endsWith('fetch-lahman.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
