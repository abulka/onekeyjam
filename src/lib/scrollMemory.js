// @ts-check

/**
 * A tiny in-memory store of per-page scroll positions, used by the router's
 * scrollBehaviour so that jumping between pages with the Tab and Shift+Tab
 * shortcuts returns you to where you were.
 */

const positions = new Map()

/**
 * @param {string} path
 * @param {number} y
 */
export function rememberScroll(path, y) {
    if (typeof y === 'number' && !Number.isNaN(y))
        positions.set(path, y)
}

/** @param {string} path */
export function scrollFor(path) {
    return positions.get(path) ?? 0
}

export function clearScrollMemory() {
    positions.clear()
}
