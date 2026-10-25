// Audio cues, synthesized with the Web Audio API (no files). Browsers only let
// audio start after a user gesture, so nothing sounds until `unlock()` has run
// from a click or key press. Every cue has a visual twin that is always drawn,
// so a muted player loses nothing:
//   climb blips   <-> the pen rising on the chart
//   bust sting    <-> the limit line flashing, the BUST tag and lamp
//   resolve notes <-> the verdict word, its lamp and the points
//   timeout buzz  <-> the greyed LCD and "Out of time"
//   countdown tick <-> the LCD numeral blinking in the last five seconds

/** The pen climbs one blip per this many chart points. */
export const BLIP_STEP = 6;
/** The LCD starts blinking, and the ticks start, at this many seconds left. */
export const TICK_FROM = 5;

let ctx = null;
let master = null;
let muted = false;

export function setMuted(value) {
  muted = Boolean(value);
}

export function isMuted() {
  return muted;
}

/** Call from a user gesture. Safe to call again; it only creates the audio context once. */
export function unlock() {
  try {
    if (!ctx) {
      const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

const canPlay = () => !muted && ctx !== null && ctx.state === 'running';

/** One enveloped oscillator note, optionally gliding to `to`. */
function tone({ freq, to = freq, type = 'sine', at = 0, dur = 0.1, gain = 0.6 }) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const play = (fn) => {
  if (!canPlay()) return;
  try {
    fn();
  } catch {
    // Audio is a garnish: never let it break the game.
  }
};

/** Pitch follows the pen: higher on the chart is higher in tone. */
export const blipFreq = (level) => 220 * 2 ** (Math.max(0, level) / 60);

/** The sounds themselves, behind a small interface so the cue logic can be tested without audio. */
export const player = {
  blip: (level) => play(() => tone({ freq: blipFreq(level), type: 'triangle', dur: 0.055, gain: 0.5 })),
  tick: (secondsLeft) => play(() => tone({ freq: 880 + (TICK_FROM - secondsLeft) * 90, type: 'square', dur: 0.03, gain: 0.35 })),
  sting: () =>
    play(() => {
      tone({ freq: 460, to: 90, type: 'sawtooth', dur: 0.5, gain: 0.7 });
      tone({ freq: 230, to: 55, type: 'square', dur: 0.55, gain: 0.5 });
    }),
  resolve: (band) =>
    play(() => {
      const notes = band === 'bull' ? [523, 659, 784, 1047] : band === 'close' ? [523, 784] : [392];
      notes.forEach((freq, i) => tone({ freq, type: 'triangle', at: i * 0.09, dur: i === notes.length - 1 ? 0.45 : 0.14, gain: band === 'safe' ? 0.4 : 0.6 }));
    }),
  timeout: () =>
    play(() => {
      tone({ freq: 150, type: 'square', dur: 0.16, gain: 0.45 });
      tone({ freq: 110, type: 'square', at: 0.2, dur: 0.3, gain: 0.45 });
    }),
  confirm: () => play(() => tone({ freq: 660, type: 'triangle', dur: 0.08, gain: 0.4 })),
};

/** The result bands that earn a resolve, as the game names them. */
export function bandFor(outcome, score) {
  if (outcome === 'bust') return 'bust';
  if (outcome !== 'scored') return 'none';
  return score >= 95 ? 'bull' : score >= 50 ? 'close' : 'safe';
}

/**
 * The cues for one reveal. Feed it each animation frame (`frame({ level, tripped })`) and call
 * `done()` once the pen has settled. Blips mark each new step the pen climbs, a bust sounds its sting
 * at the moment the pen crosses the line, and `done()` plays whatever has not sounded yet, which is
 * everything for a player on reduced motion (no frames).
 */
export function revealCues({ outcome, score }, out = player) {
  let top = 0;
  let stung = false;
  return {
    frame({ level, tripped }) {
      if (stung) return;
      if (tripped) {
        stung = true;
        out.sting();
        return;
      }
      const step = Math.floor(level / BLIP_STEP);
      if (step > top) {
        top = step;
        out.blip(level);
      }
    },
    done() {
      const band = bandFor(outcome, score);
      if (band === 'bust') {
        if (!stung) out.sting();
        stung = true;
      } else if (band === 'none') out.timeout();
      else out.resolve(band);
    },
  };
}

/** One tick per second while the LCD blinks, for 5, 4, 3, 2, 1. */
export function tickFor(secondsLeft, out = player) {
  if (secondsLeft >= 1 && secondsLeft <= TICK_FROM) out.tick(secondsLeft);
}
