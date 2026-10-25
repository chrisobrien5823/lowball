// Numbers as they appear on signs and in the reveal.

function compactUsd(v) {
  const abs = Math.abs(v);
  const fixed = (n) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
  if (abs >= 1e12) return `$${fixed(abs / 1e12)} trillion`;
  if (abs >= 1e9) return `$${fixed(abs / 1e9)} billion`;
  if (abs >= 1e6) return `$${fixed(abs / 1e6)} million`;
  return `$${Math.round(abs).toLocaleString('en-US')}`;
}

/** The bare number, e.g. "458,949", "$9,913", "$102 billion", "81.0". */
export function formatNumber(value, format) {
  if (value === null || value === undefined) return '–';
  if (format === 'dec1') return Math.abs(value).toFixed(1);
  if (format === 'usd') return `$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
  if (format === 'usd-big') return compactUsd(value);
  return Math.round(Math.abs(value)).toLocaleString('en-US');
}

/** The number with its unit, e.g. "458,949 people", "960 km²", "81.0 years". */
export function formatValue(value, { format, unit }) {
  const n = formatNumber(value, format);
  if (unit === 'US$' || n === '–') return n;
  if (unit === 'km²') return `${n} km²`;
  return `${n} ${unit}`;
}

/** Short form for signs: "500K", "100M", "$20B", "80". */
export function formatSign(value, format) {
  const usd = format === 'usd' || format === 'usd-big';
  if (format === 'dec1') return value.toFixed(value % 1 ? 1 : 0);
  const abs = Math.abs(value);
  const unit = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ].find(([n]) => abs >= n && abs >= 1e4 && abs % (n / 10) === 0);
  const body = unit ? `${String(abs / unit[0])}${unit[1]}` : abs.toLocaleString('en-US');
  return usd ? `$${body}` : body;
}
