// @ts-check

/**
 * @module lib/pattern-write-guard
 * @desc Guards for writing the chord sequencer panel back into the project.
 *
 * A stored sequence was once wiped by saving an empty panel over it (the save
 * raced ahead of the load, so the widget still had its virgin state). The
 * autosave then preserved the damage across refreshes. These small pure
 * helpers make that class of data loss impossible and are unit tested.
 */

/**
 * Whether stored MML text carries any sounded notes. The widget's
 * `getMMLString()` emits only `t` (tempo), `o` (octave), `l` (length), `r`
 * (rests), `&` ties and digits for an empty sequence, so any `a`–`g` letter
 * means a real note. An all-rest pattern counts as empty, which is the safe
 * choice: there is nothing audible to lose.
 * @param {unknown} mml
 * @returns {boolean}
 */
export function storedMmlHasNotes(mml) {
    return typeof mml === 'string' && /[a-g]/i.test(mml)
}

/**
 * Whether a panel write-back must be blocked to protect the stored sequence.
 * Blocks only the dangerous case: the panel is empty while the stored entry
 * still has notes, and the emptiness did not come from the user (an explicit
 * Clear action or deleting every note by hand, which reports a zero edit
 * count). All other saves pass through untouched.
 * @param {{ panelNoteCount: number, storedMml: unknown, explicitClear: boolean, lastUserEditCount: number|null }} state
 * @returns {boolean} true when the write must be skipped
 */
export function shouldPreserveStoredPattern({ panelNoteCount, storedMml, explicitClear, lastUserEditCount }) {
    if (explicitClear)
        return false
    if (panelNoteCount !== 0)
        return false
    if (!storedMmlHasNotes(storedMml))
        return false
    // The user deleting every note by hand reports a zero edit count, which is
    // deliberate and must still save. Any other route to an empty panel (a
    // load that has not populated yet, an overlapping switch) is an accident.
    return lastUserEditCount !== 0
}

/**
 * A serial queue for async panel loads and their saves, so a save can never
 * catch a mid-load empty panel. Enqueued work runs strictly one at a time in
 * the order it was added; a rejection is reported and swallowed so later work
 * still runs.
 * @returns {(work: () => Promise<unknown>) => Promise<unknown>} enqueue function
 */
export function createSerialQueue() {
    /** @type {Promise<unknown>} */
    let tail = Promise.resolve()
    return (work) => {
        const run = tail.then(work)
        tail = run.catch((error) => {
            console.error('Sequencer queued work failed:', error)
        })
        return run
    }
}
