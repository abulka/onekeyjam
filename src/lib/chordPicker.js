import { computed } from 'vue'
import * as Tonal from "@tonaljs/tonal";
import { globals } from "./globals.js"
import { calcAllChordSymbols } from "./calcAllChordSymbols";
import { normaliseNoteName } from "./note-tools.js"
import { setFromSymbol, revertToAuto, setNotes, setBass, loadDraftFromSlot } from "./chordInspector.js"

// The Chord Picker combos list every chord type Tonal knows, filtered and
// named for the UI.
// @ts-ignore: some complaint about computed
export const chordOptions = computed({
    get: () => calcAllChordSymbols(globals.chordPicker.showAllChords, globals.chordPicker.shortChordNames),
})

/**
 * A combo option list with the current value always present. Some lists are
 * filtered (chord types) or fixed to twelve spellings (notes), but a stored
 * chord may use something outside them, so add it rather than showing a blank
 * combo.
 * @param {Array<{text: string, value: string}>} options
 * @param {string} current the current combo value
 * @returns {Array<{text: string, value: string}>}
 */
export function optionsWithCurrent(options, current) {
    const list = Array.isArray(options) ? options : []
    if (current && !list.some(option => option.value === current))
        return [{ text: current, value: current }, ...list]
    return list
}

function findChordInCombo(chordSymbolSansRoot) {
    // find index of current chord in combo
    let currentComboIndex = -1
    for (let i = 0; i < chordOptions.value.length; i++) {
        if (chordOptions.value[i].value == chordSymbolSansRoot) {
            currentComboIndex = i
            break
        }
    }
    if (currentComboIndex == -1)
        throw (`Cannot find '${chordSymbolSansRoot}' chord TYPE combo options`)
    return currentComboIndex
}

function smartFindChordTypeInCombo(chordSymbolNoRoot) {
    // returns the index of the chord in the combo, -1 if not found
    let currentComboIndex = -1
    try {
        currentComboIndex = findChordInCombo(chordSymbolNoRoot)
    } catch (error) {
        if (!globals.chordPicker.showAllChords) {
            globals.chordPicker.showAllChords = true
            // combo may need to show all chords for this to work, so retry
            // with showAllChords = true, this time let exception happen cos it should always be found
            currentComboIndex = findChordInCombo(chordSymbolNoRoot)
        }
        else  // short chords list wasn't the problem, so throw the error
            throw (error)
    }
    return currentComboIndex
}

export function setChordPicker(chordSymbolNoRoot, bassNote, rootNote) {
    // sync the picker combos to a known chord, without touching the voicing.
    // returns true if the chord was found in the combo, false if not
    const currentComboIndex = smartFindChordTypeInCombo(chordSymbolNoRoot)
    if (currentComboIndex != -1) {
        globals.chordPicker.currentChord = chordSymbolNoRoot
        if (bassNote != undefined)
            globals.chordPicker.currentBass = normaliseNoteName(bassNote)
        if (rootNote != undefined)
            globals.chordPicker.currentRoot = normaliseNoteName(rootNote)
    }
    globals.chordPicker.currentChordInversion = 0
    return currentComboIndex != -1
}

/**
 * Load a full chord symbol into the draft identity. Used by the "chords that
 * fit" links and the key detection panel, so they edit what the grid shows.
 * @param {string} chordSymbol e.g. 'Cmaj7'
 * @returns {boolean}
 */
export function setChordSmart(chordSymbol) {
    return setFromSymbol(chordSymbol)
}

/** Alias kept for the key detection panel. */
export function setChordFromSymbol(chordSymbol) {
    return setFromSymbol(chordSymbol)
}

/**
 * Rebuild the draft voicing from the picker combos (Auto), unless a Custom
 * voicing is loaded and `force` is not set.
 * @param {boolean} [force]
 */
export function chordPickerToJammed(force = false) {
    if (!force && globals.chordInspector.voicingMode === 'custom' && globals.chordInspector.notes.length > 0)
        return
    revertToAuto()
}

/**
 * Replace the draft voicing with the exact notes of a loaded grid chord.
 * @param {Array<string>} chordNotes
 * @param {string} bass
 * @param {string} [source] retained for callers that describe the origin
 */
export function chordPickerToJammedExtraPrecision(chordNotes, bass, source = 'grid') {
    void source
    if (bass != undefined)
        setBass(bass)
    if (Array.isArray(chordNotes) && chordNotes.length > 0)
        setNotes(chordNotes)
}

/**
 * Reload the draft from the currently selected grid slot. Kept for the old
 * callers; the inspector itself reloads through loadDraftFromSlot.
 */
export function syncCustomVoicingToCurrentChord() {
    const config = globals.currentConfigEmpty() ? null : globals.currentChordConfig()
    if (!config || !config.chord) {
        globals.chordInspector.notes = []
        globals.chordInspector.voicingMode = 'auto'
        return
    }
    loadDraftFromSlot(globals.currentChordTriggerNote)
}

/** Kept for compatibility with callers that checked the old custom state. */
export function hasRealCustomVoicing() {
    return globals.chordInspector.voicingMode === 'custom'
        && Array.isArray(globals.chordInspector.notes)
        && globals.chordInspector.notes.length > 0
}

/** Kept for older callers; Tonal chord lookup only. */
export function chordSymbolNoRootFor(chordSymbol) {
    const chordObj = Tonal.Chord.get(chordSymbol)
    return chordObj.empty ? '' : chordObj.aliases[0]
}
