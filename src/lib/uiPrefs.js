// @ts-check
import { watch } from 'vue'
import { globals } from './globals.js'

/**
 * @module lib/uiPrefs
 * @desc Persistence of small UI preferences that should survive a reload.
 * Currently only the on-screen keyboard Key labels mode.
 */

const STORAGE_KEY = 'onekeyjam.uiPrefs'

export const KEYBOARD_HELP_MODES = ['off', 'black', 'white', 'all']

/**
 * @typedef {Object} UiPrefs
 * @property {string} [keyboardHelpMode]
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
        const prefs = raw ? JSON.parse(raw) : {}
        if (prefs && KEYBOARD_HELP_MODES.includes(prefs.keyboardHelpMode))
            return { keyboardHelpMode: prefs.keyboardHelpMode }
        return {}
    }
    catch (error) {
        return {}
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
}

/**
 * Loads the saved prefs and keeps them saved when they change. Call once at
 * app startup.
 * @param {Storage|null} [storage]
 */
export function initUiPrefs(storage = defaultStorage()) {
    loadUiPrefs(storage)
    watch(() => globals.keyboardHelpMode, () => {
        writePrefs({ keyboardHelpMode: globals.keyboardHelpMode }, storage)
    })
}
