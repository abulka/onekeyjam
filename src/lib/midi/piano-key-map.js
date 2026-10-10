// @ts-check

/**
 * @module lib/midi/piano-key-map
 * @desc The computer-keyboard mapping for the on-screen piano keyboard.
 *
 * The g200kg `webaudio-keyboard` widget has a hard-wired key map and no way to
 * configure shortcuts. OneKeyJam therefore clears the widget's own key codes
 * (see LivePianoKeyboard.vue) and handles keyboard input itself using this
 * table, so the shortcuts are ours to change and app shortcuts such as
 * Alt+digit do not also sound a note.
 */

/**
 * @typedef {Object} NoteKey
 * @property {string} code KeyboardEvent.code of the physical key
 * @property {number} offset Semitone offset from the first key of the on-screen keyboard
 * @property {boolean} primary Whether this is the key shown in the legend for its offset
 */

/**
 * The standard Ableton Live / Logic Pro computer-keyboard layout used in
 * Normal piano mode: A S D F G H J K L ; are the white keys and
 * W E T Y U O P are the black keys, with Z / X shifting octave.
 * @type {NoteKey[]}
 */
export const PIANO_NOTE_KEYS = [
    { code: 'KeyA', offset: 0, primary: true },
    { code: 'KeyW', offset: 1, primary: true },
    { code: 'KeyS', offset: 2, primary: true },
    { code: 'KeyE', offset: 3, primary: true },
    { code: 'KeyD', offset: 4, primary: true },
    { code: 'KeyF', offset: 5, primary: true },
    { code: 'KeyT', offset: 6, primary: true },
    { code: 'KeyG', offset: 7, primary: true },
    { code: 'KeyY', offset: 8, primary: true },
    { code: 'KeyH', offset: 9, primary: true },
    { code: 'KeyU', offset: 10, primary: true },
    { code: 'KeyJ', offset: 11, primary: true },
    { code: 'KeyK', offset: 12, primary: true },
    { code: 'KeyO', offset: 13, primary: true },
    { code: 'KeyL', offset: 14, primary: true },
    { code: 'KeyP', offset: 15, primary: true },
    { code: 'Semicolon', offset: 16, primary: true },
]

/** @type {NoteKey[]} */
export const NOTE_KEYS = [
    // Lower / home rows: the left-hand octave, plus lower-row aliases for the next octave
    { code: 'KeyZ', offset: 0, primary: true },
    { code: 'KeyS', offset: 1, primary: true },
    { code: 'KeyX', offset: 2, primary: true },
    { code: 'KeyD', offset: 3, primary: true },
    { code: 'KeyC', offset: 4, primary: true },
    { code: 'KeyV', offset: 5, primary: true },
    { code: 'KeyG', offset: 6, primary: true },
    { code: 'KeyB', offset: 7, primary: true },
    { code: 'KeyH', offset: 8, primary: true },
    { code: 'KeyN', offset: 9, primary: true },
    { code: 'KeyJ', offset: 10, primary: true },
    { code: 'KeyM', offset: 11, primary: true },

    // Upper row: right-hand white keys on letters and right-hand black keys on
    // the number row. While scale filtering is on the number row becomes the
    // 1-5 scale shortcuts; while it is off these keys play as black notes.
    { code: 'KeyQ', offset: 12, primary: true },
    { code: 'Digit2', offset: 13, primary: true },
    { code: 'KeyW', offset: 14, primary: true },
    { code: 'Digit3', offset: 15, primary: true },
    { code: 'KeyE', offset: 16, primary: true },
    { code: 'KeyR', offset: 17, primary: true },
    { code: 'Digit5', offset: 18, primary: true },
    { code: 'KeyT', offset: 19, primary: true },
    { code: 'Digit6', offset: 20, primary: true },
    { code: 'KeyY', offset: 21, primary: true },
    { code: 'Digit7', offset: 22, primary: true },
    { code: 'KeyU', offset: 23, primary: true },

    // `,` `L` `.` `/` used to be lower-row aliases for the right-hand octave.
    // They are intentionally unbound as notes now (one physical key per pitch).
    // Instead `,` and `.` switch mode and `/` adds the jammed chord; see
    // scaleFilterShortcuts.js.

    // The octave above the right hand, on the physical keys right of P
    { code: 'KeyI', offset: 24, primary: true },
    { code: 'Digit9', offset: 25, primary: true },
    { code: 'KeyO', offset: 26, primary: true },
    { code: 'Digit0', offset: 27, primary: true },
    { code: 'KeyP', offset: 28, primary: true },
    { code: 'BracketLeft', offset: 29, primary: true },
    { code: 'Minus', offset: 30, primary: true },
    { code: 'BracketRight', offset: 31, primary: true },
    { code: 'Equal', offset: 32, primary: true },
    { code: 'Backslash', offset: 33, primary: true },
]

/** @type {Record<string, string>} */
const SPECIAL_LABELS = {
    Comma: ',',
    Period: '.',
    Equal: '=',
    Slash: '/',
    Backslash: '\\',
    Backquote: '`',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Minus: '-',
}

/**
 * Human-readable label for a KeyboardEvent.code.
 * @param {string} code
 * @returns {string}
 */
export function codeToLabel(code) {
    if (SPECIAL_LABELS[code])
        return SPECIAL_LABELS[code]
    if (code.startsWith('Key'))
        return code.slice(3)
    if (code.startsWith('Digit'))
        return code.slice(5)
    return code
}

/** @type {Map<string, NoteKey>} */
const KEY_BY_CODE = new Map(NOTE_KEYS.map(key => [key.code, key]))
/** @type {Map<string, NoteKey>} */
const PIANO_KEY_BY_CODE = new Map(PIANO_NOTE_KEYS.map(key => [key.code, key]))
/** @type {Map<number, string>} */
const PIANO_LABEL_BY_OFFSET = new Map(PIANO_NOTE_KEYS.map(key => [key.offset, codeToLabel(key.code)]))

/**
 * Looks up the note key for a KeyboardEvent.code, if any.
 * @param {string} code
 * @param {'magic'|'piano'} [mode='magic']
 * @returns {NoteKey|null}
 */
export function getNoteKeyForCode(code, mode = 'magic') {
    const map = mode === 'piano' ? PIANO_KEY_BY_CODE : KEY_BY_CODE
    return map.get(code) || null
}

/**
 * The label shown in the legend for a semitone offset, taken from its primary key.
 * @param {number} offset
 * @returns {string}
 */
export function labelForOffset(offset) {
    const key = NOTE_KEYS.find(candidate => candidate.offset === offset && candidate.primary)
    return key ? codeToLabel(key.code) : ''
}

/**
 * The computer key label for a semitone offset in the piano mapping, or '' if
 * that semitone has no key. Offsets run 0 (C) to 16 (E of the next octave).
 * @param {number} offset
 * @returns {string}
 */
export function pianoKeyLabelForOffset(offset) {
    return PIANO_LABEL_BY_OFFSET.get(offset) || ''
}
