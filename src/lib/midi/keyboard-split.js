// @ts-check
import { indexToNote } from '../note-tools.js'
import { labelForOffset } from './piano-key-map.js'

/**
 * @module lib/midi/keyboard-split
 * @desc Works out where the chord triggers end and the solo notes begin for the
 * current project, so the help text can describe the live split instead of
 * hardcoding "chords are Z X C V B N M" and "solo is Q W E R T Y U".
 *
 * Chords are the first `chordCount` white notes from the trigger octave. The
 * first solo key sits on the next white note after them, so the split is a
 * single position that floats as the number of chords changes. The run of
 * mapped keys is always the same (Z X C V B N M, then Q W E R T Y U ...), so the
 * previews below show the first few keys followed by an ellipsis rather than
 * listing the whole run.
 */

// Semitone offset of each white note within an octave.
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11]

// How many keys a preview lists before adding an ellipsis.
const PREVIEW_KEY_COUNT = 4

/**
 * Semitone offset (from C of the trigger octave) of the i-th white key.
 * @param {number} index zero-based white key position
 * @returns {number}
 */
export function whiteKeyOffset(index) {
    return WHITE_OFFSETS[index % 7] + 12 * Math.floor(index / 7)
}

/**
 * The computer key label that sits on the i-th white key, or '' past the end of
 * the mapped keyboard.
 * @param {number} index
 * @returns {string}
 */
export function whiteKeyLabel(index) {
    return labelForOffset(whiteKeyOffset(index))
}

/**
 * The first few labels, followed by an ellipsis when the list is longer. Keeps
 * the help short: "Z X C V ..." rather than every key.
 * @param {string[]} keys
 * @param {number} [max=PREVIEW_KEY_COUNT]
 * @returns {string}
 */
export function previewKeys(keys, max = PREVIEW_KEY_COUNT) {
    const shown = keys.slice(0, max).join(' ')
    return keys.length > max ? `${shown} ...` : shown
}

/**
 * Describe the current chord/solo split.
 * @param {number} chordCount number of chord triggers on the grid
 * @param {number} [lhTriggerOctave=3]
 * @returns {{ chordNotes: string[], chordKeys: string[], chordKeysPreview: string, firstSoloNote: string, firstSoloKey: string, soloKeys: string[], soloKeysPreview: string }}
 */
export function describeChordSoloSplit(chordCount, lhTriggerOctave = 3) {
    const count = Math.max(0, Math.floor(Number(chordCount) || 0))

    const chordNotes = []
    const chordKeys = []
    for (let i = 0; i < count; i++) {
        chordNotes.push(indexToNote(whiteKeyOffset(i), lhTriggerOctave))
        chordKeys.push(whiteKeyLabel(i))
    }

    const firstSoloNote = indexToNote(whiteKeyOffset(count), lhTriggerOctave)
    const firstSoloKey = whiteKeyLabel(count)

    const soloKeys = []
    for (let i = count; ; i++) {
        const label = whiteKeyLabel(i)
        if (!label)
            break
        soloKeys.push(label)
    }

    return {
        chordNotes,
        chordKeys,
        chordKeysPreview: previewKeys(chordKeys.filter(Boolean)),
        firstSoloNote,
        firstSoloKey,
        soloKeys,
        soloKeysPreview: previewKeys(soloKeys.filter(Boolean)),
    }
}
