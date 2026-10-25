// The recorder window: a pen trace against a red trip line. The pen's height is
// the value the player named, read off a ladder in the question's own units, so
// the chart is a real axis and the points are only what that value earns. A MAX
// question keeps its line near the top with the trip zone above it, and the pen
// climbs toward it. A MIN question is the same chart flipped: the line sits near
// the bottom with the trip zone below it, and the pen comes down toward it. The
// chart is drawn in CSS pixels (one viewBox unit = one pixel) so its text keeps
// its size on any screen.
//
// Inside the code the pen's place is a "level": 0 at the far end of the paper,
// 100 on the line, up to CEIL in the trip zone. A level is just the value laid
// out linearly between the far end and the line, in either direction.

import { pointsFor } from './score.js';
import { QUESTION_MS } from './timer.js';
import { formatNumber, formatSign } from './format.js';

export const LINE = 100; // chart level of the limit
export const CEIL = 135; // far side of the trip zone; past it the pen leaves the paper
const TRIP = CEIL / LINE - 1; // the trip zone's depth as a share of the safe stretch
const SAFE = LINE - 0.8; // the pen never touches the line unless the answer does
const HISTORY_S = 14; // seconds of trace visible behind the pen
const HEAD_AT = 0.5; // where the pen sits across the plot while waiting
const END_AT = 0.82; // where a revealed trace comes to rest
const MIN_REACH = 2.5; // a MIN axis reaches at most this many limits past the line

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const axes = new WeakMap();

/**
 * The value axis for a question. `far` is the value at the far end of the safe
 * stretch (level 0) and `line` the limit (level 100). The safe stretch is sized
 * to the question's own answers so the chart is not mostly empty: from zero up
 * to the limit when answers are spread out, or a narrow band (life expectancy)
 * when they are not. `flip` is true for MIN questions, whose safe stretch lies
 * above the line.
 */
export function axisFor(q) {
  const cached = axes.get(q);
  if (cached) return cached;
  const line = q.limit;
  const flip = q.direction === 'over';
  const values = (q.answers ?? []).map((a) => a.value).filter(Number.isFinite);
  let span;
  if (flip) {
    const safe = values.filter((v) => v >= line);
    span = safe.length ? 1.15 * (Math.max(...safe) - line) : line;
    span = clamp(span, 0.02 * line, MIN_REACH * line);
  } else {
    const safe = values.filter((v) => v <= line);
    span = safe.length ? 1.15 * (line - Math.min(...safe)) : line;
    span = span >= 0.6 * line || span <= 0 ? line : span;
  }
  const axis = {
    line,
    flip,
    span,
    far: flip ? line + span : line - span,
    lo: flip ? line - TRIP * span : line - span,
    hi: flip ? line + span : line + TRIP * span,
  };
  axes.set(q, axis);
  return axis;
}

