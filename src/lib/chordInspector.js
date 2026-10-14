// @ts-check
import * as Tonal from '@tonaljs/tonal'
import { globals } from './globals.js'
import { arraysAreEqual } from './array-tools.js'
import { bassPitchClass } from './chordAddHelpers.js'
import { createChordSymbol, normaliseNoteName, parseNotesWithBass, sortNotes } from './note-tools.js'
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
 * played voicing switch and the row actions all operate on a single draft.
 * When a grid slot is selected the draft mirrors it and Save writes back.
 * When the project has no rows yet, playing still builds a pending new-chord
 * draft so the picker follows what was played and Add creates the first row.
 * Nothing is stored until `saveDraft` or `addRow`; `revertDraft` reloads the
 * slot. `addRow` appends a new slot and selects it, so "Add" is just "create
 * a row, then edit it".
 *
 * Playing notes auto-updates the draft identity to the detected chord and
 * keeps the exact played notes as the played alternative. The draft starts
 * on the normalised (Auto) voicing so the picker and the header always
 * agree; `useCapturedNotes` switches to the played voicing and `revertToAuto`
 * switches back, and both stay available until save, add, a new capture, or
 * a row change.
 *
 * The draft's identity lives in `globals.chordPicker` (root, quality, bass,
 * inversion), as the Chord Picker already did. The draft's notes live in
 * `globals.chordInspector.notes`, which is kept separate from
 * `globals.currentChordBeingJammed` so only fresh played notes auto-apply.
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

/**
 * True when a stored row was written as an exact voicing rather than generated
 * from its symbol: Save with the Custom row, Add with a played chord, and so on.
 * Those rows carry the "(user jam)" label; generated ones carry "(user)". Rows
 * from a project file use their own labels and are judged by their notes alone.
 */
