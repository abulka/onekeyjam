// @ts-check
import { Note } from '@tonaljs/tonal'
import { globals } from '../globals.js'
import { audioContext } from '../audio/general-midi.js'
import { secondsPerTick, secondsToTicks, recordedNoteDuration } from './timing.js'
import { stopPlayback, takeDurationSec } from './playback.js'
import { recordBackgroundNoteOn, recordBackgroundNoteOff, captureBufferedTake, clearBackgroundCapture } from './background-recorder.js'

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
const STORAGE_KEY = 'onekeyjam.latestTake'

/**
 * The browser's localStorage, or null when it is unavailable (for example in
 * some test environments).
 * @returns {Storage|null}
 */
function defaultStorage() {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage
    }
    catch (error) {
        return null
    }
}

/**
 * @param {unknown} notes
 * @returns {Array<{ midi: number, startTick: number, durationTicks: number, velocity: number, playedMidi?: number }>}
 */
function sanitizeNotes(notes) {
    if (!Array.isArray(notes))
        return []
    return notes
        .filter(note => note
            && typeof note.midi === 'number'
            && typeof note.startTick === 'number'
            && typeof note.durationTicks === 'number'
            && typeof note.velocity === 'number')
        .map(note => {
            /** @type {{ midi: number, startTick: number, durationTicks: number, velocity: number, playedMidi?: number }} */
            const clean = {
                midi: note.midi,
                startTick: note.startTick,
                durationTicks: note.durationTicks,
                velocity: note.velocity,
            }
            if (typeof note.playedMidi === 'number')
                clean.playedMidi = note.playedMidi
            return clean
        })
}

/**
 * Save the current take so a browser refresh does not lose it. Best effort:
 * storage may be unavailable or full.
 * @param {Storage|null} [storage]
 */
export function persistTake(storage = defaultStorage()) {
    if (!storage)
        return
    const rec = globals.recording
    try {
        if (!rec.hasTake) {
            storage.removeItem(STORAGE_KEY)
            return
        }
        storage.setItem(STORAGE_KEY, JSON.stringify({
            version: 1,
            bpm: rec.bpm,
            ppq: rec.ppq,
            chords: rec.take.chords,
            jam: rec.take.jam,
        }))
    }
    catch (error) {
        // Persistence is best effort.
    }
}

/**
 * Load the last persisted take, if any, into globals.recording.
 * @param {Storage|null} [storage]
 * @returns {boolean} true when a take was restored
 */
export function restoreTake(storage = defaultStorage()) {
    if (!storage)
        return false
    let data
    try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw)
            return false
        data = JSON.parse(raw)
    }
    catch (error) {
        return false
    }
    if (!data || data.version !== 1)
        return false

    const chords = sanitizeNotes(data.chords)
    const jam = sanitizeNotes(data.jam)
    if (chords.length === 0 && jam.length === 0)
        return false

    const rec = globals.recording
    if (typeof data.bpm === 'number' && data.bpm > 0)
        rec.bpm = data.bpm
    if (typeof data.ppq === 'number' && data.ppq > 0)
        rec.ppq = data.ppq
    rec.take = { chords, jam }
    rec.held = { chords: {}, jam: {} }
    rec.isRecording = false
    rec.hasTake = true
    rec.playback.durationSec = takeDurationSec(rec)
    rec.playback.positionSec = 0
    rec.playback.isPlaying = false
    rec.playback.isScrubbing = false
    return true
}

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
 * @param {string} name
 */
