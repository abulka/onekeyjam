// @ts-check
import { globals } from './globals.js'
import { stringify } from './prettyjson.js'

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

export function getProjectForPersistence(project, slim = true, meta = true) {
    const _project = JSON.parse(JSON.stringify(project))  // clone

    if (!meta)
        delete _project.meta

    if (slim) {
        // remove all scale notes from chord configs - these can be regenerated
        for (let key in _project.chords) {
            delete _project.chords[key].scale1Notes
            delete _project.chords[key].scale2Notes
            delete _project.chords[key].scale3Notes
            delete _project.chords[key].scaleNotesOfChord
            if (!_project.chords[key].symbols)
                delete _project.chords[key].symbols

        }
    }

    return stringify(_project)
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
