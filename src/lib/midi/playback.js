// @ts-check
import { Note } from '@tonaljs/tonal'
import { globals } from '../globals.js'
import { audioContext, playGmNote, stopGmNote } from '../audio/general-midi.js'
import { secondsPerTick, ticksToSeconds } from './timing.js'
import { Note as WebMidiNote } from './webmidi.js'

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
/** MIDI numbers whose keys are currently lit during playback */
let litNotes = new Set()

/**
 * @param {typeof globals.recording.take} take
 * @param {number} positionSec
 * @returns {Iterable<object>} notes whose span contains the position
 */
function notesSpanning(take, positionSec) {
    const rec = globals.recording
    const spt = secondsPerTick(rec.bpm, rec.ppq)
    return [...take.chords, ...take.jam].filter(note => {
        const startSec = ticksToSeconds(note.startTick, spt)
        const endSec = ticksToSeconds(note.startTick + note.durationTicks, spt)
        return positionSec >= startSec && positionSec < endSec
    })
}

/**
 * MIDI numbers of the notes that sound at a position.
 * @param {typeof globals.recording.take} take
 * @param {number} positionSec
 * @returns {Set<number>}
 */
export function soundingNotesAt(take, positionSec) {
    const active = new Set()
    for (const note of notesSpanning(take, positionSec)) {
        if (typeof note.midi === 'number')
            active.add(note.midi)
    }
    return active
}

/**
 * MIDI numbers of the keys that were played at a position. Notes recorded
 * before played keys were captured have no `playedMidi` and contribute nothing.
 * @param {typeof globals.recording.take} take
 * @param {number} positionSec
 * @returns {Set<number>}
 */
export function playedNotesAt(take, positionSec) {
    const active = new Set()
    for (const note of notesSpanning(take, positionSec)) {
        if (typeof note.playedMidi === 'number')
            active.add(note.playedMidi)
    }
    return active
}

/**
 * MIDI numbers that should be lit at a given position, for a highlight mode.
 * 'sounding' lights the notes that sound, 'played' the keys that were pressed,
 * and 'both' the union.
 * @param {typeof globals.recording.take} take
 * @param {number} positionSec
 * @param {string} [mode]
 * @returns {Set<number>}
 */
export function activeNotesAt(take, positionSec, mode = 'sounding') {
    if (mode === 'played')
        return playedNotesAt(take, positionSec)
    if (mode === 'both') {
        const active = soundingNotesAt(take, positionSec)
        for (const midi of playedNotesAt(take, positionSec))
            active.add(midi)
        return active
    }
    return soundingNotesAt(take, positionSec)
}

/**
 * @param {number} midi
 * @param {boolean} state
 */
function broadcastLiveNote(midi, state) {
    document.broadcastEvent('live-note', {
        state,
        note: new WebMidiNote(midi),
        source: 'playback',
    })
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {boolean}
 */
function sameKeys(a, b) {
    if (a.length !== b.length)
        return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false
    }
    return true
}

/**
 * Publish the played keys so the overlay can tint them. Only updates the
 * reactive globals when the set actually changes, to avoid needless redraws.
 * @param {Set<number>} played
 */
function publishPlayedKeys(played) {
    const next = [...played].sort((x, y) => x - y)
    const current = globals.recording.playback.playedKeys
    if (!sameKeys(current, next))
        globals.recording.playback.playedKeys = next
}

/**
 * Update the keyboard visuals for the given playback position. The sounding
 * notes light red through the widget (via `live-note`); the played keys are
 * published for the blue overlay. Only differences are broadcast, so this is
 * cheap to call every frame.
 * @param {number} positionSec
 */
export function syncVisuals(positionSec) {
    const take = globals.recording.take
    const mode = globals.recording.playback.highlightMode

    // Red highlight: the sounding notes, except in 'played' mode.
    const red = mode === 'played' ? new Set() : soundingNotesAt(take, positionSec)
    for (const midi of litNotes) {
        if (!red.has(midi)) {
            broadcastLiveNote(midi, false)
            litNotes.delete(midi)
        }
    }
    for (const midi of red) {
        if (!litNotes.has(midi)) {
            broadcastLiveNote(midi, true)
            litNotes.add(midi)
        }
    }

    // Blue overlay: the played keys, in 'played' and 'both' modes.
    publishPlayedKeys(mode === 'played' || mode === 'both'
        ? playedNotesAt(take, positionSec)
        : new Set())
}

function clearVisuals() {
    for (const midi of litNotes)
        broadcastLiveNote(midi, false)
    litNotes = new Set()
    publishPlayedKeys(new Set())
}

/**
 * Preview the keys at an arbitrary position without touching the audio. Used
 * while the user drags the scrubber, so notes are visible during the drag
 * rather than only when it is released.
 * @param {number} positionSec
 */
export function previewVisuals(positionSec) {
    globals.recording.playback.positionSec = positionSec
    syncVisuals(positionSec)
}

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
    clearVisuals()
    globals.recording.playback.isPlaying = false
    globals.recording.playback.isScrubbing = false
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
    // While dragging the scrubber the preview positions the keys, not playback.
    if (!rec.playback.isScrubbing)
        syncVisuals(position)
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
    else {
        rec.playback.positionSec = clamped
        // Preview the notes at the scrubbed position while paused.
        syncVisuals(clamped)
    }
}
