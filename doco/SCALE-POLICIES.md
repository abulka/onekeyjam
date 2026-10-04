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
| 1 | Shuffle options: pool, dwell, change chance, reroll, ranking cache | Done |
| 2 | Progression context: dominant resolutions and a two-chord ii-V-I | Done |
| 3 | History strip and UI polish (README) | Done |
| 4 | Phrase-aware bias from the last solo note | Done |
| 5 | Modulation: declared per-chord and per-section keys | Planned |
| 5b | Automatic local key inference (experimental, off by default) | Planned |

## Phase 1: shuffle options

The controls live in an inline **Options** expander beside the `Scales` select.
The button shows and hides the row, and the row shows the controls for the
active mode (shuffle options, follow context, phrase, history and preset). All
values are persisted in `uiPrefs` and default to the original behaviour.

- **Pool** (3-8, default 6). How many engine-ranked candidates the draw is
  taken from. A pool of 3 means only the stored `scale1/2/3`, so the grid always
  highlights exactly; larger pools offer more colour and more live `auto:`
  scales. The pool also widens or narrows the amount of surprise.
- **Dwell** (1-4, default 1). How many chord triggers to hold the drawn *rank*
  before redrawing. The rank is held, not the literal scale, so each new chord
  still gets a scale of that rank that fits its own harmony. A longer dwell is
  steadier and less busy; a dwell of 1 redraws at every boundary.
- **Change** (0-100%, default 100%). The chance of drawing a new rank at a
  dwell boundary. Lower values keep the current colour for longer, even after
  the dwell expires.
- **Reroll** forces a fresh draw for the current chord and resets its dwell.
- **Preset** (shuffle and follow) applies a named combination of values in one
  click, so you do not have to tune each value. Shuffle presets are
  **Balanced** (the defaults), **Steady**, **Adventurous** and
  **Phrase-aware**; follow presets are **Simple**, **Progression**,
  **Lyrical** and **Resolve**. Hand-adjusting any value moves the selector to
  `Custom`.

The drawn rank is cached with the ranked candidates per chord, key, colour and
pool size, so shuffle does not re-rank the scale dictionary on every trigger.
The cache is cleared when a project loads, a key or colour changes, or the
history resets.

### Why hold the rank rather than the scale

Holding one literal scale across a chord change is unsafe: the new chord may
not fit it. Holding the rank keeps the harmonic correctness of a fresh pick
while giving the phrase a stable colour, because the same rank tends to be a
similar kind of scale (for example the lydian-dominant slot on each dominant).

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

## Phase 3: history strip

A `History` checkbox in the Options expander shows a strip of the last four
chord-to-scale choices above the grid, newest first. Each entry shows the
chord, an arrow, the scale and a small badge naming the policy that chose it
(`manual`, `follow` or `shuffle`); a scale that uses notes outside the project
key is tinted amber. This makes the policy visible while playing, on both the
Edit and Perform views. The flag is persisted in `uiPrefs`.

## Phase 4: phrase-aware bias

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
low/medium/high `Strength` select sit in the Options expander for both follow
and shuffle, and both are off or neutral by default. Phrase bias only nudges
the choice between scales that already fit the chord.

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
as a **one-shot override** for the chord it was made on: it is released on the
next chord trigger, including a re-trigger of the same chord, so the policy
resumes. Policies only choose on a chord trigger, never mid-chord.

## UI map and manual smoke tests

Everything sits above the chord/scale grid in `GrandSummary.vue`, on both the
Edit and Perform views, and appears when a project is loaded.

