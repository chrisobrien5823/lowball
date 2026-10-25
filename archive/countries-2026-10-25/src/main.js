// The daily game: intro → question → reveal (×5) → results.

import { loadDay } from './content.js';
import { todayNumber, dateForDay, nextReset } from './date.js';
import { matchAnswer } from './match.js';
import { evaluate, bestAnswer, wordFor, dailyTotal, QUESTIONS_PER_DAY } from './score.js';
import { loadState, saveState, dayProgress } from './storage.js';
import { computeStats, HISTOGRAM_BUCKETS } from './stats.js';
import { buildShareText, copyText, canNativeShare, nativeShare } from './share.js';
import { startCountdown, remainingMs, QUESTION_MS } from './timer.js';
import { sceneMarkup, ChartView } from './scene.js';
import { formatValue, formatSign } from './format.js';
import { markSvg } from './marks.js';
import { unlock, setMuted, isMuted, player, revealCues, tickFor } from './sound.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ?day=N plays another day without touching saved progress; ?draft loads unapproved drafts.
const params = new URLSearchParams(location.search);
const override = params.has('day') ? Number(params.get('day')) : null;
const useDraft = params.has('draft');
const dayNumber = Number.isInteger(override) && override > 0 ? override : todayNumber();

// Practice plays live in this tab's session storage: they survive a refresh but never touch stats.
const PRACTICE_KEY = `lowball:practice:${dayNumber}`;
function loadPractice() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PRACTICE_KEY));
    if (p && Array.isArray(p.results)) return p;
  } catch {
    // Unreadable or blocked: start fresh.
  }
  return { results: [], current: 0, startedAt: null, done: false };
}

let saved = loadState();
let progress = override ? loadPractice() : dayProgress(saved, dayNumber);
let day = null;
let stopTimer = null;
let answering = false;
const chart = new ChartView($('scene-wrap'));

function persist() {
  if (override) {
    try {
      sessionStorage.setItem(PRACTICE_KEY, JSON.stringify(progress));
    } catch {
      // Storage blocked: practice still works for this page load.
    }
    return;
  }
  saved = { ...saved, days: { ...saved.days, [dayNumber]: progress } };
  saveState(saved);
}

function show(screen) {
  for (const id of ['loading', 'screen-intro', 'screen-play', 'screen-results', 'screen-empty']) $(id).hidden = id !== screen;
}

/** Sets text made of parts joined by a spaced separator (the font's middle dot hugs the next word). */
function setParts(el, parts) {
  el.replaceChildren();
  parts.filter(Boolean).forEach((p, i) => {
    if (i) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '·';
      el.append(sep);
    }
    el.append(document.createTextNode(p));
  });
}

function niceDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function band(result) {
  if (!result) return '';
  if (result.outcome === 'bust') return 'bust';
  if (result.outcome !== 'scored') return 'none';
  if (result.score >= 95) return 'bull';
  if (result.score >= 50) return 'close';
  return 'safe';
}

// ---------------------------------------------------------------- intro
function showIntro() {
  $('intro-theme').textContent = day.theme;
  setParts($('intro-sub'), [`Lowball #${day.day}`, niceDate(day.date), '5 questions']);
  show('screen-intro');
  $('start-btn').focus({ preventScroll: true });
}

// ---------------------------------------------------------------- question
/** `hide` is a question whose result must not show yet (its reveal is still playing). */
function renderProgress(hide = -1) {
  const list = $('progress');
  list.innerHTML = '';
  for (let i = 0; i < QUESTIONS_PER_DAY; i++) {
    const r = i === hide ? null : progress.results[i];
    const li = document.createElement('li');
    if (r) {
      li.className = `r-${band(r)}`;
      li.textContent = r.outcome === 'bust' ? 'BUST' : r.outcome === 'scored' ? String(r.score) : '–';
      li.setAttribute('aria-label', `Question ${i + 1}: ${wordFor(r)}${r.outcome === 'scored' ? `, ${r.score} points` : ''}`);
    } else {
      li.textContent = String(i + 1);
      if (i === progress.current) li.className = 'current';
      li.setAttribute('aria-label', `Question ${i + 1}${i === progress.current ? ', now' : ''}`);
    }
    list.append(li);
  }
}

