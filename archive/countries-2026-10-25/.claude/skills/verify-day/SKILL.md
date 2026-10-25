---
name: verify-day
description: Run Lowball's content checks on one or more draft days - build, validate, independent fact-checking against a second source, an adversarial player pass, and a report for the Lowball Review dashboard. Use when asked to verify, check, or review days of Lowball content.
---

# Verify Lowball days

Agents gather **evidence**. They never decide pass or fail, and they never edit data.
`tools/report.mjs` applies fixed rules to the evidence (see `judgeCheck`), and the
person approves in the Lowball Review dashboard.

Arguments: day numbers (e.g. `8 9 10`). With none, use every `content-pipeline/02_drafts/day-*.spec.json`
that has no `content-pipeline/03_reports/day-NNNN.json` yet.

## 1. Build and validate (free, deterministic)

```bash
node tools/build-day.mjs <days>
node tools/validate-content.mjs content-pipeline/02_drafts
```

If validation fails, fix the **spec** (limit, prompt or group), not the day file, then rebuild.
Never edit `01_datasets/*.csv`: its fingerprint is checked.

## 2. Prepare the evidence

```bash
node tools/report.mjs init <days>
node tools/report.mjs needs <days>
```

`content-pipeline/03_reports/work/needs.json` lists, per field, the countries whose values could change a
player's result (the ones closest to the line on both sides).

## 3. Launch the agents in parallel (one message, several Agent calls)

Give each agent a fresh context and **do not share our values' reasoning with them**. Each one writes
one file and reports back in a sentence.

### Fact-checkers: one per field in needs.json

Prompt each with the field, the unit, the country list from needs.json (iso3 and name), and these rules:

- Find **one independent source** with a table covering most of the countries, for a year as close as
  possible to ours (2023). Fetch the table and read the values from it. Never give a number from memory.
- "Independent" means not the World Bank and not a direct republication of it. World Bank population and
  life expectancy figures are derived from UN World Population Prospects, so for those prefer national
  statistics offices, Eurostat, or another compiler that publishes its own estimates.
  Good options: IMF World Economic Outlook (GDP, GDP per person), Eurostat, UN Statistics Division
  Demographic Yearbook (area), WHO Global Health Observatory (life expectancy).
- If no single table covers a country, look up that country separately, and set a per-country `url`.
- Leave a country out rather than guess.
- Write `content-pipeline/03_reports/work/source-<field>.json`:

```json
{
  "field": "population",
  "source": { "title": "…", "publisher": "…", "url": "https://…", "year": 2023, "independentOf": "why this isn't World Bank data" },
  "values": { "BRN": { "value": 455500 }, "BHS": { "value": 401283, "url": "https://… (only if different from source.url)" } }
}
```

Values go in the same unit as ours (people, km², US$, years). Convert millions or billions into plain numbers.

### Adversarial player: one agent for all the days

Give it each day's questions (prompt, direction, limit and group label from the day file), the group
rules in `content-pipeline/01_datasets/groups.json`, and the name list and `extras` from the day file. Ask it to
try to break each question **as a player would**:

- `missing-answer`: something players will reasonably type that isn't recognized at all.
- `missing-alias`: a common spelling or short name that doesn't match.
- `membership`: a country whose inclusion or exclusion players will dispute. Consult the group's `rule` and `notes`.
- `ambiguous-wording`: a prompt that can be read two ways (e.g. "over" vs "at least", nominal vs PPP GDP).

Mark a finding `"blocking": true` only if a reasonable player would feel cheated. Write
`content-pipeline/03_reports/work/adversarial.json`, keyed by question id:

```json
{ "d1q1": [{ "kind": "membership", "text": "…", "suggestion": "…", "blocking": false }] }
```

## 4. Merge, finalize, bundle

```bash
node tools/report.mjs merge <days>
node tools/report.mjs finalize <days>
node tools/report.mjs bundle
```

Read the finalized reports. For each **blocking** finding, fix the cause where it is clear: an alias in
`countries.json`, a recognized place in `otherPlaces`, a group reason or note, or a clearer prompt or moved
limit in the spec. Then rerun from step 1 for that day.

- Add a regression case to `tests/content.test.mjs` for every input you fixed.
- Record the fix in `03_reports/work/resolutions.json` under `"<question id>#<finding index>"`. `finalize`
  then shows it as fixed, and it stops blocking. Only record a fix that a test proves.

Value disagreements stay flagged for the person, because only they can pick which source is right.

## 5. Update the dashboard

Republish the Lowball Review artifact with the new `review-bundle.json` (see `content-pipeline/README.md`).
Report how many questions are clear or flagged, with the flagged ones listed in one line each.
