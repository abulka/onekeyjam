// @ts-check
import { watch } from 'vue'
import { globals } from './globals.js'

/**
 * @module lib/uiPrefs
 * @desc Persistence of small UI preferences that should survive a reload:
 * the on-screen keyboard Key labels mode and the computer-keyboard shortcut
 * badges.
 */

const STORAGE_KEY = 'onekeyjam.uiPrefs'

export const KEYBOARD_HELP_MODES = ['off', 'black', 'white', 'all']

/**
 * @typedef {Object} UiPrefs
 * @property {string} [keyboardHelpMode]
 * @property {boolean} [showKeyShortcuts]
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
 * Reads and validates the stored prefs.
 * @param {Storage|null} [storage]
 * @returns {UiPrefs}
 */
export function readPrefs(storage = defaultStorage()) {
    if (!storage)
        return {}
    try {
        const raw = storage.getItem(STORAGE_KEY)
        const stored = raw ? JSON.parse(raw) : {}
        /** @type {UiPrefs} */
        const prefs = {}
        if (stored && KEYBOARD_HELP_MODES.includes(stored.keyboardHelpMode))
            prefs.keyboardHelpMode = stored.keyboardHelpMode
        if (stored && typeof stored.showKeyShortcuts === 'boolean')
            prefs.showKeyShortcuts = stored.showKeyShortcuts
        return prefs
    }
    catch (error) {
        return {}
    }
}

/**
 * The prefs as they currently are in globals.
 * @returns {UiPrefs}
 */
export function currentPrefs() {
    return {
        keyboardHelpMode: globals.keyboardHelpMode,
        showKeyShortcuts: globals.showKeyShortcuts,
    }
}

/**
 * Writes the given prefs.
 * @param {UiPrefs} prefs
 * @param {Storage|null} [storage]
 */
export function writePrefs(prefs, storage = defaultStorage()) {
    if (!storage)
        return
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    }
    catch (error) {
        // ignore storage errors (private mode, quota, etc.)
    }
}

/**
 * Loads the saved prefs into globals.
 * @param {Storage|null} [storage]
 */
export function loadUiPrefs(storage = defaultStorage()) {
    const prefs = readPrefs(storage)
    if (prefs.keyboardHelpMode)
        globals.keyboardHelpMode = prefs.keyboardHelpMode
    if (typeof prefs.showKeyShortcuts === 'boolean')
        globals.showKeyShortcuts = prefs.showKeyShortcuts
}

/**
 * Loads the saved prefs and keeps them saved when they change. Call once at
 * app startup.
 * @param {Storage|null} [storage]
 */
export function initUiPrefs(storage = defaultStorage()) {
    loadUiPrefs(storage)
    watch(() => [globals.keyboardHelpMode, globals.showKeyShortcuts], () => {
        writePrefs(currentPrefs(), storage)
    })
}
