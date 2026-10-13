// @ts-check
import * as Tonal from '@tonaljs/tonal'
import { globals } from './globals.js'
import { arraysAreEqual } from './array-tools.js'
import { bassPitchClass } from './chordAddHelpers.js'
import { createChordSymbol, normaliseNoteName, parseNoteInput, sortNotes } from './note-tools.js'
import { chordSymbolToNotesInversion } from './chordSymbolToNotes.js'
import { removeBassSlash } from './removeBassSlash.js'
import { calcAllChordSymbols } from './calcAllChordSymbols.js'
import { calcChordInversionNumberAndNewBass } from './chordInversion.js'
import { chordAddToProject, chordAddToProjectExact } from './chordAddToProject.js'
import { replaceCurrentChord, replaceCurrentChordExact } from './replaceCurrentChord.js'
import { deleteGridChords } from './gridArrangement.js'
import { resolveProjectKey } from './projectKey.js'
import { detectKeysAfterEdit } from './autoKeyDetection.js'
import { keyDetection } from './keyDetection.js'

/**
 * @module lib/chordInspector
 * @desc The one Chord Inspector. The picker combos, the notes field, the
 * captured chip and the row actions all operate on a single draft that mirrors
 * the selected grid slot. Nothing is stored until `saveDraft`; `revertDraft`
 * reloads the slot. `addRow` appends a new slot and selects it, so "Add" is
 * just "create a row, then edit it".
 *
 * The draft's identity lives in `globals.chordPicker` (root, quality, bass,
 * inversion), as the Chord Picker already did. The draft's notes live in
 * `globals.chordInspector.notes`, which is kept separate from
 * `globals.currentChordBeingJammed` so a played chord can never silently
 * overwrite an edit; it only reaches the draft through `useCapturedNotes`.
 */

/** The draft state object. */
function inspector() {
  return globals.chordInspector
}

/** The quality combo value for a stored chord symbol, e.g. 'C4' -> '4'. */
export function chordQualityFromSymbol(symbol) {
  const chordObj = Tonal.Chord.get(symbol ?? '')
  if (chordObj.empty)
    return 'M'
  return chordObj.aliases[0] || 'M'
}

/** The root note of a stored chord symbol, e.g. 'G#7no5' -> 'G#'. */
export function chordRootFromSymbol(symbol) {
  const chordObj = Tonal.Chord.get(symbol ?? '')
  return chordObj.empty ? 'C' : normaliseNoteName(chordObj.tonic)
}

/** The normalised (Auto) voicing for an identity. */
export function autoNotesFor(root, quality, inversion = 0) {
  const [symbol] = removeBassSlash(createChordSymbol(root, quality))
  return chordSymbolToNotesInversion(symbol, inversion)
}

/** The stored chord label for an identity. */
export function autoSymbolFor(root, quality) {
  return removeBassSlash(createChordSymbol(root, quality))[0]
}

function splitSymbols(symbols, fallback) {
  if (Array.isArray(symbols))
    return symbols.filter(Boolean)
  if (typeof symbols === 'string' && symbols.length > 0)
    return symbols.split(',').map(symbol => symbol.trim()).filter(Boolean)
  return fallback ? [fallback] : []
}

/** A copy of everything the draft holds, for the dirty check and Revert. */
function snapshot() {
  const ins = inspector()
  return {
    root: globals.chordPicker.currentRoot,
    quality: globals.chordPicker.currentChord,
    bass: globals.chordPicker.currentBass,
    inversion: globals.chordPicker.currentChordInversion,
    symbol: ins.symbol,
    symbols: [...ins.symbols],
    notes: [...ins.notes],
    voicingMode: ins.voicingMode,
  }
}

/**
 * Rebuild the draft voicing from its identity and mark it Auto. This is what
 * changing root, quality or inversion does, so a custom voicing never lingers
 * under a different chord name.
 */
function applyAuto() {
  const ins = inspector()
  const root = globals.chordPicker.currentRoot
  const quality = globals.chordPicker.currentChord
  const inversion = globals.chordPicker.currentChordInversion
  ins.notes = autoNotesFor(root, quality, inversion)
  ins.voicingMode = 'auto'
  ins.symbol = autoSymbolFor(root, quality)
  ins.symbols = [ins.symbol]
}

