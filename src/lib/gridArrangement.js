// @ts-check
import { globals } from './globals.js'
import { buildTriggerMap, dealArrangement, nextPoolIds, numericId } from './triggerMaps.js'
import { deletePendingChordConfigs } from './massOperationsOnChordConfigs.js'
import { applyUserGridRowCount, updateGridSliderMax } from './maxChordConfig.js'

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */

/**
 * @module lib/gridArrangement
 * @desc The grid arrangement (`songs.default.ids`) is the ordered list of
 * chords on the trigger keys and the single source of truth for the grid.
 * These helpers mutate it and rebuild the trigger map. They stay free of
 * MIDI, Vue and document side effects so they can be unit tested; the callers
 * in `boot-project.js` add key detection and keyboard relinking.
 */

/**
 * Ensure the default song exists so the arrangement and its marks can be
 * written safely.
 * @param {object} [project]
 */
export function ensureDefaultSong(project = globals.project) {
    if (!project.songs)
        project.songs = { default: { ids: [], favourites: [], blacklist: [] } }
    if (!project.songs.default)
        project.songs.default = { ids: [], favourites: [], blacklist: [] }
    const song = project.songs.default
    if (!Array.isArray(song.ids))
        song.ids = []
    if (!Array.isArray(song.favourites))
        song.favourites = []
    if (!Array.isArray(song.blacklist))
        song.blacklist = []
    return song
}

/**
 * Rebuild `globals.chordTriggerMap` from the current arrangement. This is the
 * deterministic, side-effect-free core of `regen()`.
 */
export function rebuildTriggerMap() {
    const project = globals.project ?? {}
    const chords = Array.isArray(project.chords) ? project.chords : []
    const song = project.songs?.default
    const ids = Array.isArray(song?.ids) ? song.ids : []
    globals.chordTriggerMap = buildTriggerMap(chords, ids, globals.maxChordConfigs)
    return globals.chordTriggerMap
}

/**
 * Append new chord configs to the pool and to the end of the grid arrangement,
 * grow the grid so they are visible, and rebuild the trigger map. Used by every
 * add path (picker, exact notes, generated chord sequence).
 * @param {Array<ChordConfig>} newConfigs already-built configs with ids
 */
export function appendChordConfigsToGrid(newConfigs) {
    if (!Array.isArray(newConfigs) || newConfigs.length === 0)
        return
    const project = globals.project
    if (!project || !Array.isArray(project.chords))
        return
    const song = ensureDefaultSong(project)

    for (const config of newConfigs) {
        project.chords.push(config)
        if (!song.ids.includes(config.id))
            song.ids.push(config.id)
    }

    // Grow the grid so the new chords are visible and persisted.
    globals.maxChordConfigs = song.ids.length
    if (!project.options)
        project.options = {}
    project.options.gridRows = globals.maxChordConfigs

    rebuildTriggerMap()
}

/**
 * Deal a fresh hand from the pool. Favourites are pinned first when
 * `allocateFavourites` is on; otherwise they are set aside. The only random
 * allocation besides MIDI import.
 * @param {number} gridRows number of trigger keys
 * @param {boolean} allocateFavourites
 * @param {() => number} [rng]
 */
export function dealGrid(gridRows, allocateFavourites, rng = Math.random) {
    const project = globals.project
    if (!project || !Array.isArray(project.chords))
        return []
    const song = ensureDefaultSong(project)
    const rows = Math.min(gridRows, project.chords.length)
    song.ids = dealArrangement(project.chords, rows, song, allocateFavourites, rng)
    rebuildTriggerMap()
    return song.ids
}

/**
 * Apply a drag order to the arrangement. The pool order is untouched. Any
 * slots the drag left empty are filled from the pool so the grid keeps its
 * remembered size.
 * @param {Array<number|string>} idsInOrder
 */
export function reorderGrid(idsInOrder) {
    const project = globals.project
    if (!project || !Array.isArray(project.chords))
        return []
    const song = ensureDefaultSong(project)
    const existing = new Set(project.chords.map(chord => numericId(chord.id)))
    const seen = new Set()
    const ordered = []
    for (const rawId of (Array.isArray(idsInOrder) ? idsInOrder : [])) {
        const id = numericId(rawId)
        if (existing.has(id) && !seen.has(id)) {
            ordered.push(id)
            seen.add(id)
        }
    }
    const target = Math.min(globals.maxChordConfigs, project.chords.length)
    if (ordered.length < target)
        ordered.push(...nextPoolIds(project.chords, ordered, target - ordered.length, song))
    song.ids = ordered
    rebuildTriggerMap()
    return song.ids
}

/**
 * Change the grid height. Shrinking drops the arrangement tail; growing first
 * reveals any hidden tail (when the arrangement is longer than the window) and
 * then appends the next pool chords, so shrinking and re-growing restores the
 * same rows. Remembers the size on the project.
 * @param {number} requestedCount
 * @returns {number} the resulting grid height
 */
export function resizeGrid(requestedCount) {
    const project = globals.project
    if (!project || !Array.isArray(project.chords) || project.chords.length === 0)
        return globals.maxChordConfigs
    const next = applyUserGridRowCount(requestedCount, project)
    const song = ensureDefaultSong(project)
    const current = Array.isArray(song.ids) ? song.ids.map(numericId) : []
    let arrangement = current.slice(0, next)
    if (arrangement.length < next)
        arrangement = [...arrangement, ...nextPoolIds(project.chords, arrangement, next - arrangement.length, song)]
    song.ids = arrangement
    rebuildTriggerMap()
    return next
}

/**
 * Delete the chords ticked in `globals.idsToDelete` from the pool, the
 * arrangement and the song lists, then shrink the grid to match.
 * @returns {number} how many chords were deleted
 */
export function deleteGridChords() {
    const project = globals.project
    if (!project || !Array.isArray(project.chords))
        return 0
    if (!Array.isArray(globals.idsToDelete) || globals.idsToDelete.length === 0)
        return 0
    const deletedCount = globals.idsToDelete.length
    const song = ensureDefaultSong(project)
    deletePendingChordConfigs()

    const remaining = project.chords.length
    if (remaining > 0)
        applyUserGridRowCount(Math.max(1, Math.min(song.ids.length, remaining)), project)
    else
        updateGridSliderMax(project)
    rebuildTriggerMap()
    return deletedCount
}
