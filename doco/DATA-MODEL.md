# Data model

OneKeyJam has no backend. Its "database" is:

- static JSON files in `public/projects/featured/`,
  `public/projects/classic/`, `public/projects/progressions/` and
  `public/projects/rock/` (featured, classic, progressions and rock projects), plus
  `public/keyboards/` (keyboard configs), discovered through generated
  manifests; and
- user projects saved in the browser with IndexedDB.

This document is the reference for those shapes. The machine-readable type
model lives in `src/lib/typedefs.js`, and the static files are checked against
`schemas/project.schema.json` and `schemas/keyboard.schema.json` by
`npm run validate:data`.

## Two project shapes

There are two closely related project shapes:

- `Project` — the in-memory shape the app works with. It includes derived
  scale-note arrays on each chord config.
- `PersistedProject` — what gets written to IndexedDB or exported as JSON.
  `getProjectForPersistence()` strips the derived arrays (`scale1Notes`,
  `scale2Notes`, `scale3Notes`, `scaleNotesOfChord`) and any empty `symbols`
  to keep files small. `emergencyRepairProject()` re-expands them on load.

## Project

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `meta` | `ProjectMeta` | no | `{ type: "onekeyjam", version, source }` |
| `name` | `string` | yes | display name |
| `chords` | `ChordConfig[]` | yes | the chord configs |
| `options` | `ProjectOptions` | no | per-project overrides: `keyboard`, `key`, `soloMode`, `colour`, `scaleStyle`, `gridRows` |
| `songs` | `Songs` | no | chord configs grouped by song |
| `chordSequences` | `{ [name]: ChordSequence }` | no | sequencer patterns keyed by name. Generated songs store the short excerpt in `default` and may add a `medium` middle section and a `full` form; each has an optional `label` for the picker. Repeats reuse rows, with half bars and holds. `markstart`, `markend`, `enabled` and `loopManual` frame the loop, and `tempo` is the sequence's tempo, applied to the global BPM when it loads |

Minimal example:

```json
{
  "name": "My project",
  "chords": [
    {
      "id": 1,
      "name": "CM",
      "chord": "CM",
      "chordNotes": ["C3", "E3", "G3"],
      "scale1": "C major"
    }
  ],
  "options": {
    "key": { "tonic": "C", "type": "major", "source": "user" }
  },
  "songs": { "default": { "ids": [1], "favourites": [], "blacklist": [] } }
}
```

## Project key and solo mode

`options.key` declares the project's musical key. It guides the chord-scale
engine and can drive a "solo in key" performance mode; see
`doco/MUSIC-THEORY.md`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `tonic` | `string` | yes | key note, e.g. `"C"`, `"Bb"` |
| `type` | `string` | yes | Tonal scale type: `"major"`, `"minor"`, or a mode such as `"dorian"` |
| `source` | `"user"` or `"detected"` | no | defaults to `"user"` |

When `options.key` is absent the app detects a major/minor key from the
project's chords and uses that as the default suggestion (shown as
`(detected)` in the Key Detection section). Saving the project persists whatever
the app currently resolves.

`options.soloMode` is `"chord"` (the default) or `"key"`. In `"chord"` mode the
right hand follows `scale1`/`scale2`/`scale3` as the chords change. In `"key"`
mode it stays on the project key scale, and the scale 1/2/3 shortcuts only
switch temporarily until the next chord trigger.

`options.colour` is `"diatonic"`, `"jazz"` (the default when absent) or
`"adventurous"`. It decides how much chromatic colour the key-aware engine
prefers when ranking chord scales; see `doco/MUSIC-THEORY.md`. When a chord is
added, or when the key or colour is changed in the UI, every chord's
`scale1/2/3` is re-ranked automatically in the new context.

## ChordConfig

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `number` (or numeric `string`) | no | unique within the project; reallocated if missing |
| `name` | `string` | no | description |
| `chord` | `string` | no | chord symbol, e.g. `"Dm7"` |
| `chordNotes` | `string[]` | no | notes with octaves, e.g. `["D3","F3","A3"]` |
| `symbols` | `string` | no | alternative detected symbols, comma separated |
| `bass` | `string` | no | bass note without octave |
| `bassNote` | `string` | no | bass note with octave |
| `scale1` | `string` | no | default scale |
| `scale2`, `scale3` | `string` | no | alternative scales |
| `scale1Notes`, `scale2Notes`, `scale3Notes` | `string[]` | no | derived; stripped on save |
| `scaleNotesOfChord` | `string[]` | no | derived; stripped on save |