function isStoredExactVoicing(config) {
  return typeof config?.name === 'string' && config.name.endsWith('(user jam)')
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

/** Forget the played alternative, for example after a manual edit or row change. */
function clearPlayedVoicing() {
  const ins = inspector()
  ins.playedNotes = []
  ins.playedBass = ''
  ins.playedChord = ''
  ins.playedSymbols = []
}

/** Forget the custom voicing row (the normalised row is computed). */
function clearCustomVoicing() {
  const ins = inspector()
  ins.customNotes = []
  ins.customSymbol = ''
  ins.customSymbols = []
}

/**
 * Reset the bass to blank. Called whenever the chord identity is replaced (a
 * played chord, a Root/Chord change, transpose, step, a chord link, or a new
 * project), so a slash from the previous chord cannot linger. Note edits and
 * voicing switches keep the bass.
 */
function resetBassToAuto() {
  globals.chordPicker.currentBass = ''
}

/** The notes the normalised row shows for the current pickers. */
export function normalisedVoicingNotes() {
  return autoNotesFor(
    globals.chordPicker.currentRoot,
    globals.chordPicker.currentChord,
    globals.chordPicker.currentChordInversion,
  )
}

/** Remember the exact played notes as the toggle alternative. */
function rememberPlayedVoicing(captured) {
  const ins = inspector()
  ins.playedNotes = sortNotes([...captured.notes])
  ins.playedBass = captured.bass ? normaliseNoteName(captured.bass) : ''
  ins.playedChord = captured.chord || captured.symbols?.[0] || ''
  ins.playedSymbols = Array.isArray(captured.symbols) ? [...captured.symbols] : []
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
    // No slot means no stale draft: clear notes and the played alternative,
    // and treat anything already played as seen so a new project does not
    // inherit a previous context.
    inspector().notes = []
    inspector().voicingMode = 'auto'
    inspector().symbol = ''
    inspector().symbols = []
    inspector().capturedIgnored = Array.isArray(globals.currentChordBeingJammed.chordNotes)
      ? [...globals.currentChordBeingJammed.chordNotes]
      : []
    clearPlayedVoicing()
    clearCustomVoicing()
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
  // A hand-made voicing that happens to match the generated one note for note is
  // indistinguishable from Normalised by its notes alone, and the panel would
  // silently drop the user's choice. The stored label is what tells the two
  // kinds of row apart: an exact save is "(user jam)", a generated one "(user)".
  const isCustom = notes.length > 0
    && (!arraysAreEqual(notes, derived) || isStoredExactVoicing(config))
  const ins = inspector()
  ins.notes = notes
  ins.voicingMode = isCustom ? 'custom' : 'auto'
  ins.symbol = config.chord ?? ''
  ins.symbols = splitSymbols(config.symbols, config.chord)
  // A stored custom voicing fills the custom row; a normalised one leaves it
  // empty so the two rows start clean.
  if (isCustom) {
    ins.customNotes = [...notes]
    ins.customSymbol = config.chord ?? ''
    ins.customSymbols = splitSymbols(config.symbols, config.chord)
  }
  else {
    clearCustomVoicing()
  }
  ins.slotId = config.id ?? null
  ins.triggerNote = triggerNote ?? ''
  // A chord played before this row was selected belongs to the previous
  // context, so it never auto-applies. Only what is played from now on
  // updates the draft. Changing rows also forgets the played alternative.
  ins.capturedIgnored = Array.isArray(globals.currentChordBeingJammed.chordNotes)
    ? [...globals.currentChordBeingJammed.chordNotes]
    : []
  clearPlayedVoicing()
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
  return ok
}

/**
 * True when the draft still belongs to the current project: a draft with no
 * slot (nothing or a pending chord) is always consistent, and a slot is only
 * consistent while a row with that id exists. Used on mount to repair state
 * left over from a project that was replaced while the panel was away.
 */
export function isDraftConsistentWithProject() {
  const ins = inspector()
  if (ins.slotId == null)
    return true
  const configs = Object.values(globals.chordTriggerMap ?? {})
  return configs.some(config => config.id === ins.slotId)
}

/**
 * Forget the whole draft. Called when the project is replaced (New, project
 * switch, boot restore) so a row id and baseline from the old project can
 * never linger: a new empty project must offer only Add, never Save.
 * Anything already played is treated as seen so it cannot auto-apply here.
 */
export function resetInspector() {
  const ins = inspector()
  ins.open = false
  ins.slotId = null
  ins.triggerNote = ''
  ins.voicingMode = 'auto'
  ins.symbol = ''
  ins.symbols = []
  ins.notes = []
  ins.baseline = null
  ins.capturedIgnored = Array.isArray(globals.currentChordBeingJammed.chordNotes)
    ? [...globals.currentChordBeingJammed.chordNotes]
    : []
  resetBassToAuto()
  clearPlayedVoicing()
  clearCustomVoicing()
}

/** Load a chord symbol straight into the draft identity (Auto voicing). */
export function setFromSymbol(symbol) {
  const chordObj = Tonal.Chord.get(symbol ?? '')
  if (chordObj.empty)
    return false
  globals.chordPicker.currentRoot = normaliseNoteName(chordObj.tonic)
  globals.chordPicker.currentChord = chordObj.aliases[0] || 'M'
  globals.chordPicker.currentChordInversion = 0
  resetBassToAuto()
  clearPlayedVoicing()
  applyAuto()
  return true
}

/**
 * Change the chord identity (root and quality). This is a different chord, so
 * the voicing resets to Normalised, any lingering slash bass is cleared (the
 * bass belongs to the chord) and the custom voicing for the old chord is
 * dropped: it no longer belongs to this chord.
 */
export function setIdentity(root, quality) {
  globals.chordPicker.currentRoot = root
  globals.chordPicker.currentChord = quality
  globals.chordPicker.currentChordInversion = 0
  resetBassToAuto()
  clearPlayedVoicing()
  clearCustomVoicing()
  applyAuto()
}

/**
 * Change the bass (the picker, the custom-row field or a typed '/bass' token).
 * A value set here is the user's explicit choice.
 */
export function setBass(bass) {
  globals.chordPicker.currentBass = bass ? normaliseNoteName(bass) : ''
}

/**
 * Set the bass from the custom-row field. Returns false when the text is not
 * a note, so the field can show a hint instead of silently clearing.
 * @returns {boolean}
 */
export function applyBassEntry(text) {
  const value = String(text ?? '').trim()
  if (!value) {
    setBass('')
    return true
  }
  const parsed = Tonal.Note.get(value)
  if (parsed.empty || !parsed.pc)
    return false
  setBass(parsed.pc)
  return true
}

/** A header label with the slash bass, e.g. 'CM/G'. Omits a root bass. */
export function headerSymbol() {
  const ins = inspector()
  const root = globals.chordPicker.currentRoot
  const symbol = ins.voicingMode === 'custom' && ins.symbol
    ? ins.symbol
    : autoSymbolFor(root, globals.chordPicker.currentChord)
  const bassPc = normaliseNoteName(bassPitchClass(globals.chordPicker.currentBass))
  const rootPc = normaliseNoteName(root)
  if (bassPc && rootPc && bassPc !== rootPc)
    return `${symbol}/${bassPc}`
  return symbol
}

/**
 * Select the custom voicing row. If there is no custom voicing yet, the
 * current normalised notes become its starting point so it can be tweaked.
 * The normalised row is never touched.
 */
export function chooseCustom() {
  const ins = inspector()
  if (!Array.isArray(ins.customNotes) || ins.customNotes.length === 0) {
    ins.customNotes = [...ins.notes]
    ins.customSymbol = ins.symbol
    ins.customSymbols = [...ins.symbols]
  }
  ins.notes = [...ins.customNotes]
  ins.symbol = ins.customSymbol
  ins.symbols = [...ins.customSymbols]
  ins.voicingMode = 'custom'
  return true
}

/**
 * Select the normalised voicing row: regenerate its notes from the pickers.
 * The custom row is kept as it is, so switching back and forth never loses
 * either voicing.
 */
export function chooseNormalised() {
  applyAuto()
  return true
}

/**
 * Throw the custom voicing away and go back to the normalised row. Used when
 * the custom notes field is cleared.
 */
export function discardCustom() {
  clearCustomVoicing()
  applyAuto()
  return true
}

/**
 * Point the picker combos at a chord symbol, without touching the draft notes.
 * Used when the notes were typed or captured, so the picker always names what
 * the notes actually are.
 */
function applySymbolToIdentity(symbol) {
  if (!symbol)
    return
  const [plain] = removeBassSlash(symbol)
  const chordObj = Tonal.Chord.get(plain)
  if (chordObj.empty)
    return
  const previousRoot = globals.chordPicker.currentRoot
  const previousQuality = globals.chordPicker.currentChord
  const root = normaliseNoteName(chordObj.tonic)
  const quality = chordObj.aliases[0] || 'M'
  // A different chord clears a lingering slash bass; retyping the same chord
  // keeps it (an explicit bass should survive note edits).
  if (root !== previousRoot || quality !== previousQuality)
    resetBassToAuto()
  globals.chordPicker.currentRoot = root
  globals.chordPicker.currentChord = quality
  globals.chordPicker.currentChordInversion = 0
}

/** Store exact notes as a Custom voicing and re-name them on the picker. */
export function setNotes(notes) {
  const ins = inspector()
  ins.notes = Array.isArray(notes) ? [...notes] : []
  if (ins.notes.length === 0)
    return
  // Manual typing moves on from any played alternative, so the toggle no
  // longer offers stale notes. Switching via useCapturedNotes assigns the
  // draft directly and keeps the alternative.
  clearPlayedVoicing()
  ins.voicingMode = 'custom'
  // The typed notes are the custom row, and the active voicing is custom.
  ins.customNotes = [...ins.notes]
  const detected = Tonal.Chord.detect(ins.notes)
  if (detected.length > 0) {
    // The name is plain. A slash in the detected symbol is only Tonal's lowest
    // note, not a bass the user chose, so it never touches the Bass field:
    // leaving it blank lets the grid derive the low root from the voicing.
    const [plain] = removeBassSlash(detected[0])
    ins.symbols = detected
    ins.symbol = plain
    ins.customSymbols = [...detected]
    ins.customSymbol = plain
    // The picker follows the notes: root, quality and inversion all update so
    // the combos never disagree with what sounds.
    applySymbolToIdentity(detected[0])
  }
  else {
    ins.customSymbol = ins.symbol
    ins.customSymbols = [...ins.symbols]
  }
}

/**
 * Apply a typed notes entry, including an optional '/bass' token.
 * @returns {{ recognised: boolean, invalidBass: string }}
 */
export function applyNotesEntry(text) {
  const { notes, bass, invalidBass } = parseNotesWithBass(text)
  let recognised = false
  if (notes.length > 0) {
    // Fold theoretical spellings so typing E# G# B# stores F Ab C and names
    // the chord Fm. Normal spellings, including flats such as Eb, are left.
    setNotes(notes.map(note => Tonal.Note.simplify(note)))
    recognised = true
  }
  // An explicit '/bass' token wins over any detected slash bass.
  if (bass)
    setBass(bass)
  return { recognised, invalidBass }
}

/**
 * Apply typed notes (lenient: octaves are optional and inherited).
 * @returns {boolean} whether any notes were recognised
 */
export function setNotesFromText(text) {
  return applyNotesEntry(text).recognised
}

/** The last played chord, before it auto-applies to the draft. */
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

/** True when a played voicing is kept for toggling against Auto. */
export function hasPlayedVoicing() {
  const ins = inspector()
  return Array.isArray(ins.playedNotes) && ins.playedNotes.length > 0
}

/** The kept played voicing, or an unavailable placeholder. */
export function playedVoicingInfo() {
  const ins = inspector()
  if (!hasPlayedVoicing())
    return { available: false, chord: '', symbols: [], notes: [], bass: '' }
  return {
    available: true,
    chord: ins.playedChord || ins.playedSymbols?.[0] || '',
    symbols: Array.isArray(ins.playedSymbols) ? [...ins.playedSymbols] : [],
    notes: [...ins.playedNotes],
    bass: ins.playedBass || '',
  }
}

/** The normalised voicing for the current identity, for hover previews. */
export function previewAutoVoicing() {
  return {
    notes: autoNotesFor(
      globals.chordPicker.currentRoot,
      globals.chordPicker.currentChord,
      globals.chordPicker.currentChordInversion,
    ),
    bass: globals.chordPicker.currentBass || '',
  }
}

/**
 * True when there is a pending new chord without a slot: played notes were
 * kept or the draft holds notes while no row is selected. Used for the
 * header and for enabling Add in an empty project.
 */
export function hasPendingChord() {
  const ins = inspector()
  if (ins.slotId != null)
    return false
  if (hasPlayedVoicing())
    return true
  return Array.isArray(ins.notes) && ins.notes.length > 0
}

/**
 * What Enter should do: 'save' when a dirty row is open, 'add' when there is
 * no row but something playable is waiting, otherwise 'none' so Enter never
 * duplicates a clean row or fires with nothing to commit.
 * @returns {'save' | 'add' | 'none'}
 */
export function resolveEnterAction() {
  const ins = inspector()
  if (ins.slotId != null && isDirty())
    return 'save'
  if (ins.slotId == null && canAddRow())
    return 'add'
  return 'none'
}

/**
 * True when Add as new chord can create a row: the draft holds playable
 * notes, a played alternative is kept, or a fresh capture is waiting. Works
 * both with no slots yet and while editing a row.
 */
export function canAddRow() {
  if (!globals.project || !Array.isArray(globals.project.chords))
    return false
  const ins = inspector()
  if (Array.isArray(ins.notes) && ins.notes.length > 0)
    return true
  if (hasPlayedVoicing())
    return true
  return capturedInfo().available
}

/**
 * Apply a fresh capture immediately: the pickers follow the detected chord.
 * If the played notes are the normalised voicing for that chord, Normalised is
 * selected; otherwise the played notes become the custom voicing and Custom is
 * selected. Undetectable notes always load as Custom. Runs both while editing a
 * row and when no rows exist yet, so a new project gets a pending draft at
 * once; otherwise the capture stays available for Add row.
 */
export function autoApplyCaptured() {
  const captured = capturedInfo()
  if (!captured.available)
    return false
  const ins = inspector()
  rememberPlayedVoicing(captured)
  // A freshly played chord is a new chord, so a slash from the previous one is
  // cleared. The grid derives the low root later (played chords do not fill it).
  resetBassToAuto()

  const [plain] = removeBassSlash(captured.chord || captured.symbols?.[0] || '')
  const chordObj = plain ? Tonal.Chord.get(plain) : null
  if (captured.chord && chordObj && !chordObj.empty) {
    applySymbolToIdentity(captured.chord)
    const playedNotes = sortNotes([...captured.notes])
    const normalisedNotes = sortNotes(normalisedVoicingNotes())
    if (arraysAreEqual(playedNotes, normalisedNotes)) {
      // The played chord already is the normalised voicing: select it.
      applyAuto()
    }
    else {
      // Otherwise the played notes are the custom voicing.
      setPlayedAsCustom(captured, playedNotes)
    }
  }
  else {
    setPlayedAsCustom(captured, sortNotes([...captured.notes]))
  }

  // Consumed: the watcher sees no fresh capture, but the played notes stay
  // available for the Capture button.
  ins.capturedIgnored = [...captured.notes]
  return true
}

/** Fill the custom row from a capture and select it. */
function setPlayedAsCustom(captured, notes) {
  const ins = inspector()
  const [plain] = removeBassSlash(captured.chord || captured.symbols?.[0] || '')
  ins.customNotes = [...notes]
  ins.customSymbol = plain || ins.symbol
  ins.customSymbols = captured.symbols.length > 0 ? [...captured.symbols] : [...ins.symbols]
  ins.notes = [...notes]
  ins.symbol = ins.customSymbol
  ins.symbols = [...ins.customSymbols]
  ins.voicingMode = 'custom'
}

/**
 * Capture the played notes into the custom voicing row and select it. Works
 * for a fresh capture and for the kept played notes after auto-apply, so the
 * played voicing can be restored after editing the custom row. The Bass field
 * is the user's own and is never set here.
 */
export function useCapturedNotes() {
  const ins = inspector()
  const fresh = capturedInfo()
  let notes = []
  let chord = ''
  let symbols = []
  if (fresh.available) {
    rememberPlayedVoicing(fresh)
    notes = sortNotes([...fresh.notes])
    chord = fresh.chord || ''
    symbols = [...fresh.symbols]
    ins.capturedIgnored = [...fresh.notes]
  }
  else if (hasPlayedVoicing()) {
    const played = playedVoicingInfo()
    notes = [...played.notes]
    chord = played.chord || ''
    symbols = [...played.symbols]
  }
  else {
    return false
  }
  const [plain] = removeBassSlash(chord)
  ins.customNotes = [...notes]
  ins.customSymbol = plain || ins.symbol
  ins.customSymbols = symbols.length > 0 ? [...symbols] : [...ins.symbols]
  ins.notes = [...notes]
  ins.symbol = ins.customSymbol
  ins.symbols = [...ins.customSymbols]
  ins.voicingMode = 'custom'
  if (chord)
    applySymbolToIdentity(chord)
  return true
}

/**
 * Rebuild the normalised voicing from the current identity. The Bass field is
 * the user's own and is left alone. The custom row is not touched.
 */
export function revertToAuto() {
  applyAuto()
}

/** Save the draft into the selected slot. */
export function saveDraft() {
  const ins = inspector()
  if (!globals.isProjectLoaded || ins.slotId == null)
    return false
  // A selected but empty custom row falls back to the normalised voicing, so
  // an empty voicing can never be stored.
  if (ins.voicingMode === 'auto' || ins.notes.length === 0) {
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
 * Add a new row from the current draft choice. When a played alternative is
 * kept or the draft holds notes, the visible choice wins: Auto saves the
 * normalised chord, Played saves your exact notes. Otherwise a fresh capture
 * is saved exactly, otherwise a plain C major row is created; either way the
 * new row is selected so the inspector can edit it. Opening the new row
 * overwrites the draft by design.
 */
export function addRow() {
  if (!globals.project || !Array.isArray(globals.project.chords))
    return false
  const ins = inspector()
  const hasDraftNotes = Array.isArray(ins.notes) && ins.notes.length > 0
  if (hasPlayedVoicing() || hasDraftNotes) {
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
  const captured = capturedInfo()
  if (captured.available) {
    const symbol = captured.chord || captured.symbols[0] || 'C'
    chordAddToProjectExact(symbol, [...captured.notes], [...captured.symbols], captured.bass)
    return selectNewestSlot() ?? false
  }
  chordAddToProject('C', 'M', 0, 'C')
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
 * Delete the selected slot. The grid shrinks to match and the next row is
 * selected, or the previous row when the deleted row was the last one, so the
 * inspector always points at a real row and stays near where the user was.
 */
export function deleteDraft() {
  const ins = inspector()
  const id = ins.slotId
  if (id == null || !globals.isProjectLoaded)
    return false
  // The grid order before the delete, so the selection can move to the row that
  // slides into the deleted row's place rather than jumping to the top.
  const rowsBefore = Object.keys(globals.chordTriggerMap ?? {})
  const position = rowsBefore.indexOf(ins.triggerNote)
  globals.idsToDelete = [id]
  deleteGridChords()
  globals.projectKey = resolveProjectKey(globals.project) ?? globals.projectKey ?? null
  detectKeysAfterEdit()
  const rowsAfter = Object.keys(globals.chordTriggerMap ?? {})
  if (rowsAfter.length === 0) {
    ins.open = false
    ins.slotId = null
    ins.triggerNote = ''
    ins.notes = []
    ins.voicingMode = 'auto'
    ins.symbol = ''
    ins.symbols = []
    clearPlayedVoicing()
    return true
  }
  // The row that followed the deleted one now holds its index, so keep that
  // index. Deleting the last row clamps to the row before it.
  const nextIndex = position < 0 ? 0 : Math.min(position, rowsAfter.length - 1)
  openForSlot(rowsAfter[nextIndex])
  return true
}

/** The active custom voicing: the custom row, or the draft notes if it is empty. */
function activeCustomNotes() {
  const ins = inspector()
  if (Array.isArray(ins.customNotes) && ins.customNotes.length > 0)
    return [...ins.customNotes]
  return Array.isArray(ins.notes) ? [...ins.notes] : []
}

/**
 * Replace the custom voicing with transformed notes and re-detect its name.
 * `mapBass` transforms the user's explicit slash bass, if they set one; a blank
 * bass is left to be derived on save.
 */
function applyCustomTransform(notes, mapBass) {
  const bassBefore = globals.chordPicker.currentBass
  setNotes(notes)
  if (bassBefore)
    setBass(mapBass ? mapBass(bassBefore) : bassBefore)
}

/** Transpose a list of custom notes by semitones, keeping the app's note style. */
function transposeCustomNotes(notes, semitones) {
  const interval = Tonal.Interval.fromSemitones(semitones)
  return notes.map(note => normaliseNoteName(Tonal.Note.transpose(note, interval)))
}

/** Transpose a list of custom notes by fifths in the given direction. */
function fifthCustomNotes(notes, direction) {
  return notes.map(note => normaliseNoteName(Tonal.Note.transposeFifths(note, direction)))
}

/**
 * Invert a list of custom notes: up lifts the lowest note an octave, down drops
 * the highest an octave. Returns null when there is nothing to invert.
 */
function invertCustomNotes(notes, direction) {
  if (direction === 0)
    return null
  const withMidi = notes
    .map((note, index) => ({ note, index, midi: Tonal.Note.midi(note) }))
    .filter(entry => Number.isFinite(entry.midi))
  if (withMidi.length < 2)
    return null
  const target = withMidi.reduce((best, entry) =>
    direction > 0
      ? (entry.midi < best.midi ? entry : best)
      : (entry.midi > best.midi ? entry : best))
  const octave = Tonal.Interval.fromSemitones(direction > 0 ? 12 : -12)
  const moved = normaliseNoteName(Tonal.Note.transpose(target.note, octave))
  const result = notes.filter((_, index) => index !== target.index).concat(moved)
  return sortNotes(result)
}

/**
 * Move the draft root by semitones. Normalised: a new root is a new chord.
 * Custom: transpose the custom voicing (and the explicit slash bass) so it is
 * shaped rather than destroyed.
 */
export function transposeDraft(semitones) {
  if (inspector().voicingMode === 'custom') {
    const interval = Tonal.Interval.fromSemitones(semitones)
    applyCustomTransform(
      transposeCustomNotes(activeCustomNotes(), semitones),
      bass => normaliseNoteName(Tonal.Note.transpose(bass, interval)),
    )
    return
  }
  const newRoot = normaliseNoteName(
    Tonal.Note.transpose(globals.chordPicker.currentRoot, Tonal.Interval.fromSemitones(semitones)))
  setIdentity(newRoot, globals.chordPicker.currentChord)
}

/**
 * Move the draft root by fifths. Normalised: a new root is a new chord.
 * Custom: transpose the custom voicing (and the explicit slash bass) by a fifth.
 */
export function fifthDraft(direction) {
  if (inspector().voicingMode === 'custom') {
    applyCustomTransform(
      fifthCustomNotes(activeCustomNotes(), direction),
      bass => normaliseNoteName(Tonal.Note.transposeFifths(bass, direction)),
    )
    return
  }
  const newRoot = normaliseNoteName(
    Tonal.Note.transposeFifths(globals.chordPicker.currentRoot, direction))
  setIdentity(newRoot, globals.chordPicker.currentChord)
}

/**
 * Invert the draft up or down. Normalised: move the inversion counter, keeping
 * the Bass field the user's own (on save the derived bass is the lowest note).
 * Custom: invert the custom notes themselves, keeping the explicit bass.
 * Reset (direction 0) is only meaningful for the normalised counter.
 */
export function invertDraft(direction) {
  if (inspector().voicingMode === 'custom') {
    const notes = invertCustomNotes(activeCustomNotes(), direction)
    if (!notes)
      return
    applyCustomTransform(notes)
    return
  }
  const { inversion } = calcChordInversionNumberAndNewBass(
    globals.chordPicker.currentRoot,
    globals.chordPicker.currentChord,
    globals.chordPicker.currentChordInversion,
    globals.chordPicker.inversionChangesBass,
    direction,
  )
  globals.chordPicker.currentChordInversion = inversion
  clearPlayedVoicing()
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
  setIdentity(globals.chordPicker.currentRoot, options[index].value)
}

/**
 * Preview what a Transpose & invert button would sound like, without touching
 * the draft. Returns the resulting voicing and bass, so hovering can audition
 * it. In Custom mode it previews the transformed custom notes; otherwise the
 * prospective normalised chord. The draft stays clean until click.
 * @returns {{ notes: string[], bass: string } | null}
 */
export function previewTranspose(semitones) {
  if (inspector().voicingMode === 'custom') {
    const interval = Tonal.Interval.fromSemitones(semitones)
    return {
      notes: transposeCustomNotes(activeCustomNotes(), semitones),
      bass: customPreviewBass(bass => normaliseNoteName(Tonal.Note.transpose(bass, interval))),
    }
  }
  const root = globals.chordPicker.currentRoot
  const quality = globals.chordPicker.currentChord
  const newRoot = normaliseNoteName(
    Tonal.Note.transpose(root, Tonal.Interval.fromSemitones(semitones)))
  return { notes: autoNotesFor(newRoot, quality, 0), bass: newRoot }
}

/** Preview a fifth move without touching the draft. */
export function previewFifth(direction) {
  if (inspector().voicingMode === 'custom') {
    return {
      notes: fifthCustomNotes(activeCustomNotes(), direction),
      bass: customPreviewBass(bass => normaliseNoteName(Tonal.Note.transposeFifths(bass, direction))),
    }
  }
  const root = globals.chordPicker.currentRoot
  const quality = globals.chordPicker.currentChord
  const newRoot = normaliseNoteName(
    Tonal.Note.transposeFifths(root, direction))
  return { notes: autoNotesFor(newRoot, quality, 0), bass: newRoot }
}

/** Preview an inversion without touching the draft. */
export function previewInvert(direction) {
  if (inspector().voicingMode === 'custom') {
    const notes = invertCustomNotes(activeCustomNotes(), direction)
    if (!notes)
      return null
    return { notes, bass: globals.chordPicker.currentBass || '' }
  }
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

/** The explicit slash bass transformed for a preview, or '' when there is none. */
function customPreviewBass(mapBass) {
  const bass = globals.chordPicker.currentBass
  return bass ? mapBass(bass) : ''
}

/**
 * Preview stepping the chord quality without touching the draft.
 * Returns null for 'random' (no stable preview) or an empty catalogue.
 * @returns {{ notes: string[], bass: string, quality: string } | null}
 */
export function previewStep(direction) {
  // A quality change would replace a custom voicing, so the step buttons are
  // disabled in Custom mode and have no preview.
  if (direction === 'random' || inspector().voicingMode === 'custom')
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