/** True when the draft differs from the last loaded or saved state. */
export function isDirty() {
  const base = inspector().baseline
  if (!base)
    return false
  const now = snapshot()
  return now.root !== base.root
    || now.quality !== base.quality
    || bassPitchClass(now.bass) !== bassPitchClass(base.bass)
    || now.inversion !== base.inversion
    || now.symbol !== base.symbol
    || now.voicingMode !== base.voicingMode
    || !arraysAreEqual(now.notes, base.notes)
}

/**
 * Copy a grid slot into the draft. The picker combos follow the slot, and a
 * stored voicing that differs from the normalised one is marked Custom.
 * @returns {boolean} whether a slot was loaded
 */
export function loadDraftFromSlot(triggerNote = globals.currentChordTriggerNote) {
  const config = globals.chordTriggerMap?.[triggerNote]
  if (!config) {
    inspector().slotId = null
    inspector().triggerNote = ''
    inspector().baseline = null
    return false
  }
  const root = chordRootFromSymbol(config.chord)
  const quality = chordQualityFromSymbol(config.chord)
  globals.chordPicker.currentRoot = root
  globals.chordPicker.currentChord = quality
  globals.chordPicker.currentBass = config.bass ? normaliseNoteName(config.bass) : ''
  globals.chordPicker.currentChordInversion = 0

  const derived = autoNotesFor(root, quality, 0)
  const notes = Array.isArray(config.chordNotes) ? [...config.chordNotes] : []
  const ins = inspector()
  ins.notes = notes
  ins.voicingMode = notes.length > 0 && !arraysAreEqual(notes, derived) ? 'custom' : 'auto'
  ins.symbol = config.chord ?? ''
  ins.symbols = splitSymbols(config.symbols, config.chord)
  ins.slotId = config.id ?? null
  ins.triggerNote = triggerNote ?? ''
  // A chord played before this row was selected belongs to the previous
  // context, so it is not offered as Captured. Only what is played from now on
  // shows in the chip.
  ins.capturedIgnored = Array.isArray(globals.currentChordBeingJammed.chordNotes)
    ? [...globals.currentChordBeingJammed.chordNotes]
    : []
  ins.baseline = snapshot()
  return true
}

/** Select a slot and open the inspector on it. */
export function openForSlot(triggerNote = globals.currentChordTriggerNote) {
  if (!triggerNote || !(triggerNote in (globals.chordTriggerMap ?? {})))
    return false
  globals.currentChordTriggerNote = triggerNote
  const ok = loadDraftFromSlot(triggerNote)
  inspector().open = true
  inspector().mode = 'edit'
  return ok
}

/** Close the panel. The draft is kept so re-opening shows the same slot. */
export function closeInspector() {
  inspector().open = false
}

/** Load a chord symbol straight into the draft identity (Auto voicing). */
export function setFromSymbol(symbol) {
  const chordObj = Tonal.Chord.get(symbol ?? '')
  if (chordObj.empty)
    return false
  globals.chordPicker.currentRoot = normaliseNoteName(chordObj.tonic)
  globals.chordPicker.currentBass = normaliseNoteName(chordObj.tonic)
  globals.chordPicker.currentChord = chordObj.aliases[0] || 'M'
  globals.chordPicker.currentChordInversion = 0
  applyAuto()
  return true
}

/** Change the chord identity (root and quality); the voicing resets to Auto. */
export function setIdentity(root, quality) {
  globals.chordPicker.currentRoot = root
  globals.chordPicker.currentChord = quality
  globals.chordPicker.currentChordInversion = 0
  applyAuto()
}

/** Change only the bass. The voicing (and its Auto/Custom state) is untouched. */
export function setBass(bass) {
  globals.chordPicker.currentBass = bass ? normaliseNoteName(bass) : ''
}

/** Invert the draft voicing, keeping the identity. */
export function setInversion(inversion) {
  globals.chordPicker.currentChordInversion = inversion
  applyAuto()
}

