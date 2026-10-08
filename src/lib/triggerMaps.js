// @ts-check
import * as Tonal from "@tonaljs/tonal";
import { expandChordConfig } from "./expandChordConfig.js";
import { resolveTriggerNote } from "./resolveTriggerNote";
import { indexToWhiteNote } from "./note-tools";
import { numericId } from "./id.js";

export { numericId } from "./id.js";

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */
/** @typedef {import("./typedefs").Song} Song */

/**
 * @module lib/triggerMaps
 * @desc Chord Trigger Map creation. The map is a deterministic view over the
 * project's ordered grid arrangement (`songs.default.ids`): trigger slot `i`
 * always maps to the `i`th id in the arrangement. Randomness lives only in the
 * explicit `dealArrangement()` action.
 */

/**
 * The ordered chord configs that currently sit on the trigger keys: the first
 * `gridRows` ids of the arrangement, resolved against the pool. When the
 * arrangement is empty, fall back to the pool order (hand-built and generated
 * projects where the grid is the whole chord list).
 * @param {Array<ChordConfig>} chordConfigs project pool
 * @param {Array<number|string>} ids ordered grid arrangement
 * @param {number} gridRows number of trigger keys
 * @returns {Array<ChordConfig>}
 */
export function resolveGridChords(chordConfigs, ids, gridRows) {
    const byId = new Map()
    for (const config of chordConfigs)
        byId.set(numericId(config.id), config)

    let ordered = []
    if (Array.isArray(ids) && ids.length > 0) {
        for (const rawId of ids) {
            const config = byId.get(numericId(rawId))
            if (config)
                ordered.push(config)
        }
    }
    else {
        ordered = [...chordConfigs]
    }

    const limit = Number.isFinite(gridRows) ? Math.max(0, gridRows) : ordered.length
    return ordered.slice(0, limit)
}

/**
 * Build the runtime trigger map from the ordered grid arrangement. Each entry
 * is a clone, so transpositions during performance do not change the project.
 * @param {Array<ChordConfig>} chordConfigs project pool
 * @param {Array<number|string>} ids grid arrangement
 * @param {number} gridRows number of trigger keys
 * @returns {ChordTriggerMap}
 */
export function buildTriggerMap(chordConfigs, ids, gridRows) {
    /** @type {ChordTriggerMap} */
    const chordTriggerMap = {}
    let index = 0
    for (const source of resolveGridChords(chordConfigs, ids, gridRows)) {
        const config = JSON.parse(JSON.stringify(source))  // clone
        expandChordConfig(config)  // in place
        addToMap(chordTriggerMap, index, config)
        index++
    }
    return chordTriggerMap
}

/**
 * Deal a fresh grid arrangement from the pool. This is the only random
 * allocation path, used by the explicit Deal/Shuffle action and by MIDI import.
 * Favourites are pinned first when `allocateFavourites` is on; otherwise they
 * are set aside so the draw browses other candidates.
 * @param {Array<ChordConfig>} chordConfigs project pool
 * @param {number} gridRows number of trigger keys
 * @param {Song} song favourites and blacklist
 * @param {boolean} allocateFavourites whether favourites are pinned first
 * @param {() => number} [rng] random source, injectable for tests
 * @returns {Array<number|string>} ordered ids for the arrangement
 */
export function dealArrangement(chordConfigs, gridRows, song, allocateFavourites, rng = Math.random) {
    const favourites = Array.isArray(song?.favourites) ? song.favourites.map(numericId) : []
    const blacklist = Array.isArray(song?.blacklist) ? song.blacklist.map(numericId) : []
    const byId = new Map(chordConfigs.map(config => [numericId(config.id), config]))

    const keepers = []
    if (allocateFavourites) {
        for (const id of favourites) {
            if (keepers.length >= gridRows)
                break
            const config = byId.get(id)
            if (config && !blacklist.includes(id))
                keepers.push(config)
        }
    }
    const keeperIds = new Set(keepers.map(config => numericId(config.id)))

    const pool = chordConfigs.filter(config => {
        const id = numericId(config.id)
        if (blacklist.includes(id))
            return false
        if (keeperIds.has(id))
            return false
        if (favourites.includes(id))
            return false  // favourites are either pinned above or set aside
        return true
    })

    const needed = Math.max(0, gridRows - keepers.length)
    const fresh = randomSample(pool, Math.min(needed, pool.length), rng)
    return [...keepers, ...fresh].map(config => numericId(config.id))
}

/**
 * The next unarranged, non-blacklisted pool chords in pool order. Used when the
 * grid grows, so shrinking and re-growing restores the same rows.
 * @param {Array<ChordConfig>} chordConfigs project pool
 * @param {Array<number|string>} ids current arrangement
 * @param {number} count how many ids to add
 * @param {Song} [song]
 * @returns {Array<number|string>}
 */
