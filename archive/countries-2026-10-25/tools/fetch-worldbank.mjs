// Stage 1: snapshot World Bank country data into content-pipeline/01_datasets/.
// Every number in a day file is copied from this snapshot, never typed by hand.
//
//   node tools/fetch-worldbank.mjs [year]

import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'content-pipeline', '01_datasets');
const YEAR = Number(process.argv[2] ?? 2023);
const API = 'https://api.worldbank.org/v2';

export const INDICATORS = {
  population: { code: 'SP.POP.TOTL', label: 'Population, total', decimals: 0 },
  area_km2: { code: 'AG.SRF.TOTL.K2', label: 'Surface area (sq. km)', decimals: 0 },
  gdp_usd: { code: 'NY.GDP.MKTP.CD', label: 'GDP (current US$)', decimals: 0 },
  gdp_per_capita_usd: { code: 'NY.GDP.PCAP.CD', label: 'GDP per capita (current US$)', decimals: 0 },
  life_expectancy: { code: 'SP.DYN.LE00.IN', label: 'Life expectancy at birth, total (years)', decimals: 1 },
};

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'lowball-content-pipeline/0.1' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const body = await res.json();
  if (!Array.isArray(body) || !Array.isArray(body[1])) throw new Error(`Unexpected response from ${url}`);
  return body[1];
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const countriesUrl = `${API}/country?format=json&per_page=400`;
  const countries = (await getJson(countriesUrl)).filter((c) => c.region.value !== 'Aggregates');

  const rows = new Map(
    countries.map((c) => [
      c.id,
      { iso3: c.id, wb_name: c.name, region: c.region.value.trim(), income: c.incomeLevel.value.trim(), capital: c.capitalCity },
    ]),
  );

  const urls = { countries: countriesUrl };
  for (const [field, ind] of Object.entries(INDICATORS)) {
    const url = `${API}/country/all/indicator/${ind.code}?date=${YEAR}&format=json&per_page=400`;
    urls[field] = url;
    for (const obs of await getJson(url)) {
      const row = rows.get(obs.countryiso3code);
      if (!row) continue; // aggregates
      row[field] = obs.value === null ? null : Number(obs.value.toFixed(ind.decimals));
    }
  }

  const header = ['iso3', 'wb_name', 'region', 'income', 'capital', ...Object.keys(INDICATORS)];
  const lines = [header.join(',')];
  for (const row of [...rows.values()].sort((a, b) => a.iso3.localeCompare(b.iso3))) {
    lines.push(header.map((h) => csvCell(row[h])).join(','));
  }
  const csv = lines.join('\n') + '\n';

  const id = `worldbank-${YEAR}`;
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, `${id}.csv`), csv);
  await writeFile(
    path.join(OUT_DIR, `${id}.meta.json`),
    JSON.stringify(
      {
        id,
        title: 'World Bank World Development Indicators',
        publisher: 'World Bank',
        license: 'CC BY 4.0',
        year: YEAR,
        retrieved: new Date().toISOString(),
        sha256: createHash('sha256').update(csv).digest('hex'),
        key: 'iso3',
        fields: INDICATORS,
        urls,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Wrote ${id}.csv (${rows.size} countries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
