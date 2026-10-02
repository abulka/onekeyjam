// @ts-check
import { Note } from '@tonaljs/tonal'
import { globals } from '../globals.js'
import { audioContext, playGmNote, stopGmNote } from '../audio/general-midi.js'
import { secondsPerTick, ticksToSeconds } from './timing.js'

/**
 * @module lib/midi/playback
 * @desc Plays back a recorded take through the in-browser General MIDI sounds,
 * with a position that can be scrubbed. The take is the same two-track data
 * that is exported: solo notes first, then chord notes.
 */

/** @type {Array<object>} */
let scheduled = []
/** @type {number|null} */
let rafId = null
/** audioContext time that corresponds to the start offset */
let playbackBase = 0
/** position (seconds) that playback started from */
let startOffsetSec = 0

/**
 * Total length of the take in seconds.
 * @param {typeof globals.recording} [rec]
 * @returns {number}
 */
export function takeDurationSec(rec = globals.recording) {
    const spt = secondsPerTick(rec.bpm, rec.ppq)
    let maxTicks = 0
    for (const note of [...rec.take.chords, ...rec.take.jam]) {
        const end = note.startTick + note.durationTicks
        if (end > maxTicks)
            maxTicks = end
    }
    return ticksToSeconds(maxTicks, spt)
}

function stopScheduled() {
    for (const noteOffInfo of scheduled) {
        try {
            stopGmNote(noteOffInfo)
        }
        catch (error) {
            // The instrument may not have finished loading; nothing to stop.
        }
    }
    scheduled = []
}

/**
 * Stop playback and cancel any scheduled notes.
 * @param {boolean} [resetPosition] move the play head back to the start
 */
export function stopPlayback(resetPosition = true) {
    if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
    }
    stopScheduled()
    globals.recording.playback.isPlaying = false
    if (resetPosition)
        globals.recording.playback.positionSec = 0
}

/**
 * @param {number} fromSec position to start from
 */
export function startPlayback(fromSec = 0) {
    const rec = globals.recording
    const ctx = audioContext
    if (!ctx)
        return

    stopPlayback(false)

    const duration = takeDurationSec(rec)
    rec.playback.durationSec = duration
    if (duration <= 0)
        return

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function')
        ctx.resume()

    const spt = secondsPerTick(rec.bpm, rec.ppq)
    const offset = Math.max(0, Math.min(fromSec, duration))
    const base = ctx.currentTime + 0.06  // small lead so the first notes are not late
    const notes = [
        ...rec.take.jam.map(note => ({ ...note, toneType: 'jam' })),
        ...rec.take.chords.map(note => ({ ...note, toneType: 'chord' })),
    ]

    for (const note of notes) {
        const startSec = ticksToSeconds(note.startTick, spt)
        const endSec = ticksToSeconds(note.startTick + note.durationTicks, spt)
        if (endSec <= offset)
            continue
        const clippedStart = Math.max(startSec, offset)
        const when = base + (clippedStart - offset)
        const noteDuration = endSec - clippedStart
        const noteOffInfo = {}
        try {
            playGmNote(Note.fromMidi(note.midi), noteOffInfo, {
                velocity: note.velocity,
                toneType: note.toneType,
                duration: noteDuration,
                when,
            })
            scheduled.push(noteOffInfo)
        }
        catch (error) {
            console.warn('playback: could not schedule note', note, error)
        }
    }

    startOffsetSec = offset
    playbackBase = ctx.currentTime
    rec.playback.positionSec = offset
    rec.playback.isPlaying = true
    rafId = requestAnimationFrame(update)
}

function update() {
    const rec = globals.recording
    const ctx = audioContext
    if (!rec.playback.isPlaying || !ctx) {
        rafId = null
        return
    }
    const position = startOffsetSec + (ctx.currentTime - playbackBase)
    if (position >= rec.playback.durationSec) {
        rec.playback.positionSec = rec.playback.durationSec
        stopPlayback(false)
        return
    }
    rec.playback.positionSec = position
    rafId = requestAnimationFrame(update)
}

/**
 * Move the play head. While playing, playback is rescheduled from the new
 * position; while stopped the position is simply updated.
 * @param {number} sec
 */
export function seekPlayback(sec) {
    const rec = globals.recording
    const clamped = Math.max(0, Math.min(sec, rec.playback.durationSec))
    if (rec.playback.isPlaying)
        startPlayback(clamped)
    else
        rec.playback.positionSec = clamped
}
