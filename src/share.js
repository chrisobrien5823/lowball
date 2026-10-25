// The share card, and getting it onto the player's clipboard.

import { markFor, dailyTotal, MAX_DAILY } from './score.js';

// The name and domain aren't decided (PRODUCT.md), so the card links wherever the game is
// actually served. 'lowball.xyz' is only the planning doc's placeholder, used outside a browser.
export const SITE_URL = globalThis.location?.host || 'lowball.xyz';

export function buildShareText({ day, theme, results, url = SITE_URL }) {
  return [
    `Lowball #${day} · ${theme}`,
    results.map(markFor).join(' · '),
    `${dailyTotal(results)} / ${MAX_DAILY}`,
    url,
  ].join('\n');
}

/** Copy text; returns true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers or no permission: fall back to a hidden textarea.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function canNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches;
}

export async function nativeShare(text) {
  try {
    await navigator.share({ text });
    return true;
  } catch {
    return false;
  }
}
