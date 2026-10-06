# Scale Policies: roadmap and user guide

This document is the home for the right-hand scale policy work: what each
control does, why it exists musically, its default, and what is still planned.
The theory behind chord-scale matching lives in `doco/MUSIC-THEORY.md`; this
file covers the runtime policies, their options and their UI.

## What a policy is

On every chord trigger the right hand is filtered to a scale. Which scale that
is comes from `globals.scaleFiltering.policy`:

| Mode | What it does |
|---|---|
| `manual` | Carries the scale1/2/3 slot you last chose to the next chord. Always in charge. |
| `follow history` | Picks the stored alternative that continues the previous scale and the chord function best. |
| `shuffle` | Draws a live scale from the top ranked alternatives for variety. |

The policy is chosen in the **Scales** dropdown above the chord/scale grid and
is remembered per browser session in `uiPrefs`. The scoring lives in
`src/lib/autoScale.js`; `applyScalePolicy()` in `src/lib/change-scale.js`
applies a decision.

## Shared context

`buildContext()` in `src/lib/autoScale.js` builds one object per chord trigger
and both choosers read it:

- `current` - the resolved shape of the chord being triggered (root, intervals,
  guide tones, dominant/half-diminished/minor quality).
- `previous`, `previous2` - the shapes of the last two triggered chords.
- `previousScalePcs`, `previous2ScalePcs` - the pitch classes each sounded.
- `previousScaleName` - for the reason text.
- `recentScaleSets` - the last few scales, for the novelty term.

Every new behaviour adds a term that is zero when its feature is off, so the
defaults preserve the sound of the original engine.

## Status

| Phase | Feature | Status |
|---|---|---|
| 1 | Shuffle options: chord-change anchoring, close-shift band, hold, pool, dwell, change chance, reroll, ranking cache | Done |
| 2 | Progression context: dominant resolutions and a two-chord ii-V-I | Done |
| 3 | History strip and UI polish (README) | Done |
| 4 | Phrase-aware bias from the last solo note | Done |
| 5 | Modulation: declared per-chord and per-section keys | Planned |
| 5b | Automatic local key inference (experimental, off by default) | Planned |

## Phase 1: shuffle options

The controls live in an inline **Options** expander beside the `Scales` select.
The button shows and hides the row, and the row shows the controls for the
active mode (shuffle options, follow context and phrase, history and preset). All
values are persisted in `uiPrefs` and default to the original behaviour.

Shuffle only changes the scale when the **chord changes**. A repeated trigger
of the same chord holds the scale, so a repeated stab like `ZZZZZZ` never moves
the notes under your fingers. This is the key difference from the first version
of shuffle, which drew on every trigger.

- **Pool** (3-8, default 3). How many engine-ranked candidates the draw is
  taken from. A pool of 3 means only the stored `scale1/2/3`; larger pools offer
  more colour and more live `auto:` scales.
- **Dwell** (1-4, default 2). How many chord *changes* to hold the drawn rank
  before redrawing. The rank is held, not the literal scale, so each new chord
  still gets a scale of that rank that fits its own harmony.
- **Change** (0-100%, default 100%). The chance of drawing a new rank at a
  dwell boundary. Lower values keep the current colour for longer.
- **Spread** (same notes / 1 note / 2 notes / Wild, default 1 note). How far a
  change may move the note set. A draw is limited to candidates whose pitch set
  is within this many substituted notes of the previous scale, so a change is a
  close colour shift rather than a jump. `Wild` lifts the limit.
- **Hold** (default on). While solo notes are sounding, a chord change takes
  the **closest fit** to the previous scale instead of a random draw, so the
  mapping barely moves under the player's fingers.
- **Reroll** forces a fresh draw for the current chord and resets its dwell; it
  ignores the Spread band and the Hold rule for a deliberate jump.
- **Preset** applies a named combination in one click. Shuffle presets are
  **Subtle** (the default: pool 3, held two changes, close shifts that are
  rare), **Varied** (a close colour from a larger pool on each chord change)
  and **Wild** (no band, no hold); follow presets are **Simple**,
  **Progression**, **Lyrical** and **Resolve**. Hand-adjusting any value moves
  the selector to `Custom`.

The drawn rank is cached with the ranked candidates per chord, key, colour and
pool size, so shuffle does not re-rank the scale dictionary on every trigger.
The cache is cleared when a project loads, a key or colour changes, or the
history resets.

### Why hold on a repeat and bound the change

Holding one literal scale across a chord change is unsafe: the new chord may
not fit it. Bounding the change and, while notes are held, taking the closest
fit keeps the harmony correct while giving the phrase a stable colour. Shuffle
stays a close sibling of follow: follow picks the best continuation
deterministically, shuffle picks a close random one, weighted by rank, common
tones and novelty, and only when the harmony actually changes.

