// @ts-check
import { watch } from 'vue'
import { globals } from './globals.js'
import { SCALE_POLICIES } from './autoScale.js'
import { BACKGROUND_WINDOW_OPTIONS } from './midi/background-recorder.js'

/**
 * @module lib/uiPrefs
 * @desc Persistence of small UI preferences that should survive a reload:
 * the on-screen keyboard Key labels mode, the computer-keyboard shortcut
 * badges and the right-hand scale policy (manual, follow or shuffle).
 */

const STORAGE_KEY = 'onekeyjam.uiPrefs'

export const KEYBOARD_HELP_MODES = ['off', 'black', 'white', 'all']
export const HELP_PAGES = ['overview', 'tutorial', 'reference']
export const KEYBOARD_OCTAVE_MIN = 2
export const KEYBOARD_OCTAVE_MAX = 6
export const KEYBOARD_FIT_OCTAVES_DEFAULT = 3
export const BPM_MIN = 40
export const BPM_MAX = 240
export const FIXED_VELOCITY_MIN = 0.1
export const FIXED_VELOCITY_MAX = 1

/**
 * Clamp a stored octave count to the supported 2-6 range.
 * @param {*} value
 * @returns {number|undefined}
 */
export function clampKeyboardOctaves(value) {
    const n = Number(value)
    if (!Number.isFinite(n))
        return undefined
    return Math.min(KEYBOARD_OCTAVE_MAX, Math.max(KEYBOARD_OCTAVE_MIN, Math.round(n)))
}

/**
 * Clamp a stored fit-up-to octave count to the supported 2-6 range.
 * @param {*} value
 * @returns {number|undefined}
 */
export function clampKeyboardFitOctaves(value) {
    const n = Number(value)
    if (!Number.isFinite(n))
        return undefined
    return Math.min(KEYBOARD_OCTAVE_MAX, Math.max(KEYBOARD_OCTAVE_MIN, Math.round(n)))
}

/**
 * Clamp a stored BPM to the supported 40-240 range.
 * @param {*} value
 * @returns {number|undefined}
 */
export function clampBpm(value) {
    const n = Number(value)
    if (!Number.isFinite(n))
        return undefined
    return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(n)))
}

/**
 * Clamp a stored fixed velocity to the supported 0.1-1 range.
 * @param {*} value
 * @returns {number|undefined}
 */
export function clampFixedVelocity(value) {
    const n = Number(value)
    if (!Number.isFinite(n))
        return undefined
    return Math.round(Math.min(FIXED_VELOCITY_MAX, Math.max(FIXED_VELOCITY_MIN, n)) * 100) / 100
}

/**
 * @typedef {Object} UiPrefs
 * @property {string} [keyboardHelpMode]
 * @property {boolean} [showKeyShortcuts]
 * @property {number} [keyboardOctaves]
 * @property {number} [keyboardFitOctaves]
 * @property {number} [bpm]
 * @property {number} [fixedNoteVelocity]
 * @property {boolean} [metronomeEnabled]
 * @property {boolean} [showWelcomeDialog]
 * @property {boolean} [showFavouriteBinColumns]
 * @property {boolean} [showDeleteColumn]
 * @property {string} [helpPage]
 * @property {string} [scalePolicy]
 * @property {boolean} [scaleAdvanced]
 * @property {boolean} [scaleHistory]
 * @property {boolean} [showScaleCellFill]
 * @property {PolicyOptions} [policyOptions]
 * @property {HeldNoteRepair} [heldNoteRepair]
 * @property {boolean} [backgroundCaptureEnabled]
 * @property {number} [backgroundCaptureWindowSec]
 */

/**
 * @typedef {Object} PolicyOptions
 * @property {number} [poolSize]
 * @property {number} [dwell]
 * @property {number} [changeChance]
 * @property {number} [maxNewNotes]
 * @property {boolean} [deferWhilePlaying]
 * @property {string} [variety]  'gentle' | 'balanced' | 'lively'
 * @property {number} [contextChords]
 * @property {boolean} [phraseBias]
 * @property {number} [phraseStrength]
 * @property {string} [palette]  'primary' | 'colour' | 'bold' | 'tension'
 * @property {number} [preferPrimary] steady bias toward the stored first scale
 */
const PALETTES = ['primary', 'colour', 'bold', 'tension']
const VARIETIES = ['gentle', 'balanced', 'lively']

