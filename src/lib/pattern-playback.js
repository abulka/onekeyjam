// @ts-check
import { Note } from './midi/webmidi.js'
import { Note as TonalNote } from '@tonaljs/tonal'
import { globals } from './globals.js'
import { indexToNote } from './note-tools.js'
import { audioContext } from './audio/general-midi.js'
import { onNoteOnSequenced } from './midi/wire-events.js'
import { clearPendingChordState } from './midi/play-chord.js'
import { broadcastLiveNote } from './midi/audition-note.js'
import { recordBackgroundNoteOn, recordBackgroundNoteOff } from './midi/background-recorder.js'
import { rowToTakeNotes } from './sequencer-notes.js'

// Kept here so existing importers keep working; the implementation lives in
// sequencer-notes.js so the recorder can use it without an import cycle.
export { rowToTakeNotes }

/**
 * @module lib/pattern-playback
 * @desc The pattern sequencer's per-note callback and its timers, shared by
 * the on-screen Sequencer and the headless player used from other pages. A
 * pattern note is a trigger row: a chord-trigger row plays its chord (and
 * drives the scale), anything else plays a single note.
 */

/** Pending visual and deferred-state timers for the current playback. */
let visualTimers = []

export function clearVisualTimers() {
    for (const id of visualTimers)
        clearTimeout(id)
    visualTimers = []
}

// Light a note on the main keyboard and the strips when it is due, rather than
// when the widget's preload calls us ahead of time.
export function scheduleLiveNote(midi, startSec, endSec) {
    if (typeof midi !== 'number' || !audioContext)
        return
    const now = audioContext.currentTime
    const onDelay = Math.max(0, (startSec - now) * 1000)
    const offDelay = Math.max(onDelay + 20, (endSec - now) * 1000)
    visualTimers.push(setTimeout(() => broadcastLiveNote(midi, true, 'pattern'), onDelay))
    visualTimers.push(setTimeout(() => broadcastLiveNote(midi, false, 'pattern'), offDelay))
}

/** Run a note-on without letting the live take capture the pattern. The
 * hidden background buffer is fed separately (see capturePatternRowToBackground),
 * so Flashback Capture still recovers what was heard. */
function runSuppressed(fn) {
    const wasSuppressed = globals.recording.suppressCapture
    globals.recording.suppressCapture = true
    try {
        fn()
    }
    finally {
        globals.recording.suppressCapture = wasSuppressed
    }
}

export function resetLiveCounts() {
    globals.recording.live.chords = 0
    globals.recording.live.jam = 0
}

/** Cancel the pattern's pending visual and deferred-state timers. */
export function clearPatternTimers() {
    clearVisualTimers()
    clearPendingChordState()
}

/**
 * Write a sounded pattern row into the hidden background buffer, so Flashback
 * Capture recovers exactly the chords that were heard and nothing more. The
 * widget calls us ahead of time, so the events are stamped with when the notes
 * actually sound: the audio offset is mapped onto the background's wall clock.
 * This deliberately bypasses the live-take suppression above; during recording
 * the live take still merges the loop on stop as before.
 * @param {number} row widget row that sounded
 * @param {number} startSec audio time the note sounds
 * @param {number} endSec audio time the note ends
 */
function capturePatternRowToBackground(row, startSec, endSec) {
    const expansions = rowToTakeNotes(row)
    if (expansions.length === 0)
        return
    // Without an audio clock (only in tests) the note times are already wall
    // clock times, so they are used as they are.
    const hasAudioClock = audioContext && typeof audioContext.currentTime === 'number'
    const wallNow = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now() / 1000
        : Date.now() / 1000
    const rawEnd = typeof endSec === 'number' ? endSec : startSec
    const onAt = hasAudioClock ? wallNow + Math.max(0, startSec - audioContext.currentTime) : startSec
    const offAt = hasAudioClock
        ? wallNow + Math.max(0, rawEnd - audioContext.currentTime)
        : Math.max(rawEnd, startSec)
    for (const expansion of expansions) {
        if (!expansion || typeof expansion.midi !== 'number')
            continue
        const name = TonalNote.fromMidi(expansion.midi)
        if (!name)
            continue
        const playedName = typeof expansion.playedMidi === 'number'
            ? TonalNote.fromMidi(expansion.playedMidi)
            : undefined
        recordBackgroundNoteOn('chords', name, globals.fixedNoteVelocity, playedName ?? undefined, onAt, expansion.role)
        recordBackgroundNoteOff('chords', name, Math.max(offAt, onAt), playedName ?? undefined)
    }
}

// Milliseconds until the note's sound time, so a transpose (or any map
// change) made during the widget's ~1s preload still affects the upcoming
// chord. Without an audio clock (notably in tests) there is no preload, so
// the note plays immediately as before.
function soundDelayMs(when) {
    if (!audioContext || typeof audioContext.currentTime !== 'number' || typeof when !== 'number')
        return 0
    return Math.max(0, (when - audioContext.currentTime) * 1000)
}

// One note from the widget's play loop. The widget calls this ahead of time
// (its ~1s preload) with the note's real time in `options.t`, so anything that
// must line up with the sound is scheduled for `options.t` rather than run now.
export function patternOnNote(options) {
    // options: {t: note on time, g: note off time, n: note number}
    const allowedNote = indexToNote(options.n - 60, globals.keyboard.lhTriggerOctave)

    // Light the played key on the main keyboard and the strips, in time.
    scheduleLiveNote(TonalNote.midi(allowedNote), options.t, options.g)

    const delayMs = soundDelayMs(options.t)
    const play = () => {
        // Re-evaluate the trigger row at sound time: the row itself is fixed,
        // but the map it resolves through may have been transposed (or the
        // chord-trigger switch toggled) during the preload window.
        const triggerNote = indexToNote(options.n - 60, globals.keyboard.lhTriggerOctave)
        const event = {
            note: new Note(triggerNote, { attack: globals.fixedNoteVelocity }),
            duration: options.g - options.t,
            when: options.t,
        }
        const trigger = globals.enableLhChordTriggers && (triggerNote in globals.chordTriggerMap)
        if (trigger) {
            // Count this chord for the Record section's live "Chords" readout
            // (it is merged into the take on stop).
            if (rowToTakeNotes(options.n).length > 0)
                globals.recording.live.chords += 1
            // Both the chord audio and the scale/chord state now read the
            // current map at sound time, so a transpose made during the
            // preload window retunes this chord instead of the one after it.
            // playChord's own deferStateToWhen stays as a safety net; with the
            // note fired at sound time its remaining delay is near zero.
            runSuppressed(() => onNoteOnSequenced(event))
            capturePatternRowToBackground(options.n, options.t, options.g)
            return
        }
        // A single note (an unassigned trigger row): play it at its real time.
        globals.recording.live.jam += 1
        capturePatternRowToBackground(options.n, options.t, options.g)
        runSuppressed(() => onNoteOnSequenced(event))
    }
    if (delayMs > 8)
        visualTimers.push(setTimeout(play, delayMs))
    else
        play()
}