### Why the primary scale is favoured

The draw is not uniform. The rank weight is steep, so the engine's top-ranked,
idiomatically correct scale is the usual choice and a colour alternative is
occasional. Two details keep that musical:

- **The best fit is never punished for novelty.** In a diatonic progression the
  ii chord's scale and the V chord's primary are the same pitch set (D dorian
  and G mixolydian, for example), so continuing the same notes is the norm, not
  a repeat to avoid. Only the lower-ranked alternatives are nudged away from
  recently heard sets.
- **The first draw of a session uses the primary as its baseline.** With no
  previous scale the `Spread` band and common-tone weighting would otherwise be
  skipped; instead the top-ranked candidate is the reference, so the first
  chord behaves like every other draw.

The upshot is that in a C major ii-V-I the V chord stays on its diatonic
`G mixolydian` almost all the time and only rarely shifts to a close colour
such as `G lydian dominant` (a valid `#11` dominant sound, but a bright one).

## Phase 2: progression context

Follow now reads the previous chord's function and, optionally, the chord
before it. `progressionBonus()` in `src/lib/autoScale.js` applies:

- **ii-V**. A dominant a fourth above the previous chord: mixolydian after a
  minor seventh chord, and the altered family after a half-diminished chord.
- **Dominant resolution**. A dominant resolving down a fifth (V-I or a
  secondary dominant), down a semitone (tritone substitute) or up a whole tone
  (backdoor) into a major chord prefers the major home scale, with lydian as a
  colour alternative; into a minor chord it prefers dorian, then aeolian.
- **ii-V-I chain**. With two-chord context, a major tonic reached from a full
  ii-V (a minor seventh or half-diminished chord a fifth above the dominant)
  gets an extra bonus and the reason `ii-V-I into <root>: major`.

The **Context** control sits in the Options expander when `follow` is selected
and chooses `1 chord` (default) or `2 chords`. One chord keeps the original
behaviour; two chords adds the chain rule. The rules are candidate-specific:
they decide between the stored alternatives that already fit the chord, so
they can never force a scale that clashes.

### Follow palette

By itself follow is deterministic: it sounds the stored scale with the best
continuity with what you just played. In an all-diatonic tune every chord's
`scale1` shares the same seven notes, so follow stays on `scale1` throughout
and can appear to do nothing. The **Palette** control in the follow Options
makes the choice explicit:

- **Primary** (default): the best continuation, the original behaviour.
- **Close colour**: the best continuation among the stored scales whose notes
  differ from the previous scale, so each chord change adds the closest new
  colour. The reason names the scale and the note it adds, for example
  `palette: close colour (G lydian dominant adds C#)`.
- **Bold**: the stored scale with the fewest notes in common with the previous
  one, the biggest colour shift the chord's stored options allow.

The first chord of a session always uses Primary, and all choices are stored
scales that already fit the chord, so a palette pick can never clash. The
project-wide `Colour:` selector at the top of the page is a different setting:
it decides how the stored scales themselves are ranked (diatonic, jazz,
adventurous). Palette only chooses among whatever is stored.

## Phase 3: history strip

A `History` checkbox in Settings > Preferences (it is a global display
preference, not a policy option) shows a strip of the last four chord-to-scale
choices above the grid, newest first. Each entry shows the
chord, an arrow, the scale and a small badge naming the policy that chose it
(`manual`, `follow` or `shuffle`); a scale that uses notes outside the project
key is tinted amber. This makes the policy visible while playing, on both the
Edit and Perform views. The flag is persisted in `uiPrefs`.

## Phase 4: phrase-aware bias in follow

When the phrase bias is on, `phraseBonus()` in `src/lib/autoScale.js` reads the
last sounding solo note (recorded in a small ring buffer in
`src/lib/midi/jam.js`) and adjusts each candidate:

- keeping the note adds a bonus, larger when the note is a guide tone and
  smaller when it is a chord tone or a passing scale tone;
- leaving a guide tone or chord tone unresolved subtracts a little;
- the note a semitone above the root of a major or minor chord (a hard b9
  clash) subtracts more; on a dominant it is an available tension, so it is not
  penalised.

The bonus is scaled by the strength. A `Phrase` checkbox and a
low/medium/high `Strength` select sit in the Options expander when `follow` is
selected, and both are off by default. Phrase bias only nudges the choice
between stored scales that already fit the chord.

It is deliberately conservative. In an all-diatonic tune every stored
candidate contains the notes you are playing, so phrase changes nothing and
follow stays on `scale1`. It only changes the pick when the last note
distinguishes the candidates, for example a held `C#` over `G7` favours
`G lydian dominant`. When that happens the reason line says
`keeps your last note <name>`.

