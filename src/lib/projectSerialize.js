// @ts-check
import { stringify } from './prettyjson.js'

/**
 * @module lib/projectSerialize
 * @desc Pure project serialisation, kept free of the `globals` singleton so it
 * can be imported by `globals.js` without forming an import cycle with
 * `projectConfig.js`.
 */

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
