import { globals } from "./globals.js";
import { loadDraftFromSlot } from "./chordInspector.js";

/**
 * @module lib/syncPickerToCurrentChord
 * @desc Copy the currently triggered grid slot into the Chord Inspector draft:
 * the picker combos follow the slot's identity and the exact stored voicing is
 * loaded as-is (Auto or Custom as appropriate).
 */

/**
 * Sync the inspector to the current triggered chord.
 * @returns {boolean} true when a slot was loaded
 */
export function syncPickerToCurrentChord() {
    if (globals.currentConfigEmpty())
        return false
    return loadDraftFromSlot(globals.currentChordTriggerNote)
}
