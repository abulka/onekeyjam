// @ts-check

/**
 * @module lib/id
 * @desc Chord id normalisation. Ids are numbers in the model, but static files
 * mix in numeric strings, so comparisons must go through here.
 */

/**
 * Coerce a chord id to a number when it represents one; otherwise return it
 * unchanged. Used so numeric strings from static files match numeric ids.
 * @param {number|string} id
 * @returns {number|string}
 */
export function numericId(id) {
    if (typeof id === 'number')
        return id
    const n = Number(id)
    return Number.isFinite(n) && id !== '' && id !== null ? n : id
}

/**
 * Normalise a list of ids to unique numbers, preserving order.
 * @param {Array<number|string>} list
 * @returns {Array<number>}
 */
export function uniqueNumericIds(list) {
    if (!Array.isArray(list))
        return []
    const seen = new Set()
    const result = []
    for (const raw of list) {
        const id = numericId(raw)
        if (typeof id !== 'number' || seen.has(id))
            continue
        seen.add(id)
        result.push(id)
    }
    return result
}
