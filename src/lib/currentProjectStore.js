// @ts-check
import { watch } from 'vue'
import { globals } from './globals.js'
import { getProjectForPersistence } from './projectSerialize.js'
import { emergencyRepairProject } from './emergencyRepairProject.js'
import { resetChordHistory } from './autoScale.js'

/**
 * @module lib/currentProjectStore
 * @desc Persistence of the current working project in localStorage, so a page
 * refresh does not lose it. This is the "what I was just doing" snapshot; it
 * includes unsaved edits, unlike the user projects saved to IndexedDB. Loading
 * or creating another project simply overwrites the snapshot.
 */

const STORAGE_KEY = 'onekeyjam.currentProject'
const CATEGORIES = ['user', 'featured', 'classic', 'progressions', 'rock']
const SCALE_FILTERS = ['scale1', 'scale2', 'scale3', 'notesOfChord']

/**
 * @typedef {object} CurrentProject
 * @property {string} name the current project name
 * @property {'user'|'featured'|'classic'|'progressions'|'rock'} category which library it came from
 * @property {string} [currentChordTriggerNote] highlighted chord trigger note
 * @property {string} currentScaleFilter highlighted scale filter slot
 * @property {string} [currentChordSequenceName] which named chord sequence is shown
 * @property {number} [maxChordConfigs] how many chord rows the grid was showing
 * @property {object} project the slim persisted project (see projectSerialize.js)
 */

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
 * Reads and validates the stored snapshot.
 * @param {Storage|null} [storage]
 * @returns {CurrentProject|null}
 */
export function readCurrentProject(storage = defaultStorage()) {
    if (!storage)
        return null
    try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw)
            return null
        const data = JSON.parse(raw)
        if (!data || data.version !== 1)
            return null
        if (!data.project || typeof data.project !== 'object')
            return null
        if (typeof data.name !== 'string')
            return null
        return {
            name: data.name,
            category: CATEGORIES.includes(data.category) ? data.category : 'user',
            currentChordTriggerNote: typeof data.currentChordTriggerNote === 'string' && data.currentChordTriggerNote
                ? data.currentChordTriggerNote
                : undefined,
            currentScaleFilter: SCALE_FILTERS.includes(data.currentScaleFilter) ? data.currentScaleFilter : 'scale1',
            currentChordSequenceName: typeof data.currentChordSequenceName === 'string' && data.currentChordSequenceName
                ? data.currentChordSequenceName
                : undefined,
            maxChordConfigs: Number.isFinite(data.maxChordConfigs) ? data.maxChordConfigs : undefined,
            project: data.project,
        }
    }
    catch (error) {
        return null
    }
}

/**
 * Writes the given snapshot.
 * @param {Partial<CurrentProject>} record
 * @param {Storage|null} [storage]
 */
export function writeCurrentProject(record, storage = defaultStorage()) {
    if (!storage)
        return
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...record }))
    }
    catch (error) {
        // Persistence is best effort (private mode, quota, etc.).
    }
}

/**
 * Removes the stored snapshot.
 * @param {Storage|null} [storage]
 */
export function clearCurrentProject(storage = defaultStorage()) {
    if (!storage)
        return
    try {
        storage.removeItem(STORAGE_KEY)
    }
    catch (error) {
        // Persistence is best effort.
    }
}

/**
 * Builds a snapshot of the current working state, using the slim project shape
 * so derived scale notes are not stored.
 * @returns {CurrentProject}
 */
export function captureCurrentProject() {
    return {
        name: globals.projectLibrary.projectName || '',
        category: CATEGORIES.includes(globals.projectLibrary.projectIsUserOrFeatured)
            ? globals.projectLibrary.projectIsUserOrFeatured
            : 'user',
        currentChordTriggerNote: globals.currentChordTriggerNote,
        currentScaleFilter: globals.currentScaleFilter,
        currentChordSequenceName: globals.currentChordSequenceName,
        maxChordConfigs: globals.maxChordConfigs,
        project: JSON.parse(getProjectForPersistence(globals.project, true, true)),
    }
}

/**
 * Captures and writes the current working state.
 * @param {Storage|null} [storage]
 */
export function saveCurrentProject(storage = defaultStorage()) {
    writeCurrentProject(captureCurrentProject(), storage)
}

/**
 * Applies a stored snapshot back into globals, re-expanding the chord configs.
 * @param {Storage|null} [storage]
 * @returns {boolean} true when a valid snapshot was restored
 */
export function restoreCurrentProject(storage = defaultStorage()) {
    const record = readCurrentProject(storage)
    if (!record)
        return false

    globals.project = record.project
    globals.projectLibrary.projectName = record.name
    globals.projectLibrary.projectIsUserOrFeatured = record.category
    globals.currentChordTriggerNote = record.currentChordTriggerNote
    globals.currentScaleFilter = record.currentScaleFilter
    if (record.currentChordSequenceName)
        globals.currentChordSequenceName = record.currentChordSequenceName
    if (Number.isFinite(record.maxChordConfigs))
        globals.maxChordConfigs = record.maxChordConfigs

    emergencyRepairProject(globals.project)
    resetChordHistory()
    return true
}

let initialized = false

/**
 * Keeps the snapshot up to date as the working project changes. Call once at
 * app startup, after the initial restore. Writes are debounced, and flushed
 * when the page is hidden so a close cannot outrun the timer.
 * @param {Storage|null} [storage]
 */
export function initCurrentProjectAutosave(storage = defaultStorage()) {
    if (initialized)
        return
    initialized = true

    let timer = null

    const flush = () => {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        saveCurrentProject(storage)
    }

    const schedule = () => {
        if (timer)
            clearTimeout(timer)
        timer = setTimeout(() => {
            timer = null
            saveCurrentProject(storage)
        }, 500)
    }

    watch(() => [
        globals.project,
        globals.currentChordTriggerNote,
        globals.currentScaleFilter,
        globals.currentChordSequenceName,
        globals.maxChordConfigs,
        globals.projectLibrary.projectName,
        globals.projectLibrary.projectIsUserOrFeatured,
    ], schedule, { deep: true })

    if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', flush)
        window.addEventListener('beforeunload', flush)
    }
}
