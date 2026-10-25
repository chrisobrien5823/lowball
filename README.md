# Lowball

A daily baseball stats game that runs in the browser. Five questions a day each set a numeric line, for example "Name a hitter with under 20 home runs, in 2004". You name one player or team against a 20-second clock and score more the closer you land to the line without crossing it.

The tension is the pull of a lesser-known name. Everyone can think of a star who clears the line; the best answer is usually the bench player whose total you half-remember.

## How it plays

- **A line, not a trivia answer.** Each question is a MAX line (stay under) or a MIN line (reach it). Many players qualify; the closest one that does not cross scores the most.
- **Points follow a curve.** Points = 100 x closeness cubed, so the last stretch before the line pays the most: 90% of the way is worth 73, 99% is worth 97. Crossing the line is a bust and scores 0.
- **The chart is the value, not the points.** The pen's height is the number you named, on a real axis in the question's own units. MIN questions flip the chart so the pen always travels toward the line.
- **The answer stays hidden until the pen stops.** The reveal is a gradual climb of a few seconds; the verdict appears only when it settles.
- **Mistakes are forgiven.** A real player outside the question's group, or a name two people share ("Griffey", "New York"), gets an explanation and another try on the same clock.
- **Every question names its one source.** All numbers on a question come from a single cited dataset, shown under the prompt before you answer.
- **Sound is optional.** Short synthesized cues (a Sound button in the top bar mutes them), and every cue has a visual equivalent.

One scored attempt per day, the same five questions for everyone, resetting at midnight US Eastern. Progress and stats live in the browser's `localStorage`; there are no accounts.

## Run it

Requires a current Node.js (developed on Node 24). There are no dependencies and no build step.

```bash
npm run serve        # dev server on http://localhost:5173
npm test             # unit tests (node:test)
```

Open `http://localhost:5173/?day=1&draft` to play a draft day. `?day=N` is a practice play: it lives in `sessionStorage` and never touches stats. Without `?day`, the game loads today's puzzle (day 1 is 2026-11-01). Published days are read from `content/days/`; drafts come from `content-pipeline/02_drafts/`.

## Content pipeline

Daily content is made by code from dataset snapshots, then checked by agents and approved by a person. No number is ever typed by hand.

```bash
npm run fetch-data                  # snapshot the Lahman database into content-pipeline/01_datasets/
npm run build-day                   # day specs -> content-pipeline/02_drafts/day-NNNN.json
npm run validate                    # code checks on draft and published days
npm run report -- <init|needs|merge|finalize|bundle>   # agent-check bookkeeping
```

To add a day, write a spec in `content-pipeline/02_drafts/day-NNNN.spec.json` (a theme and five questions), build and validate it, then run the `verify-day` skill in `.claude/skills/` for the independent fact-check and an adversarial player pass. Only days approved in the review dashboard are copied to `content/days/`. See [content-pipeline/README.md](content-pipeline/README.md) for the full process.

Questions draw on wide pools (hitters with 200+ at-bats, pitchers with 50+ innings, every team in a season) so that lesser-known players are viable answers. Each day mixes statistics and seasons.

## Project layout

| Path | What it holds |
|---|---|
| `index.html`, `styles.css` | The single page and all styles, with light and dark themes |
| `src/main.js` | The screen flow: intro, question, reveal (five times), results |
| `src/score.js` | All scoring. The points curve is one constant, `CURVE` |
| `src/match.js` | Answer matching: normalization, aliases, typo tolerance |
| `src/content.js` | Loads day files and expands them |
| `src/scene.js` | The chart: value axis, flipped MIN charts, the reveal animation |
| `src/sound.js` | Synthesized audio cues (Web Audio) |
| `src/share.js`, `src/stats.js`, `src/storage.js`, `src/timer.js`, `src/date.js`, `src/format.js`, `src/marks.js` | Share card, stats, local storage, clock, day numbering, number formatting, result marks |
| `content-pipeline/` | Dataset snapshots, day specs, reports and the review dashboard |
| `tools/` | The content scripts |
| `tests/` | Unit tests |
| `archive/` | The earlier country-trivia version and the earlier visual design, kept for reference |

Product intent is in [PRODUCT.md](PRODUCT.md), the visual system in [DESIGN.md](DESIGN.md), and working notes for contributors in [CLAUDE.md](CLAUDE.md).

## Data and licensing

Baseball numbers come from the [SABR Lahman Baseball Database](https://sabr.org/lahman-database/) (2025 edition, American and National League regular seasons). Earlier Lahman editions were released under CC BY-SA 3.0, but the 2025 download page states no license, so confirm the terms with SABR before relying on this data in a public product. The Negro Leagues rows in the database are licensed to SABR by Seamheads.com and are deliberately left out of the snapshots.

No license is set for the code in this repository yet.

## Status

An early build. Seven draft days exist and pass the code checks; they have not been through the agent fact-checks or been approved for publishing. The product name and domain are undecided. The sound has been tested by logic and unit tests but not yet by ear on real speakers.
