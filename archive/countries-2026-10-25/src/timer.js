// The 20-second countdown. It is driven by the saved start time, so a reload
// resumes the same clock instead of resetting it.

export const QUESTION_MS = 20_000;

export function remainingMs(startedAt, now = Date.now()) {
  return Math.max(0, QUESTION_MS - (now - startedAt));
}

/** Calls onTick(secondsLeft) whenever the displayed second changes, then onExpire once. */
export function startCountdown(startedAt, { onTick, onExpire }) {
  let timer = null;
  let shown = null;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const ms = remainingMs(startedAt);
    const seconds = Math.ceil(ms / 1000);
    if (seconds !== shown) {
      shown = seconds;
      onTick(seconds);
    }
    if (ms <= 0) {
      stopped = true;
      onExpire();
      return;
    }
    timer = setTimeout(tick, Math.min(100, ms));
  };
  tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
