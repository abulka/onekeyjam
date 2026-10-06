// @ts-check
// import { ChordDetect } from "@tonaljs/tonal";  // there is error in the doco - https://github.com/tonaljs/tonal/issues/289 
// import { Chord } from "@tonaljs/tonal";  // this conflicts with my own custom Chord jsdoc type
import { emergencyRepairProject } from './emergencyRepairProject.js';
import { expandChordConfig } from "./expandChordConfig.js"
import { createDefaultSongs } from './song';
import { createDefaultMetaProjectConfig } from './projectConfig';
import { detectChordAndScalesFromChordNotes } from './detectChord.js';

/** @typedef {import("./typedefs").Chord} Chord */
/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").Project} Project */
/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */

/**
 * @module lib/build-project
 * @desc Related to building Project objects.
*/


/**
 * Build an entire project from scratch.
 * @param {Array<Chord>} chords each chord is an array of string notes e.g. ['C4', 'E4', 'G4'] incl. octaves
 * @returns {Project} an empty project object with just .chords created
 */
export function buildProject(chords) {
    let project = {}
    project.meta = createDefaultMetaProjectConfig()
    project.name = 'Untitled Project'
    emergencyRepairProject(project);  // TODO fix the internals of this function
    project.chords = _buildCandidateChordConfigs(chords)
    // New projects open on the "Follow the chords" scale style.
    project.options = { scaleStyle: 'follow' }
    project.songs = createDefaultSongs()
    return project
}


/**
 * Build a list of candidate chord configs from a list
 * of chords. Uses Tonal detection to set the config 'name', 'chord' and
 * 'symbols'. Scales are assigned and config is expanded into notes.
 *
 * @param {Array<Chord>} chords array of notes as strings incl. octave
 * @returns {Array<ChordConfig>} array of fully expanded configs
 */
export function _buildCandidateChordConfigs(chords) {

    /** @type {Array<ChordConfig>} */
    let chordConfigCandidates = []

    let numAllocated = 0
    let i = 0

    for (let chordNotes of chords) {
        i++

        /** @type {ChordConfig} */
        let chordConfig = {}

        chordConfig.chordNotes = chordNotes
        const bassNote = undefined // no need to set this because all the notes are in chordNotes
        const succeeded = detectChordAndScalesFromChordNotes(chordConfig, chordNotes, bassNote, `Chord ${i} from midi`)
        if (!succeeded)
            continue

        chordConfig.id = numAllocated

        // Doesn't hurt to expand chord config here
        expandChordConfig(chordConfig)

        chordConfigCandidates.push(chordConfig)
        numAllocated++
    }

    return chordConfigCandidates
}
