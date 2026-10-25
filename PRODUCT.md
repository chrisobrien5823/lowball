# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and vanilla JavaScript (ES modules), no build step. Chosen by the user during planning. Hosting is planned for a free static host (Netlify, Vercel, GitHub Pages or Cloudflare Pages); not decided.

## Users

Casual daily-puzzle players, on phones and desktops equally. Many arrive from a short-form video clip or a friend's share card. Others keep it as a daily ritual alongside games like Wordle. They play one short session a day, under two minutes, alone, then share the result in a group chat or on social media.

## Product Purpose

Lowball is a free daily baseball stats game: five questions, each setting a numeric line ("Name a Hall of Fame hitter with under 300 career home runs"). Players type one player or team per question against a 20-second timer and score more the closer they land to the line without crossing it. Success means players come back every day, keep their streaks, and share their results. The longer-term goal is $1–5k a month from light ads and paid theme packs, without ever paywalling the daily game.

## Positioning

Most trivia rewards knowing the right answer. Lowball rewards judging how close you dare to go: there are many valid answers, and the best one sits right next to the line. Baseball suits it because every fan carries milestone numbers in their head (300 homers, 3,000 hits, 300 wins), and the pull is to name a lesser player whose stat you half-remember so you do not go over. Every question is a risk decision, and a bust is as shareable as a bullseye.

## Operating Context

- One scored attempt per day, the same five questions for everyone. The puzzle resets at midnight US Eastern.
- Each question shows a theme, a prompt with a direction ("under" or "over") and a limit, the single data source its numbers come from (named under the prompt, before any answer), and a 20-second countdown.
- After each answer a reveal shows your value, your distance from the line, and the best possible answer. The source is not repeated there; it was already on the question.
- A results screen shows the share card (plain text: theme, points per question, total out of 500, site link), a streak and stats, and a countdown to the next puzzle.
- If a player types a recognized name that can't count (a real player outside the question's group such as Mike Trout for a Hall of Fame question, or a name two people share like "Griffey" or "New York"), the game says why and lets them try again on the same clock. Nothing recognized scores 0 on its own; a question only ends without a score by timing out, so ⬜ now means a timeout.
- Short-form video clips of the timer and the reveal are a primary growth channel.

## Capabilities and Constraints

- No accounts; progress, streak and stats live in the browser's localStorage.
- Day files are static JSON in `content/days/`, produced by the content pipeline in `content-pipeline/` and approved in the Lowball Review artifact.
- Answers ship in the page for the MVP, so players with browser tools can see them; server-side validation comes later.
- Scoring: a curve, not a line (`src/score.js`). Points = 100 × closeness³, rounded, where closeness is value ÷ limit on MAX questions and limit ÷ value on MIN questions. Points rise more steeply near the line: 50% of the way earns 13, 80% earns 51, 90% earns 73, 95% earns 86, 99% earns 97. The exponent is one constant (`CURVE`) and can be retuned after playtesting. Result bands are by points: bullseye 95–100, close 50–94, safe 1–49, then bust, and timeout or invalid.
- The question screen is a clean line chart: a pen trace against a red limit line. The pen's height is the value the player named, on a real axis in the question's units; points are only what that value earns. MAX questions climb toward a line near the top and MIN questions flip the chart, so the pen always travels toward the line and the trip zone is always the bust side. The reveal is a gradual climb of about 2.5 to 4 seconds, and the verdict, facts and result chip stay hidden until the pen has stopped. On desktop the chart takes the window; phones keep a single column.
- Sound: short synthesized cues (pen-climb blips, a bust sting, a resolve on a result, a timeout buzz, countdown ticks in the last five seconds). Audio starts only after a first click or key press. A Sound button in the top bar mutes it, remembered in localStorage; sound is on by default. Every cue has an always-visible twin (the pen, the line flash and BUST tag, the verdict and its mark, the countdown numeral blinking), so a muted player loses nothing.
- Undecided: final name and domain, whether to keep 5 questions and 20 seconds, ads, paid packs, percentiles, and an archive.

## Brand Commitments

- "Lowball" is a working name. Don't build the identity around the word itself, so a rename stays cheap.
- The share card is plain text, with no emoji (the owner asked for a professional look on 2026-10-25): `Lowball #12 · Mix Tape`, then points per question separated by dots (`98 · 74 · BUST · 61 · TIME`), then `328 / 500`, then the site URL.
- No emoji anywhere: not in the interface, the share card, day themes or content.
- Must not feel like a casino or betting product, a busy gamified app (badges, coins, confetti, popups between questions), or a cold data dashboard.
- The chart is a plain stat chart, not a market: no tickers, prices, up and down arrows, green and red gains, candles, or currency framing around the pen. The line is a limit, never a stake.

## Evidence on Hand

- Seven sample MLB days built from the SABR Lahman Baseball Database, 2025 edition (`content-pipeline/02_drafts/`), not yet through the agent checks or approved for publishing. Each day mixes statistics and seasons (2000 to 2025, never the 60-game 2020 year): hitters and pitchers drawn from wide pools (200+ at-bats, 50+ innings) so bench players and relievers are viable answers, plus two team-standings days. The line sits around the 70th to 80th percentile, so there are dozens of players to choose from and the best answer is rarely a star.
- The earlier country version (World Bank data, island, EU and world questions) is kept whole in `archive/countries-2026-10-25/` to come back to later.
- No logo, no players, no testimonials, no press. Future work must not invent player counts, ratings or quotes.
- Every number comes from one reputable source per question (currently the SABR Lahman Baseball Database, 2025 edition, AL and NL regular seasons only), shown on the question itself so a player can check a single source instead of comparing several. The Lahman license page is silent for the 2025 edition (earlier editions were CC BY-SA 3.0): confirm before launch.

## Product Principles

1. The line is the game: every screen should make the distance to the line obvious.
2. Tension, then a clear verdict: the timer builds pressure, and the reveal pays it off in one glance.
3. Fair beats clever: sources are shown, rules are predictable, and a player is never punished for the data's gaps.
4. One minute, once a day: nothing stands between the player and the next question.
5. Built to be filmed and shared: the reveal and the share card must read on a phone screen in a video.

## Accessibility & Inclusion

Results must never rely on color alone (a mark shape plus a word or number). Respect `prefers-reduced-motion`. Keyboard play must work fully on desktop.
