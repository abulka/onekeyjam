// @ts-check
import { createDefaultSongs } from './song';
import { createDefaultMetaProjectConfig } from './projectConfig';
import { expandChordConfig } from './expandChordConfig.js';


/** @typedef {import("../../src/lib/typedefs").Project} Project */

/**
 * Repair a project object so that it has all the properties it should. In place repair.
 * @param {Project} project 
 * @returns Nothing
 */
export function emergencyRepairProject(project) {
    if (!project.meta)
        project.meta = createDefaultMetaProjectConfig()

    if (!project.name)
        project.name = "";

    if (!project.options)
        project.options = {}

    if (project.chords === undefined)
        project.chords = [];

    if (project.songs === undefined)
        project.songs = createDefaultSongs()

    expandProjectChordConfigs(project); // in place

}

function expandProjectChordConfigs(project) {
    const reallocateIds = (project.chords.length > 0 && project.chords[0].id === undefined)
    let id = 0
    for (let chordConfig of project.chords) {
        if (reallocateIds)
            chordConfig.id = id
        expandChordConfig(chordConfig) // in place
        id++
    }
}
