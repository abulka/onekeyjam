# Editing Chords / Voicings / Notes — plan and workflow inventory

Status: **planning only, no code decided.** The current working tree holds an
experimental UI that is to be reverted. The last committed, usable state is
`28671a4 "chord picker and voicing tweaks"` (the "two voiced rows" model plus
the lenient notes parser). This document exists so the next session can pick up
without re-deriving everything.

---

## 1. The problem in one paragraph

The panel tries to edit **two different chords at once** and never says which
one it is operating on. One is a *builder voicing* generated from the Chord
Picker combos (root + quality + bass + inversion). The other is a *captured
voicing*: the exact notes from a grid slot, from playing a MIDI/computer
keyboard, or from typing. The radio list, the "Replace" button and the notes
field each pick a different one of these, so the labelling collapses ("G#7no5"
twice), Replace sometimes does nothing (replacing a slot with its own notes),
and the working state goes stale after an Add/Replace. The user's words: "we
might be doing different workflows (add, replace, change voicing, change
notes...) and things are fighting each other".

The instinct at the end of the last session was correct: **treat this as
editing a grid row/slot**, and use an idiom the world already understands
rather than inventing another one.

---

## 2. Concepts in the data model (recap)

- **ChordConfig** (a grid row / slot): `{ id, name, chord (symbol with root),
  chordNotes (exact voicing with octaves), symbols (aliases), bass, bassNote,
  scale1..3, scale1Notes.. }`. `chord` is a label; `chordNotes` is what sounds.
  The two can disagree by design (e.g. `G#7no5` with notes `F#4 C5`).
- **Grid arrangement / trigger map**: `project.songs.default.ids` is the ordered
  list of slots; `globals.chordTriggerMap` maps trigger keys (`C3`, `D3`, ...)
  to **clones** of the pool configs (`buildTriggerMap` deep-clones with
  `JSON.parse(JSON.stringify(...))`). The currently selected slot is
  `globals.currentChordTriggerNote`.
- **Chord Picker state**: `globals.chordPicker`
  `{ currentRoot, currentChord, currentBass, currentChordInversion,
  inversionChangesBass, showAllChords, shortChordNames }`. This is a *builder*.
- **Working / "jammed" state**: `globals.currentChordBeingJammed`
  `{ chord, chordNotes, symbols, bass, type, tonic, stale, source }`. This is
  the transient chord the panel is manipulating. `source` is
  `'grid' | 'midi' | 'typed' | 'picker'`.
- **Three note lists can exist at once**:
  1. the picker's canonical voicing (derived, never stored),
  2. the working notes (`currentChordBeingJammed.chordNotes`),
  3. the stored notes of the selected slot (`currentChordConfig().chordNotes`).

---

## 3. Workflow inventory (the crux)

The single most useful next step is to agree on this list. Each row is a thing
the user actually wants to do.

| # | Workflow | Intent | Input | Target | Should it add or mutate? |
|---|---|---|---|---|---|
| 1 | Build a standard chord and add it | "give me C major" | picker combos | new slot | **add** |
| 2 | Play a chord, add the exact voicing | capture a live voicing | MIDI / computer keyboard | new slot | **add** |
| 3 | Type an exact voicing, add it | hand-author a voicing | notes text | new slot | **add** |
| 4 | Duplicate / derive a slot | reuse an existing chord | existing slot | new slot | **add** |
| 5 | Load a slot into the editor | inspect/edit an existing chord | grid click | working state | neither (load) |
| 6 | Change a chord's identity | root/quality change | picker combos | selected slot? or new? | **ambiguous today** |
| 7 | Edit a slot's voicing in place | nudge notes of a slot | notes text / play | selected slot | **mutate** |
| 8 | Change only the bass | slash bass / bass note | bass field/combo | selected slot or candidate | mutate |
| 9 | Invert / transpose | rotate or shift | buttons/keys | candidate or all slots | mutate/add |
| 10 | Keep a played voicing, normalise later | preserve a voicing, standardise on demand | play, then "normalise" | slot | add, then mutate |
| 11 | Choose a name / interpretation | same notes, different label | alias dropdown | slot | mutate |
| 12 | Audition a candidate | hear before committing | speaker | candidate | neither |
| 13 | Replace a slot with a different chord | overwrite one chord | picker combos | selected slot | **mutate** |
| 14 | Cancel / undo a half-made edit | back out | Esc / Revert | candidate | neither |
| 15 | Add a chord Tonal cannot name | chromatic voicing | play/type | new slot | add |
| 16 | Browse common chords / circle of fifths | pick from a catalogue | buttons | candidate | neither (load) |
| 17 | Import MIDI / chord sequences | bulk add | file/MML | new slots | add |

