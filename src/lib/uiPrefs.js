// @ts-check
import { watch } from 'vue'
import { globals } from './globals.js'
import { SCALE_POLICIES } from './autoScale.js'

/**
 * @module lib/uiPrefs
 * @desc Persistence of small UI preferences that should survive a reload:
 * the on-screen keyboard Key labels mode, the computer-keyboard shortcut
 * badges and the right-hand scale policy (manual, follow or shuffle).
 */

const STORAGE_KEY = 'onekeyjam.uiPrefs'

export const KEYBOARD_HELP_MODES = ['off', 'black', 'white', 'all']
export const HELP_PAGES = ['overview', 'tutorial']

/**
 * @typedef {Object} UiPrefs
 * @property {string} [keyboardHelpMode]
 * @property {boolean} [showKeyShortcuts]
 * @property {boolean} [showWelcomeDialog]
 * @property {string} [helpPage]
 * @property {string} [scalePolicy]
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
        if (stored && typeof stored.showWelcomeDialog === 'boolean')
            prefs.showWelcomeDialog = stored.showWelcomeDialog
        if (stored && HELP_PAGES.includes(stored.helpPage))
            prefs.helpPage = stored.helpPage
        if (stored && SCALE_POLICIES.includes(stored.scalePolicy))
            prefs.scalePolicy = stored.scalePolicy
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
        showWelcomeDialog: globals.showWelcomeDialog,
        helpPage: globals.helpPage,
        scalePolicy: globals.scaleFiltering.policy,
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
    if (typeof prefs.showWelcomeDialog === 'boolean')
        globals.showWelcomeDialog = prefs.showWelcomeDialog
    if (prefs.helpPage)
        globals.helpPage = prefs.helpPage
    if (prefs.scalePolicy)
        globals.scaleFiltering.policy = prefs.scalePolicy
}

/**
 * Loads the saved prefs and keeps them saved when they change. Call once at
 * app startup.
 * @param {Storage|null} [storage]
 */
export function initUiPrefs(storage = defaultStorage()) {
    loadUiPrefs(storage)
    watch(() => [globals.keyboardHelpMode, globals.showKeyShortcuts, globals.showWelcomeDialog, globals.helpPage, globals.scaleFiltering.policy], () => {
        writePrefs(currentPrefs(), storage)
    })
}