| Element | Where | What it does |
|---|---|---|
| `Scales` select | scale settings row | Chooses `manual`, `follow history` or `shuffle`. |
| `auto: <scale>` chip | scale settings row | The live scale when a policy chose one that is not a stored slot. |
| Reason line | scale settings row | Short explanation of the last automatic choice. |
| `Options` button | scale settings row | Shows or hides the advanced options panel. |
| `Key: <key>` | scale settings row, far right | The resolved project key, in prominent text. |
| `Preset` | Options panel, follow/shuffle | One-click policy presets for the active mode; shows `Custom` when the values are hand-tuned. |
| `Pool`, `Dwell`, `Change` | Options panel, shuffle | Shuffle option values. |
| `Reroll` | Options panel, shuffle, far right | Draws a new scale for the current chord now. |
| `Context` | Options panel, follow | One or two previous chords. |
| `Phrase`, `Strength` | Options panel, follow/shuffle | Phrase-aware bias. |
| `History` | Options panel | Shows the recent chord-to-scale strip. |
| `Recent:` strip | above the grid | Last four chord-to-scale choices with a policy badge. |
| `closest` tag / dashed cell | grid, current row | The nearest stored scale when the live scale is not a stored slot. |

The presets are defined in `POLICY_PRESETS` in `src/lib/autoScale.js`. Shuffle:
**Balanced** (the defaults), **Steady** (pool 3, dwell 3, 50% change),
**Adventurous** (pool 8, always change) and **Phrase-aware** (phrase bias on).
Follow: **Simple** (one chord), **Progression** (two chords), **Lyrical**
(two chords plus phrase bias) and **Resolve** (one chord, strong phrase bias).

### Phase 1 - shuffle options

1. Load a demo, set `Scales` to `shuffle`, click `Options`.
2. Set `Pool` to 3. Trigger chords; the grid should always highlight exactly
   one stored cell, and the chip should name one of `scale1/2/3`.
3. Set `Pool` to 6 and `Dwell` to 3. Trigger the same chord three times: the
   reason should say `shuffle: holding rank N ...` for consecutive triggers,
   then redraw at the boundary.
4. Set `Change` to `0%`. The rank should never change between triggers.
5. Click `Reroll`: the reason should become a fresh draw, not `holding`.
6. Choose the `Balanced` preset: the values return to `6 / 1 / 100%` and the
   preset select stops showing `Custom`.

### Phase 2 - progression context

1. Set `Scales` to `follow history`, open `Options`, set `Context` to `2 chords`.
2. On the C Major II-V-I demo trigger `C3` (Dm7), `D3` (G7), `E3` (Cmaj7):
   the reason on the Cmaj7 should read `ii-V-I into C: major`.
3. Set `Context` to `1 chord` and repeat: the third reason should no longer
   mention `ii-V-I`.
4. Trigger `F3` (the Db7 tritone substitute) and then `E3` (Cmaj7): the reason
   on the Cmaj7 should mention a dominant or tritone-sub resolution.

### Phase 3 - history strip

1. Open `Options` and tick `History`. Trigger a few chords.
2. The strip above the grid should show the last four `chord -> scale` pairs,
   newest first, each with a `manual`/`follow`/`shuffle` badge. A scale outside
   the project key is tinted amber.
3. Close the `Options` panel: the strip stays visible.
4. Untick `History`: the strip disappears. Reload the page: the choice persists.

### Phase 4 - phrase bias

1. Set `Scales` to `follow history`, open `Options`, set `Pool`/`Context` aside,
   and tick `Phrase`.
2. Play a solo note that is the third or seventh of the next chord, then
   trigger that chord. With `Phrase` on, the chosen stored scale should contain
   that note (watch the bolded cell and the reason); with `Phrase` off the
   choice follows continuity and function instead.
3. Set `Strength` to `high` and repeat: the bias is more emphatic; set it to
   `low` for a gentle nudge.
4. Tick `Phrase` with `shuffle` selected: the weights should favour candidates
   that contain the held note.

### Manual pick behaviour (regression test)

1. Set `Scales` to `shuffle`. Click a scale cell in a chord row: that scale
   sounds immediately and its cell is highlighted, with no `auto:` chip.
2. Trigger that same chord again: the policy should resume. Under `shuffle` an
   `auto:` chip appears and the scale usually changes; under `follow history`
   the reason line reappears, and the chosen scale may legitimately be the same
   one because continuity still favours it. The important part is that the
   policy runs again; it must not stay locked to the clicked slot.
3. Repeat the same trigger several times: each trigger re-runs the policy.

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
