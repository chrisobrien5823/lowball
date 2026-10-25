// Everything the game remembers lives under one versioned localStorage key.
// Storage can be missing or blocked (private mode, previews), so every access
// is wrapped and falls back to memory for the current visit.

export const STORAGE_KEY = 'lowball:v1';

const empty = () => ({ v: 1, seenHelp: false, muted: false, days: {} });

let memory = null;

function backend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadState() {
  if (memory) return memory;
  let state = empty();
  try {
    const raw = backend()?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 1 && typeof parsed.days === 'object') state = { ...empty(), ...parsed };
    }
  } catch {
    // Corrupt or unreadable: start fresh.
  }
  memory = state;
  return state;
}

export function saveState(state) {
  memory = state;
  try {
    backend()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or blocked storage: keep the in-memory copy.
  }
}

/** Progress for one day: { results: [], current, startedAt, done }. */
export function dayProgress(state, day) {
  return state.days[day] ?? { results: [], current: 0, startedAt: null, done: false };
}

export function updateDay(state, day, progress) {
  const next = { ...state, days: { ...state.days, [day]: progress } };
  saveState(next);
  return next;
}

/** For tests. */
export function resetMemory() {
  memory = null;
}