/** Unclamped chart level of a value: 0 at the far end, 100 on the line, past 100 in the trip zone. */
export const levelOf = (axis, value) => (LINE * (value - axis.far)) / (axis.line - axis.far);
/** Chart level of a value, held to the paper. */
export const levelFor = (axis, value) => clamp(levelOf(axis, value), 0, CEIL);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable number per question, so a trace looks the same every time it is drawn. */
export function seedOf(q) {
  let h = 2166136261;
  for (const c of `${q.direction}|${q.limit}|${q.prompt ?? ''}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * The idle pen at `s` seconds into the question. It drifts and, as the clock
 * drains, creeps toward the line, but never reaches it and never tells the answer.
 */
export function ambientLevel(seed, s) {
  const k = clamp(s / (QUESTION_MS / 1000), 0, 1);
  const p = ((seed % 360) * Math.PI) / 180;
  const wave = 0.5 * Math.sin(s * 1.6 + p) + 0.3 * Math.sin(s * 3.7 + p * 1.9) + 0.2 * Math.sin(s * 7.3 + p * 0.6);
  return Math.max(3, 18 + 42 * k + (4 + 9 * k) * wave);
}

/**
 * The pen's path from where it was to the answer's level, as samples across u
 * from 0 to 1: one gradual climb with a small wobble that grows with how close
 * the answer is, then a short settle. A bust climbs to just short of the line
 * and then breaks through. A scored trace never crosses the line.
 */
export function revealTrace({ from, to, bust, seed, n = 64 }) {
  const rand = rng(seed ^ 0x51ed270b);
  const approach = bust ? LINE - 3 : to;
  const wobble = 1 + 2.5 * clamp(to / LINE, 0, 1) ** 2;
  let wob = 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const climb = u < 0.9 ? lerp(u / 0.9, smooth(u / 0.9), 0.5) : 1;
    const reach = wobble * (1 - 0.6 * u);
    wob = wob * 0.55 + (rand() - 0.5) * 2 * reach;
    let level = lerp(from, approach, climb) + wob;
    if (bust && u > 0.86) {
      const r = (u - 0.86) / 0.14;
      level = lerp(approach, to, r ** 3);
    } else {
      level = clamp(level, 0, SAFE);
      if (!bust && u > 0.9) level = lerp(level, to, smooth((u - 0.9) / 0.1));
    }
    out.push({ u, level: i === n - 1 ? to : clamp(level, 0, CEIL) });
  }
  return out;
}

/**
 * Milliseconds the reveal takes. The pen is gradual on purpose: the wait for
 * the line is the tension, and the answer stays hidden until the pen stops. It
 * takes longer the nearer the answer sits to the line, and longest for a bust.
 */
export function revealDuration(q, shot) {
  if (!shot || shot.value === null || shot.value === undefined) return 0;
  if (shot.outcome === 'bust') return 3800;
  const level = levelFor(axisFor(q), shot.value);
  return Math.round(2400 + 1200 * clamp(level / LINE, 0, 1) ** 2);
}

/** The reveal's own clock, mapping time to the trace: an even climb, softened at both ends, with no stall. */
export function revealProgress(t) {
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return lerp(t, smooth(t), 0.35);
}

/**
 * The paper's geometry. `flip` puts the line near the bottom (MIN questions):
 * level 0 is then at the top of the paper and the trip zone is below the line.
 */
export function chartGeometry(w, h, mini = false, flip = false) {
  const pad = mini ? { l: 3, r: 3, t: 3, b: 3 } : { l: 14, r: w < 560 ? 62 : 88, t: 14, b: 24 };
  const x0 = pad.l;
  const x1 = w - pad.r;
  const y0 = pad.t;
  const y1 = h - pad.b;
  const yFor = (level) => {
    const k = clamp(level, 0, CEIL) / CEIL;
    return flip ? y0 + k * (y1 - y0) : y1 - k * (y1 - y0);
  };
  return { w, h, mini, flip, x0, x1, y0, y1, yFor, yLine: yFor(LINE), headX: x0 + HEAD_AT * (x1 - x0), endX: x0 + END_AT * (x1 - x0) };
}

const f = (n) => n.toFixed(1);

/** Round tick values inside the axis: `step` for labelled lines, `minor` for the fine grid. */
export function valueTicks(lo, hi, target = 6) {
  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const m = raw / mag;
  const lead = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  const step = lead * mag;
  const minor = step / (lead === 2 ? 4 : 5);
  const run = (by) => {
    const out = [];
    for (let i = Math.ceil(lo / by - 1e-9); i * by <= hi + 1e-9; i++) out.push(Number((i * by).toPrecision(12)));
    return out;
  };
  return { step, major: run(step), minor: run(minor) };
}

/** The paper, grid, trip zone and limit line: everything that does not move with the answer. */
export function frameMarkup(q, g, { id = 's', live = false } = {}) {
  const ax = axisFor(q);
  const pw = g.x1 - g.x0;
  const ph = g.y1 - g.y0;
  const yTrip = g.flip ? g.yLine : g.y0;
  const hTrip = g.flip ? g.y1 - g.yLine : g.yLine - g.y0;
  let parts = `<defs>
    <pattern id="trip-${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" class="trip-a"/><rect width="2" height="9" class="trip-b"/></pattern>
    <clipPath id="plot-${id}"><rect x="${f(g.x0)}" y="${f(g.y0)}" width="${f(pw)}" height="${f(ph)}"/></clipPath>
    <clipPath id="above-${id}"><rect x="0" y="${f(yTrip)}" width="${g.w}" height="${f(hTrip)}"/></clipPath>
  </defs>
  <rect x="${f(g.x0)}" y="${f(g.y0)}" width="${f(pw)}" height="${f(ph)}" class="paper"/>`;

  const ticks = g.mini ? null : valueTicks(ax.lo, ax.hi);
  const yOf = (value) => g.yFor(levelOf(ax, value));
  if (!g.mini) {
    let minor = '';
    let major = '';
    const majors = new Set(ticks.major);
    for (const v of ticks.minor) {
      const y = f(yOf(v));
      const line = `<line x1="${f(g.x0)}" x2="${f(g.x1)}" y1="${y}" y2="${y}"/>`;
      if (majors.has(v)) major += line;
      else minor += line;
    }
    let cols = '';
    const step = 20;
    for (let x = g.x0 - step * 6; x <= g.x1 + step; x += step) {
      const idx = Math.round((x - g.x0) / step);
      cols += `<line x1="${f(x)}" x2="${f(x)}" y1="${f(g.y0)}" y2="${f(g.y1)}" class="${idx % 5 === 0 ? 'gx-major' : 'gx-minor'}"/>`;
    }
    parts += `<g clip-path="url(#plot-${id})"><g class="grid-x${live ? ' scroll' : ''}"${live ? ` style="animation-duration:${(100 / ((g.headX - g.x0) / HISTORY_S)).toFixed(2)}s"` : ''}>${cols}</g><g class="grid-minor">${minor}</g><g class="grid-major">${major}</g></g>`;
  }

  parts += `<rect x="${f(g.x0)}" y="${f(yTrip)}" width="${f(pw)}" height="${f(hTrip)}" fill="url(#trip-${id})" class="trip-zone"/>`;
  parts += `<line x1="${f(g.x0)}" x2="${f(g.x1)}" y1="${f(g.yLine)}" y2="${f(g.yLine)}" class="limit"/>`;

  if (!g.mini) {
    // The value ladder: the paper's own scale, read off the right-hand edge in the question's units.
    for (const v of ticks.major) {
      const y = yOf(v);
      if (Math.abs(y - g.yLine) < 14) continue;
      parts += `<line x1="${f(g.x1)}" x2="${f(g.x1 + 5)}" y1="${f(y)}" y2="${f(y)}" class="ladder-tick"/><text x="${f(g.x1 + 10)}" y="${f(y + 4)}" class="ladder">${esc(formatSign(v, q.format))}</text>`;
    }
    const sign = formatSign(q.limit, q.format);
    parts += `<line x1="${f(g.x1)}" x2="${f(g.x1 + 5)}" y1="${f(g.yLine)}" y2="${f(g.yLine)}" class="ladder-tick limit-tick"/><text x="${f(g.x1 + 10)}" y="${f(g.yLine + 4)}" class="ladder limit-label">${esc(sign)}</text>`;
    const kind = q.direction === 'over' ? 'MIN' : 'MAX';
    const label = `${kind} ${sign}`;
    const tw = label.length * 8.6 + 18;
    // The flag sits in the trip zone, on the far side of the line from the safe stretch.
    const fy = g.flip ? g.yLine + 4 : g.yLine - 25;
    parts += `<g class="limit-flag"><rect x="${f(g.x0 + 8)}" y="${f(fy)}" width="${f(tw)}" height="21" rx="3"/><text x="${f(g.x0 + 8 + tw / 2)}" y="${f(fy + 14.5)}" text-anchor="middle">${esc(label)}</text></g>`;
  }
  return parts;
}

function tagMarkup(g, y, text, cls) {
  const x = g.x1 + 6;
  const w = g.w - x - 4;
  const h = 24;
  const top = clamp(y - h / 2, g.y0, g.y1 - h);
  const tip = clamp(y, top + 5, top + h - 5);
  return `<g class="tag ${cls}"><path d="M${f(x)} ${f(tip)} L${f(x + 8)} ${f(top)} H${f(x + w)} V${f(top + h)} H${f(x + 8)} Z"/><text x="${f(x + 8 + (w - 8) / 2)}" y="${f(top + h / 2 + 5)}" text-anchor="middle">${esc(text)}</text></g>`;
}

/** A measured gap between the pen and the line, labelled on whichever side has room. */
function dimension(g, yPen, text, cls, avoidY = null) {
  const top = Math.min(yPen, g.yLine);
  const bot = Math.max(yPen, g.yLine);
  const x = Math.min(g.endX + 18, g.x1 - 10);
  const right = g.x1 - x >= 104;
  // A gap too short to hold its label puts it on the side of the pair away from the trace: past the line.
  const labelY = bot - top >= 18 ? (top + bot) / 2 + 4.5 : g.flip ? Math.min(g.y1 - 4, bot + 16) : Math.max(g.y0 + 10, top - 8);
  const lx = right ? x + 9 : x - 9;
  let ly = labelY;
  if (avoidY !== null && Math.abs(ly - avoidY) < 16) ly = avoidY - 16 >= g.y0 + 10 ? avoidY - 16 : avoidY + 22;
  return `<g class="dim ${cls}"><line x1="${f(x)}" x2="${f(x)}" y1="${f(top)}" y2="${f(bot)}"/><line x1="${f(x - 5)}" x2="${f(x + 5)}" y1="${f(top)}" y2="${f(top)}"/><line x1="${f(x - 5)}" x2="${f(x + 5)}" y1="${f(bot)}" y2="${f(bot)}"/><text x="${f(lx)}" y="${f(ly)}" text-anchor="${right ? 'start' : 'end'}">${esc(text)}</text></g>`;
}

/**
 * The part of the chart that changes: the pen's trace, its head, and once the
 * trace has come to rest the answer's tag, name, gap and the best answer.
 * @param st  { s, shot, best, trace, progress }  `s` is seconds on the clock at the pen's head when the
 *            answer arrived (or now, while waiting); `shot` is null while waiting, otherwise
 *            { value, name, outcome, score }, with a null value for a timeout or an answer that can't count.
 */
export function layerMarkup(q, g, st) {
  const seed = seedOf(q);
  const ax = axisFor(q);
  const answered = Boolean(st.shot);
  const scored = answered && st.shot.value !== null && st.shot.value !== undefined;
  const pxPerSec = (g.headX - g.x0) / HISTORY_S;
  const step = g.mini ? 0.5 : 0.12;
  const pts = [];
  for (let t = st.s - HISTORY_S; t < st.s; t += step) pts.push([g.headX - (st.s - t) * pxPerSec, g.yFor(ambientLevel(seed, t))]);
  let level = ambientLevel(seed, st.s);
  let headX = g.headX;
  pts.push([headX, g.yFor(level)]);

  if (scored && st.trace) {
    const u = clamp(st.progress ?? 1, 0, 1);
    const tr = st.trace;
    const at = (x) => g.headX + x * (g.endX - g.headX);
    for (let i = 1; i < tr.length; i++) {
      if (tr[i].u <= u) {
        pts.push([at(tr[i].u), g.yFor(tr[i].level)]);
        level = tr[i].level;
        headX = at(tr[i].u);
      } else {
        const a = tr[i - 1];
        const k = (u - a.u) / (tr[i].u - a.u);
        level = lerp(a.level, tr[i].level, k);
        headX = at(u);
        pts.push([headX, g.yFor(level)]);
        break;
      }
    }
  }

  const yHead = g.yFor(level);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
  const tripped = scored && st.shot.outcome === 'bust' && level > SAFE;
  const settled = answered && (st.progress ?? 1) >= 1;
  // The head keeps its idle look until the pen has stopped, so its color never tells the result early.
  const tone = !settled ? 'live' : !scored ? 'none' : st.shot.outcome === 'bust' ? 'bad' : 'good';

  let out = '';
  let bestY = null;
  if (settled && !g.mini && st.best && scored && st.best.value !== st.shot.value) {
    const by = g.yFor(levelFor(ax, st.best.value));
    bestY = by;
    // Only a MAX chart's best line can crowd the limit from below; on the flipped chart the label goes above.
    const below = !g.flip && Math.abs(by - g.yLine) < 30 && by >= g.yLine - 2;
    out += `<g class="best late"><line x1="${f(g.x0)}" x2="${f(g.x1)}" y1="${f(by)}" y2="${f(by)}"/><text x="${f(g.x0 + 8)}" y="${f(below ? by + 16 : by - 6)}">Best: ${esc(st.best.name)}, ${esc(formatSign(st.best.value, q.format))}</text></g>`;
  }
  out += `<g clip-path="url(#plot-${st.id ?? 's'})"><path d="${d}" class="trace"/><path d="${d}" class="trace trip" clip-path="url(#above-${st.id ?? 's'})"/></g>`;
  const r = g.mini ? 3 : 6;
  out += `<circle cx="${f(headX)}" cy="${f(yHead)}" r="${r}" class="head ${tone}"/>`;

  if (settled && !g.mini) {
    const text = !scored ? (st.shot.outcome === 'timeout' ? 'TIME' : 'NONE') : st.shot.outcome === 'bust' ? 'BUST' : `${st.shot.score ?? pointsFor(q.direction, q.limit, st.shot.value)} pts`;
    out += `<g class="late">${tagMarkup(g, yHead, text, tone)}`;
    if (scored) {
      const span = st.shot.name.length * 8.6 + 12;
      const near = pts.filter(([x]) => x >= headX - 12 - span && x <= headX).map(([, y]) => y);
      // The name rides on the side of the trace away from the line when it can, else on the other side.
      const crest = g.flip ? Math.max(yHead, ...near) : Math.min(yHead, ...near);
      // Near the line there is no room between the pen and it, so the name goes on the far side of the pen.
      const crowded = Math.abs(yHead - g.yLine) < 40;
      const nameY = g.flip
        ? crowded || crest + 22 >= g.y1 - 4 ? Math.min(yHead, ...near) - 12 : crest + 22
        : crowded || crest - 12 <= g.y0 + 14 ? yHead + 22 : crest - 12;
      out += `<text x="${f(headX - 12)}" y="${f(nameY)}" text-anchor="end" class="pen-label ${tone}">${esc(st.shot.name.toUpperCase())}</text>`;
      const gap = Math.abs(q.limit - st.shot.value);
      if (gap > 0) out += dimension(g, yHead, `${formatNumber(gap, q.format)} ${st.shot.value <= q.limit ? 'under' : 'over'}`, tone, bestY);
    }
    out += '</g>';
  }
  return { html: out, tripped, settled, level };
}

/**
 * A whole chart as a single SVG string, for the results lineup, restored
 * reveals, reduced motion and tests. `shot` is null while waiting.
 */
export function sceneMarkup(q, shot, { id = 's', best = null, mini = false, w = mini ? 132 : 640, h = mini ? 56 : 360, answeredAt = 11 } = {}) {
  const ax = axisFor(q);
  const g = chartGeometry(w, h, mini, ax.flip);
  const seed = seedOf(q);
  const scored = shot && shot.value !== null && shot.value !== undefined;
  const bust = scored && shot.outcome === 'bust';
  const trace = scored ? revealTrace({ from: ambientLevel(seed, answeredAt), to: levelFor(ax, shot.value), bust, seed, n: mini ? 24 : 64 }) : null;
  const layer = layerMarkup(q, g, { s: shot ? answeredAt : 4, shot, best, trace, progress: 1, id });
  const state = !shot ? 'waiting' : !scored ? 'none' : bust ? 'busted' : 'cleared';
  return `<svg viewBox="0 0 ${w} ${h}" class="scene ${state}${layer.tripped ? ' tripped' : ''}${mini ? ' mini' : ''}" aria-hidden="true">${frameMarkup(q, g, { id })}${layer.html}</svg>`;
}

/**
 * Draws the recorder window into `host` and keeps it sized to the host. One
 * view at a time: the idle pen while a question is open, or a revealed answer.
 */
export class ChartView {
  constructor(host, { reducedMotion = false } = {}) {
    this.host = host;
    this.reduced = reducedMotion;
    this.view = null;
    this.raf = 0;
    this.size = { w: 0, h: 0 };
    this.svg = null;
    this.layer = null;
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.layout()).observe(host);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    this.raf = 0;
    this.view = null;
  }

  /** The idle pen for an open question. `startedAt` is the saved start time of the clock. */
  showWaiting(q, startedAt, id) {
    this.stop();
    this.view = { kind: 'wait', q, startedAt, id };
    this.layout(true);
    this.frame();
  }

  /**
   * A revealed answer. `shot` is { value, name, outcome, score }, or has a null value when
   * nothing counted. Plays the reveal when `animate` is set, then calls `onDone`.
   */
  showResult(q, shot, { id, best = null, answeredAt = 11, animate = false, onDone, onFrame } = {}) {
    this.stop();
    const seed = seedOf(q);
    const scored = shot.value !== null && shot.value !== undefined;
    const bust = scored && shot.outcome === 'bust';
    const trace = scored ? revealTrace({ from: ambientLevel(seed, answeredAt), to: levelFor(axisFor(q), shot.value), bust, seed }) : null;
    this.view = { kind: 'result', q, shot, best, id, answeredAt, trace, animate: animate && scored && !this.reduced, onDone, onFrame, t0: performance.now(), duration: revealDuration(q, shot) };
    // A page that is not painting (a background tab) gets no frames: settle on the clock instead.
    if (this.view.animate) {
      const v = this.view;
      this.timer = setTimeout(() => {
        if (this.view !== v) return;
        v.animate = false;
        cancelAnimationFrame(this.raf);
        this.frame();
      }, v.duration + 250);
    }
    this.layout(true);
    this.frame();
  }

  layout(force = false) {
    const w = Math.round(this.host.clientWidth);
    const h = Math.round(this.host.clientHeight);
    if (!this.view || !w || !h) return;
    if (!force && w === this.size.w && h === this.size.h) return;
    this.size = { w, h };
    const g = chartGeometry(w, h, false, axisFor(this.view.q).flip);
    const v = this.view;
    const live = v.kind === 'wait' && !this.reduced;
    this.host.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="scene ${v.kind === 'wait' ? 'waiting' : ''}" aria-hidden="true">${frameMarkup(v.q, g, { id: v.id, live })}<g class="layer"></g></svg>`;
    this.svg = this.host.firstElementChild;
    this.layer = this.svg.querySelector('.layer');
    this.draw();
  }

  draw() {
    const v = this.view;
    if (!v || !this.layer) return { settled: true };
    const g = chartGeometry(this.size.w, this.size.h, false, axisFor(v.q).flip);
    let out;
    if (v.kind === 'wait') {
      out = layerMarkup(v.q, g, { s: (Date.now() - v.startedAt) / 1000, shot: null, id: v.id });
    } else {
      const progress = v.animate ? revealProgress((performance.now() - v.t0) / v.duration) : 1;
      out = layerMarkup(v.q, g, { s: v.answeredAt, shot: v.shot, best: v.best, trace: v.trace, progress, id: v.id });
      this.svg.classList.add(!v.trace ? 'none' : v.shot.outcome === 'bust' ? 'busted' : 'cleared');
    }
    this.layer.innerHTML = out.html;
    this.svg.classList.toggle('tripped', out.tripped);
    return out;
  }

  frame() {
    const v = this.view;
    if (!v) return;
    const out = this.draw();
    if (v.kind === 'wait') {
      if (!this.reduced) this.raf = requestAnimationFrame(() => this.frame());
    } else if (!out.settled) {
      if (v.animate) v.onFrame?.(out);
      this.raf = requestAnimationFrame(() => this.frame());
    } else {
      this.raf = 0;
      v.onDone?.();
    }
  }
}
