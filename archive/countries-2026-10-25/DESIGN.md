---
name: Lowball
description: A daily chart-recorder check. Your answer is a pen trace and the limit is a red trip line, drawn on recorder paper in an instrument housing.
colors:
  housing: "#1d2427"
  housing-night: "#181d1f"
  housing-ink: "#eef3f1"
  housing-muted: "#a9b6b2"
  panel-ground: "#d3d9d6"
  panel-surface: "#eaeeec"
  night-ground: "#2a2f31"
  night-surface: "#343a3d"
  paper: "#f6f9f7"
  night-paper: "#b9c5c0"
  grid-minor: "#dbe8e3"
  grid-major: "#b6d2c9"
  ink: "#121a1d"
  night-ink: "#ecf1ef"
  muted: "#49565c"
  night-muted: "#aebbb7"
  rule: "#b3bfbb"
  pen-blue: "#1d3c9e"
  night-pen-button: "#3b63e0"
  night-pen-text: "#8db6ff"
  trip-red: "#d3261b"
  trip-text: "#ad1a10"
  night-trip-text: "#ff6b5e"
  lamp-green: "#0e7a4f"
  lamp-green-text: "#09613d"
  night-lamp-text: "#4fd08f"
  lcd-amber: "#ffb300"
  lcd-plate: "#0c0f10"
typography:
  display:
    fontFamily: "Archivo, Roboto Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(64px, 16vw, 120px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Archivo, Roboto Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(34px, 8vw, 64px)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  limit:
    fontFamily: "Archivo, Roboto Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(34px, 10vw, 48px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  verdict:
    fontFamily: "Archivo, Roboto Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(28px, 7vw, 36px)"
    fontWeight: 900
    lineHeight: 1.1
  title:
    fontFamily: "Archivo, Roboto Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(18px, 4.6vw, 22px)"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, Roboto Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Archivo, Roboto Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 800
    letterSpacing: "0.1em"
rounded:
  chip: "4px"
  plate: "6px"
  control: "8px"
  panel: "14px"
spacing:
  gutter: "16px"
  screen-gap: "20px"
  rail-gap: "22px"
  stack-md: "12px"
components:
  button-go:
    backgroundColor: "{colors.pen-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "52px"
  input-answer:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "54px"
  limit-plaque:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  housing-panel:
    backgroundColor: "{colors.housing}"
    textColor: "{colors.housing-ink}"
    rounded: "{rounded.panel}"
    padding: "22px 24px 20px"
  countdown-lcd:
    backgroundColor: "{colors.lcd-plate}"
    textColor: "{colors.lcd-amber}"
    rounded: "{rounded.plate}"
    height: "44px"
    width: "68px"
  progress-chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.chip}"
    height: "28px"
    width: "42px"
  hint-plate:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: Lowball

## Overview

**Creative North Star: "The Chart Recorder"**

Lowball is drawn as a process-control strip-chart recorder. Every question is a trace against a trip line: the pen's height is the value the player named, read off a real axis in the question's own units, the red line is the limit, and the reveal is the pen climbing gradually toward the line, then settling short of it or breaking through, with the verdict held back until it stops. MAX questions climb toward a line near the top; MIN questions flip the chart, with the line near the bottom and the pen coming down toward it. Points are what the value earns and are shown as a tag, never as the pen's height. The interface around the chart is the instrument that holds it: a dark enamel housing, a recorder window with a bezel and a header strip, an amber LCD for the countdown, a limit plaque, indicator lamps for results.

The housing keeps its colors in both themes; the panel and the paper re-tune. Day is a lit grey-green enamel panel with cool white paper. Night is a darker grey enamel panel, but the recorder paper stays paper (a dimmed cool grey-green), because a black chart reads as a trading terminal, which PRODUCT.md rules out. Ink drawn on the paper (pen, trip text, plaque numerals) keeps its day values in both themes.

On desktop the window is the instrument: a left rail carries the question and the answer, and the recorder fills the rest, with the countdown in its header strip. Phones stack the same parts in one column. Type is Archivo, heavy, with tabular numerals everywhere, because every screen is about reading a number against a line.