function renderQuestionFrame(q) {
  const under = q.direction !== 'over';
  $('sign').classList.toggle('min', !under);
  $('sign-kind').textContent = under ? 'MAX' : 'MIN';
  $('sign-limit').textContent = formatSign(q.limit, q.format);
  $('sign-unit').textContent = q.unit === 'US$' ? (q.field === 'gdp_per_capita_usd' ? 'per person' : 'GDP') : q.unit;
  $('prompt').textContent = q.prompt;
  $('q-source').textContent = `Source: ${q.source}`;
  setParts($('hdr-day'), [`#${day.day}`, day.theme]);
  $('recorder-title').textContent = `Question ${progress.current + 1} of ${QUESTIONS_PER_DAY}`;
  renderProgress();
}

function setCountdown(seconds) {
  $('countdown-num').textContent = String(seconds);
  $('countdown').classList.toggle('urgent', seconds <= 5 && seconds > 0);
  $('countdown').classList.toggle('done', seconds === 0);
}

function startQuestion(index, { resume = false } = {}) {
  const q = day.questions[index];
  if (!resume) {
    progress = { ...progress, current: index, startedAt: Date.now() };
    persist();
  }
  if (remainingMs(progress.startedAt) <= 0) {
    // Reloaded after the clock ran out: the question is over.
    finishQuestion(evaluate(q, null, { timedOut: true }), { animate: false });
    return;
  }
  show('screen-play');
  renderQuestionFrame(q);
  $('reveal').hidden = true;
  $('hint').hidden = true;
  $('answer-form').hidden = false;
  $('answer').value = '';
  $('answer').disabled = false;
  $('submit-btn').disabled = false;
  answering = true;
  stopTimer?.();
  $('countdown').classList.remove('done');
  stopTimer = startCountdown(progress.startedAt, {
    onTick: (seconds) => {
      setCountdown(seconds);
      tickFor(seconds);
    },
    onExpire: () => {
      if (answering) finishQuestion(evaluate(q, null, { timedOut: true }));
    },
  });
  chart.reduced = reducedMotion.matches;
  chart.showWaiting(q, progress.startedAt, `q${index}`);
  $('answer').focus({ preventScroll: true });
}

function hint(text) {
  $('hint').textContent = text;
  $('hint').hidden = false;
}

function submitAnswer(event) {
  event.preventDefault();
  if (!answering) return;
  const q = day.questions[progress.current];
  const typed = $('answer').value.trim();
  if (!typed) return;
  const match = matchAnswer(typed, [...q.answers, ...q.excluded]);
  if (!match) {
    hint(`We don't recognize "${typed}". Check the spelling and try again.`);
    $('answer').select();
    return;
  }
  const a = match.answer;
  if (a.reason) {
    hint(`${a.reason} Try another.`);
    $('answer').select();
    return;
  }
  finishQuestion({ ...evaluate(q, a), name: a.name, input: typed });
}

function finishQuestion(result, { animate = true } = {}) {
  answering = false;
  stopTimer?.();
  const index = progress.current;
  const results = [...progress.results];
  const secondsLeft = progress.startedAt ? Math.ceil(remainingMs(progress.startedAt) / 1000) : 0;
  results[index] = { ...result, secondsLeft };
  progress = { ...progress, results, startedAt: null, done: results.filter(Boolean).length === QUESTIONS_PER_DAY };
  persist();
  showReveal(index, { animate });
}

