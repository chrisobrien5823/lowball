// Result marks drawn as small indicator lamps, one stroke weight. Each band has its
// own shape as well as its own color. Emoji stay in the share card text only.

const SHAPES = {
  bull: '<circle cx="12" cy="12" r="10" class="m-pen"/><circle cx="12" cy="12" r="5.8" class="m-ring"/><circle cx="12" cy="12" r="2" class="m-dot"/>',
  close: '<circle cx="12" cy="12" r="10" class="m-ok"/>',
  safe: '<circle cx="12" cy="12" r="8.8" class="m-ok-ring"/>',
  bust: '<path d="M12 2.6 22 20.4H2z" class="m-trip"/><path d="M12 9v5.2" class="m-bar"/><circle cx="12" cy="17.2" r="1.2" class="m-dot"/>',
  none: '<rect x="3" y="3" width="18" height="18" rx="3" class="m-none"/>',
};

/** An inline SVG mark for a result band ('bull' | 'close' | 'safe' | 'bust' | 'none'). */
export function markSvg(band) {
  return `<svg class="mark" viewBox="0 0 24 24" aria-hidden="true">${SHAPES[band] ?? SHAPES.none}</svg>`;
}