**Key Characteristics:**
- One world, a recorder: housing, paper, pen, trip line, LCD, lamps.
- The chart's vertical scale is the value itself, in the question's units, on a ladder of round numbers. Points never set the pen's height.
- MIN questions are the same chart flipped: line low, trip zone below it, pen descending toward the line.
- The paper is paper in both themes; the housing is dark in both.
- Result marks differ by shape as well as color: target, disc, ring, triangle, dashed square.
- Amber belongs to the countdown alone.

## Colors

A fixed instrument palette (housing, pen blue, trip red, lamp green, LCD amber) over a themeable panel and paper.

### Primary
- **Pen Blue** (`pen-blue`, #1d3c9e): the identity and action color. Primary buttons, the pen trace, the bullseye chip, the scored tag on the chart. In dark theme buttons and tags use the brighter `night-pen-button` (#3b63e0) and text uses `night-pen-text` (#8db6ff). On the paper the trace stays #1d3c9e in both themes.
- **Trip Red** (`trip-red`, #d3261b): the limit and busts. The limit line and its flag, the MAX/MIN kind chip, the bust chip, lamp and tag, the hatched trip zone (at 6% and 20% alpha), and the red overshoot of the trace above the line. As text on the ground it is `trip-text` (#ad1a10) by day and `night-trip-text` (#ff6b5e) by night.

### Secondary
- **Lamp Green** (`lamp-green`, #0e7a4f): the "close" lamp and chip and the "safe" ring. As text it is `lamp-green-text` (#09613d) by day and `night-lamp-text` (#4fd08f) by night.

### Tertiary
- **LCD Amber** (`lcd-amber`, #ffb300) on **LCD Plate** (`lcd-plate`, #0c0f10): the countdown and nothing else. Fixed in both themes. Done state greys to #8a8f8c.

### Neutral
- **Housing** (`housing` #1d2427 day, `housing-night` #181d1f night): the top bar, the recorder bezel, the big panels (intro title, results total, stats). Text on it is `housing-ink` (#eef3f1) and `housing-muted` (#a9b6b2).
- **Panel Ground / Surface** (`panel-ground` #d3d9d6, `panel-surface` #eaeeec; night #2a2f31, #343a3d): page background and raised fields (input, share card, hint, help dialog).
- **Paper** (`paper` #f6f9f7; night `night-paper` #b9c5c0) with **Grid** (`grid-minor` #dbe8e3, `grid-major` #b6d2c9; night #a9bfb6, #84a597): the recorder paper, the limit plaque, the mini traces.
- **Ink / Muted / Rule** (#121a1d, #49565c, #b3bfbb by day; #ecf1ef, #aebbb7, #454d50 by night): text, secondary text, unanswered chip borders and the share-card border.

### Named Rules
**The Paper Stays Paper Rule.** The recorder paper is light in both themes and the ink on it is scoped to day values (`.chart-host`, `.scene.mini`, `.sign`, `.rule-pic`). Never make the chart a black field with a pale line.
**The Ink-Not-Fill Split Rule.** A fill (trip red, lamp green, pen blue) is fixed; when the same hue must be text on the ground it gets its own themed ink token.
**The Countdown Owns Amber Rule.** Amber appears only on the LCD.
**The Recorder, Not a Market Rule.** No tickers, prices, arrows, candles, green-up red-down gains, or currency framing around the pen. The line is a limit, never a stake.

## Typography

**Display Font:** Archivo (Google Fonts, weights 400/600/800/900), with Roboto Condensed, Arial Narrow, system-ui, sans-serif
**Body Font:** the same stack
**Label/Mono Font:** none; numerals are Archivo with `font-variant-numeric: tabular-nums` on `body`

**Character:** One industrial grotesque used heavy. Hierarchy comes from size and weight, not from a second family.

### Hierarchy
- **Display** (900, clamp(64px, 16vw, 120px), line-height 1, -0.02em): the results total, followed by "/ 500" at clamp(24px, 6vw, 36px) 800 in housing-muted.
- **Headline** (900, clamp(34px, 8vw, 64px), 1.1): the intro and empty titles in the housing panel; from 960px the intro title grows to clamp(48px, 6vw, 96px).
- **Limit** (900, clamp(34px, 10vw, 48px), line-height 1): the number on the limit plaque; from 960px clamp(56px, 5.4vw, 88px).
- **Verdict** (900, clamp(28px, 7vw, 36px), 1.1): the reveal word with its lamp; points follow at 0.6em 800.
- **Title** (600, clamp(18px, 4.6vw, 22px), 1.3, balanced): the question prompt; from 960px clamp(22px, 1.9vw, 28px).
- **Body** (400, 17px, 1.45): running text and the help dialog. Fact values are 800, labels 600 muted.
- **Label** (800 to 900, 10 to 14px, tracked 0.06 to 0.14em, uppercase): the MAX/MIN chip, the plaque unit, the recorder title, chart tags.
- **Chart text** (SVG, drawn in CSS pixels so it never scales): ladder numerals 12px 600, the limit flag 12px 900, the head tag 14px 900, the pen label 12px 800 tracked, the gap label 13px 800, the best-answer label 12px 600.

### Named Rules
**The Tabular Everything Rule.** Tabular numerals are on at `body`; never switch them off for a number.
**The Short-Plaque, Long-Text Rule.** Numbers on the plaque and chart flag use the compact form (`formatSign`: "500K", "$20B"); numbers in the reveal and facts use the full form with units (`formatValue`).

## Layout

A fluid layout inside a `max-width: 1760px` main with a gutter of `max(16px, 2.4vw, safe-area inset)`. The top bar is a full-bleed housing band (56px) with a 3px trip-red underline; its inner row aligns to the same width: wordmark, the "#day · theme" breadcrumb (ellipsized), the "How to play" button pushed right. Below 480px the wordmark text hides.

**Below 960px:** one column, `.screen` capped at 720px and centered. The play screen order is fixed: progress chips, limit plaque beside the prompt, the recorder window (header strip with "Question n of 5" and the LCD, then the chart at clamp(240px, 42dvh, 380px), or 300 to 460px between 600 and 959px), then the answer row. In the reveal, the verdict and the Next button come first and the facts follow below them, so Next stays in the first screen on a phone.

**From 960px:** the window is used. The play screen is a grid of a left rail (clamp(320px, 28vw, 440px)) and the recorder, filling `100dvh` minus the bar and the page padding (minimum 560px). The rail stacks progress, the limit plaque over the prompt, then the answer form (replaced by the reveal), with 22px gaps; the recorder is one tall bezel whose chart fills it. The intro is two columns (title panel, then rules and Start); results are two columns (total panel and the five-trace lineup, then share card, stats and the next-puzzle countdown).

Spacing is not on a strict scale. Recurring steps: 6px (chips, tight lists), 8 to 10px (control internals), 12 to 14px (component stacks), 16px (plaque to prompt), 20 to 22px (screen and rail gaps), 28 to 40px (desktop column gaps).

### The Recorder geometry
The chart is drawn at the host's real size (one SVG unit is one CSS pixel) and redrawn on resize. The plot's vertical axis is the value, linear. Its safe stretch is sized to the question's own answers (`axisFor` in `src/scene.js`): from 0 up to the limit when the answers are spread out, or a narrow band, such as 74 to 80 years, when they are not; a MIN axis reaches at most 2.5 limits past the line and clamps anything higher to the paper's edge. The trip zone adds 35% of the safe stretch beyond the line. A MAX chart puts the line about a quarter of the way down from the top with the zone above it; a MIN chart is flipped, with the line about three quarters of the way down and the zone below it. A right gutter (62px on phones, 88px otherwise) carries the value ladder (round numbers in the question's units, the limit in red) and the answer's tag, which reads "39 pts", "BUST", "TIME" or "NONE". The idle pen sits at half the plot width with 14 seconds of trace behind it; a revealed trace comes to rest at 82% of the width, leaving room for the gap measure.

## Elevation & Depth

Mostly flat. Depth comes from the housing and the bezel: a 1px inset rim in white at 14% alpha on every housing surface, and a soft drop under the big objects. The paper sits recessed in its bezel with a 1px inset dark edge.

### Shadow Vocabulary
- **Housing** (`inset 0 0 0 1px rgb(255 255 255 / 0.14), 0 10px 24px -14px rgb(0 0 0 / 0.55)`): panels and the recorder bezel.
- **Plaque** (`inset 0 0 0 2px trip-red, 0 6px 14px -8px rgb(0 0 0 / 0.4)`): the limit plaque; its red edge is the plaque's border.
- **LCD recess** (`inset 0 0 0 2px #3a4347, inset 0 2px 6px rgb(0 0 0 / 0.6)`): the countdown.
- **Dialog** (`0 12px 40px rgb(0 0 0 / 0.35)`, backdrop `rgb(10 12 14 / 0.55)`): the help dialog only.

### Named Rules
**The Housing Rim Rule.** A dark panel gets its edge from the 1px white inset rim, never from a CSS border. Fields and cards (input, share card, ghost button, chips) get a plain 2px border.

## Shapes

Rectangles with modest radii, scaled to the object: 3 to 4px for chips and the kind chip, 6px for plates (LCD, header button, favicon), 8px for controls, the plaque, the hint and the paper, 10px for the share card and mini traces, 14px for housing panels, the recorder bezel and the dialog. The recurring geometry is chart geometry: a 1px grid on 5-point rows and 20px columns (heavier every 25 points and 100px), 45° hatching in the trip zone, dotted best-answer lines, and gap measures with end ticks.

### Result marks
Indicator lamps, 24-unit SVG, one stroke weight: **bull** a pen-blue disc with a target ring and dot, **close** a filled green disc, **safe** an open green ring, **bust** a red triangle with a white bar and dot, **none** a dashed muted square. They appear in the verdict (0.95em) and the results lineup (20px), always next to a word or number.

## Components

### Buttons
- **Primary ("Go"):** pen-blue fill, white 900 18px text, 52px tall, 8px radius. Start, Next question, Copy result, Got it, and the answer's Go (72px minimum). Hover brightens 12%, press drops 1px, both over 120ms with `cubic-bezier(0.16, 1, 0.3, 1)`. Disabled drops to 55%. Next is held disabled until the pen has settled.
- **Ghost:** transparent, 2px ink border, 800 16px, 52px tall. Only the native Share button.
- **Header button:** transparent on the housing, 2px currentColor border, 6px radius, 40px tall, 800 14px; hover adds a 12% white wash.

### Limit plaque (signature)
Paper face, 2px trip-red edge, 8px radius. A kind chip ("MAX" filled red with white text, "MIN" outlined red), the limit in Limit type, the unit in 800 13px muted caps. From 960px it spans the rail.

### The recorder window (signature)
A housing bezel (12px padding on desktop, 10px otherwise) holding a header strip and the chart host. The strip carries "Question n of 5" (800 13px tracked caps, housing-muted) at left and the LCD at right. The chart host is paper with an 8px radius.

### Countdown LCD
Plate #0c0f10, amber 900 30px numerals, 68×44px minimum, 6px radius, recessed. In the last five seconds the numeral blinks (1s stepped to 45%). When done it greys and gains a small "s".

### Progress chips
Five 42×28px chips, 2px border, 4px radius, 800 13px. Unanswered: rule border, muted number; current: ink border. Answered take their band: pen-blue fill (bull), green fill (close), green outline (safe), red fill with "BUST" (bust), dashed with "–" (none).

### Inputs / Fields
Panel surface, 2px ink border, 8px radius, 54px tall, 600 19px. Focus is the global 3px outline (pen blue by day, light blue by night) at 2px offset. Disabled is 60% opacity. The form is hidden during the reveal.

### The chart (signature)
- **Limit:** a 2.5px red line across the plot, a red flag at its left end ("MAX 500K", above a MAX line, below a MIN line, in the trip zone), the limit in red on the ladder. On a bust the line thickens to 4px and flashes three times, and the trip zone brightens.
- **Idle pen:** a 3px pen-blue trace that drifts and creeps upward as the clock drains but never reaches the line, ending in a dot; the paper scrolls left at the trace's speed.
- **Reveal:** one gradual climb, with no surge and no long hover. The pen eases from where it was toward the answer's value in 2.4 to 3.6s (longer the nearer the line), with a small wobble that grows with closeness and a short final settle. A bust climbs to just short of the line and breaks through it in the last stretch (3.8s), running to the edge of the paper (the part past the line draws red). The answer stays hidden until the pen stops: the verdict, facts, Next button and the result chip appear only then (the rail shows "Plotting your answer…" meanwhile), and the chart's tag, name and gap fade in at the same moment. A restored reveal (reload, reduced motion) shows everything at once.
- **Settled:** the answer's tag in the gutter (points, "BUST", "TIME" or "NONE"), the answer's name above the trace, a vertical gap measure to the line ("41,051 under"), and a dotted best-answer line labelled "Best: name, points" when the answer is not the best.
- **Mini (results lineup):** 132×56 (160×64 from 960px), no labels, no grid.

### Results
A housing panel with the total, a lineup of five rows (mini trace, answer name over prompt, score with its lamp), the share card (a `pre` on panel surface with a 2px rule border; its emoji row is the fixed share format), a stats panel (practice games show only the note), and the next-puzzle countdown.

### Navigation
The top bar is the only navigation: wordmark home link, breadcrumb, the "Sound on / Sound off" toggle (a header button with `aria-pressed`, text only), and the "How to play" button that opens a modal `<dialog>` on the panel surface.

### Sound
Synthesized in `src/sound.js`; sound is on by default and the toggle is remembered. Nothing sounds before the first click or key press. Each cue has a visual twin that is always drawn:

| Cue | Visual twin |
|---|---|
| Blip per 6 points the pen climbs, pitch rising with the pen | the pen rising on the chart and the ladder |
| Bust sting as the pen crosses the line | the limit line flash, brightened trip zone, BUST tag and lamp |
| Resolve (3 tiers: bullseye, close, safe) | the verdict word, its lamp and the points |
| Timeout buzz | the greyed LCD and "Out of time" |
| Tick at 5, 4, 3, 2, 1 seconds | the LCD numeral blinking |

Cues sound only for an answer just given, never for a reveal restored after a reload. Reduced motion skips the blips (no frames) but still plays the final cue.

## Do's and Don'ts

### Do:
- **Do** keep the chart's scale the real value, with every ladder tick a round number in the question's units, and flip it for MIN questions so the trip zone is always on the bust side.
- **Do** keep the paper light in both themes and the ink on it at its day values.
- **Do** give a result a shape and a word or number as well as a color.
- **Do** draw the chart in CSS pixels and redraw on resize, never scale its text.
- **Do** keep amber for the LCD and trip red for the limit and busts.
- **Do** gate every animation behind `prefers-reduced-motion`.

### Don't:
- **Don't** use pale-on-black chart styling, tickers, arrows, candles, or green-up red-down coloring; PRODUCT.md rules out the market and betting reading.
- **Don't** add a second typeface; hierarchy comes from Archivo's weight and size.
- **Don't** add tiles, coins, badges, confetti, or popups between questions.
- **Don't** put emoji in the interface; they belong in the share text only.
- **Don't** add drop shadows beyond the housing, the plaque, the LCD recess and the dialog.

## Known gaps and open decisions

- **The recorder's own devices are unused.** There is no trip lamp in the header strip, no stylus carriage on the pen head, no paper edge, and the results are five thumbnails rather than one printed strip. The finish review named these as unused ceiling, not defects.
- **Idle pen creep is decorative.** The trace rises as the clock drains and never reaches the line; it is not the answer. If playtests read it as a hint, flatten it.
- **Theme switch hooks are unused.** The CSS supports `data-theme="light" | "dark"` on the root, but nothing sets it; theme follows the OS only.
- **Resize replays the settle fade.** Redrawing a settled chart on resize re-runs the 0.35s fade of its labels.
- **Unreviewed captures.** The finish review had no light-theme desktop, dark-theme phone, intro, dialog or keyboard-open phone captures.
- **Brand mark.** The favicon's rising zigzag reads close to a "trending up" glyph at 28px; the red line keeps it a recorder, but watch it.
- **Sound has not been playtested by ear.** Cue levels, pitch range and the blip step were checked by logic and tests, not listened to on real speakers; expect to retune `BLIP_STEP`, `blipFreq` and the master gain.
- Open per the surface brief: final product name.
