// @ts-check
import { indexToNote } from './note-tools.js'

/**
 * @module lib/keyboard-help
 * @desc Label text and layout decisions for the on-screen keyboard overlays.
 *
 * The black key meanings used to live inside PianoKeyboard.vue's getHelp().
 * They are kept here so the research keyboard and the main-app overlay share a
 * single source of truth. The left-hand octave is a parameter rather than a
 * hardcoded 3, so it works with any keyboard or project config.
 */

const LEFT_HAND_HELP = {
    'C#': 'SHIFT',
    'D#': 'Scale filter OFF',
    'F#': 'Scale filter ON',
    'G#': 'Trans-pose chords DOWN',
    'A#': 'Trans-pose chords UP',
}

const LEFT_HAND_SHIFT_HELP = {
    'C#': '',
    'D#': 'All notes off',
    'F#': 'Add chord',
    'G#': 'Reset transp.',
    'A#': 'Reset transp.',
}

const RIGHT_HAND_HELP = {
    'C#': 'Use Scale 1',
    'D#': 'Use Scale 2',
    'F#': 'Use Scale 3',
    'G#': 'Use Scale 4 (notes of chord)',
    'A#': 'Lock current scale',
}

/**
 * Returns the help text shown on a black key.
 * @param {string} note pitch class, e.g. 'C#' (no octave)
 * @param {number|string} octave the key's octave
 * @param {{ shift?: boolean, lhTriggerOctave?: number }} [options]
 * @returns {string}
 */
export function getBlackKeyHelp(note, octave, options = {}) {
    const { shift = false, lhTriggerOctave = 3 } = options
    const isLeftHand = Number(octave) === Number(lhTriggerOctave)
    if (isLeftHand)
        return shift ? (LEFT_HAND_SHIFT_HELP[note] || '') : (LEFT_HAND_HELP[note] || '')
    return shift ? '' : (RIGHT_HAND_HELP[note] || '')
}

/**
 * Builds the white key label map: left-hand chord triggers show the chord that
 * will play, right-hand keys show the scale note they map to.
 * @param {Record<string, {chord?: string}>} [chordTriggerMap]
 * @param {Record<string, string>} [scaleTriggerMap]
 * @returns {Record<string, string>}
 */
export function buildWhiteNoteMappings(chordTriggerMap = {}, scaleTriggerMap = {}) {
    /** @type {Record<string, string>} */
    const mappings = {}
    for (const [note, data] of Object.entries(chordTriggerMap))
        mappings[note] = data && data.chord ? data.chord : ''

    for (const [note, data] of Object.entries(scaleTriggerMap)) {
        if (!mappings[note])
            mappings[note] = data
    }
    return mappings
}

/**
 * Builds one label descriptor per visible key, without pixel positions. The
 * overlay component turns these into absolutely positioned labels.
 * @param {object} [options]
 * @param {number} [options.min] widget's lowest note number
 * @param {number} [options.max] widget's highest note number
 * @param {number[]} [options.kf] key flags, 1 for black keys, indexed by semitone
 * @param {number} [options.lhTriggerOctave]
 * @param {Record<string, string>} [options.whiteNoteMappings]
 * @param {string} [options.keyboardHelpMode] 'off' | 'black' | 'white' | 'all'
 * @returns {Array<object>}
 */
export function buildKeyLabels(options = {}) {
    const {
        min = 0,
        max = 0,
        kf = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0],
        lhTriggerOctave = 3,
        whiteNoteMappings = {},
        keyboardHelpMode = 'all',
    } = options

    const showBlack = keyboardHelpMode === 'black' || keyboardHelpMode === 'all'
    const showWhite = keyboardHelpMode === 'white' || keyboardHelpMode === 'all'

    const labels = []
    let whiteIndex = 0

    for (let i = min; i <= max; i++) {
        const isBlack = kf[((i % 12) + 12) % 12] === 1
        const note = indexToNote(i - min, lhTriggerOctave)

        if (isBlack) {
            if (showBlack) {
                const pitchClass = note.replace(/-?\d+$/, '')
                const octave = Number((note.match(/-?\d+$/) || ['0'])[0])
                labels.push({
                    note,
                    isBlack: true,
                    semitoneIndex: i,
                    whiteIndex: -1,
                    help: getBlackKeyHelp(pitchClass, octave, { shift: false, lhTriggerOctave }),
                    shiftHelp: getBlackKeyHelp(pitchClass, octave, { shift: true, lhTriggerOctave }),
                    mapping: '',
                })
            }
        }
        else {
            if (showWhite) {
                labels.push({
                    note,
                    isBlack: false,
                    semitoneIndex: i,
                    whiteIndex,
                    help: '',
                    shiftHelp: '',
                    mapping: whiteNoteMappings[note] || '',
                })
            }
            whiteIndex++
        }
    }
    return labels
}

/**
 * Chooses the text shown on a black key. While the left-hand SHIFT (C#) key is
 * pressed or pending, keys that have a SHIFT meaning show only that meaning, so
 * the label fits in both modes. Keys without a SHIFT meaning keep their regular
 * text.
 * @param {string} help regular black key meaning
 * @param {string} shiftHelp meaning while SHIFT is held
 * @param {boolean} shiftActive whether SHIFT is currently pressed or pending
 * @returns {{ help: string, shiftHelp: string }}
 */
export function getBlackKeyDisplay(help, shiftHelp, shiftActive) {
    if (shiftActive && shiftHelp)
        return { help: '', shiftHelp }
    return { help: help || '', shiftHelp: '' }
}

let measureCanvas

function measureTextWidth(text, font) {
    if (typeof document === 'undefined')
        return String(text).length * 6

    try {
        if (!measureCanvas)
            measureCanvas = document.createElement('canvas')
        const ctx = measureCanvas.getContext && measureCanvas.getContext('2d')
        if (!ctx)
            return String(text).length * 6
        ctx.font = font
        return ctx.measureText(String(text)).width
    }
    catch (error) {
        // jsdom without canvas support falls back to a rough estimate
        return String(text).length * 6
    }
}

/**
 * Decides whether a label should be rendered horizontally (allowed to wrap) or
 * vertically (rotated writing mode) so that it fits inside its key.
 * @param {string} text
 * @param {number} keyWidth available width in pixels
 * @param {string} [font] CSS font used for measuring
 * @param {number} [padding] horizontal padding kept clear inside the key
 * @returns {'horizontal'|'vertical'}
 */
export function chooseTextOrientation(text, keyWidth, font = '10px sans-serif', padding = 4) {
    if (!text)
        return 'horizontal'

    const available = keyWidth - padding
    if (available <= 0)
        return 'vertical'

    const words = String(text).split(/\s+/).filter(Boolean)
    const widestWord = words.reduce((widest, word) => Math.max(widest, measureTextWidth(word, font)), 0)
    return widestWord > available ? 'vertical' : 'horizontal'
}
