import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneMarkup, layerMarkup, axisFor, levelFor, levelOf, valueTicks, ambientLevel, revealTrace, revealDuration, revealProgress, seedOf, chartGeometry, LINE, CEIL } from '../src/scene.js';

const max = { direction: 'under', limit: 1000, format: 'int', prompt: 'Name a country under 1,000' };
const min = { direction: 'over', limit: 1000, format: 'int', prompt: 'Name a country over 1,000' };
const withAnswers = (q, values) => ({ ...q, answers: values.map((value, i) => ({ id: `a${i}`, name: `A${i}`, value })) });

test('the chart axis is the value itself: linear, the line at 100 and the trip zone past it', () => {
  const ax = axisFor(max);
  assert.equal(levelOf(ax, 1000), LINE);
  assert.equal(levelOf(ax, 0), 0);
  assert.equal(levelOf(ax, 500), 50, 'half the limit is halfway up the paper, whatever it scores');
  assert.ok(levelOf(ax, 1010) > LINE, 'a bust sits past the line');
  assert.equal(levelFor(ax, 50000), CEIL, 'a far bust is clamped to the edge of the paper');
});

test('a MIN chart is the same axis flipped: the safe stretch lies above the line', () => {
  const ax = axisFor(min);
  assert.equal(ax.flip, true);
  assert.equal(levelOf(ax, 1000), LINE);
  assert.ok(levelOf(ax, 900) > LINE, 'under the limit on a MIN question is the bust side');
  assert.ok(Math.abs(levelOf(ax, ax.far)) < 1e-9);
  assert.ok(ax.far > ax.line);

  const g = chartGeometry(800, 400, false, true);
  assert.ok(g.yLine > g.y0 && g.yLine < g.y1);
  assert.equal(g.yFor(0), g.y0, 'the far end is at the top');
  assert.equal(g.yFor(CEIL), g.y1, 'the trip zone is at the bottom');
  assert.ok(g.yFor(50) < g.yLine, 'a value above a MIN limit draws above the line');
  assert.ok(g.yLine > g.h / 2, 'the line sits low on a MIN chart');

  const up = chartGeometry(800, 400);
  assert.ok(up.yFor(50) > up.yLine, 'a value below a MAX limit draws below the line');
  assert.ok(up.yLine < up.h / 2, 'the line sits high on a MAX chart');
});

test('on either chart the pen is nearer the line the nearer the value', () => {
  const a = axisFor(withAnswers(max, [100, 900]));
  assert.ok(levelFor(a, 900) > levelFor(a, 100));
  const b = axisFor(withAnswers(min, [1100, 1900]));
  assert.ok(levelFor(b, 1100) > levelFor(b, 1900));
});

test('narrow answer ranges get a narrow axis, wide ones start at zero', () => {
  const life = { direction: 'under', limit: 80, format: 'dec1' };
  const narrow = axisFor(withAnswers(life, [75.4, 77.2, 79.1, 79.9]));
  assert.ok(narrow.far > 70 && narrow.far < 75.4, `far end ${narrow.far}`);
  assert.equal(axisFor(withAnswers(max, [20, 400, 990])).far, 0);
  const wide = axisFor(withAnswers(min, [1050, 1400, 28000]));
  assert.ok(wide.far <= 3500 && wide.far > 1000, 'a MIN axis reaches only a few limits past the line');
});

test('value ticks are round numbers inside the axis', () => {
  const t = valueTicks(0, 675000);
  assert.deepEqual(t.major, [0, 200000, 400000, 600000]);
  assert.ok(t.minor.length > t.major.length);
  assert.ok(valueTicks(74.7, 80.2).major.every((v) => v >= 74.7 && v <= 80.2));
});

test('the idle pen stays well short of the line for the whole clock', () => {
  const seed = seedOf(max);
  for (let s = -14; s <= 20; s += 0.1) {
    const level = ambientLevel(seed, s);
    assert.ok(level < LINE - 15 && level > 0, `level ${level} at ${s}s`);
  }
});