// ---------------------------------------------------------------- reveal
function showReveal(index, { animate = true } = {}) {
  const q = day.questions[index];
  const r = progress.results[index];
  const best = bestAnswer(q);
  show('screen-play');
  renderQuestionFrame(q);
  setCountdown(r.outcome === 'timeout' ? 0 : r.secondsLeft ?? 0);
  $('countdown').classList.add('done');
  $('answer-form').hidden = true;
  $('hint').hidden = true;

  const motion = animate && !reducedMotion.matches;
  // The answer stays hidden until the pen has stopped: no verdict, facts or result chip before then.
  renderProgress(motion ? index : -1);

  const under = q.direction !== 'over';
  const verdict = $('verdict');
  verdict.className = `verdict ${band(r)}`;
  const word =
    r.outcome === 'scored' ? wordFor(r)
    : r.outcome === 'bust' ? (under ? 'Bust' : 'Too short')
    : r.outcome === 'timeout' ? 'Out of time'
    : "Doesn't count";
  const pts = document.createElement('span');
  pts.className = 'pts';
  pts.textContent = `${r.score} ${r.score === 1 ? 'point' : 'points'}`;
  const head = document.createElement('span');
  head.className = 'verdict-word';
  head.innerHTML = markSvg(band(r));
  head.append(document.createTextNode(word));
  verdict.replaceChildren(head, pts);

  const facts = [];
  if (r.name && r.value !== null && r.value !== undefined) {
    facts.push(['You said', `${r.name}, ${formatValue(r.value, q)}`]);
    const side = r.value <= q.limit ? 'under' : 'over';
    facts.push(['Distance', r.value === q.limit ? 'Exactly on the line' : `${formatValue(Math.abs(q.limit - r.value), q)} ${side} the line`]);
  } else if (r.reason) {
    facts.push(['You said', r.name]);
    facts.push(['Why', r.reason]);
  }
  facts.push(['The line', `${under ? 'At most' : 'At least'} ${formatValue(q.limit, q)}`]);
  if (best) {
    facts.push(['Best answer', best.name === r.name ? `${best.name}. That's the closest anyone can get.` : `${best.name}, ${formatValue(best.value, q)}`]);
  }
  $('facts').innerHTML = '';
  for (const [k, v] of facts) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    $('facts').append(dt, dd);
  }

  const last = index === QUESTIONS_PER_DAY - 1;
  $('next-btn').textContent = last ? 'See your results' : 'Next question';
  // The verdict, facts and Next button wait for the pen to stop, so the chart is the only thing that tells.
  $('reveal').hidden = motion;
  $('pending').hidden = !motion;
  chart.reduced = reducedMotion.matches;
  // Cues sound only for an answer just given, never for a restored reveal.
  const cues = animate ? revealCues(r) : null;
  chart.showResult(q, shotFor(r), {
    id: `q${index}`,
    best: best && { value: best.value, name: best.name },
    answeredAt: answeredAt(r),
    animate: motion,
    onFrame: (out) => cues?.frame(out),
    onDone: () => {
      cues?.done();
      renderProgress();
      $('pending').hidden = true;
      $('reveal').hidden = false;
      $('next-btn').disabled = false;
      $('next-btn').focus({ preventScroll: true });
    },
  });
}

/** What the chart draws for a saved result: the answer's value, or nothing when it did not count. */
function shotFor(r) {
  const counted = r.value !== null && r.value !== undefined;
  return { value: counted ? r.value : null, name: r.name ?? null, outcome: r.outcome, score: r.score };
}

/** Seconds on the clock when the answer went in, for placing the pen's trace. */
function answeredAt(r) {
  return r.outcome === 'timeout' ? QUESTION_MS / 1000 : Math.min(QUESTION_MS / 1000, Math.max(0, QUESTION_MS / 1000 - (r.secondsLeft ?? 0)));
}

function next() {
  if (progress.done) showResults();
  else startQuestion(progress.current + 1);
}

// ---------------------------------------------------------------- results
let resetTimer = null;
function showResults() {
  const results = progress.results;
  const total = dailyTotal(results);
  setParts($('hdr-day'), [`#${day.day}`, day.theme]);
  $('total').textContent = String(total);
  setParts($('results-sub'), [`Lowball #${day.day}`, day.theme, override && 'practice']);

  const lineup = $('lineup');
  lineup.innerHTML = '';
  day.questions.forEach((q, i) => {
    const r = results[i];
    const li = document.createElement('li');
    li.innerHTML = sceneMarkup(q, r ? shotFor(r) : null, { id: `m${i}`, mini: true, answeredAt: r ? answeredAt(r) : undefined });
    const text = document.createElement('p');
    text.className = 'lineup-q';
    const ans = document.createElement('span');
    ans.className = 'lineup-a';
    ans.textContent = r?.name ?? (r?.outcome === 'timeout' ? 'Out of time' : '–');
    text.append(ans, document.createTextNode(q.prompt));
    const score = document.createElement('span');
    score.className = `lineup-s ${band(r)}`;
    score.innerHTML = markSvg(band(r) || 'none');
    score.append(document.createTextNode(r?.outcome === 'bust' ? 'BUST' : String(r?.score ?? 0)));
    li.append(text, score);
    lineup.append(li);
  });

  const card = buildShareText({ day: day.day, theme: day.theme, emoji: day.emoji, results });
  $('share-card').textContent = card;
  $('share-status').textContent = '';
  $('share-btn').hidden = !canNativeShare();

  const stats = computeStats(loadState().days, todayNumber());
  const rows = [
    ['Played', stats.played],
    ['Average', stats.average],
    ['Best', stats.best],
    ['Bullseyes', stats.bullseyes],
    ['Streak', stats.streak],
    ['Longest streak', stats.maxStreak],
  ];
  $('practice-note').hidden = !override;
  // A practice game has no history to show: no table of zeros.
  $('stat-grid').hidden = Boolean(override);
  $('histogram').hidden = Boolean(override);
  $('stat-grid').innerHTML = '';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = String(v);
    $('stat-grid').append(dt, dd);
  }
  const peak = Math.max(1, ...stats.histogram);
  $('histogram').innerHTML = '';
  $('histogram').setAttribute('aria-label', 'Your daily totals: ' + HISTOGRAM_BUCKETS.map((b, i) => `${b}: ${stats.histogram[i]}`).join(', '));
  HISTOGRAM_BUCKETS.forEach((b, i) => {
    const row = document.createElement('div');
    row.innerHTML = `<span>${b}</span><i style="width:${(stats.histogram[i] / peak) * 100}%"></i><span>${stats.histogram[i]}</span>`;
    $('histogram').append(row);
  });

  clearInterval(resetTimer);
  const tick = () => {
    const ms = Math.max(0, nextReset() - Date.now());
    const h = Math.floor(ms / 3.6e6);
    const m = Math.floor((ms % 3.6e6) / 6e4);
    const s = Math.floor((ms % 6e4) / 1000);
    $('next-in').textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  tick();
  resetTimer = setInterval(tick, 1000);
  show('screen-results');
  $('copy-btn').focus({ preventScroll: true });
}