/**
 * Point the picker combos at a chord symbol, without touching the draft notes.
 * Used when the notes were typed or captured, so the picker always names what
 * the notes actually are.
 */
function applySymbolToIdentity(symbol) {
  if (!symbol)
    return
  const [plain, bass] = removeBassSlash(symbol)
  const chordObj = Tonal.Chord.get(plain)
  if (chordObj.empty)
    return
  globals.chordPicker.currentRoot = normaliseNoteName(chordObj.tonic)
  globals.chordPicker.currentChord = chordObj.aliases[0] || 'M'
  globals.chordPicker.currentChordInversion = 0
  if (bass)
    globals.chordPicker.currentBass = normaliseNoteName(bass)
}

/** Store exact notes as a Custom voicing and re-name them on the picker. */
export function setNotes(notes) {
  const ins = inspector()
  ins.notes = Array.isArray(notes) ? [...notes] : []
  if (ins.notes.length === 0)
    return
  ins.voicingMode = 'custom'
  const detected = Tonal.Chord.detect(ins.notes)
  if (detected.length > 0) {
    ins.symbols = detected
    ins.symbol = detected[0]
    // The picker follows the notes: root, quality, bass and inversion all
    // update so the combos never disagree with what sounds.
    applySymbolToIdentity(detected[0])
  }
}

/**
 * Apply typed notes (lenient: octaves are optional and inherited).
 * @returns {boolean} whether any notes were recognised
 */
export function setNotesFromText(text) {
  const notes = parseNoteInput(text)
  if (notes.length === 0)
    return false
  // Fold theoretical spellings so typing E# G# B# stores F Ab C and names the
  // chord Fm. Normal spellings, including flats such as Eb, are left as typed.
  setNotes(notes.map(note => Tonal.Note.simplify(note)))
  return true
}

/** The last played chord, offered as the Captured chip. */
export function capturedInfo() {
  const played = globals.currentChordBeingJammed
  const notes = Array.isArray(played.chordNotes) ? played.chordNotes : []
  const ins = inspector()
  // Only notes played since this row was selected count. Anything already in
  // the played state when the draft loaded is stale and stays hidden.
  const fresh = notes.length > 0
    && played.source === 'midi'
    && !arraysAreEqual(notes, ins.capturedIgnored ?? [])
  return {
    available: fresh,
    chord: played.chord || played.symbols?.[0] || '',
    symbols: Array.isArray(played.symbols) && played.symbols.length > 0
      ? [...played.symbols]
      : (played.chord ? [played.chord] : []),
    notes: [...notes],
    bass: played.bass || '',
  }
}

/**
 * Copy the captured (played) notes into the draft as a Custom voicing. Played
 * notes never reach the draft on their own.
 */
export function useCapturedNotes() {
  const captured = capturedInfo()
  if (!captured.available)
    return false
  const ins = inspector()
  ins.notes = sortNotes([...captured.notes])
  ins.voicingMode = 'custom'
  ins.symbol = captured.chord || ins.symbol
  ins.symbols = captured.symbols.length > 0 ? captured.symbols : ins.symbols
  applySymbolToIdentity(captured.chord)
  if (captured.bass)
    globals.chordPicker.currentBass = normaliseNoteName(captured.bass)
  // Applied: hide the chip so it does not offer the same notes again.
  ins.capturedIgnored = [...captured.notes]
  return true
}

/** Rebuild the normalised voicing from the current identity. */
export function revertToAuto() {
  applyAuto()
}

/** Save the draft into the selected slot. */
export function saveDraft() {
  const ins = inspector()
  if (!globals.isProjectLoaded || ins.slotId == null)
    return false
  if (ins.voicingMode === 'auto') {
    replaceCurrentChord(
      globals.chordPicker.currentRoot,
      globals.chordPicker.currentChord,
      globals.chordPicker.currentChordInversion,
      globals.chordPicker.currentBass,
    )
  }
  else {
    const symbol = ins.symbol || autoSymbolFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord)
    replaceCurrentChordExact(symbol, [...ins.notes], [...ins.symbols], globals.chordPicker.currentBass)
  }
  globals.projectKey = resolveProjectKey(globals.project) ?? globals.projectKey ?? null
  detectKeysAfterEdit()
  loadDraftFromSlot(ins.triggerNote)
  return true
}