function broadcast(name) {
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    if (typeof document !== 'undefined' && typeof document.broadcastEvent === 'function')
        // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
        document.broadcastEvent(name, {})
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
 * @param {{ midi: number, velocity: number, startTick: number, playedMidi?: number }} entry
 * @param {number} endTick
 */
function commit(track, noteName, entry, endTick) {
    /** @type {{ midi: number, startTick: number, durationTicks: number, velocity: number, playedMidi?: number }} */
    const note = {
        midi: entry.midi,
        startTick: entry.startTick,
        durationTicks: recordedNoteDuration(entry.startTick, endTick),
        velocity: entry.velocity,
    }
    if (typeof entry.playedMidi === 'number')
        note.playedMidi = entry.playedMidi
    globals.recording.take[track].push(note)
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
    stopPlayback(true)
    // Recording starts from a user gesture; resume the audio context so the
    // pattern loop and monitored sounds actually run.
    if (audioContext && audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
        audioContext.resume()
    const rec = globals.recording
    rec.take = { chords: [], jam: [] }
    rec.held = { chords: {}, jam: {} }
    rec.live = { chords: 0, jam: 0 }
    rec.startedAt = getNow(now)
    rec.isRecording = true
    rec.hasTake = false
    rec.lastRecordingSeconds = 0
    rec.playback.durationSec = 0
    rec.playback.positionSec = 0
    broadcast('recording-started')
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
    rec.lastRecordingSeconds = Math.max(0, getNow(now) - rec.startedAt)
    rec.hasTake = rec.take.chords.length > 0 || rec.take.jam.length > 0
    rec.playback.durationSec = takeDurationSec(rec)
    persistTake()
    broadcast('recording-stopped')
}

/** Discard the current take and stop recording. */
export function clearTake() {
    stopPlayback(true)
    const rec = globals.recording
    rec.isRecording = false
    rec.take = { chords: [], jam: [] }
    rec.held = { chords: {}, jam: {} }
    rec.live = { chords: 0, jam: 0 }
    rec.startedAt = 0
    rec.hasTake = false
    rec.playback.durationSec = 0
    rec.playback.positionSec = 0
    // Start a fresh background window from now, so a cleared take cannot be
    // resurrected by a later capture.
    clearBackgroundCapture()
    persistTake()
}

/**
 * Recover the last few minutes of playing from the hidden background buffer and
 * make it the current take. Returns a small result for the UI.
 *
 * Pattern chords are in the buffer too: the pattern loop writes each chord it
 * sounds straight into the background, so only what was actually heard comes
 * back alongside the solo.
 * @param {number} [windowSec] override the configured capture window
 * @param {number} [now] clock override, mainly for tests
 * @returns {{ ok: boolean, reason?: string, noteCount?: number, durationSec?: number }}
 */
export function captureTakeFromBackground(windowSec, now) {
    const rec = globals.recording
    if (rec.isRecording)
        return { ok: false, reason: 'recording' }
    if (!rec.background || !rec.background.enabled)
        return { ok: false, reason: 'disabled' }
    const take = captureBufferedTake({ windowSec, now })
    if (!take)
        return { ok: false, reason: 'empty' }

    stopPlayback(true)
    rec.take = take
    rec.held = { chords: {}, jam: {} }
    rec.live = { chords: 0, jam: 0 }
    rec.isRecording = false
    rec.hasTake = take.chords.length > 0 || take.jam.length > 0
    rec.lastRecordingSeconds = 0
    rec.playback.durationSec = takeDurationSec(rec)
    rec.playback.positionSec = 0
    rec.playback.isPlaying = false
    rec.playback.isScrubbing = false
    clearBackgroundCapture()
    persistTake()
    return {
        ok: true,
        noteCount: take.chords.length + take.jam.length,
        durationSec: rec.playback.durationSec,
    }
}

/**
 * Recompute the derived take state after the recording piano roll edits the
 * take directly, and save it so the change survives a refresh.
 */
export function commitTakeEdit() {
    const rec = globals.recording
    rec.hasTake = rec.take.chords.length > 0 || rec.take.jam.length > 0
    rec.playback.durationSec = takeDurationSec(rec)
    persistTake()
}

/**
 * @param {'chords'|'jam'} track
 * @param {string} noteName note that sounds
 * @param {number} [velocity]
 * @param {number} [now]
 * @param {string} [playedNote] the key that was pressed, when it differs from the sounding note
 */
function recordNoteOn(track, noteName, velocity, now, playedNote) {
    const rec = globals.recording
    if (rec.suppressCapture)
        return
    // Always feed the hidden background buffer, whether or not a take is being
    // recorded, so a forgotten performance can be recovered later.
    recordBackgroundNoteOn(track, noteName, velocity, playedNote)
    if (!rec.isRecording)
        return
    const midi = noteNameToMidi(noteName)
    if (midi == null)
        return
    const playedMidi = playedNote === undefined ? undefined : noteNameToMidi(playedNote)
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
        playedMidi,
    }
}

/**
 * @param {'chords'|'jam'} track
 * @param {string} noteName
 * @param {number} [now]
 */
function recordNoteOff(track, noteName, now) {
    const rec = globals.recording
    if (rec.suppressCapture)
        return
    recordBackgroundNoteOff(track, noteName)
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
 * @param {string} noteName note that sounds
 * @param {number} [velocity]
 * @param {{ now?: number, playedNote?: string }} [options]
 */
export function recordChordNoteOn(noteName, velocity, { now, playedNote } = {}) {
    recordNoteOn('chords', noteName, velocity, now, playedNote)
}

/**
 * @param {string} noteName
 * @param {{ now?: number }} [options]
 */
export function recordChordNoteOff(noteName, { now } = {}) {
    recordNoteOff('chords', noteName, now)
}

/**
 * @param {string} noteName note that sounds
 * @param {number} [velocity]
 * @param {{ now?: number, playedNote?: string }} [options]
 */
export function recordJamNoteOn(noteName, velocity, { now, playedNote } = {}) {
    recordNoteOn('jam', noteName, velocity, now, playedNote)
}

/**
 * @param {string} noteName
 * @param {{ now?: number }} [options]
 */
export function recordJamNoteOff(noteName, { now } = {}) {
    recordNoteOff('jam', noteName, now)
}