/**
 * @typedef {Object} HeldNoteRepair
 * @property {boolean} [enabled]
 * @property {number} [windowMs]
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
    if (VARIETIES.includes(stored.variety))
        options.variety = stored.variety
    if (Number.isFinite(stored.contextChords))
        options.contextChords = stored.contextChords >= 2 ? 2 : 1
    if (typeof stored.phraseBias === 'boolean')
        options.phraseBias = stored.phraseBias
    if (Number.isFinite(stored.phraseStrength))
        options.phraseStrength = Math.min(2, Math.max(0.5, stored.phraseStrength))
    if (PALETTES.includes(stored.palette))
        options.palette = stored.palette
    if (Number.isFinite(stored.preferPrimary))
        options.preferPrimary = Math.min(2, Math.max(0, stored.preferPrimary))
    return options
}

/**
 * Validate and clamp the stored global held-note repair settings.
 * @param {*} stored
 * @returns {HeldNoteRepair}
 */
function readHeldNoteRepair(stored) {
    /** @type {HeldNoteRepair} */
    const repair = {}
    if (!stored || typeof stored !== 'object')
        return repair
    // Accept the legacy names too: these settings used to live in
    // globals.scaleFiltering.policyOptions as remapHeldNotes/remapGraceMs.
    const enabled = typeof stored.enabled === 'boolean' ? stored.enabled : stored.remapHeldNotes
    if (typeof enabled === 'boolean')
        repair.enabled = enabled
    const windowMs = Number.isFinite(stored.windowMs) ? stored.windowMs : stored.remapGraceMs
    if (Number.isFinite(windowMs))
        repair.windowMs = Math.min(100000, Math.max(0, Math.round(windowMs)))
    return repair
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
        if (stored) {
            const octaves = clampKeyboardOctaves(stored.keyboardOctaves)
            if (octaves !== undefined)
                prefs.keyboardOctaves = octaves
            const fitOctaves = clampKeyboardFitOctaves(stored.keyboardFitOctaves)
            if (fitOctaves !== undefined)
                prefs.keyboardFitOctaves = fitOctaves
            const bpm = clampBpm(stored.bpm)
            if (bpm !== undefined)
                prefs.bpm = bpm
        }
        if (stored && typeof stored.fixedNoteVelocity === 'number') {
            const velocity = clampFixedVelocity(stored.fixedNoteVelocity)
            if (velocity !== undefined)
                prefs.fixedNoteVelocity = velocity
        }
        if (stored && typeof stored.metronomeEnabled === 'boolean')
            prefs.metronomeEnabled = stored.metronomeEnabled
        if (stored && typeof stored.showWelcomeDialog === 'boolean')
            prefs.showWelcomeDialog = stored.showWelcomeDialog
        if (stored && typeof stored.showFavouriteBinColumns === 'boolean')
            prefs.showFavouriteBinColumns = stored.showFavouriteBinColumns
        if (stored && typeof stored.showDeleteColumn === 'boolean')
            prefs.showDeleteColumn = stored.showDeleteColumn
        if (stored && HELP_PAGES.includes(stored.helpPage))
            prefs.helpPage = stored.helpPage
        if (stored && SCALE_POLICIES.includes(stored.scalePolicy))
            prefs.scalePolicy = stored.scalePolicy
        if (stored && typeof stored.scaleAdvanced === 'boolean')
            prefs.scaleAdvanced = stored.scaleAdvanced
        if (stored && typeof stored.scaleHistory === 'boolean')
            prefs.scaleHistory = stored.scaleHistory
        if (stored && typeof stored.showScaleCellFill === 'boolean')
            prefs.showScaleCellFill = stored.showScaleCellFill
        if (stored && stored.policyOptions) {
            const options = readPolicyOptions(stored.policyOptions)
            if (Object.keys(options).length > 0)
                prefs.policyOptions = options
        }
        const repair = readHeldNoteRepair(stored && (stored.heldNoteRepair ?? stored.policyOptions))
        if (Object.keys(repair).length > 0)
            prefs.heldNoteRepair = repair
        if (stored && typeof stored.backgroundCaptureEnabled === 'boolean')
            prefs.backgroundCaptureEnabled = stored.backgroundCaptureEnabled
        if (stored && BACKGROUND_WINDOW_OPTIONS.includes(stored.backgroundCaptureWindowSec))
            prefs.backgroundCaptureWindowSec = stored.backgroundCaptureWindowSec
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
        keyboardOctaves: globals.keyboardOctaves,
        keyboardFitOctaves: globals.keyboardFitOctaves,
        bpm: globals.recording.bpm,
        fixedNoteVelocity: globals.fixedNoteVelocity,
        metronomeEnabled: globals.metronomeEnabled,
        showWelcomeDialog: globals.showWelcomeDialog,
        showFavouriteBinColumns: globals.showFavouriteBinColumns,
        showDeleteColumn: globals.showDeleteColumn,
        helpPage: globals.helpPage,
        scalePolicy: globals.scaleFiltering.policy,
        scaleAdvanced: globals.showScaleAdvanced,
        scaleHistory: globals.showScaleHistory,
        showScaleCellFill: globals.showScaleCellFill,
        policyOptions: { ...globals.scaleFiltering.policyOptions },
        heldNoteRepair: { ...globals.heldNoteRepair },
        backgroundCaptureEnabled: globals.recording.background.enabled,
        backgroundCaptureWindowSec: globals.recording.background.windowSec,
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
    if (typeof prefs.keyboardOctaves === 'number')
        globals.keyboardOctaves = prefs.keyboardOctaves
    if (typeof prefs.keyboardFitOctaves === 'number')
        globals.keyboardFitOctaves = prefs.keyboardFitOctaves
    if (typeof prefs.bpm === 'number')
        globals.recording.bpm = prefs.bpm
    if (typeof prefs.fixedNoteVelocity === 'number')
        globals.fixedNoteVelocity = prefs.fixedNoteVelocity
    if (typeof prefs.metronomeEnabled === 'boolean')
        globals.metronomeEnabled = prefs.metronomeEnabled
    if (typeof prefs.showWelcomeDialog === 'boolean')
        globals.showWelcomeDialog = prefs.showWelcomeDialog
    if (typeof prefs.showFavouriteBinColumns === 'boolean')
        globals.showFavouriteBinColumns = prefs.showFavouriteBinColumns
    if (typeof prefs.showDeleteColumn === 'boolean')
        globals.showDeleteColumn = prefs.showDeleteColumn
    if (prefs.helpPage)
        globals.helpPage = prefs.helpPage
    if (prefs.scalePolicy)
        globals.scaleFiltering.policy = prefs.scalePolicy
    if (typeof prefs.scaleAdvanced === 'boolean')
        globals.showScaleAdvanced = prefs.scaleAdvanced
    if (typeof prefs.scaleHistory === 'boolean')
        globals.showScaleHistory = prefs.scaleHistory
    if (typeof prefs.showScaleCellFill === 'boolean')
        globals.showScaleCellFill = prefs.showScaleCellFill
    if (prefs.policyOptions)
        Object.assign(globals.scaleFiltering.policyOptions, prefs.policyOptions)
    if (prefs.heldNoteRepair)
        Object.assign(globals.heldNoteRepair, prefs.heldNoteRepair)
    if (typeof prefs.backgroundCaptureEnabled === 'boolean')
        globals.recording.background.enabled = prefs.backgroundCaptureEnabled
    if (typeof prefs.backgroundCaptureWindowSec === 'number')
        globals.recording.background.windowSec = prefs.backgroundCaptureWindowSec
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
        globals.keyboardOctaves,
        globals.keyboardFitOctaves,
        globals.recording.bpm,
        globals.fixedNoteVelocity,
        globals.metronomeEnabled,
        globals.showWelcomeDialog,
        globals.showFavouriteBinColumns,
        globals.showDeleteColumn,
        globals.helpPage,
        globals.scaleFiltering.policy,
        globals.showScaleAdvanced,
        globals.showScaleHistory,
        globals.showScaleCellFill,
        globals.scaleFiltering.policyOptions.poolSize,
        globals.scaleFiltering.policyOptions.dwell,
        globals.scaleFiltering.policyOptions.changeChance,
        globals.scaleFiltering.policyOptions.maxNewNotes,
        globals.scaleFiltering.policyOptions.deferWhilePlaying,
        globals.scaleFiltering.policyOptions.variety,
        globals.scaleFiltering.policyOptions.contextChords,
        globals.scaleFiltering.policyOptions.phraseBias,
        globals.scaleFiltering.policyOptions.phraseStrength,
        globals.scaleFiltering.policyOptions.palette,
        globals.scaleFiltering.policyOptions.preferPrimary,
        globals.heldNoteRepair.enabled,
        globals.heldNoteRepair.windowMs,
        globals.recording.background.enabled,
        globals.recording.background.windowSec,
    ], () => {
        writePrefs(currentPrefs(), storage)
    })
}
