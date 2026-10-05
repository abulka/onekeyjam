// @ts-check
import { Note } from '@tonaljs/tonal'
import { globals } from '../globals.js'
import { secondsPerTick, secondsToTicks, recordedNoteDuration } from './timing.js'

/**
 * @module lib/midi/background-recorder
 * @desc A hidden, always-on note buffer that keeps the last few minutes of
 * playing so the user can recover a take they forgot to record. It mirrors the
 * live recorder's note funnel but stores raw events on a monotonic clock in a
 * plain module-local array, so it never feeds Vue's reactive system.
 *
 * `captureRecentTake()` turns the buffered window into the same two-track note
 * shape the live recorder produces, ready to be played back or exported.
 */

/** How far back the buffer keeps notes by default, in seconds. */
export const DEFAULT_BACKGROUND_WINDOW_SEC = 120

/** Window lengths offered in the Settings UI, in seconds. */
export const BACKGROUND_WINDOW_OPTIONS = [30, 60, 120, 300, 600]

/** Safety cap on buffered events, so a very long session cannot grow forever. */
const MAX_EVENTS = 20000

/**
 * @typedef {Object} BackgroundEvent
 * @property {'chords'|'jam'} track
 * @property {number} midi
 * @property {number} [playedMidi]
 * @property {number} velocity
 * @property {number} startSec
 * @property {number|null} endSec  null while the note is still held
 */

/** @type {BackgroundEvent[]} */
let events = []
/** @type {Map<string, BackgroundEvent>} */
let held = new Map()

/**
 * Monotonic clock for the buffer, in seconds. This does not use the audio
 * context, so a suspended context cannot collapse the captured timings.
 * @returns {number}
 */
function getNow() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function')
        return performance.now() / 1000
    return Date.now() / 1000
}

/**
 * @param {number|undefined} now
 * @returns {number}
 */
function resolveNow(now) {
    return typeof now === 'number' ? now : getNow()
}

/**
 * @param {string} track
 * @param {string} noteName
 * @returns {string}
 */
function heldKey(track, noteName) {
    return `${track}:${noteName}`
}

/**
 * @param {number} velocity
 * @returns {number}
 */
function normaliseVelocity(velocity) {
    if (typeof velocity !== 'number' || Number.isNaN(velocity))
        return 0.8
    return Math.min(1, Math.max(0, velocity))
}

/**
 * The window length currently configured, falling back to the default.
 * @returns {number}
 */
export function backgroundWindowSec() {
    const configured = globals.recording && globals.recording.background
        ? globals.recording.background.windowSec
        : undefined
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_BACKGROUND_WINDOW_SEC
}

/**
 * Whether background capture is switched on.
 * @returns {boolean}
 */
export function backgroundEnabled() {
    return !!(globals.recording && globals.recording.background && globals.recording.background.enabled)
}

/**
 * Drop buffered events that have fallen out of the window. Open notes are kept,
 * since they still end in the future, and the hard cap only ever removes closed
 * notes from the front.
 * @param {number} now
 */
function prune(now) {
    const cutoff = now - backgroundWindowSec()
    events = events.filter(event => (event.endSec === null ? event.startSec : event.endSec) > cutoff)

    if (events.length > MAX_EVENTS) {
        const keep = new Set(events.slice(events.length - MAX_EVENTS))
        events = events.filter(event => keep.has(event))
        for (const [key, event] of held) {
            if (!keep.has(event))
                held.delete(key)
        }
    }
}

/** Publish a small reactive summary for the UI without exposing the buffer. */
function publishSummary() {
    const background = globals.recording && globals.recording.background
    if (!background)
        return
    background.noteCount = events.length
    background.available = background.enabled !== false && events.length > 0
}

/**
 * Buffer a note-on. A retrigger of a note that is still held closes the earlier
 * one first, matching the live recorder.
 * @param {'chords'|'jam'} track
 * @param {string} noteName
 * @param {number} [velocity]
 * @param {string} [playedNote] the key that was pressed, when it differs
 * @param {number} [now]
 */
