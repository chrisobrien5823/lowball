import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hydrateDay } from '../src/content.js';
import { matchAnswer } from '../src/match.js';
import { bestAnswer, pointsFor } from '../src/score.js';
import { validateDay } from '../tools/validate-content.mjs';
import { loadGroups, resolveGroup, resolveNames, splitTeamName } from '../tools/lib/dataset.mjs';

const read = async (n) => JSON.parse(await readFile(new URL(`../content-pipeline/02_drafts/day-000${n}.json`, import.meta.url), 'utf8'));
const raw = await read(1);
const ctx = { groups: await loadGroups() };
const clone = () => JSON.parse(JSON.stringify(raw));
const day = async (n) => hydrateDay(await read(n));
const lookup = (q, input) => matchAnswer(input, [...q.answers, ...q.excluded])?.answer ?? null;

test('day 1 passes validation as built', async () => {
  assert.deepEqual((await validateDay(raw, ctx)).errors, []);
});

test('hand-editing a value fails validation', async () => {
  const d = clone();
  d.questions[0].answers[0].value += 1;
  const { errors } = await validateDay(d, ctx);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not match dataset value/);
});

test('dropping a group member fails validation', async () => {
  const d = clone();
  d.questions[1].answers.pop();
  assert.match((await validateDay(d, ctx)).errors.join('\n'), /missing from the answers/);
});

test('an alias that collides with another name fails validation', async () => {
  const d = clone();
  d.entities.aaronha01.aliases.push('Babe Ruth');
  assert.match((await validateDay(d, ctx)).errors.join('\n'), /claimed by/);
});

test('every group in every day is a season group with a rule and a label', async () => {
  const seen = new Set();
  const years = new Set();
  for (let n = 1; n <= 7; n++) {
    for (const q of (await day(n)).questions) {
      seen.add(q.group);
      years.add(q.group.match(/\d{4}$/)[0]);
    }
  }
  for (const id of seen) {
    const g = resolveGroup(ctx.groups, id);
    assert.ok(g.rule && g.label, `${id} needs a rule and a label`);
    assert.match(id, /^(hitters|pitchers|teams)-\d{4}$/);
  }
  assert.ok(years.size >= 15, 'the days draw on many different seasons');
  assert.ok(!years.has('2020'), 'the 60-game 2020 season is left out');
});

test('a day mixes seasons and kinds of player', async () => {
  const d1 = await day(1);
  assert.equal(new Set(d1.questions.map((q) => q.group)).size, 5);
  assert.ok(d1.questions.some((q) => q.group.startsWith('hitters')) && d1.questions.some((q) => q.group.startsWith('pitchers')));
  for (const q of d1.questions) assert.match(q.prompt, /, in \d{4}$/);
});

test('numbers come straight from the data: known season lines are exact', async () => {
  const q = (await day(1)).questions[0];
  assert.equal(q.group, 'hitters-2004');
  assert.equal(lookup(q, 'Barry Bonds').value, 45);
  assert.equal(lookup(q, 'Eric Byrnes').value, 20, 'on the line, Eric Byrnes sits exactly on it');
  assert.equal(pointsFor(q.direction, q.limit, 20), 100);
  assert.equal(bestAnswer(q).value, 20);
});

test('every recognized non-answer lets the player retry, so none scores 0', async () => {
  for (let n = 1; n <= 7; n++) {
    for (const q of (await day(n)).questions) {
      const loose = q.excluded.filter((e) => !e.retry || !e.reason);
      assert.deepEqual(loose.map((e) => e.name), [], `day ${n} ${q.id}`);
    }
  }
});

test('every question names the one source its numbers come from', async () => {
  for (let n = 1; n <= 7; n++) {
    for (const q of (await day(n)).questions) assert.match(q.source ?? '', /Lahman.*\(.*\.\w+\)/, `day ${n} ${q.id}`);
  }
});

