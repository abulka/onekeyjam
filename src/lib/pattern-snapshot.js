// @ts-check
import { audioContext } from './audio/general-midi.js'

/**
 * @module lib/pattern-snapshot
 * @desc The sequencer clock shared between the pattern sequencer and the
 * metronome.
 *
 * The on-screen Sequencer and the headless pattern player both play the same
 * loop, but only one of them runs at a time. Whichever one is active marks the
 * clock while it plays, so the metronome can click during a pattern loop as
 * well as during take playback.
 *
 * It lives in its own module so the metronome can read it without importing
 * the player (which would close an import cycle through the MIDI event wiring).
 * Pattern chords reach Flashback Capture another way: the pattern loop writes
 * each chord it sounds straight into the background buffer.
 */

/** @type {boolean} */
let playing = false
/** @type {number|null} */
let baseTime = null
let offsetSec = 0

/**
 * Mark the sequencer loop as started. Captures the audio time so the
 * metronome can line its clicks up with the start of the loop.
 * @param {number} [baseTimeOverride] explicit clock value, mainly for tests
 */
export function noteSequencerStarted(baseTimeOverride) {
    playing = true
    offsetSec = 0
    if (typeof baseTimeOverride === 'number') {
        baseTime = baseTimeOverride
        return
    }
    try {
        baseTime = audioContext && typeof audioContext.currentTime === 'number'
            ? audioContext.currentTime
            : null
    }
    catch (error) {
        baseTime = null
    }
}

/** Mark the sequencer loop as stopped. */
export function noteSequencerStopped() {
    playing = false
    baseTime = null
    offsetSec = 0
}

/**
 * The sequencer clock for the metronome. `baseTime` is the audio-context time
 * that corresponds to `offsetSec` (the loop always restarts at its beginning).
 * @returns {{ isPlaying: boolean, baseTime: number|null, offsetSec: number }}
 */
export function getSequencerClock() {
    return { isPlaying: playing, baseTime, offsetSec }
}
