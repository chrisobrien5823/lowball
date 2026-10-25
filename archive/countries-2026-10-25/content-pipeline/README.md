# Lowball content pipeline

Each day of questions goes through four stages before players see it. Agents gather evidence, code
applies fixed rules to that evidence, and you approve. Nothing here uses the paid API: the agents run
as Claude Code sessions on your plan.

| Stage | Where | What happens |
|---|---|---|
| 1. Data | `01_datasets/` | Dataset snapshots (CSV) with source URLs and a sha256 fingerprint. `countries.json` holds names and aliases; `groups.json` holds membership rules (only `sovereign`, `eu` and `island-nations`: no continent or region groups, since players cannot be expected to know where a region ends). No number is ever typed by hand. |
| 2. Code checks | `tools/validate-content.mjs` | Values match the snapshot, every group member is listed, the line is well placed, and no alias collides with another country. |
| 3. Agent checks | `03_reports/` | Fact-checkers compare the answers closest to the line against an independent source. An adversarial player looks for answers, aliases or wording that would feel unfair. `tools/report.mjs` turns the evidence into a clear or flagged verdict. |
| 4. Review | Lowball Review artifact | You approve each question or send it back with a note. Decisions are saved in the artifact and read back by Claude. |

## Making a new day

1. Write `02_drafts/day-NNNN.spec.json`, with a theme, an emoji and five questions (group, field, direction, limit, prompt).
2. Ask Claude to run the **verify-day** skill for that day. It runs every command below and launches the agents.
3. Review the day in Lowball Review.
4. Ask Claude to publish the approved days. They are copied into `content/days/`.

## Commands

```bash
npm run fetch-data                    # refresh the World Bank snapshot (changes the fingerprint)
npm run build-day -- 8                # spec -> 02_drafts/day-0008.json
npm run validate                      # stage 2 on drafts and published days
npm run report -- init 8              # evidence skeleton for the agents
npm run report -- needs 8             # what each fact-checker must look up
npm run report -- merge 8             # copy agent results into the evidence
npm run report -- finalize 8          # apply the rules, write 03_reports/day-0008.json
npm run report -- bundle              # 03_reports/review-bundle.json for the dashboard
```

## When review stops being needed

The dashboard's track record counts the problems you catch that the agents missed.

- **Launch:** you review every question.
- **After 30 clean days in a row** (no misses): days where every question is clear are approved automatically, and you review only flagged questions.
- **Later:** you spot-check about one auto-approved day in ten, and a "Report a problem" link on the reveal screen catches anything that slips through.

A single miss resets the count.

## Lessons from the first run

The first seven days put many lines within a few percent of a country's value to make bullseyes
possible. Independent sources often disagree by that much, especially on population and life
expectancy, so those questions were flagged. When writing specs, keep the answers nearest the line
at least 5% away from it, unless the two sources agree.