test('a scored trace ends on the answer and never crosses the line before it', () => {
  for (const to of [3, 40, 87, 99.6, 100]) {
    const trace = revealTrace({ from: 35, to, bust: false, seed: 7 });
    assert.equal(trace.at(-1).level, to);
    assert.equal(trace[0].u, 0);
    assert.equal(trace.at(-1).u, 1);
    for (const p of trace.slice(0, -1)) assert.ok(p.level < LINE, `crossed the line at u=${p.u} for ${to}`);
  }
});

test('a bust creeps up to the line, then breaks through to its level', () => {
  const trace = revealTrace({ from: 35, to: 112, bust: true, seed: 3 });
  assert.equal(trace.at(-1).level, 112);
  const crossing = trace.findIndex((p) => p.level > LINE);
  assert.ok(crossing > trace.length * 0.8, 'the break comes at the end');
  assert.ok(trace.slice(0, crossing).every((p) => p.level < LINE));
});

test('a trace is the same every time for the same question', () => {
  const a = revealTrace({ from: 30, to: 74, bust: false, seed: seedOf(max) });
  const b = revealTrace({ from: 30, to: 74, bust: false, seed: seedOf(max) });
  assert.deepEqual(a, b);
  assert.notEqual(seedOf(max), seedOf(min));
});

test('the reveal is gradual, longer the nearer the line, and longest for a bust', () => {
  const far = revealDuration(max, { value: 100, outcome: 'scored' });
  const near = revealDuration(max, { value: 990, outcome: 'scored' });
  const bust = revealDuration(max, { value: 1200, outcome: 'bust' });
  assert.ok(far >= 2400 && bust <= 4000, 'a few seconds, not a long wait');
  assert.ok(far < near && near < bust);
  assert.equal(revealDuration(max, { value: null, outcome: 'timeout' }), 0);
});

test('the reveal clock climbs evenly with no stall or surge', () => {
  assert.equal(revealProgress(0), 0);
  assert.equal(revealProgress(1), 1);
  assert.ok(Math.abs(revealProgress(0.5) - 0.5) < 1e-9);
  let last = -1;
  for (let t = 0; t <= 1; t += 0.02) {
    const p = revealProgress(t);
    assert.ok(p >= last, `progress went backwards at t=${t}`);
    last = p;
  }
  assert.ok(revealProgress(0.25) < 0.3, 'no sudden surge at the start');
  assert.ok(revealProgress(0.75) - revealProgress(0.5) > 0.2, 'no stall in the middle');
  assert.ok(revealProgress(0.9) - revealProgress(0.8) > 0.05, 'no stall at the end');
});

