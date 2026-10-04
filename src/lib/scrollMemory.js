// @ts-check

/**
 * A tiny in-memory store of per-page scroll positions, used by the router's
 * scrollBehaviour so that jumping between the Edit page and the Help page with
 * the Tab key returns you to where you were reading.
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
