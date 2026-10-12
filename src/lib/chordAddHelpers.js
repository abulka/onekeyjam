// @ts-check
import { arraysAreEqual } from './array-tools.js'

/**
 * @module lib/chordAddHelpers
 * @desc The two voicings the Edit Chords panel offers to Add or Replace:
 *
 * - `picker`: the canonical voicing built from the Chord Picker combos
 *   (root + quality + inversion). Its audition always plays that voicing.
 * - `custom`: the exact notes loaded from a grid chord, played on the MIDI
 *   keyboard, or typed by the user. Its audition plays exactly those notes.
 *
 * Keeping these as two named choices stops a detected chord symbol (a name)
 * from being confused with a voicing (a set of notes).
 */

export const PICKER_VOICING = 'picker'
export const CUSTOM_VOICING = 'custom'

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
 * @typedef {object} VoicingChoice
 * @property {'picker'|'custom'} id
 * @property {string} label heading for the row
 * @property {string} symbol chord name to store
 * @property {Array<string>} notes notes with octaves, to show and audition
 * @property {string} bass bass with octave, to audition
 */

/**
 * Build the list of voicing choices to show. The picker choice is always
 * present when a symbol is known. The custom choice appears when it holds
 * notes and those notes differ from the picker voicing, so the rows never
 * read as identical duplicates.
 * @param {object} input
 * @param {string} input.pickerSymbol
 * @param {Array<string>} input.pickerNotes
 * @param {*} input.pickerBass
 * @param {string} input.customSymbol
 * @param {Array<string>} input.customNotes
 * @param {*} input.customBass
 * @returns {Array<VoicingChoice>}
 */
export function buildVoicingChoices({ pickerSymbol, pickerNotes, pickerBass, customSymbol, customNotes, customBass }) {
    /** @type {Array<VoicingChoice>} */
    const choices = []
    if (pickerSymbol)
        choices.push({
            id: PICKER_VOICING,
            label: 'Chord Picker voicing',
            symbol: pickerSymbol,
            notes: pickerNotes ?? [],
            bass: pickerBass ?? '',
        })

    const hasCustom = Array.isArray(customNotes) && customNotes.length > 0
    if (hasCustom && customSymbol && !areVoicingsTheSame(pickerNotes, customNotes, pickerBass, customBass))
        choices.push({
            id: CUSTOM_VOICING,
            label: 'Custom voicing',
            symbol: customSymbol,
            notes: customNotes,
            bass: customBass ?? '',
        })

    return choices
}

/**
 * Keep the user's voicing choice across rebuilds when it is still valid.
 * Prefers the custom voicing when it exists, matching the old default of
 * selecting the jammed notes first.
 * @param {Array<VoicingChoice>} choices
 * @param {string} currentPicked
 * @returns {string}
 */
export function pickVoicingToKeep(choices, currentPicked) {
    if (!Array.isArray(choices) || choices.length === 0)
        return ''
    if (currentPicked && choices.some(choice => choice.id === currentPicked))
        return currentPicked
    const custom = choices.find(choice => choice.id === CUSTOM_VOICING)
    return (custom ?? choices[0]).id
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
 * Human readable label for where the custom voicing came from.
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

/**
 * Should the Replace button be disabled? It is disabled when no voicing is
 * picked, or when the picked voicing already matches what is stored.
 * @param {object} input
 * @param {VoicingChoice|null} input.choice
 * @param {Array<string>} input.storedNotes
 * @param {string} input.storedBass
 * @returns {boolean}
 */
export function isReplaceDisabled({ choice, storedNotes, storedBass }) {
    if (!choice)
        return true
    const notesSame = arraysAreEqual(choice.notes ?? [], storedNotes ?? [])
    const bassSame = bassPitchClass(choice.bass) === bassPitchClass(storedBass)
    return notesSame && bassSame
}
