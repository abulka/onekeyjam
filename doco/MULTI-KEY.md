# Multi-key projects

Status: implemented (auto and manual groups).

A project may contain chords that belong to more than one key — for example a
verse in A minor and a chorus in C major, or a standard that keeps modulating.
`options.key` is the project's base key (the first key group, and the fallback
for any chord without its own key), and a chord may carry its own optional
**section key**. Scale ranking, Solo in key and the header key all follow the
chord that is sounding. This document describes the model.

## Model

- `options.key` stays the project's base key and the fallback for every chord
  that has no key of its own. Changing it never rewrites a group, so
  single-key projects are unchanged and every existing static project remains
  valid.
- A chord may carry an optional section key: `chords[].key =
  { tonic, type, source }`, the same shape as `options.key`
  (`src/lib/typedefs.js`, `schemas/project.schema.json`).
- Groups are derived, not stored: grid rows that share an effective key form a
  key signature group. There is no separate group id list to keep in sync when
  chords are added, deleted, dealt or imported.
- The same chord symbol under two keys becomes two grid rows (one per
  `symbol + key`). Rhythm Changes uses this: the `G7` of the A section (key of
  Bb) and the `G7` of the bridge (key of C) are separate rows.

The effective key of a chord resolves in
`resolveChordKey()` (`src/lib/projectKey.js`): the chord's own key when present,
otherwise the project key, with the project colour carried through. The live
transposition offset is applied on top by `globals.getChordKey()` /
`globals.getActiveKey()`, so a transposed jam moves the section keys too.

## Runtime

- Scale ranking is per chord: `fillInChordConfig`, `expandChordConfig`,
  `detectChord`, `findMatchingScales.js`, `change-scale.js` and `autoScale.js`
  all rank each chord in its own effective key.
- Solo in key (`applyKeyScale()`) uses the active chord's key, so the right
  hand follows a modulation.
- The grid shows a **Key** badge column, colour-coded per key, dimmed for rows
  on the fallback project key, with a divider on the first row of a new key run.
- The header **Key:** chip and the out-of-key tags follow the active chord's
  key, so they move with the music.

## Auto and Manual modes

The Key Detection panel has an **Auto** and a **Manual** mode (the choice is a
global preference, saved in `uiPrefs`, and defaults to Auto). `src/lib/autoKeyDetection.js`
owns the behaviour:

- **Auto**: the project key and the section keys follow the grid. After any grid
  edit (adding a chord or sequence, reordering, dealing, resizing or deleting)
  `detectKeysAfterEdit()` re-runs `suggestKeyGroups()` and applies the result
  with the same code the manual **Apply all** button uses. A freshly opened song
  is left exactly as authored until that first edit; when detection does change
  keys a toast suggests switching to Manual. Locked chords are always kept, so a
  lock is the way to pin a teaching moment the detector reads differently.
- **Manual**: detection is only a suggestion. The user sets the project key and
  every section key by hand, and presses **Detect key groups** and **Apply**
  when they want the detector's reading.

The detected project key is saved with `source: 'detected'`, so the badge
distinguishes an automatic key from one the user typed. The shared write path
lives in `src/lib/keyGroupApply.js`: `applyDetectedGroups()` makes the first
group the project key and the later groups its section keys, skipping locked
chords. Switching the panel to Auto applies the detection immediately, so the
effect is visible without editing the grid first.

## Editing

The Edit view's Key Detection accordion has a **Key Groups** section, shown in
Manual mode:

- It lists every grid chord in trigger order with its own key dropdown and a
  **lock** checkbox. The dropdown starts on `Project key` for a fallback chord,
  or on the chord's section key. Changing one chord calls
  `applyChordKeySettings()` for that chord only, which splits or merges a group
  and re-ranks just the affected scales.
- A **locked** chord (`chord.keyLocked = true`, persisted with the project) is
  protected from key changes: **Apply**, **↓ all** and automatic mode all leave
  it alone. Locking does not influence detection itself, so locking a key (even
  a wrong one) cannot skew the suggestion. The dropdown still edits a locked
  chord by hand.
- **↓ all** applies the row's key to that chord and the following chords,
  stopping before the first locked chord. The key can be a section key or the
  project-key fallback (an empty selection clears back to the project key).
- **Detect key groups** runs the experimental detector (see below) over the
  whole grid and offers suggestions with alternatives. Locked chords inside a
  suggestion are marked and skipped; **Apply** writes one group and **Apply all**
  overwrites every unlocked chord's key with its chosen reading.
