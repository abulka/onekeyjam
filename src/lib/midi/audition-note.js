// @ts-check
import { Note } from '@tonaljs/tonal'
import { audioContext, playGmNote, stopGmNote } from '../audio/general-midi.js'
import { playChordNote } from './play-chord.js'
import { globals } from '../globals.js'
import { Note as WebMidiNote } from './webmidi.js'

/**
 * @module lib/midi/audition-note
 * @desc Plays notes briefly through the in-browser synth, used when a
 * piano-roll's piano strip or a note is clicked. Browsers keep the audio
 * context suspended until a user gesture, so this resumes it first. Auditions
 * play directly and never go through the recorder, so they are not captured.
 */

/**
 * Broadcast a live-note event so the main piano keyboard (and any piano-roll
 * strip overlays) light the note. `source` marks automated lights so views can
 * skip the "raw live note" readout meant for real playing.
 * @param {number} midi
 * @param {boolean} state
 * @param {string} [source]
 */
export function broadcastLiveNote(midi, state, source) {
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    if (typeof document === 'undefined' || typeof document.broadcastEvent !== 'function')
        return
    /** @type {{ state: boolean, note: object, source?: string }} */
    const detail = { state, note: new WebMidiNote(midi) }
    if (source)
        detail.source = source
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('live-note', detail)
}

/**
 * Light the note on the main piano keyboard for a moment, so an audition gives
 * visible feedback as well as sound.
 * @param {number} midi
 * @param {number} durationMs
 */
export function flashLiveNote(midi, durationMs = 350) {
    broadcastLiveNote(midi, true, 'audition')
    setTimeout(() => {
        broadcastLiveNote(midi, false, 'audition')
    }, durationMs)
}

/**
 * @param {number} midi
 * @param {number} [duration] seconds
 */
export function auditionMidiNote(midi, duration = 0.4) {
    flashLiveNote(midi)
    if (!audioContext)
        return
    if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
        audioContext.resume()
    try {
        playGmNote(Note.fromMidi(midi), {}, {
            velocity: 0.8,
            toneType: 'jam',
            duration,
            when: audioContext.currentTime + 0.001,
        })
    }
    catch (error) {
        // The soundfont instrument may not have finished loading; nothing to do.
    }
}

// Auditioning a chord uses a fixed fake trigger and the pending-note bookkeeping
// that playChordNote already maintains, but stops without playChordOff's map
// lookup (the fake trigger is not in the chord trigger map).
const AUDITION_TRIGGER = 'C21'
let chordStopTimer = null

function stopAuditionChord() {
    const chordInfos = globals.pendingChordNoteOffs[AUDITION_TRIGGER]
    if (chordInfos) {
        for (const info of chordInfos) {
            if (globals.GM)
                stopGmNote(info)
            else if (globals.channel2)
                globals.channel2.stopNote(info.allowedNote)
        }
    }
    delete globals.pendingChordNoteOffs[AUDITION_TRIGGER]

    const bassInfo = globals.pendingChordBassNoteOffs[AUDITION_TRIGGER]
    if (bassInfo) {
        if (globals.GM)
            stopGmNote(bassInfo)
        else if (globals.channel3)
            globals.channel3.stopNote(bassInfo.allowedNote)
    }
    delete globals.pendingChordBassNoteOffs[AUDITION_TRIGGER]
}

/**
 * Play a chord (and optional bass) briefly, without changing the current chord
 * or scale, and without recording it. Only `highlightMidi` (the trigger key) is
 * lit on the keyboard, matching how a real chord trigger behaves; if it is not
 * given, every chord note is lit instead.
 * @param {string[]} notes chord notes including octaves
 * @param {string} [bass] bass note including octave
 * @param {number} [highlightMidi] the trigger key to light
 * @param {number} [durationMs]
 */
export function auditionChord(notes, bass, highlightMidi, durationMs = 800) {
    if (!Array.isArray(notes) || notes.length === 0)
        return
    if (!audioContext)
        return
    if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
        audioContext.resume()

    stopAuditionChord()

    const originNote = /** @type {any} */ (Note.get('C20'))
    originNote.attack = 0.5
    const options = { originNote, duration: 0, when: 0 }

    const wasSuppressed = globals.recording.suppressCapture
    globals.recording.suppressCapture = true
    try {
        if (!(AUDITION_TRIGGER in globals.pendingChordNoteOffs))
            globals.pendingChordNoteOffs[AUDITION_TRIGGER] = []
        for (const noteName of notes)
            playChordNote(noteName, 'chord', options, globals.channel2, AUDITION_TRIGGER, globals.pendingChordNoteOffs)
        if (bass)
            playChordNote(bass, 'bass', options, globals.channel3, AUDITION_TRIGGER, globals.pendingChordBassNoteOffs)
    }
    finally {
        globals.recording.suppressCapture = wasSuppressed
    }

    if (typeof highlightMidi === 'number') {
        flashLiveNote(highlightMidi, durationMs)
    }
    else {
        for (const noteName of notes) {
            const midi = Note.midi(noteName)
            if (typeof midi === 'number')
                flashLiveNote(midi, durationMs)
        }
    }

    clearTimeout(chordStopTimer)
    chordStopTimer = setTimeout(stopAuditionChord, durationMs)
}