/** Discard the draft and reload the selected slot. */
export function revertDraft() {
  return loadDraftFromSlot(inspector().triggerNote)
}

function selectNewestSlot() {
  const triggerNotes = Object.keys(globals.chordTriggerMap ?? {})
  const last = triggerNotes[triggerNotes.length - 1]
  if (last)
    openForSlot(last)
  return last
}

/** Append a chord built from the draft, then select it. */
export function duplicateDraft() {
  const ins = inspector()
  if (!globals.isProjectLoaded)
    return false
  if (ins.voicingMode === 'auto') {
    chordAddToProject(
      globals.chordPicker.currentRoot,
      globals.chordPicker.currentChord,
      globals.chordPicker.currentChordInversion,
      globals.chordPicker.currentBass,
    )
  }
  else {
    const symbol = ins.symbol || autoSymbolFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord)
    chordAddToProjectExact(symbol, [...ins.notes], [...ins.symbols], globals.chordPicker.currentBass)
  }
  return selectNewestSlot() ?? false
}

/**
 * Add a new row. A chord played since the last action is seeded straight in,
 * otherwise a plain C major row is created; either way the new row is selected
 * so the inspector can edit it.
 */
export function addRow() {
  if (!globals.project || !Array.isArray(globals.project.chords))
    return false
  const captured = capturedInfo()
  if (captured.available) {
    const symbol = captured.chord || captured.symbols[0] || 'C'
    chordAddToProjectExact(symbol, [...captured.notes], [...captured.symbols], captured.bass)
  }
  else {
    chordAddToProject('C', 'M', 0, 'C')
  }
  return selectNewestSlot() ?? false
}

/** Does the selected slot carry the favourite flag? */
export function isFavourite() {
  const favourites = globals.project?.songs?.default?.favourites
  return Array.isArray(favourites) && favourites.includes(inspector().slotId)
}

/** Toggle the favourite flag on the selected slot. */
export function toggleFavourite() {
  const id = inspector().slotId
  const song = globals.project?.songs?.default
  if (id == null || !song)
    return false
  if (!Array.isArray(song.favourites))
    song.favourites = []
  const index = song.favourites.indexOf(id)
  if (index >= 0)
    song.favourites.splice(index, 1)
  else
    song.favourites.push(id)
  // Key detection can be set to look only at favourites, so a change here may
  // change the detected key.
  if (globals.keySignatureDetection?.fromFavouritesOnly)
    keyDetection()
  return true
}

/**
 * Delete the selected slot. The grid shrinks to match and the nearest slot is
 * selected, so the inspector always points at a real row.
 */
export function deleteDraft() {
  const id = inspector().slotId
  if (id == null || !globals.isProjectLoaded)
    return false
  globals.idsToDelete = [id]
  deleteGridChords()
  globals.projectKey = resolveProjectKey(globals.project) ?? globals.projectKey ?? null
  detectKeysAfterEdit()
  const triggerNotes = Object.keys(globals.chordTriggerMap ?? {})
  if (triggerNotes.length === 0) {
    inspector().open = false
    inspector().slotId = null
    inspector().triggerNote = ''
    return true
  }
  openForSlot(triggerNotes[0])
  return true
}

/** Move the draft root by semitones, keeping the quality. Resets to Auto. */
export function transposeDraft(semitones) {
  const newRoot = normaliseNoteName(
    Tonal.Note.transpose(globals.chordPicker.currentRoot, Tonal.Interval.fromSemitones(semitones)))
  globals.chordPicker.currentBass = newRoot
  setIdentity(newRoot, globals.chordPicker.currentChord)
}

