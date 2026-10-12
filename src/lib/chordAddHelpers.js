// @ts-check
import { arraysAreEqual } from './array-tools.js'

/**
 * @module lib/chordAddHelpers
 * @desc Small pure helpers shared by the Chord Inspector. A chord has a label
 * (`chord`) and a voicing (`chordNotes`) that may disagree by design; these
 * helpers compare them and name them.
 */

/**
 * Normalise a bass value for comparison. Values may be missing, a pitch class
 * such as 'C', or a pitched note such as 'C2'.
 * @param {*} bass
 * @returns {string}
 */
export function normaliseBassForCompare(bass) {
    if (bass === undefined || bass === null)
        return ''
    return String(bass)
}

/**
 * Reduce a bass value to a pitch class so an octave difference does not read
 * as a different chord.
 * @param {*} bass
 * @returns {string}
 */
export function bassPitchClass(bass) {
    return normaliseBassForCompare(bass).replace(/-?\d+$/, '')
}

/**
 * Are two voicings the same? Compares notes (with octaves) and bass pitch
 * classes, so a bass-only change still counts as a different voicing.
 * @param {Array<string>} aNotes
 * @param {Array<string>} bNotes
 * @param {*} aBass
 * @param {*} bBass
 * @returns {boolean}
 */
export function areVoicingsTheSame(aNotes, bNotes, aBass, bBass) {
    const notesSame = arraysAreEqual(aNotes ?? [], bNotes ?? [])
    const bassSame = bassPitchClass(aBass) === bassPitchClass(bBass)
    return notesSame && bassSame
}

/**
 * The names the custom notes could be stored under. `symbols` are the aliases
 * Tonal detected; the fallback is the current name so it is always selectable.
 * @param {object} input
 * @param {Array<string>} input.symbols
 * @param {string} input.fallbackSymbol
 * @returns {Array<string>}
 */
export function nameOptionsFor({ symbols, fallbackSymbol }) {
    const options = Array.isArray(symbols) ? symbols.filter(Boolean) : []
    if (fallbackSymbol && !options.includes(fallbackSymbol))
        options.unshift(fallbackSymbol)
    return [...new Set(options)]
}

/**
 * Human readable label for where a voicing came from.
 * @param {string} source 'grid' | 'midi' | 'typed' | 'picker' | ''
 * @returns {string}
 */
export function voicingSourceLabel(source) {
    switch (source) {
        case 'grid': return 'from grid chord'
        case 'midi': return 'from MIDI'
        case 'typed': return 'typed'
        case 'picker': return 'from Chord Picker'
        default: return ''
    }
}
