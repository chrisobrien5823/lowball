import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../src/stats.js';
import { buildShareText } from '../src/share.js';
import { loadState, saveState, updateDay, dayProgress, resetMemory, STORAGE_KEY } from '../src/storage.js';

const s = (score) => ({ outcome: 'scored', score });
const bust = { outcome: 'bust', score: 0 };
const done = (...results) => ({ results, done: true, current: 5, startedAt: null });

test('share card is plain text: theme, points per question, total, link', () => {
  const text = buildShareText({
    day: 12,
    theme: 'Mix Tape',
    results: [s(98), s(74), bust, s(61), s(95)],
  });
  assert.equal(text, 'Lowball #12 · Mix Tape\n98 · 74 · BUST · 61 · 95\n328 / 500\nlowball.xyz');
  assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, 'no emoji on the card');
});

test('share card shows timeouts and misses in words', () => {
  const text = buildShareText({ day: 1, theme: 'T', results: [{ outcome: 'timeout', score: 0 }, { outcome: 'invalid', score: 0 }] });
  assert.match(text, /TIME · –/);
});

test('stats: streak counts consecutive days and survives until the next day ends', () => {
  const days = { 3: done(s(90)), 4: done(s(20)), 5: done(s(100), s(96)), 7: done(s(10)), 8: done(s(50)) };
  const st = computeStats(days, 9);
  assert.equal(st.played, 5);
  assert.equal(st.streak, 2);
  assert.equal(st.maxStreak, 3);
  assert.equal(st.bullseyes, 2);
  assert.equal(st.best, 196);
  assert.deepEqual(st.histogram, [4, 1, 0, 0, 0]);
  assert.equal(computeStats(days, 10).streak, 0);
});

test('stats ignore unfinished days', () => {
  const st = computeStats({ 1: { results: [s(50)], done: false } }, 1);
  assert.equal(st.played, 0);
  assert.equal(st.streak, 0);
});

test('storage round-trips and survives corrupt data', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  resetMemory();
  let state = loadState();
  assert.deepEqual(state.days, {});
  state = updateDay(state, 3, { ...dayProgress(state, 3), current: 1 });
  resetMemory();
  assert.equal(loadState().days[3].current, 1);

  store.set(STORAGE_KEY, '{not json');
  resetMemory();
  assert.deepEqual(loadState().days, {});

  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  resetMemory();
  saveState({ v: 1, seenHelp: true, days: {} });
  assert.equal(loadState().seenHelp, true);
  delete globalThis.localStorage;
});
