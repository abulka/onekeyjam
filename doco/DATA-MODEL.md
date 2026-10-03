# Data model

OneKeyJam has no backend. Its "database" is:

- static JSON files in `public/projects/featured/` and
  `public/projects/classic/` (featured and classic projects), plus
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
| `options` | `ProjectOptions` | no | per-project overrides, e.g. `keyboard` |
| `songs` | `Songs` | no | chord configs grouped by song |
| `chordSequences` | `{ [name]: ChordSequence }` | no | sequencer patterns |

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
  "options": {},
  "songs": { "default": { "ids": [1], "favourites": [], "blacklist": [] } }
}
```

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
- `id` is normally a number but some older files use numeric strings. The app
  compares ids loosely (`==`) and `emergencyRepairProject()` reallocates ids
  when they are entirely missing.

The JSON Schema accepts this variance while still type-checking every field
that is present. If you want a stricter dataset later, normalising ids to
numbers across `public/projects/` is the first step.

## Song and Songs

`Songs` is an object keyed by song name. Each `Song` is:

| Field | Type | Notes |
| --- | --- | --- |
| `ids` | `number[]` | chord config ids in this song |
| `favourites` | `number[]` | ids shown at the top |
| `blacklist` | `number[]` | ids excluded in this song only |

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
- `public/keyboards/keyboards-manifest.json`

Each entry is `{ text, value, file }`: display name, URL and file name. These
are generated, so they are not validated and should not be edited by hand.

## Storage locations and modules

| Where | What | Module |
| --- | --- | --- |
| `public/projects/featured/*.json` | featured projects | `src/lib/projectLibrary.js` |
| `public/projects/classic/*.json` | generated classic projects | `bin/generate-classic-projects.mjs` |
| `public/keyboards/*.json` | keyboard configs | `src/lib/projectLibrary.js` |
| IndexedDB `onekeyjam` → `projects` (keyPath `name`) | user projects | `src/lib/localStore.js` |
| exported/imported `.json` files | backup/move | `src/lib/projectSave.js` |
| JSON Schema | static file validation | `schemas/`, `bin/validate-data.mjs` |

## Versioning and repair

- `ProjectMeta.version` currently `2`; `createDefaultMetaProjectConfig()`
  creates it.
- `emergencyRepairProject()` fills in missing top-level fields, reallocates
  chord ids when absent, and expands each chord config. It is called whenever a
  project is loaded, so partial files are tolerated.

## Checking your changes

```sh
npm run validate:data   # validate all static project/keyboard JSON
npm run typecheck       # type-check the JS that uses this model
```