- **Apply all** also sets the project key to the first group's reading and
  clears that group's chords, so the first group becomes the primary key and
  the later groups become its explicit modulations. This is the same shape the
  generated multi-key songs use. Per-group **Apply** leaves the project key
  alone.
- Key groups (the per-chord `key` and `keyLocked`) live on the project, so they
  survive a refresh (autosave) and save/export/import. The grid holds clones of
  the project chords for performance, so edits are written to the project and
  synced back onto the grid rather than changed on the clone only.

## Detection (experimental)

`suggestKeyGroups()` in `src/lib/keyGroupDetection.js` searches for the
partition of the arranged chords that best explains the music as a few key
groups, using dynamic programming over contiguous runs of at least two chords.
Each candidate run is scored by:

- **coverage**: how well its chord tones sit in the key, normalised per chord
  tone so runs of different lengths compare fairly, from the existing
  hit-weight/penalty key finder;
- **function cues**: a tonic start, an ending on the tonic, and any V-I cadence
  inside the run;
- **sequence bonus**: two adjacent runs with the same shape (the same chord
  qualities and root motions, such as two i-VI phrases) are a harmonic
  sequence, which is strong evidence that the second run has its own key;
- **boundary penalty**: cutting a V-I resolution across two groups is
  discouraged;
- an adaptive **segment penalty** so each extra group must earn its keep. A
  tonal arrangement (where one key explains most chord tones) keeps the
  historical penalty, which keeps plain ii-V-I progressions in one key. A
  chromatic arrangement, where no single key covers much, gets a lower penalty
  so genuine key changes can surface.

Detection ignores locks and existing keys completely: it always gives one
reading for the arrangement, so a locked or previously keyed chord cannot skew
or split the analysis. Locks and keys are applied only when writing the result,
where locked chords are skipped.

The detector still tests only major and natural minor keys, so relative keys
tie on note fit (A minor and C major, for example, share the same seven notes).
That is why every suggested group carries **alternatives** and, when the
runner-up is within half a point, a **close call** note naming it, with a click
to switch the reading. In Manual mode the reading is chosen by the user; in
Auto mode the top reading is applied automatically, and locks are the way to
keep a chord the detector reads differently. Boundaries come from the chords
themselves, so there is no fixed window size to land a chord off.

### Sensitivity

The panel has a **Sensitivity** selector next to the Auto/Manual toggle, saved
in `uiPrefs` (default **Balanced**). It sets the chromatic segment penalty:

- **Conservative** always uses the historical penalty (2.8), so only very clear
  modulations split.
- **Balanced** lowers the penalty (to 2.0) only when the arrangement is
  chromatic, which keeps plain tonal progressions whole but lets chromatic
  music split. This is the default.
- **Eager** lowers it further (to 1.2), finding more key areas at the risk of
  extra splits on ambiguous songs.

Adjacent groups that resolve to the same key are always fused into one section,
so the reported and applied groups never contain two touching sections of the
same key. `resolveSegmentPenalty()` and `SENSITIVITIES` in
`src/lib/keyGroupDetection.js` hold the levels.

## Example library

`public/projects/multi-key/` is a generated library of modulating examples:
two synthetic etudes, a Giant Steps-style thirds cycle, and multi-key versions
of All the Things You Are, Blue Bossa, The Girl from Ipanema and Rhythm
Changes. They are discovered through `multi-key-manifest.json` and open from
**File → Open Multi-key**.

Regenerate with `npm run generate:multi-key` (or `npm run generate:libraries`).

## Risks and open questions

- **Stale scales:** changing a group's key must re-rank that group. Every key
  change goes through `applyChordKeySettings()` / `applyProjectKeySettings()`.
- **Detection quality:** the segmentation weights were tuned against the
  example library and a sweep of the static libraries (single-key songs stay
  whole). More real songs will help. Auto mode applies this reading on every
  grid edit, which can surprise on an ambiguous chart; the toast names it and
  the sensitivity, locks and Manual mode are the escape hatches. Live inference while a tune
  plays stays out of scope (see `SCALE-POLICIES.md` Phase 5b).
- **Grid order, not musical order:** detection walks the grid arrangement, not
  the tune's sequence order, so a chart whose grid order shuffles sections can
  produce a suggestion that does not match the written form. The alternatives
  and the manual editor are the answer for now.
