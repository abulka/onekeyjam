// @ts-check
import * as Tonal from "@tonaljs/tonal";
import { chordSymbolToNotesInversion } from "./chordSymbolToNotes.js";
import { chordOctave } from "./settings.js";

/**
 * @module lib/voiceChordSequence
 * @desc Choose inversions (and octave shifts) that minimise movement between chords.
 */

/**
 * @typedef {import("./parseChordSequence.js").ParsedChordToken} ParsedChordToken
 */

/**
 * @typedef {object} VoicedChord
 * @property {string} input original text token
 * @property {string} chord chord symbol without bass
 * @property {string} bass explicit bass pitch class or ""
 * @property {string} symbol full symbol including slash bass
 * @property {Array<string>} chordNotes voiced notes with octaves, ascending
 * @property {number} inversion chosen inversion index
 * @property {number} octaveShift whole-octave shift relative to the base octave (-1, 0, 1)
 */

/**
 * Voice a sequence of parsed chords so each chord stays close to the previous one.
 * The first chord stays close to `previousChordNotes` when supplied, otherwise it
 * uses root position. Later chords chain greedily from the previous choice.
 * @param {Array<ParsedChordToken>} entries
 * @param {{previousChordNotes?: Array<string>, baseOctave?: number}} [options]
 * @returns {Array<VoicedChord>}
 */
export function voiceChordSequence(entries, options = {}) {
    const { previousChordNotes = [], baseOctave = chordOctave } = options
    /** @type {Array<VoicedChord>} */
    const voiced = []
    let prevNotes = Array.isArray(previousChordNotes) ? [...previousChordNotes] : []

    for (const entry of entries) {
        const candidates = buildCandidates(entry.chord, baseOctave)
        if (candidates.length === 0) {
            voiced.push({ ...entry, chordNotes: [], inversion: 0, octaveShift: 0 })
            continue
        }
        let best = candidates[0]
        if (prevNotes.length > 0) {
            let bestCost = Infinity
            for (const candidate of candidates) {
                const cost = voiceLeadingCost(prevNotes, candidate.chordNotes, baseOctave)
                if (cost < bestCost - 1e-9) {
                    bestCost = cost
                    best = candidate
                }
            }
        }
        voiced.push({ ...entry, chordNotes: best.chordNotes, inversion: best.inversion, octaveShift: best.octaveShift })
        prevNotes = best.chordNotes
    }
    return voiced
}

/**
 * Build every inversion at one octave below, level, and one octave above.
 * Order prefers root position and the base octave so ties are stable.
 * @param {string} chordSymbol
 * @param {number} baseOctave
 */
function buildCandidates(chordSymbol, baseOctave) {
    const chordObj = Tonal.Chord.get(chordSymbol)
    if (chordObj.empty)
        return []
    const numNotes = chordObj.notes.length
    const candidates = []
    for (let inversion = 0; inversion < numNotes; inversion++) {
        for (const octaveShift of [0, -1, 1]) {
            const notes = chordSymbolToNotesInversion(chordSymbol, inversion, baseOctave + octaveShift)
            if (notes.length === 0)
                continue
            candidates.push({ chordNotes: notes, inversion, octaveShift })
        }
    }
    return candidates
}

/**
 * Total movement between two voicings in semitones, plus a small pull toward
 * the middle register so long sequences do not drift up or down an octave.
 * Voices are compared in ascending order. Extra notes in the longer chord add
 * their distance to the nearest note in the shorter chord.
 * @param {Array<string>} prevNotes notes with octaves, e.g. ["D3","G3","A3"]
 * @param {Array<string>} nextNotes
 * @param {number} [baseOctave]
 */
export function voiceLeadingCost(prevNotes, nextNotes, baseOctave = chordOctave) {
    const prevMidi = toSortedMidi(prevNotes)
    const nextMidi = toSortedMidi(nextNotes)
    if (prevMidi.length === 0 || nextMidi.length === 0)
        return Infinity

    const overlap = Math.min(prevMidi.length, nextMidi.length)
    let cost = 0
    for (let i = 0; i < overlap; i++)
        cost += Math.abs(prevMidi[i] - nextMidi[i])

    const [shorter, longer] = prevMidi.length <= nextMidi.length ? [prevMidi, nextMidi] : [nextMidi, prevMidi]
    if (longer.length > shorter.length) {
        for (let i = shorter.length; i < longer.length; i++) {
            let nearest = Infinity
            for (const note of shorter)
                nearest = Math.min(nearest, Math.abs(longer[i] - note))
            cost += nearest
        }
    }

    // Small centring pull: an octave of drift costs less than one extra semitone
    // of real voice movement, so smooth movement always wins over register.
    const center = 12 * (baseOctave + 1)
    let centrePull = 0
    for (const note of nextMidi)
        centrePull += Math.abs(note - center)
    cost += centrePull * 0.02

    return cost
}

/**
 * @param {Array<string>} notes
 */
function toSortedMidi(notes) {
    return notes
        .map(note => Tonal.Note.midi(note))
        .filter(/** @returns {m is number} */(m) => typeof m === "number")
        .sort((a, b) => a - b)
}