The fight comes from #6, #7, #8, #13 all landing on the same radio + Replace
button, when #1–#4 are "add" and #5–#14 are "edit". **Add and Edit are two
different operations and should never share a target.**

---

## 4. Classic idioms for editing a row/slot

These are the established patterns; we should adopt one instead of inventing.

1. **Grid + Inspector (Master–Detail).** A list/grid on one side; selecting a
   row fills a detail form. Editing then Save/Cancel (or live-save with undo).
   Examples: database admin tools, Lightroom, CMS list → edit page, macOS
   Finder Get Info, Android settings detail screens. This is the strongest fit:
   the grid already exists.
2. **Inline grid editing (spreadsheet).** Edit cells directly in the row;
   Enter commits, Esc cancels; a blank row at the bottom inserts. Examples:
   Excel/Sheets, DAW track headers, Trello card titles. Good for terse values
   (trigger, symbol, bass) but awkward for a list of notes and a picker.
3. **Separate Add vs Edit modes of one form.** A list plus a "New" button; the
   same form opens blank for add and prefilled for edit. Examples: contacts,
   todos, most REST admin UIs. Differentiates the two intents in the title and
   the primary button ("Create" vs "Save").
4. **Preset/template picker, then Apply.** Browse a catalogue, optionally
   tweak, then apply to the target. Examples: synth patch browsers, drum
   machine pads, Photoshop filters. This is the Chord Picker + Common Chords.
   The key idiom: **the catalogue is a source, never the target.**
5. **Copy-on-write / Duplicate-then-edit.** Treat every row as immutable; to
   change one, duplicate it, edit the copy, replace the original. Examples:
   immutable-state editors, Figma component variants. Avoids accidental edits.
6. **Command + preview + commit.** "Try it" (audition), then Commit; Revert
   discards. Examples: audio effect previews, colour pickers. Fits the speaker
   buttons.
7. **Non-destructive inspector with dirty badge.** Edits apply live but show a
   "modified" dot and an Undo, rather than a Save button. Examples: Ableton
   device inspector, Figma properties. Lower friction, but needs reliable undo.

The best fit for this app is **(1) Grid + Inspector** with **(3) separate
Add/Edit modes**, borrowing **(4)** for the Chord Picker (a catalogue/source)
and **(6)** for audition.

---

## 5. The old UI (before `28671a4`)

Layout, top to bottom:

- **Chord Picker** combos: `[root] [quality] / [bass]`, plus a speaker
  (`chordPlay()` -> canonical picker voicing).
- **Add Chord** button and **Replace** button with a long chip line.
- Accordion **Voicings**:
  - "Choose interpretation of Chord Notes" -> one radio per detected symbol of
    the working notes, each rendering as e.g. `G#7no5`.
  - "Use default Chord Picker voicing" -> a second radio, also rendered as
    `G#7no5` (the `-default-voicing` suffix was stripped for display).
- Accordion **Edit Notes**: Chord Notes text, Bass text, Clear, Reset.

Problems:

- Two radios with identical labels, one meaning "interpretation of these
  notes" and the other meaning "a completely different set of notes".
- "Replace" target unnamed; "Replace the Chord Picker voicing" is meaningless
  because that voicing is generated, not stored.
- Edit Notes ambiguously edits "the chord" with no indication of source.
- Selecting the custom/played row dims Replace (correct no-op) but looks
  broken.
- Working state goes stale after Add/Replace (old voicing lingers).

## 6. Committed UI (`28671a4`, what a revert restores)

Same skeleton, but the Voicings section became two clearly labelled rows:

- "Chord Picker voicing" always present.
- "Custom voicing {from grid chord | from MIDI | typed}" shown when it differs,
  with its own notes and audition.
