// @ts-check
import { Note } from '@tonaljs/tonal'
import { globals } from '../globals.js'
import { audioContext } from '../audio/general-midi.js'
import { secondsPerTick, secondsToTicks, recordedNoteDuration } from './timing.js'

/**
 * @module lib/midi/recorder
 * @desc Captures a live performance into the two-track take held in
 * `globals.recording`. The caller passes the note names that actually
 * sounded, so chord/bass notes land on the 'chords' track and scale-filtered
 * jam notes land on the 'jam' track.
 *
 * Every function accepts an optional `now` (seconds) so the recorder can be
 * driven by a fake clock in tests. In the app it reads
 * `audioContext.currentTime`.
 */

const DEFAULT_VELOCITY = 0.8

/**
 * @param {number} [now]
 * @returns {number}
 */
function getNow(now) {
    if (typeof now === 'number')
        return now
    if (audioContext && typeof audioContext.currentTime === 'number')
        return audioContext.currentTime
    if (typeof performance !== 'undefined' && typeof performance.now === 'function')
        return performance.now() / 1000
    return Date.now() / 1000
}

/**
 * Tick position relative to the start of the recording.
 * @param {number} [now]
 * @returns {number}
 */
function tickFrom(now) {
    const rec = globals.recording
    const spt = secondsPerTick(rec.bpm, rec.ppq)
    return Math.max(0, secondsToTicks(getNow(now) - rec.startedAt, spt))
}

/**
 * @param {string} noteName
 * @returns {number|undefined}
 */
function noteNameToMidi(noteName) {
    const midi = Note.midi(noteName)
    return midi == null ? undefined : midi
}

/**
 * @param {number} [velocity]
 * @returns {number}
 */
function normaliseVelocity(velocity) {
    if (typeof velocity !== 'number' || Number.isNaN(velocity))
        return DEFAULT_VELOCITY
    return Math.min(1, Math.max(0, velocity))
}

/**
 * @param {'chords'|'jam'} track
 * @param {string} noteName
 * @param {{ midi: number, velocity: number, startTick: number }} entry
 * @param {number} endTick
 */
function commit(track, noteName, entry, endTick) {
    globals.recording.take[track].push({
        midi: entry.midi,
        startTick: entry.startTick,
        durationTicks: recordedNoteDuration(entry.startTick, endTick),
        velocity: entry.velocity,
    })
}

/**
 * @param {'chords'|'jam'} track
 * @param {number} endTick
 */
function finalizeHeld(track, endTick) {
    const held = globals.recording.held[track]
    for (const noteName of Object.keys(held)) {
        commit(track, noteName, held[noteName], endTick)
        delete held[noteName]
    }
}

/**
 * Begin a new take, discarding any previous one.
 * @param {number} [now]
 */
export function startRecording(now) {
    const rec = globals.recording
    rec.take = { chords: [], jam: [] }
    rec.held = { chords: {}, jam: {} }
    rec.startedAt = getNow(now)
    rec.isRecording = true
    rec.hasTake = false
}

/**
 * Stop recording and finalise any notes still held down.
 * @param {number} [now]
 */
export function stopRecording(now) {
    const rec = globals.recording
    if (!rec.isRecording)
        return
    const endTick = tickFrom(now)
    finalizeHeld('chords', endTick)
    finalizeHeld('jam', endTick)
    rec.isRecording = false
    rec.hasTake = rec.take.chords.length > 0 || rec.take.jam.length > 0
}

/** Discard the current take and stop recording. */
export function clearTake() {
    const rec = globals.recording
    rec.isRecording = false
    rec.take = { chords: [], jam: [] }
    rec.held = { chords: {}, jam: {} }
    rec.startedAt = 0
    rec.hasTake = false
}

/**
 * @param {'chords'|'jam'} track
 * @param {string} noteName
 * @param {number} [velocity]
 * @param {number} [now]
 */
function recordNoteOn(track, noteName, velocity, now) {
    const rec = globals.recording
    if (!rec.isRecording)
        return
    const midi = noteNameToMidi(noteName)
    if (midi == null)
        return
    const startTick = tickFrom(now)
    const existing = rec.held[track][noteName]
    // Retrigger of a note that is still held: close out the previous note at
    // this point rather than silently overwriting it.
    if (existing)
        commit(track, noteName, existing, startTick)
    rec.held[track][noteName] = {
        midi,
        velocity: normaliseVelocity(velocity),
        startTick,
    }
}

/**
 * @param {'chords'|'jam'} track
 * @param {string} noteName
 * @param {number} [now]
 */
function recordNoteOff(track, noteName, now) {
    const rec = globals.recording
    if (!rec.isRecording)
        return
    const held = rec.held[track]
    const entry = held[noteName]
    if (!entry)
        return
    delete held[noteName]
    commit(track, noteName, entry, tickFrom(now))
}

/**
 * @param {string} noteName
 * @param {number} [velocity]
 * @param {number} [now]
 */
export function recordChordNoteOn(noteName, velocity, now) {
    recordNoteOn('chords', noteName, velocity, now)
}

/**
 * @param {string} noteName
 * @param {number} [now]
 */
export function recordChordNoteOff(noteName, now) {
    recordNoteOff('chords', noteName, now)
}

/**
 * @param {string} noteName
 * @param {number} [velocity]
 * @param {number} [now]
 */
export function recordJamNoteOn(noteName, velocity, now) {
    recordNoteOn('jam', noteName, velocity, now)
}

/**
 * @param {string} noteName
 * @param {number} [now]
 */
export function recordJamNoteOff(noteName, now) {
    recordNoteOff('jam', noteName, now)
}
