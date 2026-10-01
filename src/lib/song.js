// @ts-check

/** @typedef {import("../../src/lib/typedefs").Song} Song */
/** @typedef {import("../../src/lib/typedefs").Songs} Songs */

/**
 * @module lib/song
 * @desc Create default song structure. More to do in the future.
 */


/**
 * Create default songs for a project.
 * @returns {Songs} creates songs object with default song, for attaching to a project
 */
export function createDefaultSongs() {
    return { default: { ids: [], favourites: [], blacklist: [] } }
}