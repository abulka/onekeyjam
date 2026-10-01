// @ts-check
import pkg from 'lodash';
const { uniqWith, isEqual } = pkg;  // import { uniqWith, isEqual } from 'lodash';  // not node compatible
// import { ChordDetect } from "@tonaljs/tonal";  // there is error in the doco - https://github.com/tonaljs/tonal/issues/289 
// import { Chord } from "@tonaljs/tonal";  // this conflicts with my own custom Chord jsdoc type
import * as Tonal from '@tonaljs/tonal';
import { emergencyRepairProject } from './emergencyRepairProject.js';
import { removeBassSlash } from "./removeBassSlash.js";
import { expandChordConfig } from "./expandChordConfig.js"
import { findTop3MatchingScales } from './findMatchingScales';
import { createDefaultSongs } from './song';
import { createDefaultMetaProjectConfig } from './projectConfig';
import { globals } from './globals.js';

/** @typedef {import("./typedefs").Chord} Chord */
/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").Project} Project */
/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */

/**
 * @module lib/build-project
 * @desc Related to building Project objects.
*/


const debug = {
    tonal_chord_detect: false,
}


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
    project.options = {}
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


export function detectChordAndScalesFromChordNotes(chordConfig, chordNotes, bassNote, name) {
    // Fills in the chord config with the detected chord, symbols and scale info from the chordNotes
    // Avoids filling in `.name`, `.bass` or `.scale{1,2,3}` if they are already set.
    // returns true if succeeded the detection

    // Take into account the bass note when doing the detection, though sometimes this is not a
    // good thing to do.  Surface this as a granular option in the UI one day - but for now
    // we'll just ignore the bass note.
    let _chordNotes = chordNotes.slice()
    if (bassNote && false)  // TODO: make this a granular UI option instead of always false.
        _chordNotes.unshift(bassNote)

    /** @type {Array<string>} */
    const detectedChordSymbols = Tonal.Chord.detect(_chordNotes)  // e.g. ['Am#5', 'FM/A'] 

    if (detectedChordSymbols.length > 0) {
        // Chord detection worked, name the chord config entries
        chordConfig.symbols = detectedChordSymbols.toString()

        if (!chordConfig.name)
            chordConfig.name = name
        if (chordConfig.name == chordConfig.symbols)
            chordConfig.name = `Chord ${chordConfig.id}`
        chordConfig.name += ' (chord was auto detected)'

        let [symbol, bass] = removeBassSlash(detectedChordSymbols[0])
        chordConfig.chord = symbol

        if (!chordConfig.bass)
            chordConfig.bass = bass
    } else if (globals.importMidiUnrecognisedChords) {
        chordConfig.name = 'Unrecognised chord'
        chordConfig.chord = chordNotes.join()
        chordConfig.symbols = ''
        chordConfig.bass = Tonal.Note.get(chordNotes[0]).pc
        chordConfig.scale1 = chordConfig.scale2 = chordConfig.scale3 = 'C major'
        return true
    }
    else {
        // Skip chords that Tonal can't detect
        const msg = `Unknown (notes: ${chordNotes.join()}) in config ${name}`
        if (debug.tonal_chord_detect)
            console.log('Tonal cannot detect, skipping', msg)
        return false
    }

    let [scale1, scale2, scale3] = findTop3MatchingScales(detectedChordSymbols);
    chordConfig.scale1 = chordConfig.scale1 ? chordConfig.scale1 : scale1;
    chordConfig.scale2 = chordConfig.scale2 ? chordConfig.scale2 : scale2;
    chordConfig.scale3 = chordConfig.scale3 ? chordConfig.scale3 : scale3;

    return true
}