test('a real player outside the group is told why and can try again', async () => {
  const q = (await day(1)).questions[0];
  const trout = lookup(q, 'Mike Trout');
  assert.equal(trout.reason, "Mike Trout isn't a 2004 hitter with 200 or more at-bats.");
  assert.equal(trout.retry, true);
  const pitcherQ = (await day(1)).questions[1];
  assert.match(lookup(pitcherQ, 'Barry Bonds').reason, /isn't a 2013 pitcher with 50 or more innings/);
});

test('surnames work when they are unique, and ask for more when they are not', async () => {
  const q = (await day(1)).questions[0];
  assert.equal(lookup(q, 'Aaron').name, 'Hank Aaron');
  assert.equal(lookup(q, 'Mantle').name, 'Mickey Mantle');
  assert.equal(lookup(q, 'Mickey Mantel').name, 'Mickey Mantle', 'one typo is forgiven');
  assert.equal(lookup(q, 'Byrnes').value, 20, 'a surname reaches the player in this season');
  assert.equal(lookup(q, 'Ken Griffey Jr.').name, 'Ken Griffey Jr.');
  const both = lookup(q, 'Griffey');
  assert.match(both.reason, /More than one fits "Griffey"/);
  assert.equal(both.retry, true);
});

test('two players with one name are told apart by debut, then by birth year', async () => {
  const d = await read(1);
  const tagged = Object.values(d.entities).map((e) => e.name.match(/^(.+) \((\d{4}|b\. \d{4})\)$/)).filter(Boolean);
  assert.ok(tagged.length >= 2, 'the day has players who share a name');
  const q = hydrateDay(d).questions[0];
  const [, plain] = tagged[0];
  assert.match(lookup(q, plain).reason, new RegExp(`More than one fits "${plain}"`));
  assert.equal(new Set(Object.values(d.entities).map((e) => e.name)).size, Object.keys(d.entities).length, 'every display name is unique');
});

test('teams answer to nicknames, unique cities and abbreviations', async () => {
  const q = (await day(3)).questions[0];
  assert.equal(lookup(q, 'Yankees').name, 'New York Yankees');
  assert.equal(lookup(q, 'NYY').name, 'New York Yankees');
  assert.equal(lookup(q, 'Red Sox').name, 'Boston Red Sox');
  assert.equal(lookup(q, 'Boston').name, 'Boston Red Sox');
  assert.equal(lookup(q, 'St. Louis').name, 'St. Louis Cardinals');
  assert.equal(lookup(q, 'Angels').name, 'Los Angeles Angels');
  assert.equal(lookup(q, 'Dodgers').value, 94);
  assert.equal(lookup(q, 'Tigers').value, 90, 'the Tigers sit exactly on the 2014 line');
});

test('a city with two teams asks which one', async () => {
  const q = (await day(3)).questions[0];
  for (const city of ['New York', 'Chicago', 'Los Angeles']) {
    const hit = lookup(q, city);
    assert.match(hit.reason, new RegExp(`More than one fits "${city}"`), city);
    assert.equal(hit.retry, true);
  }
});

test('resolveNames: shared aliases become retries, whole names beat aliases, equal names get a tag', () => {
  const { names, extras } = resolveNames([
    { id: 'a', name: 'Al Young', aliases: ['Young'], tag: '1990', tag2: 'b. 1965' },
    { id: 'b', name: 'Bo Young', aliases: ['Young'], tag: '2001', tag2: 'b. 1975' },
    { id: 'c', name: 'Cy Old', aliases: ['Old'], tag: '1950', tag2: 'b. 1925' },
    { id: 'd', name: 'Old', aliases: [], tag: '1900', tag2: 'b. 1870' },
    { id: 'e', name: 'Sam Lee', aliases: ['Lee'], tag: '1999', tag2: 'b. 1970' },
    { id: 'f', name: 'Sam Lee', aliases: ['Lee'], tag: '1999', tag2: 'b. 1974' },
  ]);
  assert.deepEqual(names.a.aliases, []);
  assert.deepEqual(names.c.aliases, [], 'a whole name ("Old") is not given away as an alias');
  assert.equal(names.e.name, 'Sam Lee (b. 1970)');
  assert.equal(names.f.name, 'Sam Lee (b. 1974)');
  assert.ok(extras.every((x) => x.retry && /More than one fits/.test(x.reason)));
  assert.ok(extras.some((x) => x.name === 'Young'));
  assert.ok(extras.some((x) => x.name === 'Sam Lee'));
});

test('team names split into city and nickname', () => {
  assert.deepEqual(splitTeamName('New York Yankees'), { city: 'New York', nickname: 'Yankees' });
  assert.deepEqual(splitTeamName('Boston Red Sox'), { city: 'Boston', nickname: 'Red Sox' });
  assert.deepEqual(splitTeamName('St. Louis Cardinals'), { city: 'St. Louis', nickname: 'Cardinals' });
  assert.deepEqual(splitTeamName('Tampa Bay Rays'), { city: 'Tampa Bay', nickname: 'Rays' });
});