export function nextPoolIds(chordConfigs, ids, count, song) {
    const blacklist = Array.isArray(song?.blacklist) ? song.blacklist.map(numericId) : []
    const arranged = new Set((ids || []).map(numericId))
    const result = []
    for (const config of chordConfigs) {
        if (result.length >= count)
            break
        const id = numericId(config.id)
        if (arranged.has(id) || blacklist.includes(id))
            continue
        result.push(id)
    }
    return result
}

/**
 * Pick `n` random elements from `arr` without mutating it.
 * @template T
 * @param {Array<T>} arr
 * @param {number} n
 * @param {() => number} rng
 * @returns {Array<T>}
 */
function randomSample(arr, n, rng) {
    const len = arr.length
    if (n <= 0 || len === 0)
        return []
    if (n >= len)
        return [...arr]

    const taken = new Array(len)
    const result = new Array(n)
    let remaining = len
    let count = n
    while (count--) {
        const x = Math.floor(rng() * remaining)
        result[count] = arr[x in taken ? taken[x] : x]
        taken[x] = --remaining in taken ? taken[remaining] : remaining
    }
    return result
}

/**
 * Expands each chord config to allocate actual chord notes (if needed) with
 * octaves and scale notes, then maps them to trigger notes in order.
 * @param {Array<ChordConfig>} chordConfigs Project config's chord configs
 * @returns {ChordTriggerMap} Runtime mapping of trigger notes to chord configs
 * @deprecated kept for the trigger map tests; use buildTriggerMap().
 */
export function candidatesToTriggerMapDumbDeprecated(chordConfigs) {
    /** @type {ChordTriggerMap} */
    let chordTriggerMap = {}

    let index = 0
    for (let chordConfig of chordConfigs) {
        // Expand chord configs into note arrays: from e.g. 'Cmaj7' to ['C4', 'E4', 'G4', 'B4']
        expandChordConfig(chordConfig) // in place

        addToMap(chordTriggerMap, index, chordConfig);
        index++
    }
    return chordTriggerMap
}

function addToMap(chordTriggerMap, index, chordConfig) {
    // Allocate chordConfig into the mapping
    /*
    Implementation Note: The algorithm temporarily and internally uses old v1
    project trigger note names, e.g. 'C' or 'C_2' to figure out the normal
    octave based trigger note e.g. 'C4'. The octave for the final trigger notes
    is based on the loaded MIDI keyboard config 'triggerOctave'). 

    The result is something like e.g. { 'C2': { id: 0, chord: 'Dm7', ... },
    'C3': { id: 1, chord: 'CM', ... }
    }
    */
    const originalPureTriggerNoteName = indexToWhiteNote(index); // e.g. 'C' or 'C_2'
    const key = resolveTriggerNote(originalPureTriggerNoteName); // e.g. 'C2'
    chordTriggerMap[key] = chordConfig;
}

function updateChordTriggerMap(chordTriggerMap, chordConfig) {
    // Update the chordTriggerMap with the new chordConfig entry

    // Note: globals.chordTriggerMap values (type chordConfigs) are copies 
    // of a subset (maxChordConfigs) of project.chords (type chordConfigs). The project configs
    // are passed in as references so need to be cloned here to ensure they remain separate
    // which allows us to 'reset' chordTriggerMap entries to their initial states during
    // add hoc transpositions during performance etc.

    chordConfig = JSON.parse(JSON.stringify(chordConfig))  // clone
    expandChordConfig(chordConfig)  // in place

    // Find the current chord config in the chordTriggerMap and replace it (keep them in sync)
    for (let key in chordTriggerMap) {
        const chordConfigInMap = chordTriggerMap[key]
        if (numericId(chordConfigInMap.id) === numericId(chordConfig.id)) {
            chordTriggerMap[key] = chordConfig;
            return
        }
    }
    // The chord is no longer on the grid (gone from the arrangement), so there
    // is nothing to reset. This is not an error.
}

/**
 * Update all chordTriggerMap entries with the original values from projectChords array
 * @param {ChordTriggerMap} chordTriggerMap 
 * @param {Array<ChordConfig>} projectChords original values from project, typically pass in `globals.project.chords`
 * @returns Nothing
 */
export function resetChordTriggerMap(chordTriggerMap, projectChords) {
    const idsInChordTriggerMap = Object.values(chordTriggerMap).map(chordConfig => numericId(chordConfig.id))
    const projectChordsInChordTriggerMap = projectChords.filter(chordConfig => idsInChordTriggerMap.includes(numericId(chordConfig.id)))
    for (let chordConfig of projectChordsInChordTriggerMap)
        updateChordTriggerMap(chordTriggerMap, chordConfig)
}

/**
 * Verifies the validity of a trigger note map.
 * @param {ChordTriggerMap} chordTriggerMap 
 */
export function verifyTriggerMap(chordTriggerMap) {
    for (let triggerNote in chordTriggerMap) {
        if (Tonal.Note.get(triggerNote).oct == undefined) {
            console.error('Invalid trigger note', triggerNote, 'missing octave?')
            // throw('Invalid chordTriggerMap')
        }
    }
}
