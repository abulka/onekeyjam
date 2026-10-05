// @ts-check

// Same import workaround as src/lib/parse-midi.js: the two-step form works in
// the browser (Vite), in node and in the Vitest environment.
import * as pkg from '@tonejs/midi'
const { Midi } = pkg
import { sanitizeFilename } from '../filename.js'

/**
 * @module lib/midi/export-recording
 * @desc Builds and downloads a two-track MIDI file from a recorded take
 * (`globals.recording.take`): a 'Chords' track for the left hand and a 'Jam'
 * track for the right hand.
 */

const DEFAULT_PPQ = 480

/**
 * @param {import('@tonejs/midi').Midi} midi
 * @param {number} ppq
 */
function setHeaderPpq(midi, ppq) {
    const json = midi.header.toJSON()
    json.ppq = ppq
    midi.header.fromJSON(json)
}

/**
 * @param {import('@tonejs/midi').Midi} midi
 * @param {Array<{ midi: number, startTick: number, durationTicks: number, velocity: number }>} notes
 * @param {string} name
 */
function notesToTrack(midi, notes, name) {
    const track = midi.addTrack()
    track.name = name
    for (const note of notes) {
        track.addNote({
            midi: note.midi,
            ticks: Math.round(note.startTick),
            durationTicks: Math.max(1, Math.round(note.durationTicks)),
            velocity: Math.min(1, Math.max(0, note.velocity)),
        })
    }
}

/**
 * @param {{ chords?: Array<object>, jam?: Array<object> }} take
 * @param {number} [bpm]
 * @param {number} [ppq]
 * @returns {Uint8Array}
 */
export function recordingToMidi(take, bpm = 120, ppq = DEFAULT_PPQ) {
    const midi = new Midi()
    midi.header.setTempo(bpm)
    midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] })
    // Track 1 is the solo (jam) part, track 2 is the chord part.
    notesToTrack(midi, take.jam || [], 'Solo')
    notesToTrack(midi, take.chords || [], 'Chords')
    setHeaderPpq(midi, ppq)
    return midi.toArray()
}

/**
 * @param {Uint8Array} data
 * @param {string} filename
 */
function downloadBlob(data, filename) {
    const blob = new Blob([/** @type {BlobPart} */ (data)], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const safeName = sanitizeFilename(filename)
    anchor.download = safeName.endsWith('.mid') ? safeName : `${safeName}.mid`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
}

/**
 * @param {{ chords?: Array<object>, jam?: Array<object> }} take
 * @param {string} [filename]
 * @param {number} [bpm]
 * @param {number} [ppq]
 * @returns {Uint8Array}
 */
export function downloadRecording(take, filename = 'onekeyjam-take', bpm = 120, ppq = DEFAULT_PPQ) {
    const data = recordingToMidi(take, bpm, ppq)
    downloadBlob(data, filename)
    return data
}
