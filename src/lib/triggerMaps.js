// @ts-check
import * as Tonal from "@tonaljs/tonal";
import { globals } from "./globals.js";
import { expandChordConfig } from "./expandChordConfig.js";
import { resolveTriggerNote } from "./resolveTriggerNote";
import { indexToWhiteNote } from "./note-tools";
import { getRandomFromArray } from "./util"
import { sortChordConfigs } from "./note-tools"
import pkg from 'lodash';
const { isEqual } = pkg;

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */
/** @typedef {import("./typedefs").Song} Song */

/**
 * @module lib/triggerMaps
 * @desc Chord Trigger Map creation function, incl. updating and adding to the
 * trigger map.
 */

/**
 * @typedef TriggerMapSmartResult
 * @type {object}
 * @property {ChordTriggerMap} chordTriggerMap the mapping
 * @property {Array<number>} ids the ids of chords configs allocated and residing in the trigger map
 * @property {object} statistics some statistics about what was allocated, num favourites, num blacklist, etc
 */


/**
 * Expands each chord config to allocate actual chord notes (if needed) with
 * octaves and scale notes. Then builds a runtime mapping of trigger notes to
 * those chord configs.
 * @param {Array<ChordConfig>} chordConfigs Project config's chord configs
 * @returns {ChordTriggerMap} Runtime mapping of trigger notes to chord configs
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

/**
 * Allocate ids in the song from candidates, as well as build a ChordTriggerMap
 * @param {Array<ChordConfig>} chordConfigs candidate chord configs
 * @param {number} maxChordConfigs max to allocate
 * @param {Song} song containing favourites, and blacklist ids
 * @param {boolean} allocateFavourites whether to skip a config if it appears in
 * favourites, see globals.allocateFavourites
 * @param {boolean} [sortIds=false] whether to sort newly allocated ids - makes
 * chords be grouped around tonic which is not reflective of the original midi
 * chord sequence and thus usually bad. Possibly need a UI option for this.
 * @returns {TriggerMapSmartResult} three values are returned inside an object
 */
export function candidatesToTriggerMapSmart(chordConfigs, maxChordConfigs, song, allocateFavourites, sortIds = false) {
    /** @type {ChordTriggerMap}  */
    const chordTriggerMap = {}
    const statistics = {}
    let nextTriggerNoteIndex = 0;
    let _nextTriggerNote;
    // console.log('candidatesToTriggerMapSmart', chordConfigs.length, 'maxChordConfigs', maxChordConfigs) // TODO maxChordConfigs debugging 3
    maxChordConfigs = Math.min(maxChordConfigs, chordConfigs.length)

    /*
    Note 'allocateFavourites' is typically true, but when set to false by the
    user, then favourites are not allocated to trigger notes meaning you can
    cull chord candidates more easily - having them all assigned to convenient
    trigger notes for auditioning without the favourites being allocated to all
    the good trigger notes and being in the way.     
    */

    // Take into account favourites
    let favourites = []
    if (allocateFavourites)
        for (let index of song.favourites.slice(0, maxChordConfigs)) {
            const chordCandidate = findFavouriteConfigMatchingId(chordConfigs, index);
            if (chordCandidate)
                favourites.push(chordCandidate)
        }

    // Allocate fresh candidates, excluding favourites and blacklisted
    const unusedCandidates = chordConfigs
        .filter(chordConfig => !song.favourites.includes(chordConfig.id))
        .filter(chordConfig => !song.blacklist.includes(chordConfig.id))

    const numFavouritesAlreadyAllocated = allocateFavourites ? Math.min(maxChordConfigs, song.favourites.length) : 0
    const numFreshCandidatesNeeded = Math.min(unusedCandidates.length, maxChordConfigs - numFavouritesAlreadyAllocated)
    let freshCandidates = []
    if (numFreshCandidatesNeeded > 0) {
        freshCandidates = getRandomFromArray(unusedCandidates, numFreshCandidatesNeeded)
        console.log('candidatesToTriggerMapSmart', 'numFreshCandidatesNeeded', numFreshCandidatesNeeded, 'freshCandidates', freshCandidates.length, freshCandidates)
    }

    if (sortIds)
        freshCandidates = sortChordConfigs(freshCandidates)
    let candidates = [...favourites, ...freshCandidates]

    for (let chordConfig of candidates) {
        chordConfig = JSON.parse(JSON.stringify(chordConfig))  // clone
        expandChordConfig(chordConfig) // in place
        addToMap(chordTriggerMap, nextTriggerNoteIndex, chordConfig);
        nextTriggerNoteIndex++;
    }
    const ids = candidates.map(candidate => candidate.id).sort()

    // Generate statistics
    statistics.totalChordsAvailable = chordConfigs.length;
    statistics.numAllocated = nextTriggerNoteIndex;
    statistics.numFavourites = song.favourites.length;
    statistics.numBlacklisted = song.blacklist.length;
    statistics.numUnAllocated = statistics.totalChordsAvailable - statistics.numAllocated - statistics.numBlacklisted;
    statistics.summaryMsg = `Allocated ${statistics.numAllocated} chords to white note trigger notes. There are ${statistics.totalChordsAvailable} total candidates, ${statistics.numBlacklisted} blacklisted, so ${statistics.numUnAllocated} remain unallocated.`

    return { chordTriggerMap, ids, statistics }

}

