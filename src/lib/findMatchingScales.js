// @ts-check
import { globals } from './globals.js';
import { expandChordConfig } from './expandChordConfig.js';
import { updateProjectChordConfig } from './projectConfig';
import { findTop3MatchingScales } from './scaleMatching.js';
import { resolveChordKey } from './projectKey.js';

// Re-exported so existing callers can keep importing it from here.
export { findTop3MatchingScales };

/** @typedef {import("./typedefs").Chord} Chord */
/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").Project} Project */
/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */

/** @param {ChordConfig} chordConfig */
function chordInfoForConfig(chordConfig) {
    if (!chordConfig.chordNotes)
        throw (`No chordNotes in ${JSON.stringify(chordConfig)} - chord configs should contain chordNotes`);
    return {
        symbol: chordConfig.chord,
        notes: chordConfig.chordNotes,
        bass: chordConfig.bass ?? chordConfig.bassNote,
        name: chordConfig.name,
    };
}

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
        const key = resolveChordKey(project, chordConfig);
        [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3] = findTop3MatchingScales([], simple, chordInfoForConfig(chordConfig), key);
        expandChordConfig(chordConfig); // convert scales into scale notes etc. in this chord triggermap chord config
        if (updateProjectChords)
            updateProjectChordConfig(chordConfig)  // update the project config too
    }
}

/**
 * Re-rank the scales of every chord in the project (not only the chords that
 * are currently allocated to trigger notes) in the project key and colour, then
 * sync any allocated trigger-map entries so the UI and the jam mapping use the
 * new scales. Used when the project key or colour changes.
 * @param {Project} project
 * @param {boolean} [simple=true]
 */
export function findMatchingScalesForAllProjectChords(project, simple = true) {
    for (const chordConfig of project.chords) {
        const key = resolveChordKey(project, chordConfig);
        [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3] = findTop3MatchingScales([], simple, chordInfoForConfig(chordConfig), key);
        expandChordConfig(chordConfig);
    }
    syncTriggerMapScales(project);
}

/**
 * Re-rank a single chord's scales in its own key (section key, else project
 * key) and sync any allocated trigger-map entry. Used when a chord is added to
 * a key group or moved between groups, so large projects do not need a full
 * re-rank.
 * @param {Project} project
 * @param {ChordConfig} chordConfig
 */
export function reRankChordScales(project, chordConfig) {
    const key = resolveChordKey(project, chordConfig);
    [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3] = findTop3MatchingScales([], true, chordInfoForConfig(chordConfig), key);
    expandChordConfig(chordConfig);
    syncTriggerMapScales(project);
}

/** @param {Project} project */
function syncTriggerMapScales(project) {
    for (const triggerNote of Object.keys(globals.chordTriggerMap)) {
        const triggerConfig = globals.chordTriggerMap[triggerNote];
        const projectConfig = project.chords.find((chordConfig) => chordConfig.id == triggerConfig.id);
        if (!projectConfig)
            continue;
        for (const field of ['scale1', 'scale2', 'scale3', 'scale1Notes', 'scale2Notes', 'scale3Notes', 'scaleNotesOfChord'])
            triggerConfig[field] = projectConfig[field];
    }
}