Shuffle ignores the last note entirely, because the draw is driven by rank,
continuity and spread; held notes are handled by the note-repair setting in
`Settings`. Without that, an inert Phrase control in shuffle only added
confusion.

## Phase 5: modulation (planned)

A project currently has one key. The first step is **declared overrides**: an
optional per-chord `key` and a per-song key, resolved before the project key,
so a tune that changes key can say so. This touches the schemas, the data
model, key resolution and the chord and song editors. An experimental
automatic mode that infers a local key from recent chords, with hysteresis,
comes later and stays off by default.

## Interaction with the other controls

This is behaviour, not a mode. The locked scale (`5`) always wins and pauses
the policies. Solo in key (`0`) keeps the key scale and pauses them. A manual
`1`-`4` press, a grid cell click or a right-hand black key applies immediately
as an **override**: the chosen slot is kept while its own chord keeps sounding,
including a re-trigger, and it is carried to the next different chord once, so
the pick wins on the next chord hit either way. After that the policy resumes.
Because the slot resolves to the new chord's own stored scale, carrying it
across a chord change stays in harmony. Policies only choose on a chord
trigger, never mid-chord.

## UI map and manual smoke tests

Everything sits above the chord/scale grid in `GrandSummary.vue`, on both the
Edit and Perform views, and appears when a project is loaded.

| Element | Where | What it does |
|---|---|---|
| `Scales` select | scale settings row | Chooses `manual`, `follow history` or `shuffle`. |
| `auto: <scale>` chip | scale settings row | The live scale when a policy chose one that is not a stored slot. |
| Reason line | scale settings row | Short explanation of the last automatic choice. |
| `Options` button | scale settings row | Shows or hides the advanced options panel. |
| `Preset` | scale settings row, left of `Options` | One-click policy presets for the active mode; shows `Custom` (highlighted) when the values are hand-tuned. Always visible while follow or shuffle is selected, even when the options are hidden. |
| `Key: <key>` | header, beside the project name | The resolved project key, in prominent text. It moves with a live transposition. |
| `Pool`, `Dwell`, `Change`, `Spread`, `Hold` | Options panel, shuffle | Shuffle option values. `Spread` limits how far a change moves the note set; `Hold` keeps the closest fit while solo notes sound. |
| `Reroll` | Options panel, shuffle, far right | Draws a new scale for the current chord now. |
| `Context` | Options panel, follow | One or two previous chords. |
| `Palette` | Options panel, follow | Which stored scale follow prefers: `Primary` (best continuation), `Close colour` (best alternative that adds a note at each change) or `Bold` (biggest colour shift among the stored scales). |
| `Phrase`, `Strength` | Options panel, follow | Phrase-aware bias for follow; shuffle ignores the last note. |
| `History` | Settings > Preferences | Shows the recent chord-to-scale strip. |
| `Recent:` strip | above the grid | Last four chord-to-scale choices with a policy badge. |
| `chosen` tag | grid, current row | Marks the stored scale that is sounding; in follow the slot highlight is softened so this reads first. |
| `closest` tag / dashed cell | grid, current row | The nearest stored scale when the live scale is not a stored slot. |

The presets are defined in `POLICY_PRESETS` in `src/lib/autoScale.js`. Shuffle:
**Subtle** (the default: only the stored scales, held for two chord changes,
close shifts), **Varied** (a close colour from a pool of five on each chord
change) and **Wild** (no band, no hold). The shipped defaults match Subtle; the
`Subtle` preset keeps `Spread` at one note, so it never uses the Wild spread.
The `?` beside the `Preset` select opens a one-line explanation of each preset
for the active mode.
Follow: **Simple** (one chord), **Progression** (two chords), **Lyrical**
(two chords plus phrase bias) and **Resolve** (one chord, strong phrase bias)
all use `Palette: Primary`; **Colourful** uses `Palette: Close colour`. Every
value a preset sets is visible in the Options panel.

### Phase 1 - shuffle options

1. Load a demo, set `Scales` to `shuffle`, click `Options`.
2. Trigger the same chord several times (`Z Z Z Z Z`): the scale must not
   change. The reason stays `holding` and the notes stay put.
3. Trigger two different chords in turn: each chord change may draw once, and
   the reason names the shift (for example `shuffle: 1 note change`).
4. Set `Spread` to `same notes`: changes keep the same note set. Set it to
   `Wild`: changes may jump.
