// @ts-check
import { Note as TonalNote } from '@tonaljs/tonal'
import { globals } from './globals.js'

/**
 * @module lib/describeTriggerChord
 * @desc A read-only description of the exact notes a trigger key sounds, for
 * the Edit Notes debug panel. It mirrors the note selection in `playChord`:
 * the chord notes sound on channel 2 and the bass on channel 3, and a chord
 * note that duplicates the bass is skipped unless `playChordBass`.
 *
 * The bass is listed last so the debug line reads chord-first, matching how
 * the notes are shown elsewhere in the UI.
 */

const CHORD_CHANNEL = 2
const BASS_CHANNEL = 3

/**
 * @typedef {object} TriggerSound
 * @property {string} name note name including octave
 * @property {number} midi MIDI note number
 * @property {number} channel MIDI channel (2 chords, 3 bass)
 * @property {'chord'|'bass'} role
 */

/**
 * @typedef {object} StoredNote
 * @property {string} name note name including octave
 * @property {number|null} midi MIDI note number, or null when unparseable
 */

/**
 * @param {string} name
 * @returns {number|null}
 */
function midiOrNull(name) {
    const midi = name ? TonalNote.midi(name) : null
    return typeof midi === 'number' ? midi : null
}

/**
 * Describe the notes the given trigger key plays. Reads the live flags from
 * `globals` unless overrides are passed (mainly for tests).
 * @param {string} triggerNote
 * @param {{ chordTriggerMap?: object, playChordOnly?: boolean, playBassOnly?: boolean, playChordBass?: boolean }} [options]
 * @returns {{ trigger: string, found: boolean, chord: string, chordNotes: string[], storedNotes: StoredNote[], bassNote: string, storedBassMidi: number|null, sounds: TriggerSound[], skippedBassDuplicate: boolean }}
 */
export function describeTriggerChord(triggerNote, options = {}) {
    const map = options.chordTriggerMap ?? globals.chordTriggerMap
    const playChordOnly = options.playChordOnly ?? globals.playChordOnly
    const playBassOnly = options.playBassOnly ?? globals.playBassOnly
    const playChordBass = options.playChordBass ?? globals.playChordBass

    const config = map ? map[triggerNote] : undefined
    if (!config)
        return {
            trigger: triggerNote,
            found: false,
            chord: '',
            chordNotes: [],
            storedNotes: [],
            bassNote: '',
            storedBassMidi: null,
            sounds: [],
            skippedBassDuplicate: false,
        }

    const chordNotes = Array.isArray(config.chordNotes) ? config.chordNotes : []
    const bassNote = config.bassNote || ''
    /** @type {StoredNote[]} */
    const storedNotes = chordNotes.map(name => ({ name, midi: midiOrNull(name) }))

    /** @type {TriggerSound[]} */
    const sounds = []
    const bassIsInVoicing = !!bassNote && chordNotes.includes(bassNote)
    const skippedBassDuplicate = bassIsInVoicing && !playChordBass

    if (!playBassOnly) {
        // The exact bass note is left out of the chord channel, then added back
        // when the "double the bass" option is on, matching playChord.
        const chordChannelNotes = chordNotes.filter(name => name !== bassNote)
        if (playChordBass && bassNote)
            chordChannelNotes.push(bassNote)
        for (const name of chordChannelNotes) {
            const midi = TonalNote.midi(name)
            if (typeof midi === 'number')
                sounds.push({ name, midi, channel: CHORD_CHANNEL, role: 'chord' })
        }
    }

    // The bass is listed after the chord notes.
    if (!playChordOnly && bassNote) {
        const midi = TonalNote.midi(bassNote)
        if (typeof midi === 'number')
            sounds.push({ name: bassNote, midi, channel: BASS_CHANNEL, role: 'bass' })
    }

    return {
        trigger: triggerNote,
        found: true,
        chord: config.chord || config.name || '',
        chordNotes: [...chordNotes],
        storedNotes,
        bassNote,
        storedBassMidi: midiOrNull(bassNote),
        sounds,
        skippedBassDuplicate,
    }
}
