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

- It lists the grid chords grouped by effective key, each with a key combo.
  Changing a group's key re-ranks only that group's scales
  (`applyChordKeySettings()` in `src/lib/projectScaleSettings.js`).
- "follow project key" removes the key from a group so it uses the project key
  again.
- **Detect key groups** runs the experimental detector (see below) and offers
  suggestions to accept one at a time or all at once. Nothing is applied
  without the user accepting it.

## Detection (experimental)

`suggestKeyGroups()` in `src/lib/keyGroupDetection.js` scores non-overlapping
windows of the arranged chords with `rankedKeysFromChords()` (a scored variant
of the existing major/minor key finder) and merges runs with the same key. It
only tests major and natural minor keys, so relative keys are ambiguous; ties
prefer the declared project key, then the window's first chord root, then major.
Window boundaries are coarse, so a suggested boundary can land one chord early
or late. It is a hint to accept by hand, not an automatic mode.

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
- **Detection quality:** segmentation heuristics were tuned against the example
  library; more real songs will help. Automatic live inference stays out of
  scope (see `SCALE-POLICIES.md` Phase 5b).
- **Boundary alignment:** the detector uses fixed-size windows, so it can place
  a boundary a chord off. Closer boundary refinement is future work.
