// @ts-check

/**
 * @module lib/randomSong
 * @desc The pool behind the top-bar Random song dice. The dice draws from the
 * classic, rock and multi-key static collections only: progressions keep their
 * own dice, dev-only test songs are excluded, and the user's own locally saved
 * projects are never included.
 */

/**
 * @typedef {Object} SongPoolEntry
 * @property {string} name song name as listed in its collection
 * @property {'classic'|'rock'|'multi-key'} category which collection it came from
 */

/**
 * Build the dice pool, tagging each song with its collection so the caller
 * loads it with the right loader even when two collections share a song name.
 * @param {{classic?: string[], rock?: string[], multiKey?: string[]}} [collections]
 * @returns {SongPoolEntry[]}
 */
export function buildRandomSongPool({ classic = [], rock = [], multiKey = [] } = {}) {
    /** @type {SongPoolEntry[]} */
    const pool = []
    for (const name of classic ?? [])
        pool.push({ name, category: 'classic' })
    for (const name of rock ?? [])
        pool.push({ name, category: 'rock' })
    for (const name of multiKey ?? [])
        pool.push({ name, category: 'multi-key' })
    return pool
}

/**
 * Pick a random song, excluding the current one when there is more than one
 * choice so the dice always moves you. Returns null for an empty pool.
 * @param {SongPoolEntry[]} pool
 * @param {string} [currentName]
 * @returns {SongPoolEntry|null}
 */
export function pickRandomSong(pool, currentName = '') {
    if (!pool || pool.length === 0)
        return null
    const candidates = pool.length > 1
        ? pool.filter((entry) => entry.name !== currentName)
        : pool
    const choices = candidates.length > 0 ? candidates : pool
    return choices[Math.floor(Math.random() * choices.length)]
}
