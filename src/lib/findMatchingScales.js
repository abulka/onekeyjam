// @ts-check
import { chordSymbolToScaleName } from './chord-to-scale.js';
import { globals } from './globals.js';
import * as Tonal from '@tonaljs/tonal';
import { expandChordConfig } from './expandChordConfig.js';
import { updateProjectChordConfig } from './projectConfig';

/** @typedef {import("./typedefs").Chord} Chord */
/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").Project} Project */
/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */

/**
 * Update the scales for all chord configs in the visible globals.chordTriggerMap, and also the project.
 * @param {Project} project project
 * @param {boolean} [simple=true] pass this flag to internal call to findTop3MatchingScales()
 * @param {boolean} [updateProjectChords=false] whether to update project.chords as well as the visible globals.chordTriggerMap
 * @returns Nothing
 */
export function findMatchingScalesForProject(project, simple = true, updateProjectChords = true) {

    function chordNotesToChordSymbols(chordNotes) {
        // Converts an array of notes to an array of chord symbols
        // Returns an array of chord symbols
        const detectedChordSymbols = Tonal.Chord.detect(chordNotes);
        if (detectedChordSymbols.length === 0) {
            throw (`No chord detected for ${chordNotes}`);
        }
        return detectedChordSymbols;
    }

    const chordConfigs = Object.values(globals.chordTriggerMap);
    for (let chordConfig of chordConfigs) {
        if (!chordConfig.chordNotes)
            throw (`No chordNotes in ${JSON.stringify(chordConfig)} - chord configs should contain chordNotes`);
        const detectedChordSymbols = chordNotesToChordSymbols(chordConfig.chordNotes);
        [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3] = findTop3MatchingScales(detectedChordSymbols, simple);
        expandChordConfig(chordConfig); // convert scales into scale notes etc. in this chord triggermap chord config
        if (updateProjectChords)
            updateProjectChordConfig(chordConfig)  // update the project config too
    }
}


/**
 * Find the scales that fit with this chord
 * @param {Array<string>} detectedChordSymbols custom or Tonal symbols.
 * @param {boolean} [simple=true] if true, only the first chord symbol is used.
 * @returns {Array<string>} array of scale names viz. [scale1, scale2, scale3] incl tonic 
 * 
 * Re `simple` If true (default), only the first chord symbol is used, trying to
 * keep all scales based on the same tonic as the chord. if false, spreads the
 * scale allocations across all the chord symbols detected e.g. ['CM', 'Em#5/C']
 * will give 'C lydian', 'E harmonic minor', 'E phrygian' which confuses the UI.
 *
 * Re `detectedChordSymbols` e.g. `['Am#5', 'FM/A']`. Each chord symbol can be: 
 * - custom string scale name found in config.js e.g. `"CmScaleBlues"`
 * - string scale name known by Tonal e.g. `"c major pentatonic"`
 *
 * 
 * @example
 * const [scale1, scale2, scale3] = findTop3MatchingScales([chordSymbolInclRoot])
 * // ['G lydian', 'G major', 'G major pentatonic']
 */

export function findTop3MatchingScales(detectedChordSymbols, simple = true) {
    let scale1, scale2, scale3 = undefined;

    if (simple) // remove all the other elements from the array except the first one
        detectedChordSymbols = [detectedChordSymbols[0]];

    if (detectedChordSymbols.length == 1) {
        scale1 = chordSymbolToScaleName(detectedChordSymbols[0], 1); // first chord symbol, variation 1
        scale2 = chordSymbolToScaleName(detectedChordSymbols[0], 2); // first chord symbol, variation 2
        scale3 = chordSymbolToScaleName(detectedChordSymbols[0], 3); // first chord symbol, variation 3
    }
    else if (detectedChordSymbols.length == 2) {
        scale1 = chordSymbolToScaleName(detectedChordSymbols[0], 1); // first chord symbol, variation 1
        scale2 = chordSymbolToScaleName(detectedChordSymbols[1], 1); // second chord symbol, variation 1
        scale3 = chordSymbolToScaleName(detectedChordSymbols[1], 2); // second chord symbol, variation 2
    }
    else if (detectedChordSymbols.length >= 3) {
        scale1 = chordSymbolToScaleName(detectedChordSymbols[0], 1); // first chord symbol, variation 1
        scale2 = chordSymbolToScaleName(detectedChordSymbols[1], 1); // second chord symbol, variation 1
        scale3 = chordSymbolToScaleName(detectedChordSymbols[2], 1); // third chord symbol, variation 1
    }
    else {
        scale1 = ''
        scale2 = ''
        scale3 = ''
    }
    // console.log([scale1, scale2, scale3], 'TOP 3 SCALES');
    return [scale1, scale2, scale3];
}