export function recordBackgroundNoteOn(track, noteName, velocity, playedNote, now) {
    if (!backgroundEnabled())
        return
    const midi = Note.midi(noteName)
    if (midi == null)
        return
    const at = resolveNow(now)

    const key = heldKey(track, noteName)
    const existing = held.get(key)
    if (existing)
        existing.endSec = at

    /** @type {BackgroundEvent} */
    const event = {
        track,
        midi,
        velocity: normaliseVelocity(velocity),
        startSec: at,
        endSec: null,
    }
    const playedMidi = playedNote == null ? undefined : Note.midi(playedNote)
    if (playedMidi != null)
        event.playedMidi = playedMidi

    events.push(event)
    held.set(key, event)
    prune(at)
    publishSummary()
}

/**
 * Buffer a note-off.
 * @param {'chords'|'jam'} track
 * @param {string} noteName
 * @param {number} [now]
 */
export function recordBackgroundNoteOff(track, noteName, now) {
    if (!backgroundEnabled())
        return
    const at = resolveNow(now)
    const key = heldKey(track, noteName)
    const event = held.get(key)
    if (event) {
        event.endSec = at
        held.delete(key)
    }
    prune(at)
    publishSummary()
}

/**
 * Number of events currently buffered.
 * @returns {number}
 */
export function backgroundNoteCount() {
    return events.length
}

/** Forget the buffered notes. */
export function clearBackgroundCapture() {
    events = []
    held = new Map()
    publishSummary()
}

/**
 * Turn the buffered window into two-track take notes.
 *
 * Notes that started before the window are clipped to its start, still-held
 * notes are closed at `now`, and leading silence is trimmed so tick 0 is the
 * first captured note. Returns null when there is nothing to recover.
 *
 * @param {{ windowSec?: number, now?: number, bpm?: number, ppq?: number }} [options]
 * @returns {{ chords: Array<object>, jam: Array<object> }|null}
 */
export function captureBufferedTake({ windowSec, now, bpm, ppq } = {}) {
    if (!backgroundEnabled() && events.length === 0)
        return null
    const at = resolveNow(now)
    const span = Number.isFinite(windowSec) && windowSec > 0 ? windowSec : backgroundWindowSec()
    const windowStart = at - span

    const rec = globals.recording
    const useBpm = Number.isFinite(bpm) ? bpm : rec.bpm
    const usePpq = Number.isFinite(ppq) ? ppq : rec.ppq
    const spt = secondsPerTick(useBpm, usePpq)

    const windowed = []
    for (const event of events) {
        const end = event.endSec === null ? at : event.endSec
        if (end <= windowStart)
            continue
        const start = Math.max(event.startSec, windowStart)
        // Keep even a zero-length note; recordedNoteDuration gives it the same
        // one-tick minimum the live recorder uses.
        const clippedEnd = Math.max(Math.min(end, at), start)
        windowed.push({ event, start, end: clippedEnd })
    }
    if (windowed.length === 0)
        return null

    let originSec = Infinity
    for (const item of windowed) {
        if (item.start < originSec)
            originSec = item.start
    }

    /** @type {{ chords: Array<object>, jam: Array<object> }} */
    const take = { chords: [], jam: [] }
    for (const { event, start, end } of windowed) {
        const startTick = secondsToTicks(start - originSec, spt)
        const endTick = secondsToTicks(end - originSec, spt)
        /** @type {{ midi: number, startTick: number, durationTicks: number, velocity: number, playedMidi?: number }} */
        const note = {
            midi: event.midi,
            startTick,
            durationTicks: recordedNoteDuration(startTick, endTick),
            velocity: event.velocity,
        }
        if (typeof event.playedMidi === 'number')
            note.playedMidi = event.playedMidi
        take[event.track].push(note)
    }
    return take
}
