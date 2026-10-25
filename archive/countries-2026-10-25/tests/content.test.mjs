import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hydrateDay } from '../src/content.js';
import { matchAnswer } from '../src/match.js';
import { validateDay } from '../tools/validate-content.mjs';
import { loadCountries, loadGroups } from '../tools/lib/dataset.mjs';

const raw = JSON.parse(await readFile(new URL('../content-pipeline/02_drafts/day-0001.json', import.meta.url), 'utf8'));
const ctx = { countries: await loadCountries(), groups: await loadGroups() };
const clone = () => JSON.parse(JSON.stringify(raw));

test('day 1 passes validation as built', async () => {
  assert.deepEqual((await validateDay(raw, ctx)).errors, []);
});

test('hand-editing a value fails validation', async () => {
  const day = clone();
  day.questions[0].answers[0].value += 1;
  const { errors } = await validateDay(day, ctx);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not match dataset value/);
});

test('dropping a group member fails validation', async () => {
  const day = clone();
  day.questions[1].answers.pop();
  assert.match((await validateDay(day, ctx)).errors.join('\n'), /missing from the answers/);
});

test('an alias that collides with another country fails validation', async () => {
  const day = clone();
  day.countries.ISL.aliases.push('Ireland');
  assert.match((await validateDay(day, ctx)).errors.join('\n'), /"Ireland"/);
});

test('hydrated questions explain why non-answers do not count', () => {
  const q = hydrateDay(raw).questions[0];
  const all = [...q.answers, ...q.excluded];
  assert.equal(matchAnswer('Brunei', all).answer.value > 0, true);
  assert.equal(matchAnswer('Greenland', all).answer.reason, "Greenland is part of the Kingdom of Denmark, so it doesn't count as a country here.");
  assert.equal(matchAnswer('Norway', all).answer.reason, "Norway isn't an island country.");
  assert.match(matchAnswer('Vatican', all).answer.reason, /observer state/);
  assert.equal(matchAnswer('Vatican', all).answer.retry, true);
  assert.equal(matchAnswer('Norway', all).answer.retry, true);
});

test('every recognized non-answer lets the player retry, so none scores 0', async () => {
  for (let d = 1; d <= 7; d++) {
    for (const q of (await day(d)).questions) {
      const loose = q.excluded.filter((e) => !e.retry || !e.reason);
      assert.deepEqual(loose.map((e) => e.name), [], `day ${d} ${q.id}`);
    }
  }
});

test('every question names the one source its figures come from', async () => {
  for (let d = 1; d <= 7; d++) {
    for (const q of (await day(d)).questions) {
      assert.match(q.source ?? '', /\S/, `day ${d} ${q.id} has no source`);
    }
  }
});

// Every input the adversarial player flagged, replayed against the real day files.
const day = async (n) => hydrateDay(JSON.parse(await readFile(new URL(`../content-pipeline/02_drafts/day-000${n}.json`, import.meta.url), 'utf8')));
const lookup = (q, input) => matchAnswer(input, [...q.answers, ...q.excluded])?.answer ?? null;

test('adversarial findings: aliases and typos now match the intended country', async () => {
  const cases = [
    [1, 2, 'Palu', 'Palau'], [1, 2, 'Naru', 'Nauru'], [1, 2, 'Republic of Ireland', 'Ireland'], [1, 2, 'Eire', 'Ireland'],
    [2, 0, 'Slovania', 'Slovenia'], [2, 3, 'Czech', 'Czechia'],
    [3, 0, 'Democratic Republic of Congo', 'DR Congo'], [3, 0, 'Republic of Congo', 'Republic of the Congo'],
    [3, 0, 'Nigera', 'Nigeria'], [3, 1, 'Brundi', 'Burundi'], [3, 1, 'Nambia', 'Namibia'], [3, 4, 'Burkina', 'Burkina Faso'],
    [4, 1, 'Salvador', 'El Salvador'], [4, 2, 'Dominican', 'Dominican Republic'],
    [5, 1, 'N Korea', 'North Korea'], [5, 1, 'S Korea', 'South Korea'], [7, 1, 'Austrlia', 'Australia'],
  ];
  for (const [d, qi, input, expected] of cases) {
    const q = (await day(d)).questions[qi];
    assert.equal(lookup(q, input)?.name, expected, `day ${d} Q${qi + 1}: "${input}"`);
  }
});

test('adversarial findings: non-countries explain themselves and allow a retry', async () => {
  const q1 = (await day(1)).questions[2];
  for (const input of ['England', 'Scotland', 'Taiwan', 'Hawaii', 'Montserrat', 'Cook Islands', 'Niue', 'Greenland']) {
    const hit = lookup(q1, input);
    assert.ok(hit?.reason, `"${input}" should be recognized`);
    assert.equal(hit.retry, true, `"${input}" should allow a retry`);
  }
  assert.equal(lookup(q1, 'Australia').reason, 'Australia is a continent, not an island country.');
  assert.equal(lookup(q1, 'Australia').retry, true);
  assert.equal(lookup(q1, 'Norway').retry, true);

  const q3 = (await day(3)).questions[0];
  assert.match(lookup(q3, 'Congo').reason, /two Congos/);
  assert.equal(lookup(q3, 'Congo').retry, true);
  for (const [d, qi, input] of [[3, 3, 'Eritrea'], [3, 3, 'South Sudan'], [7, 4, 'Yemen'], [7, 4, 'Syria'], [1, 3, 'Cuba'], [4, 0, 'North Korea']]) {
    const hit = lookup((await day(d)).questions[qi], input);
    assert.equal(hit?.retry, true, `day ${d} Q${qi + 1}: "${input}" has no data and should allow a retry`);
  }
  assert.equal(lookup((await day(7)).questions[1], 'Antarctica').retry, true);
  assert.equal(lookup((await day(6)).questions[0], 'Vatican City').retry, true);
});

test('no question uses a regional group: every group is a fact a player can look up', async () => {
  const groups = await loadGroups();
  assert.deepEqual(Object.keys(groups).filter((k) => !k.startsWith('_')).sort(), ['eu', 'island-nations', 'sovereign']);
  for (let d = 1; d <= 7; d++) {
    for (const q of (await day(d)).questions) assert.ok(['sovereign', 'eu', 'island-nations'].includes(q.group), `day ${d} ${q.id} uses "${q.group}"`);
  }
});