test('waiting chart draws the limit, its flag and the value ladder, with no answer on it', () => {
  const svg = sceneMarkup(max, null, { w: 640, h: 360 });
  assert.match(svg, /class="scene waiting/);
  assert.match(svg, /class="limit"/);
  assert.match(svg, /MAX 1,000/);
  assert.match(svg, /class="ladder">\d/, 'the ladder reads in the question\'s own units');
  assert.doesNotMatch(svg, /PTS/);
  assert.doesNotMatch(svg, /class="tag /, 'no tag until there is an answer');
  assert.match(sceneMarkup(min, null, { w: 640, h: 360 }), /MIN 1,000/);
});

test('the MIN flag sits below its line, in the trip zone, and the MAX flag above', () => {
  const flagY = (svg) => Number(svg.match(/class="limit-flag"><rect x="[\d.]+" y="([\d.]+)"/)[1]);
  const lineY = (svg) => Number(svg.match(/y1="([\d.]+)" y2="[\d.]+" class="limit"/)[1]);
  const down = sceneMarkup(min, null, { w: 640, h: 360 });
  const up = sceneMarkup(max, null, { w: 640, h: 360 });
  assert.ok(flagY(down) > lineY(down));
  assert.ok(flagY(up) < lineY(up));
});

test('a revealed chart carries the answer, its points as a tag, and the gap', () => {
  const svg = sceneMarkup(max, { value: 900, name: 'Malta', outcome: 'scored', score: 73 }, { best: { value: 990, name: 'Fiji' }, w: 640, h: 360 });
  assert.match(svg, /class="scene cleared/);
  assert.match(svg, />73 pts</);
  assert.match(svg, />MALTA</);
  assert.match(svg, /100 under/);
  assert.match(svg, /Best: Fiji, 990</, 'the best answer is placed by its value');
});

test('a MIN answer sits above its line and a bust below it', () => {
  const answerY = (svg) => Number(svg.match(/class="head [a-z]+" ?/) ? svg.match(/<circle cx="[\d.]+" cy="([\d.]+)"/)[1] : NaN);
  const lineY = (svg) => Number(svg.match(/y1="([\d.]+)" y2="[\d.]+" class="limit"/)[1]);
  const q = withAnswers(min, [1050, 1400, 2200]);
  const safe = sceneMarkup(q, { value: 1400, name: 'Peru', outcome: 'scored', score: 36 }, { w: 640, h: 360 });
  assert.ok(answerY(safe) < lineY(safe), 'a safe MIN answer is above the line');
  const bust = sceneMarkup(q, { value: 700, name: 'Chad', outcome: 'bust', score: 0 }, { w: 640, h: 360 });
  assert.ok(answerY(bust) > lineY(bust), 'a bust is below the line');
  assert.match(bust, /class="scene busted tripped/);
  assert.match(bust, /300 under/);
});

test('a bust is tripped, tagged BUST and measured over the line', () => {
  const svg = sceneMarkup(max, { value: 1300, name: 'Chad', outcome: 'bust', score: 0 }, { w: 640, h: 360 });
  assert.match(svg, /class="scene busted tripped/);
  assert.match(svg, />BUST</);
  assert.match(svg, /300 over/);
});

test('a timeout or an answer that cannot count is tagged and has no gap', () => {
  const timeout = sceneMarkup(max, { value: null, name: null, outcome: 'timeout' }, { w: 640, h: 360 });
  assert.match(timeout, />TIME</);
  assert.doesNotMatch(timeout, /class="dim /);
  assert.match(sceneMarkup(max, { value: null, name: 'Greenland', outcome: 'invalid' }, { w: 640, h: 360 }), />NONE</);
});

test('the best answer is not drawn twice when it is the answer', () => {
  const svg = sceneMarkup(max, { value: 990, name: 'Fiji', outcome: 'scored', score: 97 }, { best: { value: 990, name: 'Fiji' }, w: 640, h: 360 });
  assert.doesNotMatch(svg, /class="best/);
});

test('mini charts carry the line and the pen but no labels', () => {
  const svg = sceneMarkup(max, { value: 900, name: 'Malta', outcome: 'scored', score: 73 }, { mini: true });
  assert.match(svg, /class="scene cleared mini"/);
  assert.match(svg, /class="limit"/);
  assert.doesNotMatch(svg, /<text/);
});

test('chart geometry puts the line above the answers and leaves a trip zone', () => {
  const g = chartGeometry(800, 400);
  assert.ok(g.yLine > g.y0 && g.yLine < g.y1);
  assert.ok(g.yFor(CEIL) === g.y0 && g.yFor(0) === g.y1);
  assert.ok(g.yFor(75) > g.yLine, 'lower values sit lower on the paper');
  const phone = chartGeometry(375, 300);
  assert.ok(phone.w - phone.x1 < g.w - g.x1, 'the gutter narrows on phones');
});

test('the pen head keeps one color until it settles, so it never gives the answer away', () => {
  const g = chartGeometry(640, 360);
  const seed = seedOf(max);
  const mk = (value, outcome, progress) => {
    const trace = revealTrace({ from: ambientLevel(seed, 11), to: levelFor(axisFor(max), value), bust: outcome === 'bust', seed });
    return layerMarkup(max, g, { s: 11, shot: { value, name: 'X', outcome, score: 0 }, trace, progress, id: 't' }).html;
  };
  for (const [value, outcome] of [[1300, 'bust'], [900, 'scored'], [100, 'scored']]) {
    assert.match(mk(value, outcome, 0.5), /class="head live"/, `${outcome} ${value} mid-reveal`);
  }
  assert.match(mk(1300, 'bust', 1), /class="head bad"/);
  assert.match(mk(900, 'scored', 1), /class="head good"/);
});
