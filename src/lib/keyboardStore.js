// @ts-check

/**
 * @module lib/keyboardStore
 * @desc Local persistence for user-defined keyboard configs. The built-in
 * keyboards live as static JSON in public/keyboards; configs saved here let a
 * keyboard that has no bundled config still be wired up and remembered, with
 * its own trigger and jam octaves.
 */

const STORAGE_KEY = 'onekeyjam.keyboards'
const DISABLED_STORAGE_KEY = 'onekeyjam.keyboardsDisabled'

/**
 * Tokens that describe the port or model revision rather than the keyboard, so
 * they are dropped when building a short suggestion.
 */
const NOISE_TOKENS = /^(midi|port|bus|in|out|keyboard|mk(ii|2|i|iii)|in|out|\d+)$/i

/**
 * A short, human-friendly description for a keyboard config, distinct from the
 * raw device name. For example "Arturia MiniLab mkII" becomes "My Arturia
 * MiniLab", and "LPK25" becomes "My LPK25".
 * @param {string} deviceName
 * @returns {string}
 */
export function suggestConfigName(deviceName) {
    const name = (deviceName || '').trim()
    if (!name)
        return ''
    const words = name
        .split(/[\s_]+/)
        .filter(word => word && !NOISE_TOKENS.test(word))
        // Drop dotted initials such as "A.I.R." that add nothing to a friendly
        // label. A plain two-letter token like "SL" is kept.
        .filter(word => !/^[A-Z](\.[A-Z])+\.?$/.test(word))
    const fragment = words.slice(0, 2).join(' ')
    return `My ${fragment || name}`
}

/**
 * The label for the save button, based on whether the current keyboard already
 * has a config and whether that config is built-in or custom.
 * @param {{hasCustom: boolean, hasBuiltin: boolean}} state
 * @returns {string}
 */
export function keyboardSaveActionLabel({ hasCustom, hasBuiltin }) {
    if (hasCustom)
        return 'Save config'
    if (hasBuiltin)
        return 'Save as custom config (replaces built-in)'
    return 'Add config for this keyboard'
}

/**
 * @returns {Storage|null}
 */
function defaultStorage() {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage
    }
    catch (error) {
        return null
    }
}

/**
 * All saved custom keyboards, keyed by name.
 * @param {Storage|null} [storage]
 * @returns {Object<string, {name: string, description: string, lhTriggerOctave: number, rhJamSoundOctave: number}>}
 */
export function readCustomKeyboards(storage = defaultStorage()) {
    if (!storage)
        return {}
    try {
        const raw = storage.getItem(STORAGE_KEY)
        const data = raw ? JSON.parse(raw) : {}
        return data && typeof data === 'object' ? data : {}
    }
    catch (error) {
        return {}
    }
}

/**
 * @param {Storage|null} [storage]
 * @returns {string[]}
 */
export function listCustomKeyboards(storage = defaultStorage()) {
    return Object.keys(readCustomKeyboards(storage))
}

/**
 * @param {string} name
 * @param {Storage|null} [storage]
 * @returns {{name: string, description: string, lhTriggerOctave: number, rhJamSoundOctave: number}|null}
 */
export function fetchCustomKeyboard(name, storage = defaultStorage()) {
    const all = readCustomKeyboards(storage)
    return all[name] || null
}

/**
 * Save (or overwrite) a custom keyboard config.
 * @param {{name: string, description?: string, lhTriggerOctave?: number, rhJamSoundOctave?: number}} config
 * @param {Storage|null} [storage]
 */
export function saveCustomKeyboard(config, storage = defaultStorage()) {
    if (!storage || !config || !config.name)
        return
    const all = readCustomKeyboards(storage)
    all[config.name] = {
        name: config.name,
        description: config.description || suggestConfigName(config.name),
        lhTriggerOctave: Number.isFinite(Number(config.lhTriggerOctave)) ? Number(config.lhTriggerOctave) : 3,
        rhJamSoundOctave: Number.isFinite(Number(config.rhJamSoundOctave)) ? Number(config.rhJamSoundOctave) : 4,
    }
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(all))
    }
    catch (error) {
        // Persistence is best effort (private mode, quota, etc.).
    }
}

/**
 * Remove a saved custom keyboard config.
 * @param {string} name
 * @param {Storage|null} [storage]
 */
export function deleteCustomKeyboard(name, storage = defaultStorage()) {
    const all = readCustomKeyboards(storage)
    if (!(name in all))
        return
    delete all[name]
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(all))
    }
    catch (error) {
        // Persistence is best effort.
    }
}

/**
 * The device names the user has switched off. Every connected keyboard is live
 * by default, so only the exceptions need remembering.
 * @param {Storage|null} [storage]
 * @returns {string[]}
 */
export function readDisabledKeyboards(storage = defaultStorage()) {
    if (!storage)
        return []
    try {
        const raw = storage.getItem(DISABLED_STORAGE_KEY)
        const data = raw ? JSON.parse(raw) : []
        return Array.isArray(data) ? data.filter(name => typeof name === 'string' && name) : []
    }
    catch (error) {
        return []
    }
}

/**
 * @param {string[]} names
 * @param {Storage|null} [storage]
 */
export function saveDisabledKeyboards(names, storage = defaultStorage()) {
    if (!storage)
        return
    try {
        const clean = Array.isArray(names) ? names.filter(name => typeof name === 'string' && name) : []
        storage.setItem(DISABLED_STORAGE_KEY, JSON.stringify(clean))
    }
    catch (error) {
        // Persistence is best effort.
    }
}
