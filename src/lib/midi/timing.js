// @ts-check

/**
 * @module lib/midi/timing
 * @desc Pure timing maths for the live MIDI recorder. Kept free of browser
 * state so it can be unit tested.
 */

/**
 * Seconds per MIDI tick.
 * @param {number} bpm
 * @param {number} ppq pulses (ticks) per quarter note
 * @returns {number}
 */
export function secondsPerTick(bpm, ppq) {
    if (!bpm || !ppq)
        return 0
    return 60 / bpm / ppq
}

/**
 * @param {number} seconds
 * @param {number} spt seconds per tick
 * @returns {number}
 */
export function secondsToTicks(seconds, spt) {
    if (!spt)
        return 0
    return seconds / spt
}

/**
 * @param {number} ticks
 * @param {number} spt seconds per tick
 * @returns {number}
 */
export function ticksToSeconds(ticks, spt) {
    return ticks * spt
}

/**
 * Snap a tick position to a grid. A grid of 0 or less disables quantisation.
 * @param {number} tick
 * @param {number} grid grid spacing in ticks
 * @returns {number}
 */
export function quantizeTick(tick, grid) {
    if (grid <= 0)
        return tick
    return Math.round(tick / grid) * grid
}

/**
 * Duration in ticks for a committed note. A note never resolves to less than
 * one tick, otherwise the MIDI file would contain a zero-length note.
 * @param {number} startTick
 * @param {number} endTick
 * @returns {number}
 */
export function recordedNoteDuration(startTick, endTick) {
    return Math.max(1, endTick - startTick)
}
