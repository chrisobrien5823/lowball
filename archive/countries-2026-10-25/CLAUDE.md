# Lowball

A daily browser trivia game. Five questions a day each set a numeric line ("Name an island country with a population under 500,000"); the player names one country per question against a 20-second clock and scores more the closer they land to the line without crossing it.

Read `PRODUCT.md` for product truth, `DESIGN.md` for the current visual system, and `content-pipeline/README.md` for how daily content is made and checked.

## Commands

```bash
npm test                 # unit tests (node:test, no dependencies)
npm run validate         # code checks on draft and published day files
npm run build-day        # day specs -> content-pipeline/02_drafts/day-NNNN.json
npm run report -- <cmd>  # agent-check bookkeeping: init | needs | merge | finalize | bundle
npm run serve            # dev server on http://localhost:5173 (also .claude/launch.json "lowball")
```

Play a draft day locally with `http://localhost:5173/?day=1&draft`. `?day=N` is a practice play: it lives in sessionStorage and never touches stats. Without `?day`, the game loads today's puzzle (day 1 = 2026-11-01, reset at midnight US Eastern).

## Layout

- `index.html`, `styles.css`: the single page and all styles (color tokens with light and dark themes). Below 960px the game is one column; from 960px the play screen is a left rail (progress, limit plaque, prompt, answer or reveal) beside the recorder window, and the intro and results screens go two-column.
- `src/main.js`: the screen state machine (intro → question → reveal ×5 → results).
- `src/score.js`: all scoring (`pointsFor`, `closeness`, `evaluate`, result bands). The points curve is the `CURVE` exponent (points = 100 × closeness^CURVE); change it here only.
- `src/match.js`: answer matching (normalization, aliases, typo tolerance, tie-breaks).
- `src/content.js`: loads day files and expands them (`hydrateDay`); `excluded` entries with `retry: true` let the player guess again.
- `src/scene.js`: the recorder chart. The pen's height is the answer's value on a real axis (`axisFor`; MIN questions are flipped), and points only show as a tag; `ChartView` draws it in CSS pixels, runs the idle pen while a question is open and plays the reveal. `src/marks.js`: result marks (indicator lamps). `src/format.js`: number formatting.
- `src/sound.js`: audio cues (Web Audio, no files). `revealCues` and `tickFor` hold the cue logic and take an injected player so tests run without audio; `unlock()` runs on the first click or key press.
- `src/timer.js`, `src/date.js`, `src/storage.js`, `src/stats.js`, `src/share.js`: clock, day numbering, localStorage, stats, share card.
- `content-pipeline/`: datasets, day specs, agent reports and the Lowball Review dashboard source. `tools/`: the content scripts. `.claude/skills/verify-day/`: the agent-check skill.
- `workflows/impeccable/`: vendored Impeccable design guides (Markdown only). Its scripts are not installed; never run or install them without asking.

## Rules

- Numbers in day files come only from dataset snapshots in `content-pipeline/01_datasets/`. Never type a value by hand; never edit a snapshot CSV (its fingerprint is checked).
- Only days approved in the Lowball Review dashboard get copied to `content/days/`.
- Every fix to matching or content gets a regression case in `tests/`.
- UI work follows the Impeccable guides: `PRODUCT.md`, then a direction contract in `.impeccable/surfaces/`, `craft-floor.md` before editing, at most two inspection rounds, a fresh finish review, then `DESIGN.md` from the built result.
- The share card text format is fixed (see `PRODUCT.md`); emoji appear in that text only.

## Planned changes (requested 2026-10-24)

Done 2026-10-24: **1. Full-window desktop layout** and **2. Recorder chart with a points curve.** The road-signage world was replaced by a chart-recorder world (direction contract in `.impeccable/surfaces/game.md`, system in `DESIGN.md`). Points = 100 × closeness³, chosen with the owner; the exponent is one constant to retune after playtesting. The numbering is kept so older notes still match.

3. **Sound.** Done 2026-10-25 (`src/sound.js`, synthesized with Web Audio; the Sound button in the top bar is the mute toggle, saved as `muted` in localStorage; each cue's visual twin is listed in `DESIGN.md`). Original request: add short audio cues that build tension while numbers move: blips as the value climbs, a sting on bust, a resolve on a close call, and countdown ticks near the end.
   - Audio can only start after a user gesture (the Start button).
   - Add a visible mute toggle and remember it in localStorage.
   - Keep files tiny, or synthesize the sounds with the Web Audio API.
   - Give every cue a visual equivalent, so muted players lose nothing.

4. **Retry on out-of-category answers.** Done 2026-10-25, with the data source moved onto the question (under the prompt, not in the reveal) so one source is visible before answering. Original request: a real country outside the question's group (e.g. Norway for an island question) currently scores 0 with a reason. Change it so the player sees the reason and guesses again on the same clock, like territories and countries without data already do.
   - Where: the non-retry branch in `hydrateDay` (`src/content.js`) and `submitAnswer` (`src/main.js`).
   - Update the help dialog copy, `PRODUCT.md` (Operating Context) and the tests in `tests/content.test.mjs`.
   - Check the effect on the "Doesn't count" verdict and the ⬜ band, which may then only mean a timeout.

## Content rule

Question groups are limited to things a player can look up and agree on: all UN member states (`sovereign`), the EU, or island countries. No continent or region groups, because players do not know where a region's edges are. Add a group only if its membership is a published fact.

## Known open items

- `DESIGN.md` → "Known gaps and open decisions" lists the remaining design issues from the recorder redesign (unused recorder devices, decorative idle-pen creep, unused theme-switch hooks, review captures not taken).
- Days 3, 4 and 5 were rewritten on 2026-10-25 when the regional groups (Africa, Latin America, East/Southeast/South Asia) were removed. They validate in code but have not been through the agent checks yet: run the verify-day skill on days 3 to 5 before approving them. Their old reports are in `content-pipeline/03_reports/archive-regional-days/`.
- 14 sample questions are flagged in the Lowball Review dashboard for source disagreements and need the owner's decision.
- Unrecognized input now allows a retry instead of scoring 0. This is a deliberate change from the original planning doc, pending the owner's confirmation.
- The final name and domain are undecided; the share card uses the serving host.