/** Move the draft root by fifths, keeping the quality. Resets to Auto. */
export function fifthDraft(direction) {
  const newRoot = normaliseNoteName(
    Tonal.Note.transposeFifths(globals.chordPicker.currentRoot, direction))
  globals.chordPicker.currentBass = newRoot
  setIdentity(newRoot, globals.chordPicker.currentChord)
}

/** Invert the draft voicing up or down. */
export function invertDraft(direction) {
  const { bass, inversion } = calcChordInversionNumberAndNewBass(
    globals.chordPicker.currentRoot,
    globals.chordPicker.currentChord,
    globals.chordPicker.currentChordInversion,
    globals.chordPicker.inversionChangesBass,
    direction,
  )
  globals.chordPicker.currentChordInversion = inversion
  globals.chordPicker.currentBass = bass
  applyAuto()
}

/** Step through the chord quality catalogue: 'next', 'prev' or 'random'. */
export function stepChord(direction) {
  const options = calcAllChordSymbols(globals.chordPicker.showAllChords, globals.chordPicker.shortChordNames)
  if (options.length === 0)
    return
  let index = options.findIndex(option => option.value === globals.chordPicker.currentChord)
  if (index < 0)
    index = 0
  if (direction === 'next')
    index = (index + 1) % options.length
  else if (direction === 'prev')
    index = (index - 1 + options.length) % options.length
  else if (direction === 'random')
    index = Math.floor(Math.random() * options.length)
  globals.chordPicker.currentBass = globals.chordPicker.currentRoot
  setIdentity(globals.chordPicker.currentRoot, options[index].value)
}

/**
 * Preview what a Transpose & invert button would sound like, without touching
 * the draft. Returns the Auto voicing notes and bass for the prospective
 * chord, so hovering can audition it. The draft stays clean until click.
 * @returns {{ notes: string[], bass: string }}
 */
export function previewTranspose(semitones) {
  const root = globals.chordPicker.currentRoot
  const quality = globals.chordPicker.currentChord
  const newRoot = normaliseNoteName(
    Tonal.Note.transpose(root, Tonal.Interval.fromSemitones(semitones)))
  return { notes: autoNotesFor(newRoot, quality, 0), bass: newRoot }
}

/** Preview a fifth move without touching the draft. */
export function previewFifth(direction) {
  const root = globals.chordPicker.currentRoot
  const quality = globals.chordPicker.currentChord
  const newRoot = normaliseNoteName(
    Tonal.Note.transposeFifths(root, direction))
  return { notes: autoNotesFor(newRoot, quality, 0), bass: newRoot }
}

/** Preview an inversion without touching the draft. */
export function previewInvert(direction) {
  const root = globals.chordPicker.currentRoot
  const quality = globals.chordPicker.currentChord
  const { bass, inversion } = calcChordInversionNumberAndNewBass(
    root,
    quality,
    globals.chordPicker.currentChordInversion,
    globals.chordPicker.inversionChangesBass,
    direction,
  )
  return { notes: autoNotesFor(root, quality, inversion), bass }
}

/**
 * Preview stepping the chord quality without touching the draft.
 * Returns null for 'random' (no stable preview) or an empty catalogue.
 * @returns {{ notes: string[], bass: string, quality: string } | null}
 */
export function previewStep(direction) {
  if (direction === 'random')
    return null
  const options = calcAllChordSymbols(globals.chordPicker.showAllChords, globals.chordPicker.shortChordNames)
  if (options.length === 0)
    return null
  const root = globals.chordPicker.currentRoot
  let index = options.findIndex(option => option.value === globals.chordPicker.currentChord)
  if (index < 0)
    index = 0
  if (direction === 'next')
    index = (index + 1) % options.length
  else if (direction === 'prev')
    index = (index - 1 + options.length) % options.length
  else
    return null
  const quality = options[index].value
  return { notes: autoNotesFor(root, quality, 0), bass: root, quality }
}

/** Select a slot without opening the panel (used from the grid). */
export function selectSlot(triggerNote) {
  if (!triggerNote || !(triggerNote in (globals.chordTriggerMap ?? {})))
    return false
  globals.currentChordTriggerNote = triggerNote
  return loadDraftFromSlot(triggerNote)
}
