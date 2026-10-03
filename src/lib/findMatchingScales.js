// @ts-check
import { globals } from './globals.js';
import { expandChordConfig } from './expandChordConfig.js';
import { updateProjectChordConfig } from './projectConfig';
import { findTop3MatchingScales } from './scaleMatching.js';

// Re-exported so existing callers can keep importing it from here.
export { findTop3MatchingScales };

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
    const chordConfigs = Object.values(globals.chordTriggerMap);
    for (let chordConfig of chordConfigs) {
        if (!chordConfig.chordNotes)
            throw (`No chordNotes in ${JSON.stringify(chordConfig)} - chord configs should contain chordNotes`);
        const chordInfo = {
            symbol: chordConfig.chord,
            notes: chordConfig.chordNotes,
            bass: chordConfig.bass ?? chordConfig.bassNote,
            name: chordConfig.name,
        };
        [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3] = findTop3MatchingScales([], simple, chordInfo);
        expandChordConfig(chordConfig); // convert scales into scale notes etc. in this chord triggermap chord config
        if (updateProjectChords)
            updateProjectChordConfig(chordConfig)  // update the project config too
    }
}

