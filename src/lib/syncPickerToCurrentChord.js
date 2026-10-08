// @ts-check
import { globals } from "./globals.js";
import { currentChordInfo } from "./currentChordInfo.js";
import { setChordPicker } from "./chordPicker.js";
import { chordPickerToJammed, chordPickerToJammedExtraPrecision } from "./chordPicker.js";
import { chordPlay } from "./auditionNotes.js";

/**
 * @module lib/syncPickerToCurrentChord
 * @desc Copy the currently triggered project chord into the Chord Picker,
 * preserving the stored voicing so the voicing list and Edit Notes update.
 */

/**
 * Sync the Chord Picker combos to the current triggered chord.
 * Uses the exact stored chord notes when available, so custom voicings survive.
 * @returns {boolean} true when the picker type was recognised
 */
export function syncPickerToCurrentChord() {
    if (globals.currentConfigEmpty())
        return false
    const { chordSymbolNoRoot, bass, rootNote, chordNotes } = currentChordInfo()
    // Custom or unparseable chord names have no combo entry. Still load the
    // exact notes so the voicing and Edit Notes areas follow the grid.
    if (!chordSymbolNoRoot || !rootNote) {
        chordPickerToJammed()
        if (Array.isArray(chordNotes) && chordNotes.length > 0)
            chordPickerToJammedExtraPrecision(chordNotes, bass)
        return false
    }
    let success = false
    try {
        success = setChordPicker(chordSymbolNoRoot, bass, rootNote)
    } catch (error) {
        console.warn("Could not match grid chord in Chord Picker", error)
        success = false
    }

    chordPickerToJammed()
    if (Array.isArray(chordNotes) && chordNotes.length > 0)
        chordPickerToJammedExtraPrecision(chordNotes, bass)

    if (success)
        chordPlay()
    return success
}
