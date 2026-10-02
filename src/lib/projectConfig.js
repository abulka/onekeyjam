// @ts-check
import { globals } from './globals.js'

// Re-exported so existing callers keep working.
export { getProjectForPersistence } from './projectSerialize.js'

/** @typedef {import("./typedefs").ProjectMeta} ProjectMeta */

/**
 * @module lib/projectConfig
 * @desc Project config related.
 */


/**
 * Creates a default project meta config object, with current version number
 * @returns {ProjectMeta}
 */
export function createDefaultMetaProjectConfig() {
    return {
        type: "onekeyjam",
        version: 2,
        source: "https://onekeyjam.netlify.app",
    };
}


// ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐┬ ┬┌─┐┬─┐┌┬┐  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
// │ │├─┘ ││├─┤ │ ├┤   │  ├─┤│ │├┬┘ ││  │  │ ││││├┤ ││ ┬
// └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘┴ ┴└─┘┴└──┴┘  └─┘└─┘┘└┘└  ┴└─┘


export function updateProjectChordConfig(chordConfig) {
    const projectChordConfig = findProjectConfigById(chordConfig.id)
    Object.assign(projectChordConfig, chordConfig)
}

function findProjectConfigById(id) {
    for (let chordConfig of globals.project.chords) {
        if (chordConfig.id == id)
            return chordConfig
    }
    throw ('Could not find chord config in project')
}