### Known data variance

Static projects are hand-authored and are looser than the in-memory model:

- `chord` and `chordNotes` may be omitted. `expandChordConfig()` derives the
  missing parts on load (Tonal detects the chord from the notes, or the notes
  from the chord).
- `id` is normally a number but some older files use numeric strings. On load
  `emergencyRepairProject()` coerces numeric strings to numbers, fills missing
  ids sequentially and reallocates duplicates, so ids are unique numbers from
  then on. Ids are never assigned randomly.

The JSON Schema accepts this variance while still type-checking every field
that is present. If you want a stricter dataset later, normalising ids to
numbers across `public/projects/` is the first step.

## Song and Songs

`Songs` is an object keyed by song name. Each `Song` is:

| Field | Type | Notes |
| --- | --- | --- |
| `ids` | `number[]` | **the grid arrangement**: the ordered chord config ids currently assigned to the trigger keys. This is the single source of truth for the grid. It is saved and restored exactly; loading never reshuffles it. |
| `favourites` | `number[]` | keeper ids, pinned first when a new hand is dealt from a large pool. Not used to select chords from a hand-built grid. |
| `blacklist` | `number[]` | ids excluded from a deal (and from growing the grid). |

### The grid arrangement

The grid is a deterministic view of `ids`: trigger slot `i` (C, D, E, F, G, A,
B, then the next octave) maps to the `i`th id resolved against `options`'
chord pool (`project.chords`). `project.options.gridRows` remembers how many
slots are shown, so a project reopens at the size it was left. When `ids` is
missing or empty, the loader seeds a stable hand: favourites first, then the
next pool chords up to the grid size. Randomness exists only in the explicit
**Deal new chords** action and in MIDI import; nothing else reshuffles the grid.

## KeyboardConfig

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | `string` | yes | matches a detected MIDI device name |
| `description` | `string` | no | |
| `rhJamSoundOctave` | `number` | yes | where right-hand jam notes sound |
| `lhTriggerOctave` | `number` | yes | where chords are triggered |

A project can override these in `options.keyboard`.

## Manifests

`bin/generate-manifests.mjs` scans the static folders and writes:

- `public/projects/featured/featured-manifest.json`
- `public/projects/classic/classic-manifest.json`
- `public/projects/progressions/progressions-manifest.json`
- `public/projects/rock/rock-manifest.json`
- `public/keyboards/keyboards-manifest.json`

Each entry is `{ text, value, file }`: display name, URL and file name. These
are generated, so they are not validated and should not be edited by hand.

## Storage locations and modules

| Where | What | Module |
| --- | --- | --- |
| `public/projects/featured/*.json` | featured projects | `src/lib/projectLibrary.js` |
| `public/projects/classic/*.json` | generated classic projects | `bin/generate-classic-projects.mjs` |
| `public/projects/progressions/*.json` | generated progression projects | `bin/generate-progressions-projects.mjs` |
| `public/projects/rock/*.json` | generated rock projects | `bin/generate-rock-projects.mjs` |
| `public/keyboards/*.json` | keyboard configs | `src/lib/projectLibrary.js` |
| IndexedDB `onekeyjam` → `projects` (keyPath `name`) | user projects | `src/lib/localStore.js` |
| exported/imported `.json` files | backup/move | `src/lib/projectSave.js` |
| JSON Schema | static file validation | `schemas/`, `bin/validate-data.mjs` |

## Versioning and repair

- `ProjectMeta.version` currently `2`; `createDefaultMetaProjectConfig()`
  creates it.
- `emergencyRepairProject()` fills in missing top-level fields, normalises chord
  ids to unique numbers, seeds or repairs the grid arrangement and expands each
  chord config. It is called whenever a project is loaded, so partial files are
  tolerated.

## Checking your changes

```sh
npm run validate:data     # validate all static project/keyboard JSON
npm run typecheck         # type-check the JS that uses this model
npm run validate:scales   # key-aware guide-tone and colour-note report
npm run regenerate:scales # dry-run the engine's scale replacements
```