// ---------------------------------------------------------------- empty
function showEmpty() {
  $('hdr-day').textContent = '';
  if (dayNumber < 1) {
    $('empty-title').textContent = 'Opening soon';
    $('empty-sub').textContent = `Lowball #1 opens ${niceDate(dateForDay(1))}`;
    $('empty-note').textContent = 'The first daily puzzle goes live at midnight US Eastern.';
  } else {
    $('empty-title').textContent = 'Not ready yet';
    $('empty-sub').textContent = `No puzzle for #${dayNumber} yet`;
    $('empty-note').textContent = "Today's puzzle isn't ready. Check back soon.";
  }
  show('screen-empty');
}

// ---------------------------------------------------------------- wiring
// Audio may only start after a gesture: the first click or key press unlocks it (Start is a click).
const unlockOnce = () => {
  unlock();
  document.removeEventListener('pointerdown', unlockOnce);
  document.removeEventListener('keydown', unlockOnce);
};
document.addEventListener('pointerdown', unlockOnce);
document.addEventListener('keydown', unlockOnce);

function renderSoundButton() {
  const btn = $('sound-btn');
  btn.textContent = isMuted() ? 'Sound off' : 'Sound on';
  btn.setAttribute('aria-pressed', String(!isMuted()));
}
setMuted(saved.muted);
renderSoundButton();
$('sound-btn').addEventListener('click', () => {
  setMuted(!isMuted());
  saved = { ...saved, muted: isMuted() };
  saveState(saved);
  renderSoundButton();
  unlock();
  if (!isMuted()) player.confirm();
});

$('start-btn').addEventListener('click', () => startQuestion(0));
$('answer-form').addEventListener('submit', submitAnswer);
$('next-btn').addEventListener('click', next);
$('help-btn').addEventListener('click', () => $('help').showModal());
$('help-key').innerHTML = [
  ['bull', '95–100'],
  ['close', '50–94'],
  ['safe', '1–49'],
  ['bust', 'bust'],
  ['none', "out of time or doesn't count"],
].map(([mark, text]) => `<span>${markSvg(mark)}${text}</span>`).join('');
$('copy-btn').addEventListener('click', async () => {
  const ok = await copyText($('share-card').textContent);
  $('share-status').textContent = ok ? 'Copied. Paste it anywhere.' : 'Copy didn’t work here. Select the text above and copy it.';
});
$('share-btn').addEventListener('click', () => nativeShare($('share-card').textContent));

async function boot() {
  setParts($('hdr-day'), override ? [`#${dayNumber}`, 'practice'] : []);
  day = await loadDay(dayNumber, { draft: useDraft });
  if (!day) return showEmpty();
  if (!override && !saved.seenHelp) {
    saved = { ...saved, seenHelp: true };
    saveState(saved);
  }
  if (progress.done) return showResults();
  const current = progress.current ?? 0;
  if (progress.results[current]) return showReveal(current, { animate: false });
  if (progress.startedAt) return startQuestion(current, { resume: true });
  showIntro();
}

boot();
