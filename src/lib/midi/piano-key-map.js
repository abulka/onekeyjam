// @ts-check

/**
 * @module lib/midi/piano-key-map
 * @desc The computer-keyboard mapping for the on-screen piano keyboard.
 *
 * The g200kg `webaudio-keyboard` widget has a hard-wired key map and no way to
 * configure shortcuts. OneKeyJam therefore clears the widget's own key codes
 * (see LivePianoKeyboard.vue) and handles keyboard input itself using this
 * table, so the shortcuts are ours to change and app shortcuts such as
 * Ctrl+digit do not also sound a note.
 */

/**
 * @typedef {Object} NoteKey
 * @property {string} code KeyboardEvent.code of the physical key
 * @property {number} offset Semitone offset from the first key of the on-screen keyboard
 * @property {boolean} primary Whether this is the key shown in the legend for its offset
 */

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

    // Upper row: the right-hand white keys. The right-hand black keys are the
    // scale-filter modifiers and are triggered by the 1-5 number keys, so the
    // number row is not part of the note map.
    { code: 'KeyQ', offset: 12, primary: true },
    { code: 'KeyW', offset: 14, primary: true },
    { code: 'KeyE', offset: 16, primary: true },
    { code: 'KeyR', offset: 17, primary: true },
    { code: 'KeyT', offset: 19, primary: true },
    { code: 'KeyY', offset: 21, primary: true },
    { code: 'KeyU', offset: 23, primary: true },

    // Lower-row aliases for the right-hand octave (kept for parity with the widget)
    { code: 'Comma', offset: 12, primary: false },
    { code: 'KeyL', offset: 13, primary: false },
    { code: 'Period', offset: 14, primary: false },
    { code: 'Slash', offset: 16, primary: false },

    // The octave above the right hand, on the physical keys right of P
    { code: 'KeyI', offset: 24, primary: true },
    { code: 'KeyO', offset: 26, primary: true },
    { code: 'KeyP', offset: 28, primary: true },
    { code: 'BracketLeft', offset: 29, primary: true },
    { code: 'BracketRight', offset: 31, primary: true },
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

/**
 * Looks up the note key for a KeyboardEvent.code, if any.
 * @param {string} code
 * @returns {NoteKey|null}
 */
export function getNoteKeyForCode(code) {
    return KEY_BY_CODE.get(code) || null
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
