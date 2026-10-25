# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and vanilla JavaScript (ES modules), no build step. Chosen by the user during planning. Hosting is planned for a free static host (Netlify, Vercel, GitHub Pages or Cloudflare Pages); not decided.

## Users

Casual daily-puzzle players, on phones and desktops equally. Many arrive from a short-form video clip or a friend's share card. Others keep it as a daily ritual alongside games like Wordle. They play one short session a day, under two minutes, alone, then share the result in a group chat or on social media.

## Product Purpose

Lowball is a free daily trivia game: five questions, each setting a numeric line ("Name an island country with a population under 500,000"). Players type one answer per question against a 20-second timer and score more the closer they land to the line without crossing it. Success means players come back every day, keep their streaks, and share their results. The longer-term goal is $1–5k a month from light ads and paid theme packs, without ever paywalling the daily game.

## Positioning

Most trivia rewards knowing the right answer. Lowball rewards judging how close you dare to go: there are many valid answers, and the best one sits right next to the line. Every question is a risk decision, and a bust is as shareable as a bullseye.

## Operating Context

- One scored attempt per day, the same five questions for everyone. The puzzle resets at midnight US Eastern.
- Each question shows a theme, a prompt with a direction ("under" or "over") and a limit, the single data source its figures come from (named under the prompt, before any answer), and a 20-second countdown.
- After each answer a reveal shows your value, your distance from the line, and the best possible answer. The source is not repeated there; it was already on the question.
- A results screen shows the share card (emoji row, total out of 500, site link), a streak and stats, and a countdown to the next puzzle.
- If a player types a recognized place that can't count (a real country outside the question's group such as Norway for an island question, a territory, a country missing from the data, an ambiguous name like "Congo"), the game says why and lets them try again on the same clock. Nothing recognized scores 0 on its own; a question only ends without a score by timing out, so ⬜ now means a timeout.
- Short-form video clips of the timer and the reveal are a primary growth channel.

## Capabilities and Constraints

- No accounts; progress, streak and stats live in the browser's localStorage.
- Day files are static JSON in `content/days/`, produced by the content pipeline in `content-pipeline/` and approved in the Lowball Review artifact.
- Answers ship in the page for the MVP, so players with browser tools can see them; server-side validation comes later.
- Scoring: a curve, not a line (`src/score.js`). Points = 100 × closeness³, rounded, where closeness is value ÷ limit on MAX questions and limit ÷ value on MIN questions. Points rise more steeply near the line: 50% of the way earns 13, 80% earns 51, 90% earns 73, 95% earns 86, 99% earns 97. The exponent is one constant (`CURVE`) and can be retuned after playtesting. Result bands are by points: 🎯 95–100, 🟢 50–94, 🟡 1–49, 💥 bust, ⬜ timeout or invalid.
- The question screen is a chart recorder: a pen trace against a red trip line. The pen's height is the value the player named, on a real axis in the question's units; points are only what that value earns. MAX questions climb toward a line near the top and MIN questions flip the chart, so the pen always travels toward the line and the trip zone is always the bust side. The reveal is a gradual climb of about 2.5 to 4 seconds, and the verdict, facts and result chip stay hidden until the pen has stopped. On desktop the chart takes the window; phones keep a single column.
- Sound: short synthesized cues (pen-climb blips, a bust sting, a resolve on a result, a timeout buzz, countdown ticks in the last five seconds). Audio starts only after a first click or key press. A Sound button in the top bar mutes it, remembered in localStorage; sound is on by default. Every cue has an always-visible twin (the pen, the line flash and BUST tag, the verdict and lamp, the LCD blink), so a muted player loses nothing.
- Undecided: final name and domain, whether to keep 5 questions and 20 seconds, ads, paid packs, percentiles, and an archive.

## Brand Commitments

- "Lowball" is a working name. Don't build the identity around the word itself, so a rename stays cheap.
- The share card format from the planning doc is fixed: `Lowball #12 · Island Life 🏝️`, then the emoji row, then `328 / 500`, then the site URL.
- Must not feel like a casino or betting product, a busy gamified app (badges, coins, confetti, popups between questions), or a cold data dashboard.
- The chart is a recorder, not a market: no tickers, prices, up and down arrows, green and red gains, candles, or currency framing around the pen. The line is a limit, never a stake.

## Evidence on Hand

- Seven sample days of questions built from World Bank 2023 data (`content-pipeline/02_drafts/`), not yet approved for publishing.
- No logo, no players, no testimonials, no press. Future work must not invent player counts, ratings or quotes.
- Every figure comes from one reputable source per question (currently World Bank WDI 2023, CC BY 4.0), shown on the question itself so a player can check a single source instead of comparing several.

## Product Principles

1. The line is the game: every screen should make the distance to the line obvious.
2. Tension, then a clear verdict: the timer builds pressure, and the reveal pays it off in one glance.
3. Fair beats clever: sources are shown, rules are predictable, and a player is never punished for the data's gaps.
4. One minute, once a day: nothing stands between the player and the next question.
5. Built to be filmed and shared: the reveal and the share card must read on a phone screen in a video.

## Accessibility & Inclusion

Results must never rely on color alone (emoji plus a word). Respect `prefers-reduced-motion`. Keyboard play must work fully on desktop.
