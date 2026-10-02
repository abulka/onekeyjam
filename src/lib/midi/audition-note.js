// @ts-check
import { Note } from '@tonaljs/tonal'
import { audioContext, playGmNote } from '../audio/general-midi.js'
import { Note as WebMidiNote } from './webmidi.js'

/**
 * @module lib/midi/audition-note
 * @desc Plays a single note briefly through the in-browser synth, used when a
 * piano-roll's piano strip is clicked. Browsers keep the audio context
 * suspended until a user gesture, so this resumes it first. It plays directly
 * and never goes through the recorder, so auditions are not captured.
 */

/**
 * Light the note on the main piano keyboard for a moment, so a piano-strip
 * click gives visible feedback as well as sound.
 * @param {number} midi
 * @param {number} durationMs
 */
export function flashLiveNote(midi, durationMs = 350) {
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    if (typeof document === 'undefined' || typeof document.broadcastEvent !== 'function')
        return
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('live-note', { state: true, note: new WebMidiNote(midi) })
    setTimeout(() => {
        // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
        document.broadcastEvent('live-note', { state: false, note: new WebMidiNote(midi) })
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