/**
 * Re-allocate mappings to white notes, reusing an existing chord trigger map.
 * @param {ChordTriggerMap} existingChordTriggerMap
 * @param {Array<number>} idsInOrder the desired order of chord config ids
 * @returns {TriggerMapSmartResult}
 */
export function existingToTriggerMapSmart(existingChordTriggerMap, idsInOrder) {
    // re-allocate mappings to white notes, use existing chord trigger map
    /** @type {ChordTriggerMap} */
    let chordTriggerMap = {}
    let nextTriggerNoteIndex = 0;

    // Loop through idsInOrder, and find the corresponding chord config by searching for a value.id in the existingChordTriggerMap and call addToMap
    for (let id of idsInOrder) {
        for (let key in existingChordTriggerMap) {
            let chordConfig = existingChordTriggerMap[key]
            if (chordConfig.id === id) {
                addToMap(chordTriggerMap, nextTriggerNoteIndex, chordConfig);
                nextTriggerNoteIndex++;
                break;
            }
        }
    }
    const ids = Object.values(chordTriggerMap).map(chordConfig => chordConfig.id)//.sort()
    if (!isEqual(ids, idsInOrder)) {
        console.error('existingToTriggerMapSmart', 'idsInOrder', idsInOrder, 'ids', ids)
        throw new Error('idsInOrder and ids do not match')
    }

    const statistics = {}
    return { chordTriggerMap, ids, statistics }
}

function findFavouriteConfigMatchingId(chordConfigs, id) {
    const matchingFavourites = chordConfigs.filter(candidate => candidate.id == id);
    if (matchingFavourites.length != 1) {
        console.error('Could not find favourite matching', id);
        return undefined
    }
    const chordCandidate = matchingFavourites[0];
    return chordCandidate;
}

function updateChordTriggerMap(chordTriggerMap, chordConfig) {
    // Update the chordTriggerMap with the new chordConfig entry

    // Note: globals.chordTriggerMap values (type chordConfigs) are copies 
    // of a subset (maxChordConfigs) of project.chords (type chordConfigs). The project configs
    // are passed in as references so need to clone them here to ensure they remain separate
    // which allows us to 'reset' chordTriggerMap entries to their initial states during
    // add hoc transpositions during performance etc.

    chordConfig = JSON.parse(JSON.stringify(chordConfig))  // clone
    expandChordConfig(chordConfig)  // in place

    // Find the current chord config in the chordTriggerMap and replace it (keep them in sync)
    for (let key in chordTriggerMap) {
        const chordConfigInMap = chordTriggerMap[key]
        if (chordConfigInMap.id == chordConfig.id) {
            chordTriggerMap[key] = chordConfig;
            return
        }
    }
    throw ('Could not find chord config in map')
}

function spotCheck() {
    // Pretty sure globals.chordTriggerMap.length == globals.maxChordConfigs at all times.
    // TODO arguably convert to computed: a setter causes the re-allocation and the getter is the length.
    if (Object.keys(globals.chordTriggerMap).length != globals.maxChordConfigs)
        console.warn(`globals.chordTriggerMap length != globals.maxChordConfigs I thought they would always be the same?`, Object.keys(globals.chordTriggerMap).length, globals.maxChordConfigs)
}

/**
 * Update all chordTriggerMap entries with the original values from projectChords array
 * @param {ChordTriggerMap} chordTriggerMap 
 * @param {Array<ChordConfig>} projectChords original values from project, typically pass in `globals.project.chords`
 * @returns Nothing
 */
export function resetChordTriggerMap(chordTriggerMap, projectChords) {
    spotCheck()
    const idsInChordTriggerMap = Object.values(chordTriggerMap).map(chordConfig => chordConfig.id)
    const projectChordsInChordTriggerMap = projectChords.filter(chordConfig => idsInChordTriggerMap.includes(chordConfig.id))
    for (let chordConfig of projectChordsInChordTriggerMap)
        updateChordTriggerMap(chordTriggerMap, chordConfig)
}


export function appendChordTriggerMap(chordTriggerMap, chordConfig) {
    // Append the chordConfig to the chordTriggerMap
    // If globals.chordTriggerMap values were ids pointing back into globals.project.chords, we would be done.
    // But as the values are copies, we need to re-copy the current (just updated) chordConfig into the globals.chordTriggerMap

    chordConfig = JSON.parse(JSON.stringify(chordConfig))  // clone
    expandChordConfig(chordConfig)  // in place

    const nextTriggerNoteIndex = getNextTriggerNoteIndex(chordTriggerMap)
    const nextTriggerNote = indexToWhiteNote(nextTriggerNoteIndex)
    const key = resolveTriggerNote(nextTriggerNote)
    chordTriggerMap[key] = chordConfig;
}

function getNextTriggerNoteIndex(chordTriggerMap) {
    const max = Object.keys(chordTriggerMap).length
    return max
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