5. Set `Change` to `0%`: the rank is kept across chord changes.
6. Click `Reroll`: the reason becomes a fresh draw, not `holding`.
7. Choose the `Subtle` preset: the values become `3 / 2 / 100% / 1 note` with
   `Hold` on, and the preset select stops showing `Custom`. Choose `Varied` for
   `5 / 1 / 100% / 1 note`; choose `Wild` for `6 / 1 / 100% / Wild` with `Hold`
   off.
8. While holding a long solo note, change chord: the reason should read
   `closest fit`, and the scale should move as little as possible.
9. Transpose the C Major II-V-I demo up a semitone (`Alt+4`, or hold the
   left-hand `C#` and press `A#`), then trigger the second chord: the `Key:`
   chip should read `Db major`, the chord row should show `Ab7/Eb`, and
   shuffle should offer Ab scales (Ab mixolydian, Ab lydian dominant, Ab
   mixolydian b6), never a G scale. Press Shift+`G#` (or the Reset
   Transpositions button) to reset: the key returns to C major and the chord to
   `G7/D`.

### Phase 2 - progression context

1. Set `Scales` to `follow history`, open `Options`, set `Context` to `2 chords`.
2. On the C Major II-V-I demo trigger `C3` (Dm7), `D3` (G7), `E3` (Cmaj7):
   the reason on the Cmaj7 should read `ii-V-I into C: major`.
3. Set `Context` to `1 chord` and repeat: the third reason should no longer
   mention `ii-V-I`.
4. Trigger `F3` (the Db7 tritone substitute) and then `E3` (Cmaj7): the reason
   on the Cmaj7 should mention a dominant or tritone-sub resolution.
5. Set `Palette` to `Primary` and trigger `C3`, `D3`, `E3`: the scales stay
   `D dorian`, `G mixolydian`, `C major`, and the reason names the chosen scale
   (`G mixolydian: ii-V into G: diatonic dominant`).
6. Choose the `Colourful` preset (or set `Palette` to `Close colour`): the `G7`
   reason becomes `palette: close colour (G lydian dominant adds C#)` and the
   grid bolds `G lydian dominant` with a green `chosen` tag. The cadence still
   resolves to `C major`.
7. Set `Palette` to `Bold`: the pick takes the biggest colour shift among the
   stored scales, with a reason beginning `palette: bold`.
8. Re-trigger the same chord: the palette choice is held, so the notes do not
   move under your fingers.

### Phase 3 - history strip

1. Open `Settings` and tick `History` in `Preferences`. Trigger a few chords.
2. The strip above the grid should show the last four `chord -> scale` pairs,
   newest first, each with a `manual`/`follow`/`shuffle` badge. A scale outside
   the project key is tinted amber.
3. Close the `Options` panel: the strip stays visible.
4. Untick `History`: the strip disappears. Reload the page: the choice persists.

### Phase 4 - phrase bias in follow

1. Set `Scales` to `follow history`, open `Options`, and tick `Phrase`.
2. Play a solo note that only a colour scale contains (for example a held `C#`
   over `G7`), then trigger that chord. The chosen stored scale should contain
   that note and the reason line should read `keeps your last note C#`; with
   `Phrase` off the choice follows continuity and function instead.
3. Set `Strength` to `high` and repeat: the bias is more emphatic; set it to
   `low` for a gentle nudge.
4. In a plain diatonic tune, phrase stays quiet: every stored scale already
   contains the notes you are playing, so follow stays on `scale1` and the
   reason does not mention your note. That is the intended, conservative
   behaviour, not a fault.
5. `Phrase` is not shown in `shuffle`, which ignores the last note.

### Manual override behaviour (regression test)

1. Set `Scales` to `shuffle`. Press `2` (or click a scale cell in a chord row):
   that scale sounds immediately and its cell is highlighted, with no `auto:`
   chip.
2. Trigger that same chord (`Z`): the override is respected, so the scale stays
   on the picked slot and no `auto:` chip appears.
3. Trigger a **different** chord: the picked slot carries to it once, so that
   chord's own `scale2` sounds and no `auto:` chip appears.
4. Trigger another chord: the pick has been consumed, so the policy resumes and
   an `auto:` chip appears (under `shuffle`).

## Files

- `src/lib/autoScale.js` - context, scoring, choosers, history, ranking cache.
- `src/lib/change-scale.js` - `applyScalePolicy()`, `rerollShuffleScale()`,
  `setScalePolicy()`, `setAutoScaleFilter()`.
- `src/lib/midi/play-chord.js` - applies the policy per chord trigger and
  records history.
- `src/components/GrandSummary.vue` - the `Scales` select, the live `auto:`
  chip, the closest-stored marker and the Options expander.
- `src/lib/globals.js` - `scaleFiltering.policy`, `policyOptions`, dwell state.
- `src/lib/uiPrefs.js` - session persistence of the policy and its options.
