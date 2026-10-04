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
 * @property {boolean} [showFavouriteBinColumns]
 * @property {string} [helpPage]
 * @property {string} [scalePolicy]
 * @property {boolean} [scaleAdvanced]
 * @property {boolean} [scaleHistory]
 * @property {PolicyOptions} [policyOptions]
 */

/**
 * @typedef {Object} PolicyOptions
 * @property {number} [poolSize]
 * @property {number} [dwell]
 * @property {number} [changeChance]
 * @property {number} [maxNewNotes]
 * @property {boolean} [deferWhilePlaying]
 * @property {number} [contextChords]
 * @property {boolean} [phraseBias]
 * @property {number} [phraseStrength]
 */

/**
 * Validate and clamp the stored policy options.
 * @param {*} stored
 * @returns {PolicyOptions}
 */
function readPolicyOptions(stored) {
    /** @type {PolicyOptions} */
    const options = {}
    if (!stored || typeof stored !== 'object')
        return options
    if (Number.isFinite(stored.poolSize))
        options.poolSize = Math.min(8, Math.max(3, Math.round(stored.poolSize)))
    if (Number.isFinite(stored.dwell))
        options.dwell = Math.min(4, Math.max(1, Math.round(stored.dwell)))
    if (Number.isFinite(stored.changeChance))
        options.changeChance = Math.min(1, Math.max(0, stored.changeChance))
    if (Number.isFinite(stored.maxNewNotes))
        options.maxNewNotes = Math.min(7, Math.max(0, Math.round(stored.maxNewNotes)))
    if (typeof stored.deferWhilePlaying === 'boolean')
        options.deferWhilePlaying = stored.deferWhilePlaying
    if (Number.isFinite(stored.contextChords))
        options.contextChords = stored.contextChords >= 2 ? 2 : 1
    if (typeof stored.phraseBias === 'boolean')
        options.phraseBias = stored.phraseBias
    if (Number.isFinite(stored.phraseStrength))
        options.phraseStrength = Math.min(2, Math.max(0.5, stored.phraseStrength))
    return options
}

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
        if (stored && typeof stored.showFavouriteBinColumns === 'boolean')
            prefs.showFavouriteBinColumns = stored.showFavouriteBinColumns
        if (stored && HELP_PAGES.includes(stored.helpPage))
            prefs.helpPage = stored.helpPage
        if (stored && SCALE_POLICIES.includes(stored.scalePolicy))
            prefs.scalePolicy = stored.scalePolicy
        if (stored && typeof stored.scaleAdvanced === 'boolean')
            prefs.scaleAdvanced = stored.scaleAdvanced
        if (stored && typeof stored.scaleHistory === 'boolean')
            prefs.scaleHistory = stored.scaleHistory
        if (stored && stored.policyOptions) {
            const options = readPolicyOptions(stored.policyOptions)
            if (Object.keys(options).length > 0)
                prefs.policyOptions = options
        }
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
        showFavouriteBinColumns: globals.showFavouriteBinColumns,
        helpPage: globals.helpPage,
        scalePolicy: globals.scaleFiltering.policy,
        scaleAdvanced: globals.showScaleAdvanced,
        scaleHistory: globals.showScaleHistory,
        policyOptions: { ...globals.scaleFiltering.policyOptions },
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
    if (typeof prefs.showFavouriteBinColumns === 'boolean')
        globals.showFavouriteBinColumns = prefs.showFavouriteBinColumns
    if (prefs.helpPage)
        globals.helpPage = prefs.helpPage
    if (prefs.scalePolicy)
        globals.scaleFiltering.policy = prefs.scalePolicy
    if (typeof prefs.scaleAdvanced === 'boolean')
        globals.showScaleAdvanced = prefs.scaleAdvanced
    if (typeof prefs.scaleHistory === 'boolean')
        globals.showScaleHistory = prefs.scaleHistory
    if (prefs.policyOptions)
        Object.assign(globals.scaleFiltering.policyOptions, prefs.policyOptions)
}

/**
 * Loads the saved prefs and keeps them saved when they change. Call once at
 * app startup.
 * @param {Storage|null} [storage]
 */
export function initUiPrefs(storage = defaultStorage()) {
    loadUiPrefs(storage)
    watch(() => [
        globals.keyboardHelpMode,
        globals.showKeyShortcuts,
        globals.showWelcomeDialog,
        globals.showFavouriteBinColumns,
        globals.helpPage,
        globals.scaleFiltering.policy,
        globals.showScaleAdvanced,
        globals.showScaleHistory,
        globals.scaleFiltering.policyOptions.poolSize,
        globals.scaleFiltering.policyOptions.dwell,
        globals.scaleFiltering.policyOptions.changeChance,
        globals.scaleFiltering.policyOptions.maxNewNotes,
        globals.scaleFiltering.policyOptions.deferWhilePlaying,
        globals.scaleFiltering.policyOptions.contextChords,
        globals.scaleFiltering.policyOptions.phraseBias,
        globals.scaleFiltering.policyOptions.phraseStrength,
    ], () => {
        writePrefs(currentPrefs(), storage)
    })
}
