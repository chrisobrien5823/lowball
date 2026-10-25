import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, bestAnswer, markFor, wordFor, dailyTotal, pointsFor, closeness, pointsForCloseness, CURVE } from '../src/score.js';

const under = { direction: 'under', limit: 500000, answers: [] };
const over = { direction: 'over', limit: 8000, answers: [] };

test('under: exactly on the line scores 100', () => {
  assert.deepEqual(evaluate(under, { value: 500000 }), { outcome: 'scored', score: 100, value: 500000, distance: 0 });
});

test('under: points follow the curve below the line', () => {
  assert.equal(evaluate(under, { value: 250000 }).score, 13);
  assert.equal(evaluate(under, { value: 400000 }).score, 51);
  assert.equal(evaluate(under, { value: 450000 }).score, 73);
  assert.equal(evaluate(under, { value: 475000 }).score, 86);
  assert.equal(evaluate(under, { value: 495000 }).score, 97);
  assert.equal(evaluate(under, { value: 123456 }).score, 2);
});

test('the curve pays more for each step nearer the line', () => {
  assert.equal(CURVE, 3);
  const steps = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map((r) => pointsForCloseness(r));
  const gains = steps.slice(1).map((p, i) => p - steps[i]);
  for (let i = 1; i < gains.length; i++) assert.ok(gains[i] > gains[i - 1], 'each step up the scale gains more than the last');
  assert.equal(pointsForCloseness(1), 100);
  assert.equal(pointsForCloseness(2), 100, 'closeness past the line is clamped, busts are scored 0 elsewhere');
});

test('closeness is 1 on the line, below 1 inside it and above 1 past it', () => {
  assert.equal(closeness('under', 100, 100), 1);
  assert.equal(closeness('under', 100, 50), 0.5);
  assert.equal(closeness('under', 100, 120), 1.2);
  assert.equal(closeness('over', 100, 200), 0.5);
  assert.equal(closeness('over', 100, 80), 1.25);
  assert.equal(closeness('over', 100, 0), Infinity);
});

test('under: one over the line is a bust', () => {
  const r = evaluate(under, { value: 500001 });
  assert.equal(r.outcome, 'bust');
  assert.equal(r.score, 0);
  assert.equal(r.distance, 1);
});

test('over: closeness is limit / value, then the curve', () => {
  assert.equal(evaluate(over, { value: 8000 }).score, 100);
  assert.equal(evaluate(over, { value: 8849 }).score, 74);
  assert.equal(evaluate(over, { value: 16000 }).score, 13);
  assert.equal(evaluate(over, { value: 7999 }).outcome, 'bust');
});

test('timeout and invalid score 0', () => {
  assert.equal(evaluate(under, null, { timedOut: true }).outcome, 'timeout');
  assert.equal(evaluate(under, null).outcome, 'invalid');
  assert.equal(evaluate(under, null).score, 0);
});

test('bestAnswer picks the closest answer on the scoring side', () => {
  const q = {
    direction: 'under',
    limit: 100,
    answers: [
      { name: 'a', value: 40 },
      { name: 'b', value: 99 },
      { name: 'c', value: 101 },
    ],
  };
  assert.equal(bestAnswer(q).name, 'b');
  const o = { direction: 'over', limit: 100, answers: [{ name: 'x', value: 99 }, { name: 'y', value: 150 }, { name: 'z', value: 104 }] };
  assert.equal(bestAnswer(o).name, 'z');
});

test('marks and words match the result bands', () => {
  assert.equal(markFor({ outcome: 'scored', score: 95 }), '95');
  assert.equal(markFor({ outcome: 'scored', score: 0 }), '0');
  assert.equal(markFor({ outcome: 'bust', score: 0 }), 'BUST');
  assert.equal(markFor({ outcome: 'timeout', score: 0 }), 'TIME');
  assert.equal(markFor({ outcome: 'invalid', score: 0 }), '–');
  assert.equal(wordFor({ outcome: 'scored', score: 97 }), 'Bullseye');
});

test('dailyTotal sums scores', () => {
  assert.equal(dailyTotal([{ score: 98 }, { score: 74 }, { score: 0 }, { score: 61 }, { score: 95 }]), 328);
  assert.equal(pointsFor('under', 10, 11), 0);
});
