# Multi-key projects

Status: implemented (manual groups), experimental detection.

A project may contain chords that belong to more than one key — for example a
verse in A minor and a chorus in C major, or a standard that keeps modulating.
Today OneKeyJam carries a single key per project (`options.key`), and detection,
filtering and scale ranking all use that one key. This document describes the
implemented extension.

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

## Editing

The Edit view's Key Detection accordion has a **Key Groups** section:

- It lists every grid chord in trigger order with its own key dropdown and a
  **lock** checkbox. The dropdown starts on `Project key` for a fallback chord,
  or on the chord's section key. Changing one chord calls
  `applyChordKeySettings()` for that chord only, which splits or merges a group
  and re-ranks just the affected scales.
- A **locked** chord (`chord.keyLocked = true`, persisted with the project) is
  protected from key changes: **Apply** and **↓ all** leave it alone. Locking
  does not influence detection itself, so locking a key (even a wrong one)
  cannot skew the suggestion. The dropdown still edits a locked chord by hand.
- **↓ all** applies the row's key to that chord and the following chords,
  stopping before the first locked chord. The key can be a section key or the
  project-key fallback (an empty selection clears back to the project key).
- **Detect key groups** runs the experimental detector (see below) over the
  whole grid and offers suggestions with alternatives. Locked chords inside a
  suggestion are marked and skipped; **Apply all** overwrites every unlocked
  chord's key with its chosen reading, and a group whose reading is the project
  key clears those chords back to the fallback.

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
- a **segment penalty** so each extra group must earn its keep, which keeps
  plain ii-V-I progressions in one key.

Detection ignores locks and existing keys completely: it always gives one
reading for the arrangement, so a locked or previously keyed chord cannot skew
or split the analysis. Locks and keys are applied only by the UI, which skips
locked chords when writing the result.

The detector still tests only major and natural minor keys, so relative keys
tie on note fit (A minor and C major, for example, share the same seven notes).
That is why every suggested group carries **alternatives** and, when the
runner-up is within half a point, a **close call** note naming it, with a click
to switch the reading. The reading is always chosen by the user, never applied
automatically. Boundaries come from the chords themselves, so there is no fixed
window size to land a chord off.

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
  whole). More real songs will help. Automatic live inference stays out of
  scope (see `SCALE-POLICIES.md` Phase 5b).
- **Grid order, not musical order:** detection walks the grid arrangement, not
  the tune's sequence order, so a chart whose grid order shuffles sections can
  produce a suggestion that does not match the written form. The alternatives
  and the manual editor are the answer for now.
