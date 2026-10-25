import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealCues, tickFor, bandFor, blipFreq, setMuted, isMuted, unlock, player, BLIP_STEP } from '../src/sound.js';
import { loadState, resetMemory } from '../src/storage.js';

const recorder = () => {
  const log = [];
  const out = {};
  for (const k of ['blip', 'tick', 'sting', 'resolve', 'timeout']) out[k] = (...a) => log.push([k, ...a]);
  return { out, log };
};

test('result bands match the game words', () => {
  assert.equal(bandFor('scored', 100), 'bull');
  assert.equal(bandFor('scored', 95), 'bull');
  assert.equal(bandFor('scored', 94), 'close');
  assert.equal(bandFor('scored', 50), 'close');
  assert.equal(bandFor('scored', 49), 'safe');
  assert.equal(bandFor('bust', 0), 'bust');
  assert.equal(bandFor('timeout', 0), 'none');
  assert.equal(bandFor('invalid', 0), 'none');
});

test('blips sound once per new step the pen climbs, never on a wobble back down', () => {
  const { out, log } = recorder();
  const cues = revealCues({ outcome: 'scored', score: 73 }, out);
  for (const level of [2, BLIP_STEP + 1, BLIP_STEP * 2 + 1, BLIP_STEP * 2 - 3, BLIP_STEP * 2 + 2, BLIP_STEP * 3 + 1]) cues.frame({ level, tripped: false });
  assert.deepEqual(log.map(([k]) => k), ['blip', 'blip', 'blip']);
  assert.ok(log[0][1] < log[2][1], 'pitch rises with the pen');
});

test('a bust stings as the pen crosses the line and stops the blips', () => {
  const { out, log } = recorder();
  const cues = revealCues({ outcome: 'bust', score: 0 }, out);
  cues.frame({ level: 40, tripped: false });
  cues.frame({ level: 104, tripped: true });
  cues.frame({ level: 130, tripped: true });
  cues.done();
  assert.deepEqual(log.map(([k]) => k), ['blip', 'sting']);
});

test('with no frames (reduced motion) done() plays the whole cue', () => {
  for (const [outcome, score, expected] of [
    ['bust', 0, 'sting'], ['timeout', 0, 'timeout'], ['scored', 97, 'resolve'], ['scored', 10, 'resolve'],
  ]) {
    const { out, log } = recorder();
    revealCues({ outcome, score }, out).done();
    assert.deepEqual(log.map(([k]) => k), [expected], `${outcome} ${score}`);
  }
  const { out, log } = recorder();
  revealCues({ outcome: 'scored', score: 60 }, out).done();
  assert.deepEqual(log[0], ['resolve', 'close']);
});

test('countdown ticks cover the last five seconds only', () => {
  const { out, log } = recorder();
  for (let s = 20; s >= 0; s--) tickFor(s, out);
  assert.deepEqual(log.map(([, s]) => s), [5, 4, 3, 2, 1]);
});

test('blip pitch climbs with the chart and stays in a listenable range', () => {
  assert.ok(blipFreq(0) >= 200);
  assert.ok(blipFreq(135) < 1500);
  assert.ok(blipFreq(100) > blipFreq(50));
});

test('muted state is remembered in storage and defaults to sound on', () => {
  resetMemory();
  assert.equal(loadState().muted, false);
  setMuted(true);
  assert.equal(isMuted(), true);
  setMuted(false);
});

test('playing before a gesture, or without audio support, is silent and never throws', () => {
  setMuted(false);
  unlock();
  assert.doesNotThrow(() => {
    player.blip(50);
    player.sting();
    player.resolve('bull');
    player.timeout();
    player.tick(3);
    player.confirm();
  });
});
