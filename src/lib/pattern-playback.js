// @ts-check
import { Note } from './midi/webmidi.js'
import { Note as TonalNote } from '@tonaljs/tonal'
import { globals } from './globals.js'
import { indexToNote } from './note-tools.js'
import { audioContext } from './audio/general-midi.js'
import { onNoteOnSequenced } from './midi/wire-events.js'
import { clearPendingChordState } from './midi/play-chord.js'
import { broadcastLiveNote } from './midi/audition-note.js'

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

/** Run a note-on without letting the recorder capture the pattern. */
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

// Expand a pattern row into the notes it should sound in the take: a chord
// trigger becomes its chord notes (and bass), anything else a single raw note.
// `playedMidi` is the trigger key, matching live chord recording.
export function rowToTakeNotes(row) {
    const triggerNote = indexToNote(row - 60, globals.keyboard.lhTriggerOctave)
    const triggerMidi = TonalNote.midi(triggerNote)
    const config = globals.chordTriggerMap[triggerNote]
    if (!config)
        return typeof triggerMidi === 'number' ? [{ midi: triggerMidi, playedMidi: triggerMidi }] : []

    const out = []
    const playedMidi = typeof triggerMidi === 'number' ? triggerMidi : undefined
    if (!globals.playBassOnly) {
        for (const name of config.chordNotes || []) {
            if (!globals.playChordBass && name === config.bassNote)
                continue
            const midi = TonalNote.midi(name)
            if (typeof midi === 'number')
                out.push({ midi, playedMidi: playedMidi ?? midi })
        }
    }
    if (!globals.playChordOnly && config.bassNote) {
        const midi = TonalNote.midi(config.bassNote)
        if (typeof midi === 'number')
            out.push({ midi, playedMidi: playedMidi ?? midi })
    }
    return out
}

// One note from the widget's play loop. The widget calls this ahead of time
// (its ~1s preload) with the note's real time in `options.t`, so anything that
// must line up with the sound is scheduled for `options.t` rather than run now.
export function patternOnNote(options) {
    // options: {t: note on time, g: note off time, n: note number}
    const allowedNote = indexToNote(options.n - 60, globals.keyboard.lhTriggerOctave)
    const simulatedEvent = {
        note: new Note(allowedNote, { attack: 0.5 }),
        duration: options.g - options.t,
        when: options.t,
    }

    // Light the played key on the main keyboard and the strips, in time.
    scheduleLiveNote(TonalNote.midi(allowedNote), options.t, options.g)

    const isTrigger = globals.enableLhChordTriggers && (allowedNote in globals.chordTriggerMap)
    if (isTrigger) {
        // Count this chord for the Record section's live "Chords" readout (it is
        // merged into the take on stop).
        if (rowToTakeNotes(options.n).length > 0)
            globals.recording.live.chords += 1
        // playChord schedules the chord audio for `when` now and defers the
        // scale/chord state to `when` too (see deferStateToWhen).
        runSuppressed(() => onNoteOnSequenced(simulatedEvent))
        return
    }

    // A single note (an unassigned trigger row): play it at its real time.
    globals.recording.live.jam += 1
    const delayMs = Math.max(0, (options.t - audioContext.currentTime) * 1000)
    const play = () => runSuppressed(() => onNoteOnSequenced(simulatedEvent))
    if (delayMs > 8)
        visualTimers.push(setTimeout(play, delayMs))
    else
        play()
}
