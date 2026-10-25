# Lowball content pipeline

Each day of questions goes through four stages before players see it. Agents gather evidence, code
applies fixed rules to that evidence, and you approve. Nothing here uses the paid API: the agents run
as Claude Code sessions on your plan.

| Stage | Where | What happens |
|---|---|---|
| 1. Data | `01_datasets/` | Dataset snapshots (CSV) with source URLs and a sha256 fingerprint. `groups.json` holds membership rules (a group is a set of rows chosen by plain rules, or a template taking a season such as `hitters-2023`). Names and aliases come from the data: a surname, a team nickname, a unique city or an abbreviation, with shared ones answered by "More than one fits…". No number is ever typed by hand. |
| 2. Code checks | `tools/validate-content.mjs` | Values match the snapshot, every group member is listed, the line is well placed, and no name or alias is claimed by two entries. |
| 3. Agent checks | `03_reports/` | Fact-checkers compare the answers closest to the line against an independent source. An adversarial player looks for answers, aliases or wording that would feel unfair. `tools/report.mjs` turns the evidence into a clear or flagged verdict. |
| 4. Review | Lowball Review artifact | You approve each question or send it back with a note. Decisions are saved in the artifact and read back by Claude. |

## Making a new day

1. Write `02_drafts/day-NNNN.spec.json`, with a theme and five questions (group, field, direction, limit, prompt).
2. Ask Claude to run the **verify-day** skill for that day. It runs every command below and launches the agents.
3. Review the day in Lowball Review.
4. Ask Claude to publish the approved days. They are copied into `content/days/`.

## Commands

```bash
npm run fetch-data                    # refresh the Lahman snapshots (changes the fingerprints)
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

## Lessons

The earlier country days put lines within a few percent of a value, and independent sources often
disagreed by that much, so those questions were flagged. Baseball counting stats are official and
sources agree to the unit, so a milestone line (300 home runs, 3,000 hits) can sit exactly on a
player's total: that is the fun of it. Expect the second source to differ only for players whose
career includes other leagues, or for recent seasons not yet corrected.
