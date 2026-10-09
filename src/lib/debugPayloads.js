// @ts-check

/**
 * @module lib/debugPayloads
 * @desc Build the JSON strings the debug copy buttons put on the clipboard, so
 * a take, the grid chords and the project config can be pasted elsewhere for
 * inspection without hand-copying the screen.
 */

import { globals } from './globals.js'

/**
 * The current take as pretty JSON: tempo, resolution and both note tracks.
 * @param {typeof globals.recording} [rec]
 * @returns {string}
 */
export function takeDebugJson(rec = globals.recording) {
    return JSON.stringify({
        bpm: rec.bpm,
        ppq: rec.ppq,
        chords: rec.take.chords,
        jam: rec.take.jam,
    }, null, 2)
}

/**
 * The chords currently on the grid, in trigger order, as pretty JSON.
 * @param {Record<string, any>} [triggerMap]
 * @returns {string}
 */
export function gridChordsDebugJson(triggerMap = globals.chordTriggerMap) {
    const grid = Object.entries(triggerMap || {}).map(([trigger, config], index) => ({
        order: index,
        trigger,
        id: config ? config.id : null,
        chord: config ? config.chord : '',
        chordNotes: config ? config.chordNotes : [],
        bass: config ? config.bass : '',
        bassNote: config ? config.bassNote : '',
    }))
    return JSON.stringify(grid, null, 2)
}

/**
 * The persisted project config as pretty JSON. `getProjectConfig()` already
 * returns a pretty JSON string (the same slim shape used when saving), so it is
 * passed through rather than stringified again.
 * @returns {string}
 */
export function projectDebugJson() {
    return globals.getProjectConfig()
}
