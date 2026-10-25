---
name: Lowball
description: A quiet baseball stat sheet. Your answer is a pen trace on a real value axis and the limit is a single red line, on white cards over a warm ground.
colors:
  ground: "#f3f1ea"
  surface: "#ffffff"
  ink: "#172033"
  muted: "#596275"
  rule: "#d8d4c8"
  hero: "#14213d"
  hero-ink: "#f4f1e8"
  hero-muted: "#aeb6c8"
  navy: "#1b2f5b"
  limit-red: "#b3202a"
  limit-text: "#9a1b24"
  ok-green: "#1f7a4d"
  ok-text: "#17613b"
  grid-minor: "#efede5"
  grid-major: "#dedbd0"
  night-ground: "#0f141c"
  night-surface: "#171d28"
  night-ink: "#eceff5"
  night-muted: "#9ba5b7"
  night-rule: "#2b3445"
  night-hero: "#1b2740"
  night-navy-button: "#4a6fd6"
  night-navy-text: "#9db8ff"
  night-limit-red: "#e5535c"
  night-limit-text: "#ff8b92"
  night-ok-text: "#5fd29a"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(60px, 14vw, 104px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(32px, 7vw, 56px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  limit:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(34px, 10vw, 48px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  verdict:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(26px, 7vw, 34px)"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(18px, 4.6vw, 22px)"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  chip: "4px"
  control: "6px"
  card: "10px"
  dialog: "12px"
spacing:
  gutter: "16px"
  screen-gap: "20px"
  rail-gap: "22px"
  stack-md: "12px"
components:
  button-go:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  input-answer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "50px"
  limit-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 18px"
  hero-block:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.hero-ink}"
    rounded: "{rounded.card}"
    padding: "24px 26px 22px"
  countdown:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "8px"
    height: "38px"
    width: "64px"
  progress-chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.chip}"
    height: "28px"
    width: "42px"
  hint:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: Lowball

## Overview

**Creative North Star: "The Stat Sheet"**

Lowball reads like a page of baseball statistics: white cards with hairline rules on a warm off-white ground, navy ink, and one red line. Every question is a single chart. The pen's height is the value the player named, read off a ladder of round numbers in the question's own units, and the red limit line is the one thing on the page that is always red. Everything else is navy, grey or white, so the line is the thing the eye finds first.

There is no ornament: no gradients, no drop shadows (except the help dialog), no enamel, bezels or glowing numerals. The dark theme keeps the same structure on a deep navy ground. Dark blocks (the intro title, the results total) use a navy `hero` fill in both themes, as the page's only heavy objects.

On desktop the window is the page: a left rail carries the question and the answer, and the chart card fills the rest, with the countdown in its header line. Phones stack the same parts in one column. Type is Archivo from regular to bold, with tabular numerals everywhere, because every screen is about reading a number against a line.

**Key Characteristics:**
- One red thing: the limit line, its flag, its ladder number, the trip zone and a bust.
- The chart's vertical scale is the value itself; points are only a tag.
- MIN questions flip the chart: the line is low, the bust zone is below it, and the pen comes down.
- Result marks differ by shape as well as color: target, disc, ring, triangle, dashed square.
- No emoji, anywhere.

## Colors

A navy and red pair on warm white. Light is the default; the dark theme follows the OS.

### Primary
- **Navy** (`navy`, #1b2f5b): actions and the pen. Primary buttons, the pen trace and its head, the points tag, the bullseye mark, the wordmark. In the dark theme buttons use `night-navy-button` (#4a6fd6) and text and the pen use `night-navy-text` (#9db8ff).
- **Limit Red** (`limit-red`, #b3202a): the limit and busts. The limit line and its flag, the trip zone (5 to 6% tint with a faint 45° hatch), the bust tag and mark, the red overshoot of the trace past the line. As text it is `limit-text` (#9a1b24); at night `night-limit-red` (#e5535c) for the line and `night-limit-text` (#ff8b92) for text.

### Secondary
- **Ok Green** (`ok-green`, #1f7a4d): the "close" and "safe" marks and progress chips. As text `ok-text` (#17613b); at night `night-ok-text` (#5fd29a).

### Neutral
- **Ground / Surface** (`ground` #f3f1ea, `surface` #ffffff; night #0f141c, #171d28): the page and every card, the chart paper, inputs and the dialog.
- **Ink / Muted / Rule** (#172033, #596275, #d8d4c8; night #eceff5, #9ba5b7, #2b3445): text, secondary text, hairlines and unanswered chip borders.
- **Hero** (`hero` #14213d, text `hero-ink` #f4f1e8, secondary `hero-muted` #aeb6c8; night #1b2740): the intro title block and the results total.
- **Grid** (`grid-minor` #efede5, `grid-major` #dedbd0; night #1f2736, #2b3548): the chart's lines, quiet enough that the pen and limit carry.

### Named Rules
**The One Red Rule.** Red appears only for the limit and what happens at it. A bust is red; nothing else decorative is.
**The Ink-Not-Fill Split Rule.** A fill (navy, red, green) is fixed or has a night variant; when the same hue is text on a surface it uses its own themed ink token.
**The Neutral Pen Rule.** The pen's head keeps its idle navy until the pen has stopped. Its color never tells the result early.
**The No Market Rule.** No tickers, prices, up and down arrows, candles, or green-up red-down gains. The line is a limit, never a stake.

## Typography

**Display Font:** Archivo (Google Fonts, weights 400/500/600/700), with Helvetica Neue, Arial, system-ui, sans-serif
**Body Font:** the same stack
**Label/Mono Font:** none; numerals are Archivo with `font-variant-numeric: tabular-nums` on `body`

**Character:** One grotesque used at moderate weight. Hierarchy comes from size and weight, not from a second family or capitals.

### Hierarchy
- **Display** (700, clamp(60px, 14vw, 104px), line-height 1, -0.02em): the results total, followed by "/ 500" at clamp(22px, 5vw, 32px) 500 in hero-muted.
- **Headline** (700, clamp(32px, 7vw, 56px), 1.12): the intro and empty titles; from 960px the intro title grows to clamp(44px, 5.4vw, 84px).
- **Limit** (700, clamp(34px, 10vw, 48px), line-height 1): the number on the limit card; from 960px clamp(52px, 5vw, 80px).
- **Verdict** (700, clamp(26px, 7vw, 34px), 1.1): the verdict word with its mark; points follow at 0.6em 600.
- **Title** (600, clamp(18px, 4.6vw, 22px), 1.3, balanced): the question prompt; from 960px clamp(22px, 1.9vw, 28px).
- **Body** (400, 17px, 1.5): running text and the help dialog. Fact values are 600, labels 500 muted.
- **Label** (600 to 700, 12 to 14px): the MAX/MIN chip (tracked 0.1em, capitals), the chart card title and chart tags. The wordmark is 700 with 0.12em tracking.
- **Chart text** (SVG, drawn in CSS pixels so it never scales): ladder numerals 12px 500, the limit flag 12px 600, the points tag 13px 600, the pen label 12px 600, the gap label 13px 600, the best-answer label 12px 500.

### Named Rules
**The Tabular Everything Rule.** Tabular numerals are on at `body`; never switch them off for a number.
**The Short-Card, Long-Text Rule.** Numbers on the limit card and chart flag use the compact form (`formatSign`: "500K", "$20B"); numbers in the reveal and facts use the full form with units (`formatValue`).

## Layout

A fluid layout inside a `max-width: 1760px` main with a gutter of `max(16px, 2.4vw, safe-area inset)`. The top bar is a full-bleed white band (56px) with a hairline underneath; its inner row aligns to the same width: wordmark, the "#day · theme" breadcrumb (ellipsized), then the Sound and "How to play" buttons pushed right. Below 480px the wordmark text hides.

**Below 960px:** one column, `.screen` capped at 720px and centered. The play screen order is fixed: progress chips, limit card beside the prompt and its source, the chart card (header line with "Question n of 5" and the countdown, then the chart at clamp(240px, 42dvh, 380px), or 300 to 460px between 600 and 959px), then the answer row. In the reveal, the verdict and the Next button come first and the facts follow below them, so Next stays in the first screen on a phone.

**From 960px:** the window is used. The play screen is a grid of a left rail (clamp(320px, 28vw, 440px)) and the chart card, filling `100dvh` minus the bar and the page padding (minimum 560px). The rail stacks progress, the limit card over the prompt, then the answer form (replaced by the reveal), with 22px gaps. The intro is two columns (title block, then rules and Start); results are two columns (total block and the five-row lineup, then share card, stats and the next-puzzle countdown).

Spacing is not on a strict scale. Recurring steps: 6px (chips, tight lists), 8 to 10px (control internals), 12 to 14px (component stacks), 16px (card to prompt), 20 to 22px (screen and rail gaps), 28 to 40px (desktop column gaps).

### The chart geometry
The chart is drawn at the host's real size (one SVG unit is one CSS pixel) and redrawn on resize. The vertical axis is the value, linear. Its safe stretch is sized to the question's own answers (`axisFor` in `src/scene.js`): from 0 up to the limit when answers are spread out, or a narrow band when they are not; a MIN axis reaches at most 2.5 limits past the line and clamps anything higher to the paper's edge. The trip zone adds 35% of the safe stretch beyond the line. A MAX chart puts the line about a quarter of the way down with the zone above it; a MIN chart is flipped, with the line about three quarters of the way down and the zone below it. A right gutter (62px on phones, 88px otherwise) carries the value ladder (round numbers in the question's units, the limit in red) and the answer's tag, which reads "39 pts", "BUST", "TIME" or "NONE". The idle pen sits at half the plot width with 14 seconds of trace behind it; a revealed trace comes to rest at 82% of the width, leaving room for the gap measure.

## Elevation & Depth

Flat. Cards are separated from the ground by a 1px rule and nothing else. The only shadow is the help dialog's (`0 16px 40px -12px rgb(10 20 40 / 0.35)`, backdrop `rgb(10 14 24 / 0.5)`).

### Named Rules
**The Hairline Rule.** A card's edge is a 1px `rule` border. No bezels, no inset rims, no glow.

## Shapes

Rectangles with modest radii: 4px for chips and the kind chip, 6px for controls and the chart paper, 8px for the countdown, 10px for cards and hero blocks, 12px for the dialog. The recurring geometry is chart geometry: a 1px grid at round value ticks (and 20px columns), a faint 45° hatch in the trip zone, dotted best-answer lines, and gap measures with end ticks.

### Result marks
Small status glyphs, 24-unit SVG, one stroke weight: **bull** a navy disc with a target ring and dot, **close** a filled green disc, **safe** an open green ring, **bust** a red triangle with a white bar and dot, **none** a dashed square. They appear in the verdict (0.8em) and the results lineup (18px), always next to a word or number.

## Components

### Buttons
- **Primary:** navy fill, white 600 17px text, 48px tall, 6px radius. Start, Next question, Copy result, Got it, and the answer's Go (72px minimum). Hover brightens 14%, press drops 1px, both over 120ms. Disabled drops to 55%.
- **Ghost:** transparent, 1px muted border, 600 16px, 48px tall. Only the native Share button.
- **Header button:** transparent, 1px rule border, 6px radius, 38px tall, 600 14px; hover fills with the ground color. Sound on/off (with `aria-pressed`) and How to play.

### Limit card (signature)
A white card with a 1px rule border and a 10px radius. A kind chip ("MAX" or "MIN" in limit text on a 5% red tint), the limit in Limit type, the unit in 500 14px muted. From 960px it spans the rail.

### The chart card (signature)
A white card with a 1px rule, 12px padding (14px on desktop), holding a header line and the chart. The header carries "Question n of 5" (600 14px muted) at left and the countdown at right. The chart paper is the card surface with a faint grid.

### Countdown
A ground-tinted 8px pill, 64×38px minimum, 700 22px numerals, a 1px inner rule. In the last five seconds the numeral turns limit-red and blinks (1s stepped to 45%). When done it greys and gains a small "s".

### Progress chips
Five 42×28px chips, 1px border, 4px radius, 600 13px. Unanswered: rule border, muted number; current: ink border with a second inner line. Answered take their result: navy fill (bullseye), green fill (close), green outline (safe), red fill with "BUST" (bust), dashed with a dash (none). A just-answered question's chip stays unanswered until the pen stops.

### Inputs / Fields
White surface, 1px muted border, 6px radius, 50px tall, 500 18px. Focus is the global 2px outline in navy (light blue at night) at 2px offset. Disabled is 60% opacity. The form is hidden during the reveal, replaced by "Plotting your answer…".

### The chart (signature)
- **Limit:** a 2px red line across the plot, a red flag at its left end ("MAX 500K": above a MAX line, below a MIN line, in the trip zone), the limit in red on the ladder. On a bust the line thickens to 3px and flashes three times, and the trip zone brightens.
- **Idle pen:** a 2.5px navy trace that drifts and creeps toward the line as the clock drains but never reaches it, ending in a dot; the paper scrolls left at the trace's speed.
- **Reveal:** one gradual climb with no surge and no long hover. The pen eases from where it was toward the answer's value in 2.4 to 3.6s (longer the nearer the line), with a small wobble that grows with closeness and a short final settle. A bust climbs to just short of the line and breaks through in the last stretch (3.8s), running to the edge of the paper (the part past the line draws red). The answer stays hidden until the pen stops: the verdict, facts, Next button and result chip appear only then, and the chart's tag, name and gap fade in at the same moment. A restored reveal (reload, reduced motion) shows everything at once.
- **Settled:** the answer's tag in the gutter, the answer's name near the trace, a vertical gap measure to the line ("41,051 under"), and a dotted best-answer line labelled "Best: name, value" when the answer is not the best.
- **Mini (results lineup):** 132×56 (160×64 from 960px), no labels, no grid.

### Results
A navy hero block with the total, a bordered list of five rows (mini trace, answer name over prompt, score with its mark), the share card (a `pre` on a white card with a 1px rule; plain text with no emoji: theme, points per question, total, link), a stats card (practice games show only the note), and the next-puzzle countdown.

### Navigation
The top bar is the only navigation: wordmark home link, breadcrumb, the Sound toggle and the "How to play" button that opens a modal `<dialog>`.

### Sound
Synthesized in `src/sound.js`; sound is on by default and the toggle is remembered. Nothing sounds before the first click or key press. Each cue has a visual twin that is always drawn:

| Cue | Visual twin |
|---|---|
| Blip per 6 chart units the pen climbs, pitch rising with the pen | the pen moving on the chart and the ladder |
| Bust sting as the pen crosses the line | the limit line flash, brightened trip zone, BUST tag and mark |
| Resolve (3 tiers: bullseye, close, safe) | the verdict word, its mark and the points |
| Timeout buzz | the greyed countdown and "Out of time" |
| Tick at 5, 4, 3, 2, 1 seconds | the countdown numeral turning red and blinking |

Cues sound only for an answer just given, never for a reveal restored after a reload. Reduced motion skips the blips (no frames) but still plays the final cue.

## Do's and Don'ts

### Do:
- **Do** keep the chart's scale the real value, with every ladder tick a round number in the question's units, and flip it for MIN questions so the trip zone is always on the bust side.
- **Do** keep red for the limit and what happens at it.
- **Do** give a result a shape and a word or number as well as a color.
- **Do** draw the chart in CSS pixels and redraw on resize, never scale its text.
- **Do** keep the pen's head one color until the pen stops.
- **Do** gate every animation behind `prefers-reduced-motion`.

### Don't:
- **Don't** use tickers, arrows, candles, or green-up red-down coloring; PRODUCT.md rules out the market and betting reading.
- **Don't** add a second typeface; hierarchy comes from Archivo's weight and size.
- **Don't** add tiles, coins, badges, confetti, or popups between questions.
- **Don't** use emoji, anywhere, including the share text.
- **Don't** add shadows, gradients, bezels or glow; cards get a 1px rule and nothing more.
- **Don't** reveal the result before the pen stops: not in the verdict, the chips, the head color or the tag.

## Known gaps and open decisions

- **Idle pen creep is decorative.** The trace drifts toward the line as the clock drains and never reaches it; it is not the answer. If playtests read it as a hint, flatten it.
- **Theme switch hooks are unused.** The CSS supports `data-theme="light" | "dark"` on the root, but nothing sets it; theme follows the OS only.
- **Resize replays the settle fade.** Redrawing a settled chart on resize re-runs the 0.35s fade of its labels.
- **Crowded labels near the line.** A settled answer within a few pixels of the line puts the name, the gap label and the best-answer label close together.
- **Unreviewed captures.** The finish review covered desktop light and dark, and a phone question screen in dark; it did not cover the light-theme phone reveal, the dialog, or a keyboard-open phone.
- **Sound has not been playtested by ear.** Cue levels, pitch range and the blip step were checked by logic and tests, not on real speakers.
- **Brand mark.** The favicon's rising zigzag with a red line reads close to a "trending up" glyph at 28px; watch it.
- Open per the surface brief: the final product name.