- A small "store as" name dropdown when several aliases fit.
- A green "current chord" tag on the row that equals the stored slot.
- "Notes to write:" heading; Add/Replace act on the selected row.
- `ChordAddEditNotes` got the lenient parser + direct setter, so typing
  `C E G` works and no longer reverts.

Problems that remained: still two sources to reason about; the default
selection flips between picker and custom; the Replace line could show the same
chord on both sides with a "No change" note; the picker-vs-custom relationship
is still not obvious.

## 7. Experimental UI (current, uncommitted, to be reverted)

One "working chord" with two ways to shape it:

- Chord Picker combos rebuild the working chord on root/quality/inversion;
  bass edits only the bass.
- Notes field overrides the working notes (direct set + name detection).
- Single speaker; Add and Replace both write the working chord via the exact
  path; a "Normalise" button rebuilds from the picker.

Observed failures (reported by the user, to be fixed in the next design, not
patched here):

1. **Picker auditions a custom voicing, not the standard one.** Caused by
   changing `chordPlay()` and the picker speaker to play the working chord.
   This contradicts an explicit earlier requirement ("the chord picker always
   plays the default voicing").
2. **Extra notes when adding a chord from the MIDI keyboard.** Hypothesis:
   Add always writes the live working notes, and those arrays are stored **by
   reference** (see §8), so stale/aliased notes can leak in. Needs repro.
3. **Extra grid entry when clicking Replace.** No code path adds a slot on
   replace (`replaceCurrentChordExact` only mutates; `appendChordConfigsToGrid`
   is the only add path and is called only by Add). Suspect the Add button
   firing, or the click also reaching Add. Needs repro.
4. **Replace line clutter**: `G4 G6 [G4 A#4 C5 C#5] → G6 [G4 A#4 C5 C#5] No
   change — ...` prints the full note list twice.
5. Not actually clearer than before.

---

## 8. Data-integrity bugs to reproduce first (next session)

- **Array aliasing.** `ChordAdd.vue` passes `workingNotes` (the live reactive
  array) directly into `chordAddToProjectExact`; `fillInChordConfig2` assigns
  that same reference to the stored config. Separately,
  `syncPickerToCurrentChord` -> `chordPickerToJammedExtraPrecision` assigns the
  stored config's array to the working state. Any later in-place sort/mutation
  (e.g. `sortNotes`, which sorts in place) then silently edits a stored chord.
  **Fix direction:** always copy (`[...notes]`) when writing, in both directions.
- **Detection staleness.** `detectChordsBeingPlayed` uses module-level
  `lastNotes`/`lastNotesAnalysed` and a 100 ms stabilisation window; a quick
  play can leave the working notes as the previously loaded chord. Repro: load
  a 4-note grid chord, then quickly play 3 notes and hit Add; check whether the
  stored notes are the 3 played or the stale 4.
- **Extra slot on Replace.** Log/assert `project.chords.length` and
  `song.ids.length` before/after the Replace click, and confirm whether
  `chord-add` fired. Repro instructions wanted: number of rows before/after,
  and whether Replace was enabled.

---

## 9. Recommended direction

Adopt **Grid + Inspector with separate Add and Edit modes**.

- The **grid** is the list of slots. Clicking a slot selects it and opens the
  **inspector** for that slot (this already partly happens via
  `syncPickerToCurrentChord`).
- The inspector is **one form** with a clear title:
  - **Add chord** mode: opens from an "Add" button / the `/` shortcut; target
    is a *new* slot; primary button "Add to grid".
  - **Edit slot** mode: opens when a grid slot is selected; target is *that*
    slot; primary button "Save changes".
- **Add and Replace are no longer the same wording.** "Replace" disappears;
  editing a slot is "Save changes". This structurally removes workflow #13's
  ambiguity and cannot add a row.
- **The Chord Picker is a catalogue/source, not the target** (idiom 4). Its
  speaker always auditions the canonical voicing. A button "Use this voicing"
  copies the canonical voicing into the inspector's notes (like a preset).
- **Played / typed notes are another source** for the inspector, with their own
  audition. Keeping a played voicing and normalising it later is just: play →
  the notes are in the inspector → optionally "Use this voicing" → Save.
- **Dirty state + Save/Revert** (idiom 6/7). Enter = save, Esc = revert, with a
  visible "modified" indicator. (Undo-live is an alternative but needs a real
  undo stack.)
- **Copy-on-write for arrays** (§8) so stored chords can never alias live state.

### Concrete screen sketch (for discussion)

```
Chord table
  [ ... rows ... ]  <- selecting a row selects a slot

Inspector:  Edit slot  C3 · G#7no5 [F#4 C5]
  Symbol   [G#7no5 ▾]        (aliases; free-text if unnamed)
  Notes    [F#4 C5]   (play) (type; C E G accepted)
  Bass     [C]
  Source   ( ) Chord Picker  [G#3 C4 F#4] (play)  [Use this voicing]
           ( ) Played / typed [F#4 C5]           (play)
  [ Revert ]                         [ Save changes ]

Add:  "Add chord" opens the same inspector in new mode,
      prefilled from the current Chord Picker chord.
      [ Cancel ]                        [ Add to grid ]
```

---

## 10. Options considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Grid + Inspector, Add/Edit modes** (recommended) | One form, two titles/buttons; picker is a source | Removes Replace ambiguity; structurally safe; familiar | Inspector needs a home in the layout; slightly more UI |
| B. Two-action single voicing | One editable voicing with "Add new" and "Save to slot"; picker applies into it | Small change from committed UI | Still couples add and edit on one candidate |
| C. Two voiced rows with per-row Add/Replace | Keep committed model, give each row its own buttons | Reuses existing rows | Still two sources; two Add + two Replace buttons |
| D. Modal dialogs | "Add chord" / "Edit chord" dialogs | Very explicit | Heavier; hides the grid; more clicks |

---

## 11. Open questions for the next session

1. Extra slot on Replace: what exactly was clicked, and did the row count grow?
2. Placing the Inspector: replace the current "Edit Chords" accordion content,
   or dock it beside the grid?
3. For Edit slot, do we want explicit **Save/Revert**, or **live edit + Undo**?
4. Do we need a free-text symbol field for chords Tonal cannot name, or is the
   alias dropdown enough?
5. Should editing a slot's root/quality **mutate** that slot (inspector model)
   or always require "Save changes" first?
6. Duplicate/derive workflow (#4): a "Duplicate slot" action, or just Add while
   a slot is selected (pre-filled inspector)?

---

## 12. Appendix — where the code lives

- `src/components/ChordPicker.vue` — combos, speaker, Common Chords, Transpose.
- `src/components/ChordAdd.vue` — Add/Replace buttons and the voicing/notes UI.
- `src/components/ChordAddEditNotes.vue` — notes + bass editor, name dropdown.
- `src/components/GrandSummary.vue` — the grid; `syncPickerAfterGridClick`,
  `generalTableClick`, `scaleFilterTableClick`.
- `src/lib/chordPicker.js` — `chordPickerToJammed`, `setWorkingBass`,
  `syncCustomVoicingToCurrentChord`, inversion/transpose helpers.
- `src/lib/chordAddToProject.js`, `src/lib/replaceCurrentChord.js` — write paths.
- `src/lib/fillInChordConfig.js` — `fillInChordConfig` (from combos) and
  `fillInChordConfig2` (exact notes).
- `src/lib/syncPickerToCurrentChord.js` — grid slot → picker/working load.
- `src/lib/detectChordsBeingPlayed.js` — `detectChordsBeingPlayed` (live MIDI)
  and `setChordNotesDirectly` (typed).
- `src/lib/chordAddHelpers.js` — note/bass comparisons, name options.
- `src/lib/globals.js` — `currentChordBeingJammed`, `chordPicker`, getters
  `currentChordConfig`, `currentLhNotes`, `currentBass`, `currentConfigEmpty`.
- `src/lib/triggerMaps.js` — `buildTriggerMap` (clones), `resolveGridChords`.
- `src/lib/gridArrangement.js` — `appendChordConfigsToGrid` (the only add path).
- Tests of interest: `test/chord-add/*`, `test/chord-sequence/
  syncPickerToCurrentChord.test.js`.
