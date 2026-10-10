// @ts-check

/**
 * @module lib/keyGroupEditing
 * @desc Pure helpers for the Key Groups editor. Kept out of the component so
 * the copy-down rule (which chords a "↓ all" action touches) can be unit
 * tested. See doco/MULTI-KEY.md.
 */

/**
 * The chords a "copy key down" action should apply to: the clicked row and the
 * rows after it, stopping before the first locked row. A locked row is a
 * boundary and is never overwritten. The clicked row itself is assumed to be
 * unlocked (the UI disables the button on a locked row).
 * @param {Array<{chordConfig: import("./typedefs").ChordConfig, locked?: boolean}>} rows
 * @param {number} startIndex
 * @returns {Array<import("./typedefs").ChordConfig>}
 */
export function copyDownTargets(rows, startIndex) {
    /** @type {Array<import("./typedefs").ChordConfig>} */
    const targets = [];
    if (!Array.isArray(rows) || startIndex < 0 || startIndex >= rows.length)
        return targets;
    for (let i = startIndex; i < rows.length; i++) {
        if (i > startIndex && rows[i].locked)
            break;
        targets.push(rows[i].chordConfig);
    }
    return targets;
}
