// @ts-check

/**
 * @module lib/midi/pattern-store
 * @desc Persistence of the latest sequencer pattern in localStorage, so a page
 * refresh does not lose it. This mirrors the take's persistence; binding a
 * pattern to a project is a separate, explicit action (Save To Project).
 */

const STORAGE_KEY = 'onekeyjam.pattern'

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
 * @typedef {object} StoredPattern
 * @property {string} mml
 * @property {number} markstart
 * @property {number} markend
 * @property {number} tempo
 * @property {boolean} enabled
 */

/**
 * @param {Partial<StoredPattern>} pattern
 * @param {Storage|null} [storage]
 */
export function savePattern(pattern, storage = defaultStorage()) {
    if (!storage)
        return
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...pattern }))
    }
    catch (error) {
        // Persistence is best effort.
    }
}

/**
 * @param {Storage|null} [storage]
 * @returns {StoredPattern|null}
 */
export function loadPattern(storage = defaultStorage()) {
    if (!storage)
        return null
    try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw)
            return null
        const data = JSON.parse(raw)
        if (!data || data.version !== 1)
            return null
        return {
            mml: typeof data.mml === 'string' ? data.mml : '',
            markstart: Number.isFinite(data.markstart) ? data.markstart : 0,
            markend: Number.isFinite(data.markend) ? data.markend : 0,
            tempo: Number.isFinite(data.tempo) ? data.tempo : 100,
            enabled: !!data.enabled,
        }
    }
    catch (error) {
        return null
    }
}

/**
 * @param {Storage|null} [storage]
 */
export function clearPattern(storage = defaultStorage()) {
    if (!storage)
        return
    try {
        storage.removeItem(STORAGE_KEY)
    }
    catch (error) {
        // Persistence is best effort.
    }
}
